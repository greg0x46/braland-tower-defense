import Phaser from 'phaser';
import {
  attackBehaviorOf,
  engagementTimingsOf,
  type AttackBehavior,
  type TowerType,
} from '../data/towers';
import type { Enemy } from './Enemy';
import { COLORS } from '../core/constants';
import { isTargetValid, resolveAttack, type AttackOutcome, type Origin } from '../systems/combat';
import {
  createEngagementState,
  stepEngagement,
  type EngagementConfig,
  type EngagementState,
  type EngagementCommand,
} from '../systems/engagement';
import { TowerAttackAnimator } from './TowerAttackAnimator';

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
 * Torre de gameplay. A regra de engajamento vive em `systems/engagement`; esta
 * classe adapta comandos puros para dano/projetil e renderizacao Phaser.
 */
export class Tower extends Phaser.GameObjects.Container {
  readonly def: TowerType;
  readonly radius: number;
  /** Contrato de ataque: quem decide dano, alcance, cadência e regra de alvo. */
  readonly behavior: AttackBehavior;

  private readonly fire: FireFn;
  private readonly base: Origin;
  private readonly engagementConfig: EngagementConfig;
  private readonly engagementState: EngagementState<Enemy>;
  private readonly rangeRing: Phaser.GameObjects.Arc;
  private readonly visualRoot: Phaser.GameObjects.Container;
  private readonly spriteVisual?: Phaser.GameObjects.Image;
  private readonly attackAnimator?: TowerAttackAnimator;

  constructor(scene: Phaser.Scene, x: number, y: number, type: TowerType, fire: FireFn) {
    super(scene, x, y);
    this.def = type;
    this.radius = type.radius;
    this.behavior = attackBehaviorOf(type);
    this.fire = fire;
    this.base = { x, y };
    this.engagementState = createEngagementState<Enemy>(this.base);
    this.engagementConfig = {
      behavior: this.behavior,
      timings: engagementTimingsOf(type),
      base: this.base,
    };

    this.rangeRing = scene.add
      .circle(0, 0, type.range, type.color, 0.08)
      .setStrokeStyle(1.5, type.color, 0.5)
      .setVisible(false);

    // Resolução visual (contrato C2): se há sprite carregado, renderiza a
    // ilustração; senão, cai no placeholder círculo + emoji. Apenas o objeto de
    // exibição muda — colisão/alcance/depth continuam derivados de `def`.
    this.add(this.rangeRing);
    const visualDisplayWidth =
      this.radius * (type.attackAnimation?.visualScale ?? TOWER_SPRITE_SCALE);
    const visual = this.buildVisual(scene, type, visualDisplayWidth);
    this.visualRoot = visual.root;
    this.spriteVisual = visual.sprite;
    this.add(this.visualRoot);

    if (type.attackAnimation) {
    this.attackAnimator = new TowerAttackAnimator({
        scene,
        definition: type.attackAnimation,
        visualRoot: this.visualRoot,
        spriteVisual: this.spriteVisual,
        spriteDisplayWidth: visualDisplayWidth,
        idleSpriteKey: type.spriteKey,
        idleFrame: type.attackAnimation.idleFrame ?? type.spriteFrame,
      });
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
  private buildVisual(
    scene: Phaser.Scene,
    type: TowerType,
    displayWidth: number,
  ): {
    root: Phaser.GameObjects.Container;
    sprite?: Phaser.GameObjects.Image;
  } {
    const root = scene.add.container(0, 0);

    if (type.spriteFrame && scene.textures.exists(type.spriteFrame.textureKey)) {
      const sprite = this.buildSprite(scene, type.spriteFrame.textureKey, displayWidth, type.spriteFrame.frame);
      root.add(sprite);
      return { root, sprite };
    }

    if (type.spriteKey && scene.textures.exists(type.spriteKey)) {
      const sprite = this.buildSprite(scene, type.spriteKey, displayWidth);
      root.add(sprite);
      return { root, sprite };
    }

    const body = scene.add.circle(0, 0, this.radius, type.color);
    body.setStrokeStyle(2, 0x000000, 0.4);
    const emoji = scene.add
      .text(0, 0, type.emoji, { fontSize: `${this.radius * 1.4}px` })
      .setOrigin(0.5);
    root.add([body, emoji]);
    return { root };
  }

  private buildSprite(
    scene: Phaser.Scene,
    spriteKey: string,
    displayWidth: number,
    frame?: string | number,
  ): Phaser.GameObjects.Image {
    const image = scene.add.image(0, 0, spriteKey, frame).setOrigin(0.5);
    const aspect = image.frame.realHeight / image.frame.realWidth;
    image.setDisplaySize(displayWidth, displayWidth * aspect);
    return image;
  }

  update(deltaSec: number, enemies: Enemy[]): void {
    const commands = stepEngagement(
      this.engagementConfig,
      this.engagementState,
      enemies,
      deltaSec,
    );

    for (const command of commands) this.applyStrikeCommand(command);

    if (this.attackAnimator) {
      this.attackAnimator.render(this.engagementState, this.base);
    } else {
      this.visualRoot.setPosition(
        this.engagementState.x - this.base.x,
        this.engagementState.y - this.base.y,
      );
    }
  }

  get engagementX(): number {
    return this.engagementState.x;
  }

  get engagementY(): number {
    return this.engagementState.y;
  }

  private applyStrikeCommand(command: EngagementCommand<Enemy>): void {
    if (!isTargetValid(this.behavior, this.base, command.target)) return;
    const outcome = resolveAttack(this.behavior, this.base, [command.target]);
    this.applyOutcome(outcome);
  }

  /** Aplica o efeito descrito pelo comportamento. */
  private applyOutcome(outcome: AttackOutcome<Enemy>): void {
    switch (outcome.kind) {
      case 'none':
        return;

      case 'projectile':
        this.fire(
          this.engagementState.x,
          this.engagementState.y,
          outcome.target,
          outcome.damage,
          outcome.speed,
        );
        return;

      case 'direct':
      case 'area':
        for (const target of outcome.targets) {
          if (isTargetValid(this.behavior, this.base, target)) target.takeDamage(outcome.damage);
        }
        return;
    }
  }

  /** Anel de alcance também usado como feedback (ex.: destaque). */
  showRange(visible: boolean): void {
    this.rangeRing.setVisible(visible);
    this.rangeRing.setStrokeStyle(1.5, COLORS.rangeValid, 0.6);
  }

}
