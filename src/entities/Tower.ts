import Phaser from 'phaser';
import type { TowerType } from '../data/towers';
import type { Enemy } from './Enemy';
import { COLORS } from '../core/constants';
import { pickMostAdvancedInRange } from '../systems/targeting';

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

    const body = scene.add.circle(0, 0, this.radius, type.color);
    body.setStrokeStyle(2, 0x000000, 0.4);

    const emoji = scene.add
      .text(0, 0, type.emoji, { fontSize: `${this.radius * 1.4}px` })
      .setOrigin(0.5);

    this.add([this.rangeRing, body, emoji]);
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
