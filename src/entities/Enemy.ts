import Phaser from 'phaser';
import type { EnemyType } from '../data/enemies';
import type { Point } from '../data/path';
import { COLORS, ANIMS } from '../core/constants';
import { resolveOrientation, tiltToDegrees } from '../systems/orientation';
import type { OrientationState } from '../systems/orientation';

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

  /** Sprite animado, quando a sheet carregou; null no fallback (círculo+emoji). */
  private readonly sprite: Phaser.GameObjects.Sprite | null;
  /** Orientação atual (histerese entre frames). Entra indo p/ a direita. */
  private orientation: OrientationState = { flipX: true, tilt: 'flat' };

  constructor(scene: Phaser.Scene, type: EnemyType, path: Point[], hpOverride?: number) {
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
      const src = sprite.texture.getSourceImage();
      // Ajusta ao raio mantendo a proporção do frame (largura ≈ 2.6×raio).
      const displayWidth = this.radius * 3.2;
      sprite.setDisplaySize(displayWidth, displayWidth * (src.height / src.width));
      // Estado inicial coerente com `orientation` (entra indo p/ a direita).
      // A orientação passa a ser derivada do movimento em step() (US2).
      sprite.setFlipX(this.orientation.flipX);
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
    const barY = -this.radius - 8;
    const hpBarBg = scene.add
      .rectangle(0, barY, this.hpBarWidth, 5, COLORS.hpBarBg, 0.6)
      .setOrigin(0.5);
    this.hpBarFill = scene.add
      .rectangle(-this.hpBarWidth / 2, barY, this.hpBarWidth, 5, COLORS.hpBarFill)
      .setOrigin(0, 0.5);

    this.add([...visuals, hpBarBg, this.hpBarFill]);
    scene.add.existing(this);
  }

  /** Avança ao longo do caminho. deltaSec em segundos. */
  step(deltaSec: number): void {
    if (this.status !== 'alive') return;

    // Vetor de deslocamento do frame (net) → orienta o sprite (US2), evitando
    // re-ler o path. Vetor nulo preserva a orientação (histerese).
    const startX = this.x;
    const startY = this.y;

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

    this.applyOrientation(this.x - startX, this.y - startY);

    if (this.segmentIndex >= this.path.length - 1) {
      this.status = 'leaked';
    }
  }

  /**
   * Deriva a orientação do vetor de deslocamento e aplica ao Sprite apenas
   * quando muda (sem set redundante — Constitution III). No fallback (sem
   * Sprite) apenas mantém o estado; a moto segue percorrendo o caminho.
   */
  private applyOrientation(dx: number, dy: number): void {
    if (!this.sprite) return;

    const next = resolveOrientation(this.orientation, dx, dy);
    if (next.flipX !== this.orientation.flipX) {
      this.sprite.setFlipX(next.flipX);
    }
    if (next.tilt !== this.orientation.tilt) {
      // "Nariz p/ cima ao subir" nos dois sentidos: quando espelhado, a rotação
      // visual inverte, então compensamos o sinal pelo flipX (research D3/D6).
      const deg = tiltToDegrees(next.tilt);
      const signed = next.flipX ? -deg : deg;
      this.sprite.setRotation(Phaser.Math.DegToRad(signed));
    }
    this.orientation = next;
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
