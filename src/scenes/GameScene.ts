import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import {
  PLAY_WIDTH,
  GAME_HEIGHT,
  COLORS,
  TEXTURES,
} from '../core/constants';
import { PATH } from '../data/path';
import { ENEMY_TYPES } from '../data/enemies';
import type { TowerType } from '../data/towers';
import { Enemy } from '../entities/Enemy';
import { Tower } from '../entities/Tower';
import { Projectile } from '../entities/Projectile';
import { BuildManager } from '../managers/BuildManager';
import { WaveManager } from '../managers/WaveManager';
import { DebugOverlay } from '../debug/DebugOverlay';

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
  /** Só instanciado em desenvolvimento (Constitution X). */
  private debug?: DebugOverlay;
  private loggedMapFallback = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.cameras.main.roundPixels = true;

    this.drawMapBackground();

    this.buildManager = new BuildManager(this, () => this.towers, this.placeTower);
    this.waveManager = new WaveManager(this.spawnEnemy, () => this.enemies.length);

    if (import.meta.env.DEV) {
      this.debug = new DebugOverlay(this, {
        enemies: () => this.enemies,
        towers: () => this.towers,
        projectiles: () => this.projectiles,
      });
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  private drawMapBackground(): void {
    if (this.textures.exists(TEXTURES.initialMap)) {
      this.add
        .image(0, 0, TEXTURES.initialMap)
        .setOrigin(0)
        .setDisplaySize(PLAY_WIDTH, GAME_HEIGHT)
        .setDepth(DEPTH.background);
      return;
    }

    this.add
      .rectangle(0, 0, PLAY_WIDTH, GAME_HEIGHT, COLORS.background)
      .setOrigin(0)
      .setDepth(DEPTH.background);

    if (!this.loggedMapFallback) {
      this.loggedMapFallback = true;
      console.error(
        `[GameScene] Textura "${TEXTURES.initialMap}" ausente; usando fallback visual do mapa.`,
      );
    }
  }

  // --- Callbacks fornecidos aos managers/torres ---

  private spawnEnemy = (enemyTypeId: string, hp: number): void => {
    const type = ENEMY_TYPES[enemyTypeId];
    if (!type) return;
    const enemy = new Enemy(this, type, PATH, hp).setDepth(DEPTH.enemy) as Enemy;
    this.enemies.push(enemy);
  };

  private placeTower = (x: number, y: number, type: TowerType): void => {
    const tower = new Tower(this, x, y, type, this.fire).setDepth(DEPTH.tower) as Tower;
    this.towers.push(tower);
  };

  private fire = (
    x: number,
    y: number,
    target: Enemy,
    damage: number,
    speed: number,
  ): void => {
    const p = new Projectile(this, x, y, target, damage, speed).setDepth(
      DEPTH.projectile,
    ) as Projectile;
    this.projectiles.push(p);
  };

  // --- Loop principal ---

  update(_time: number, delta: number): void {
    this.debug?.update();
    // Congela tudo quando encerrado ou pausado (US3): entidades, torres,
    // projéteis e o relógio de ondas param de avançar.
    if (GameState.isOver || GameState.isPaused) return;
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

    // Resolve inimigos que morreram (recompensa) ou vazaram (dano à base).
    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.status === 'dead') {
        GameState.addMoney(enemy.reward);
        enemy.destroy();
        return false;
      }
      if (enemy.status === 'leaked') {
        GameState.loseLife();
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
    this.debug?.destroy();
  }
}
