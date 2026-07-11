import Phaser from 'phaser';
import { COLORS } from '../core/constants';
import type { Enemy } from './Enemy';

/**
 * Projétil com perseguição simples. Guarda referência ao alvo e move em
 * direção a ele; ao encostar, aplica dano. Se o alvo morrer/vazar antes,
 * segue até a última posição conhecida e expira.
 */
export class Projectile extends Phaser.GameObjects.Arc {
  private readonly speed: number;
  private readonly damage: number;
  private target: Enemy | null;
  private lastX: number;
  private lastY: number;
  private life = 2; // segundos até expirar por segurança

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Enemy,
    damage: number,
    speed: number,
  ) {
    super(scene, x, y, 5, 0, 360, false, COLORS.projectile);
    this.setStrokeStyle(1, 0x000000, 0.4);
    this.speed = speed;
    this.damage = damage;
    this.target = target;
    this.lastX = target.x;
    this.lastY = target.y;
    scene.add.existing(this);
  }

  /** Retorna true quando o projétil deve ser removido (acertou ou expirou). */
  step(deltaSec: number): boolean {
    this.life -= deltaSec;
    if (this.life <= 0) return true;

    if (this.target && this.target.status === 'alive') {
      this.lastX = this.target.x;
      this.lastY = this.target.y;
    } else {
      this.target = null; // alvo perdido: mira na última posição
    }

    const dx = this.lastX - this.x;
    const dy = this.lastY - this.y;
    const dist = Math.hypot(dx, dy);
    const move = this.speed * deltaSec;

    if (dist <= move) {
      this.setPosition(this.lastX, this.lastY);
      if (this.target && this.target.status === 'alive') {
        this.target.takeDamage(this.damage);
      }
      return true;
    }

    const t = move / dist;
    this.setPosition(this.x + dx * t, this.y + dy * t);
    return false;
  }
}
