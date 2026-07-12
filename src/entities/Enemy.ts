import Phaser from 'phaser';
import type { EnemyType } from '../data/enemies';
import type { Point } from '../data/path';
import { COLORS, ANIMS } from '../core/constants';
import {
  DEFAULT_RENDER_SHARPNESS,
  resolveDevicePixelRatio,
  snapVisualPosition,
} from '../core/renderSharpness';
import { MOTOBOY_SPRITE_SHEET } from '../core/spriteSheets';
import {
  headingVectorToNextWaypoint,
  rotationDegreesForOrientation,
  resolveOrientation,
  spriteFlipXForOrientation,
} from '../systems/orientation';
import type { OrientationState } from '../systems/orientation';

export type EnemyStatus = 'alive' | 'dead' | 'leaked';

/**
 * O que de fato aconteceu no golpe. Existe para que a apresentação (som de impacto)
 * possa perguntar "houve dano real?" sem reimplementar a regra — e sem que um golpe
 * em inimigo já morto vire som fantasma (contrato C1).
 *
 * É só um relatório: nenhum campo daqui alimenta HP, status, recompensa ou vida.
 */
export interface TakeDamageResult {
  /** Dano aplicado a um inimigo vivo. */
  readonly damaged: boolean;
  /** Este golpe foi o que zerou o HP. */
  readonly killed: boolean;
}

const NO_DAMAGE: TakeDamageResult = { damaged: false, killed: false };

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
  private readonly path: readonly Point[];

  private segmentIndex = 0;
  /** Distância total percorrida — usada para escolher o inimigo mais avançado. */
  distanceTravelled = 0;

  status: EnemyStatus = 'alive';

  private readonly hpBarFill: Phaser.GameObjects.Rectangle;
  private readonly hpBarBg: Phaser.GameObjects.Rectangle;
  private readonly hpBarWidth: number;
  private readonly hpBarY: number;

  /** Sprite animado, quando a sheet carregou; null no fallback (círculo+emoji). */
  private readonly sprite: Phaser.GameObjects.Sprite | null;
  /** Orientação atual (histerese entre frames). Entra indo p/ a direita. */
  private orientation: OrientationState = { flipX: true, tilt: 'flat' };

  constructor(scene: Phaser.Scene, type: EnemyType, path: readonly Point[], hpOverride?: number) {
    const start = path[0];
    super(scene, start.x, start.y);

    this.def = type;
    this.radius = type.radius;
    // HP escalado pela onda (progressão) quando fornecido; senão o base do roster.
    this.maxHp = hpOverride ?? type.maxHp;
    this.hp = this.maxHp;
    this.speed = type.speed;
    this.path = path;

    // Apresentação: se a sprite sheet carregou, usa um Sprite animado; senão,
    // cai no placeholder círculo + emoji (mesmo contrato da Tower — FR-007).
    const visuals: Phaser.GameObjects.GameObject[] = [];
    if (type.spriteKey && scene.textures.exists(type.spriteKey)) {
      const sprite = scene.add.sprite(0, 0, type.spriteKey).setOrigin(0.5);
      const displayWidth =
        this.radius * MOTOBOY_SPRITE_SHEET.visualScale.displayWidthRadiusMultiplier;
      sprite.setDisplaySize(
        displayWidth,
        displayWidth * (sprite.frame.cutHeight / sprite.frame.cutWidth),
      );
      // Estado inicial coerente com `orientation` (entra indo p/ a direita).
      // A orientação passa a ser derivada do movimento em step() (US2).
      sprite.setFlipX(spriteFlipXForOrientation(this.orientation));
      sprite.play(ANIMS.motoboyRide);
      visuals.push(sprite);
      this.sprite = sprite;
    } else {
      const body = scene.add.circle(0, 0, this.radius, type.color);
      body.setStrokeStyle(2, 0x000000, 0.35);
      const emoji = scene.add
        .text(0, 0, type.emoji, { fontSize: `${this.radius * 1.4}px` })
        .setOrigin(0.5);
      visuals.push(body, emoji);
      this.sprite = null;
    }

    this.hpBarWidth = this.radius * 2;
    this.hpBarY = -this.radius - 8;
    this.hpBarBg = scene.add
      .rectangle(0, this.hpBarY, this.hpBarWidth, 5, COLORS.hpBarBg, 0.6)
      .setOrigin(0.5);
    this.hpBarFill = scene.add
      .rectangle(-this.hpBarWidth / 2, this.hpBarY, this.hpBarWidth, 5, COLORS.hpBarFill)
      .setOrigin(0, 0.5);

    this.add([...visuals, this.hpBarBg, this.hpBarFill]);
    scene.add.existing(this);
    this.applyVisualSnap();
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

    const heading = headingVectorToNextWaypoint(this.path, this.segmentIndex, this.x, this.y);
    this.applyOrientation(heading.dx, heading.dy);
    this.applyVisualSnap();

    if (this.segmentIndex >= this.path.length - 1) {
      this.status = 'leaked';
    }
  }

  private applyVisualSnap(): void {
    if (!this.sprite) return;

    const snap = snapVisualPosition(
      this,
      DEFAULT_RENDER_SHARPNESS,
      resolveDevicePixelRatio(DEFAULT_RENDER_SHARPNESS),
    );
    this.sprite.setPosition(snap.offsetX, snap.offsetY);
    this.hpBarBg.setPosition(snap.offsetX, this.hpBarY + snap.offsetY);
    this.hpBarFill.setPosition(
      -this.hpBarWidth / 2 + snap.offsetX,
      this.hpBarY + snap.offsetY,
    );
  }

  /**
   * Deriva a orientação do vetor de deslocamento e aplica ao Sprite apenas
   * quando muda (sem set redundante — Constitution III). No fallback (sem
   * Sprite) apenas mantém o estado; a moto segue percorrendo o caminho.
   */
  private applyOrientation(dx: number, dy: number): void {
    if (!this.sprite) return;

    const next = resolveOrientation(this.orientation, dx, dy);
    const flipChanged = next.flipX !== this.orientation.flipX;
    const tiltChanged = next.tilt !== this.orientation.tilt;
    if (flipChanged) {
      this.sprite.setFlipX(spriteFlipXForOrientation(next));
    }
    if (flipChanged || tiltChanged) {
      this.sprite.setRotation(Phaser.Math.DegToRad(rotationDegreesForOrientation(next)));
    }
    this.orientation = next;
  }

  /** Satisfaz a interface Targetable do sistema de mira, sem alocar. */
  get alive(): boolean {
    return this.status === 'alive';
  }

  get currentHp(): number {
    return this.hp;
  }

  takeDamage(amount: number): TakeDamageResult {
    if (this.status !== 'alive' || amount <= 0) return NO_DAMAGE;

    this.hp = Math.max(0, this.hp - amount);
    this.hpBarFill.width = this.hpBarWidth * (this.hp / this.maxHp);
    if (this.hp <= 0) {
      this.status = 'dead';
      return { damaged: true, killed: true };
    }

    return { damaged: true, killed: false };
  }

  get reward(): number {
    return this.def.reward;
  }

  get typeId(): string {
    return this.def.id;
  }
}
