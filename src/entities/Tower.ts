import Phaser from 'phaser';
import type { TowerType } from '../data/towers';
import type { Enemy } from './Enemy';
import { COLORS } from '../core/constants';
import { pickMostAdvancedInRange } from '../systems/targeting';

/**
 * Fator de escala visual do sprite relativo ao `radius` (apresentação, não
 * gameplay). Largura de exibição ≈ `radius * TOWER_SPRITE_SCALE`; a altura
 * preserva o aspecto da imagem. Ajustável sem tocar em nenhuma regra.
 */
export const TOWER_SPRITE_SCALE = 3.0;

/** Callback usado pela torre para pedir à cena a criação de um projétil. */
export type FireFn = (
  x: number,
  y: number,
  target: Enemy,
  damage: number,
  speed: number,
) => void;

/**
 * Torre estacionária. A cada frame procura o inimigo mais avançado dentro do
 * alcance e dispara respeitando a cadência (fireRate). Mostra um anel de
 * alcance ao passar o mouse.
 */
export class Tower extends Phaser.GameObjects.Container {
  readonly def: TowerType;
  readonly radius: number;

  private cooldown = 0;
  private readonly fireInterval: number;
  private readonly fire: FireFn;
  private readonly rangeRing: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, type: TowerType, fire: FireFn) {
    super(scene, x, y);
    this.def = type;
    this.radius = type.radius;
    this.fire = fire;
    this.fireInterval = 1 / type.fireRate;

    this.rangeRing = scene.add
      .circle(0, 0, type.range, type.color, 0.08)
      .setStrokeStyle(1.5, type.color, 0.5)
      .setVisible(false);

    // Resolução visual (contrato C2): se há sprite carregado, renderiza a
    // ilustração; senão, cai no placeholder círculo + emoji. Apenas o objeto de
    // exibição muda — colisão/alcance/depth continuam derivados de `def`.
    this.add(this.rangeRing);
    if (type.spriteKey && scene.textures.exists(type.spriteKey)) {
      this.add(this.buildSprite(scene, type.spriteKey));
    } else {
      const body = scene.add.circle(0, 0, this.radius, type.color);
      body.setStrokeStyle(2, 0x000000, 0.4);
      const emoji = scene.add
        .text(0, 0, type.emoji, { fontSize: `${this.radius * 1.4}px` })
        .setOrigin(0.5);
      this.add([body, emoji]);
    }
    scene.add.existing(this);

    // Interatividade: mostra o alcance ao passar o mouse sobre a torre.
    this.setSize(this.radius * 2, this.radius * 2);
    this.setInteractive(
      new Phaser.Geom.Circle(0, 0, this.radius),
      Phaser.Geom.Circle.Contains,
    );
    this.on('pointerover', () => this.rangeRing.setVisible(true));
    this.on('pointerout', () => this.rangeRing.setVisible(false));
  }

  /**
   * Cria o objeto de exibição do sprite: largura relativa ao `radius`, altura
   * preservando o aspecto real da textura, origem centrada. Nenhuma dimensão
   * daqui alimenta gameplay (colisão/alcance seguem `def`).
   */
  private buildSprite(scene: Phaser.Scene, spriteKey: string): Phaser.GameObjects.Image {
    const image = scene.add.image(0, 0, spriteKey).setOrigin(0.5);
    const src = image.texture.getSourceImage();
    const aspect = src.height / src.width;
    const displayWidth = this.radius * TOWER_SPRITE_SCALE;
    image.setDisplaySize(displayWidth, displayWidth * aspect);
    return image;
  }

  update(deltaSec: number, enemies: Enemy[]): void {
    if (this.cooldown > 0) this.cooldown -= deltaSec;
    if (this.cooldown > 0) return;

    const target = this.pickTarget(enemies);
    if (!target) return;

    this.fire(this.x, this.y, target, this.def.damage, this.def.projectileSpeed);
    this.cooldown = this.fireInterval;
  }

  /** Inimigo vivo mais avançado dentro do alcance. */
  private pickTarget(enemies: Enemy[]): Enemy | null {
    return pickMostAdvancedInRange(this.x, this.y, this.def.range, enemies);
  }

  /** Anel de alcance também usado como feedback (ex.: destaque). */
  showRange(visible: boolean): void {
    this.rangeRing.setVisible(visible);
    this.rangeRing.setStrokeStyle(1.5, COLORS.rangeValid, 0.6);
  }
}
