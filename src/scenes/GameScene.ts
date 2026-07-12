import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { GameEvents, emitGameEvent, type CombatAudioSignal } from '../core/EventBus';
import { PLAY_WIDTH, GAME_HEIGHT, LEAK_DAMAGE } from '../core/constants';
import { ACTIVE_MAP } from '../data/maps';
import { ENEMY_TYPES } from '../data/enemies';
import type { ProjectileVisualSpec, TowerType } from '../data/towers';
import { Enemy } from '../entities/Enemy';
import { Tower } from '../entities/Tower';
import { Projectile } from '../entities/Projectile';
import { BuildManager } from '../managers/BuildManager';
import { CombatSfxManager } from '../managers/CombatSfxManager';
import { WaveManager } from '../managers/WaveManager';
import { DebugOverlay } from '../debug/DebugOverlay';
import { describeMapContractErrors, validateMapContract } from '../systems/mapContract';

const DEPTH = { background: 0, enemy: 20, tower: 30, projectile: 40 } as const;

/**
 * Cena de gameplay: desenha o mapa, mantém as listas de inimigos, torres e
 * projéteis, e roda o loop principal. Delega construção ao
 * BuildManager e progressão ao WaveManager.
 */
export class GameScene extends Phaser.Scene {
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];

  private buildManager!: BuildManager;
  private waveManager!: WaveManager;
  private combatSfx!: CombatSfxManager;
  /** Só instanciado em desenvolvimento (Constitution X). */
  private debug?: DebugOverlay;
  private loggedMapFallback = false;
  /** Sequência dos eventos audíveis desta partida. Zera junto com a cena. */
  private combatAudioSeq = 0;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.combatAudioSeq = 0;
    this.cameras.main.roundPixels = true;

    if (import.meta.env.DEV) this.validateMap();
    this.drawMapBackground();

    this.buildManager = new BuildManager(this, () => this.towers, this.placeTower);
    this.waveManager = new WaveManager(this.spawnEnemy, () => this.enemies.length);

    // O SFX de combate pertence ao ciclo de vida da partida (ao contrário da trilha,
    // que vive na BootScene): reiniciar precisa levar junto os sons e os listeners.
    this.combatSfx = new CombatSfxManager(this);
    this.combatSfx.start();

    if (import.meta.env.DEV) {
      this.debug = new DebugOverlay(this, {
        enemies: () => this.enemies,
        towers: () => this.towers,
        projectiles: () => this.projectiles,
      });
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  /** Visual do mapa pelo contrato; a falha do asset cai no fallback jogável (FR-014). */
  private drawMapBackground(): void {
    if (this.textures.exists(ACTIVE_MAP.visualKey)) {
      this.add
        .image(0, 0, ACTIVE_MAP.visualKey)
        .setOrigin(0)
        .setDisplaySize(PLAY_WIDTH, GAME_HEIGHT)
        .setDepth(DEPTH.background);
      return;
    }

    this.add
      .rectangle(0, 0, PLAY_WIDTH, GAME_HEIGHT, ACTIVE_MAP.fallbackVisualColor)
      .setOrigin(0)
      .setDepth(DEPTH.background);

    if (!this.loggedMapFallback) {
      this.loggedMapFallback = true;
      console.error(
        `[GameScene] Textura "${ACTIVE_MAP.visualKey}" do mapa "${ACTIVE_MAP.id}" ausente; usando fallback visual.`,
      );
    }
  }

  /**
   * O contrato do mapa precisa ser válido antes de qualquer entidade nascer: um
   * caminho fora do campo ou uma estrada de largura zero viram bug de gameplay
   * silencioso. Em dev, isso aparece no console já no boot (Constitution X).
   */
  private validateMap(): void {
    const errors = validateMapContract(ACTIVE_MAP);
    if (errors.length > 0) {
      console.error(describeMapContractErrors(ACTIVE_MAP, errors));
    }
  }

  // --- Callbacks fornecidos aos managers/torres ---

  private spawnEnemy = (enemyTypeId: string, hp: number): void => {
    const type = ENEMY_TYPES[enemyTypeId];
    if (!type) return;
    const enemy = new Enemy(this, type, ACTIVE_MAP.path, hp).setDepth(DEPTH.enemy) as Enemy;
    this.enemies.push(enemy);
  };

  private placeTower = (x: number, y: number, type: TowerType): void => {
    const tower = new Tower(this, x, y, type, this.fire, this.announceCombatAudio).setDepth(
      DEPTH.tower,
    ) as Tower;
    this.towers.push(tower);
  };

  private fire = (
    x: number,
    y: number,
    target: Enemy,
    damage: number,
    speed: number,
    towerTypeId: string,
    visual?: ProjectileVisualSpec,
  ): void => {
    const p = new Projectile(
      this,
      x,
      y,
      target,
      damage,
      speed,
      towerTypeId,
      visual,
      this.announceCombatAudio,
    ).setDepth(DEPTH.projectile) as Projectile;
    this.projectiles.push(p);
  };

  /**
   * Completa o que a entidade não deve saber — id do evento e relógio — e publica.
   * A torre e o projétil dizem apenas *o que fizeram*; quem transforma isso em som é
   * o `CombatSfxManager`, do outro lado do EventBus (Constitution IV).
   */
  private announceCombatAudio = (signal: CombatAudioSignal): void => {
    this.combatAudioSeq++;
    emitGameEvent(GameEvents.COMBAT_AUDIO_EVENT, {
      ...signal,
      eventId: `sfx-${this.combatAudioSeq}`,
      occurredAtMs: this.time.now,
    });
  };

  // --- Loop principal ---

  update(_time: number, delta: number): void {
    this.debug?.update();
    // Só o estado `running` avança gameplay: no setup, na pausa e na derrota,
    // entidades, torres, projéteis e o relógio de ondas ficam congelados (FR-005).
    if (!GameState.advancesGameplay) return;
    const dt = delta / 1000;

    for (const enemy of this.enemies) enemy.step(dt);
    for (const tower of this.towers) tower.update(dt, this.enemies);
    this.projectiles = this.projectiles.filter((p) => {
      if (p.step(dt)) {
        p.destroy();
        return false;
      }
      return true;
    });

    // Anuncia o que aconteceu; quem decide o custo/recompensa é o GameState.
    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.status === 'dead') {
        emitGameEvent(GameEvents.ENEMY_KILLED, {
          enemyTypeId: enemy.typeId,
          reward: enemy.reward,
        });
        enemy.destroy();
        return false;
      }
      if (enemy.status === 'leaked') {
        emitGameEvent(GameEvents.ENEMY_LEAKED, {
          enemyTypeId: enemy.typeId,
          damage: LEAK_DAMAGE,
        });
        enemy.destroy();
        return false;
      }
      return true;
    });

    this.waveManager.update(dt);
  }

  private onShutdown(): void {
    this.buildManager.destroy();
    this.waveManager.destroy();
    this.combatSfx.destroy();
    this.debug?.destroy();
  }
}
