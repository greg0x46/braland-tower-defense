import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { EventBus, GameEvents } from '../core/EventBus';
import {
  PLAY_WIDTH,
  GAME_HEIGHT,
  PATH_WIDTH,
  COLORS,
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

const DEPTH = { path: 1, enemy: 10, tower: 20, projectile: 30 } as const;

/**
 * Cena de gameplay: desenha o mapa e o caminho, mantém as listas de inimigos,
 * torres e projéteis, e roda o loop principal. Delega construção ao
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
  private won = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.won = false;

    this.drawBackground();
    this.drawPath();

    this.buildManager = new BuildManager(this, () => this.towers, this.placeTower);
    this.waveManager = new WaveManager(this, this.spawnEnemy, () => this.enemies.length);

    EventBus.on(GameEvents.GAME_WON, this.onWon, this);

    if (import.meta.env.DEV) {
      this.debug = new DebugOverlay(this, {
        enemies: () => this.enemies,
        towers: () => this.towers,
        projectiles: () => this.projectiles,
      });
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  private drawBackground(): void {
    this.add.rectangle(0, 0, PLAY_WIDTH, GAME_HEIGHT, COLORS.background).setOrigin(0).setDepth(0);
  }

  private drawPath(): void {
    const g = this.add.graphics().setDepth(DEPTH.path);
    this.strokeAlongPath(g, PATH_WIDTH + 8, COLORS.pathBorder);
    this.strokeAlongPath(g, PATH_WIDTH, COLORS.path);
  }

  /** Desenha a trilha com cantos arredondados (linha + discos nos vértices). */
  private strokeAlongPath(g: Phaser.GameObjects.Graphics, width: number, color: number): void {
    g.lineStyle(width, color, 1);
    g.beginPath();
    g.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) g.lineTo(PATH[i].x, PATH[i].y);
    g.strokePath();
    g.fillStyle(color, 1);
    for (const p of PATH) g.fillCircle(p.x, p.y, width / 2);
  }

  // --- Callbacks fornecidos aos managers/torres ---

  private spawnEnemy = (enemyTypeId: string): void => {
    const type = ENEMY_TYPES[enemyTypeId];
    if (!type) return;
    const enemy = new Enemy(this, type, PATH).setDepth(DEPTH.enemy) as Enemy;
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

  private onWon = (): void => {
    this.won = true;
  };

  // --- Loop principal ---

  update(_time: number, delta: number): void {
    this.debug?.update();
    if (GameState.isOver || this.won) return;
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

    this.waveManager.update();
  }

  private onShutdown(): void {
    EventBus.off(GameEvents.GAME_WON, this.onWon, this);
    this.buildManager.destroy();
    this.waveManager.destroy();
    this.debug?.destroy();
  }
}
