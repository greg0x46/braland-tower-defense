import Phaser from 'phaser';
import type { EnemyType } from '../data/enemies';
import type { Point } from '../data/path';
import { COLORS } from '../core/constants';

export type EnemyStatus = 'alive' | 'dead' | 'leaked';

/**
 * Inimigo que percorre o caminho. Representado por um Container com corpo
 * (círculo colorido), emoji e barra de vida. GameScene chama step() a cada
 * frame e trata a recompensa/vida quando o status deixa de ser 'alive'.
 */
export class Enemy extends Phaser.GameObjects.Container {
  readonly def: EnemyType;
  readonly radius: number;

  private hp: number;
  private readonly maxHp: number;
  private readonly speed: number;
  private readonly path: Point[];

  private segmentIndex = 0;
  /** Distância total percorrida — usada para escolher o inimigo mais avançado. */
  distanceTravelled = 0;

  status: EnemyStatus = 'alive';

  private readonly hpBarFill: Phaser.GameObjects.Rectangle;
  private readonly hpBarWidth: number;

  constructor(scene: Phaser.Scene, type: EnemyType, path: Point[]) {
    const start = path[0];
    super(scene, start.x, start.y);

    this.def = type;
    this.radius = type.radius;
    this.maxHp = type.maxHp;
    this.hp = type.maxHp;
    this.speed = type.speed;
    this.path = path;

    const body = scene.add.circle(0, 0, this.radius, type.color);
    body.setStrokeStyle(2, 0x000000, 0.35);

    const emoji = scene.add
      .text(0, 0, type.emoji, { fontSize: `${this.radius * 1.4}px` })
      .setOrigin(0.5);

    this.hpBarWidth = this.radius * 2;
    const barY = -this.radius - 8;
    const hpBarBg = scene.add
      .rectangle(0, barY, this.hpBarWidth, 5, COLORS.hpBarBg, 0.6)
      .setOrigin(0.5);
    this.hpBarFill = scene.add
      .rectangle(-this.hpBarWidth / 2, barY, this.hpBarWidth, 5, COLORS.hpBarFill)
      .setOrigin(0, 0.5);

    this.add([body, emoji, hpBarBg, this.hpBarFill]);
    scene.add.existing(this);
  }

  /** Avança ao longo do caminho. deltaSec em segundos. */
  step(deltaSec: number): void {
    if (this.status !== 'alive') return;

    let remaining = this.speed * deltaSec;
    while (remaining > 0 && this.segmentIndex < this.path.length - 1) {
      const target = this.path[this.segmentIndex + 1];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= remaining) {
        this.setPosition(target.x, target.y);
        this.distanceTravelled += dist;
        remaining -= dist;
        this.segmentIndex++;
      } else {
        const t = remaining / dist;
        this.setPosition(this.x + dx * t, this.y + dy * t);
        this.distanceTravelled += remaining;
        remaining = 0;
      }
    }

    if (this.segmentIndex >= this.path.length - 1) {
      this.status = 'leaked';
    }
  }

  /** Satisfaz a interface Targetable do sistema de mira, sem alocar. */
  get alive(): boolean {
    return this.status === 'alive';
  }

  takeDamage(amount: number): void {
    if (this.status !== 'alive') return;
    this.hp = Math.max(0, this.hp - amount);
    this.hpBarFill.width = this.hpBarWidth * (this.hp / this.maxHp);
    if (this.hp <= 0) {
      this.status = 'dead';
    }
  }

  get reward(): number {
    return this.def.reward;
  }
}
