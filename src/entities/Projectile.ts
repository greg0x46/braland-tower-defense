import Phaser from 'phaser';
import { COLORS } from '../core/constants';
import type { AnnounceCombatAudio } from '../core/EventBus';
import type { ProjectileVisualSpec } from '../data/towers';
import type { Enemy } from './Enemy';

/**
 * Projétil com perseguição simples. Guarda referência ao alvo e move em
 * direção a ele; ao encostar, aplica dano. Se o alvo morrer/vazar antes,
 * segue até a última posição conhecida e expira.
 */
export class Projectile extends Phaser.GameObjects.Container {
  private readonly speed: number;
  private readonly damage: number;
  /** De qual torre este projétil saiu — o som do impacto pode ser dela (chinelada). */
  private readonly towerTypeId: string;
  /** Anúncio de apresentação do impacto real. O projétil não conhece som. */
  private readonly announce?: AnnounceCombatAudio;
  private readonly spinRadPerSec: number;
  private readonly rotationOffsetRad: number;
  private readonly visual: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
  private target: Enemy | null;
  private lastX: number;
  private lastY: number;
  private spinRotation = 0;
  private life = 2; // segundos até expirar por segurança

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Enemy,
    damage: number,
    speed: number,
    towerTypeId: string,
    visualSpec?: ProjectileVisualSpec,
    announce?: AnnounceCombatAudio,
  ) {
    super(scene, x, y);
    this.speed = speed;
    this.damage = damage;
    this.towerTypeId = towerTypeId;
    this.announce = announce;
    this.spinRadPerSec = visualSpec?.spinRadPerSec ?? 0;
    this.rotationOffsetRad = visualSpec?.rotationOffsetRad ?? 0;
    this.target = target;
    this.lastX = target.x;
    this.lastY = target.y;
    this.visual = this.buildVisual(scene, visualSpec);
    this.add(this.visual);
    this.updateVisualRotation(this.lastX - x, this.lastY - y, 0);
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

    this.updateVisualRotation(dx, dy, deltaSec);

    if (dist <= move) {
      this.setPosition(this.lastX, this.lastY);
      // Impacto real em alvo vivo é a única coisa que soa: um projétil que chega na
      // última posição conhecida de um alvo já morto expira em silêncio (C1).
      if (this.target && this.target.status === 'alive') {
        const result = this.target.takeDamage(this.damage);
        if (result.damaged) {
          this.announce?.({
            category: 'enemy-damaged',
            towerTypeId: this.towerTypeId,
            enemyTypeId: this.target.typeId,
            x: this.x,
            y: this.y,
          });
        }
      }
      return true;
    }

    const t = move / dist;
    this.setPosition(this.x + dx * t, this.y + dy * t);
    return false;
  }

  private buildVisual(
    scene: Phaser.Scene,
    visualSpec?: ProjectileVisualSpec,
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Arc {
    if (visualSpec && scene.textures.exists(visualSpec.frame.textureKey)) {
      const image = scene.add
        .image(0, 0, visualSpec.frame.textureKey, visualSpec.frame.frame)
        .setOrigin(0.5);
      const aspect = image.frame.realHeight / image.frame.realWidth;
      image.setDisplaySize(visualSpec.displayWidth, visualSpec.displayWidth * aspect);
      return image;
    }

    const fallback = scene.add.circle(0, 0, 5, COLORS.projectile);
    fallback.setStrokeStyle(1, 0x000000, 0.4);
    return fallback;
  }

  private updateVisualRotation(dx: number, dy: number, deltaSec: number): void {
    this.spinRotation += this.spinRadPerSec * deltaSec;
    if (Math.abs(dx) <= 0.000001 && Math.abs(dy) <= 0.000001) {
      this.visual.rotation = this.rotationOffsetRad + this.spinRotation;
      return;
    }

    this.visual.rotation =
      Math.atan2(dy, dx) + this.rotationOffsetRad + this.spinRotation;
  }
}
