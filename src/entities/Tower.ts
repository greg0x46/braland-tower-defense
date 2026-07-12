import Phaser from 'phaser';
import { attackBehaviorOf, type AttackBehavior, type TowerType } from '../data/towers';
import type { Enemy } from './Enemy';
import { COLORS } from '../core/constants';
import {
  appliesOnCue,
  cooldownSeconds,
  isTargetValid,
  resolveAttack,
  type AttackOutcome,
} from '../systems/combat';
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
 * Torre estacionária. A cada frame procura o inimigo mais avançado dentro do
 * alcance e dispara respeitando a cadência (fireRate). Mostra um anel de
 * alcance ao passar o mouse.
 */
export class Tower extends Phaser.GameObjects.Container {
  readonly def: TowerType;
  readonly radius: number;
  /** Contrato de ataque: quem decide dano, alcance, cadência e regra de alvo. */
  readonly behavior: AttackBehavior;

  private cooldown = 0;
  private readonly fireInterval: number;
  private readonly fire: FireFn;
  private readonly rangeRing: Phaser.GameObjects.Arc;
  private readonly visualRoot: Phaser.GameObjects.Container;
  private readonly spriteVisual?: Phaser.GameObjects.Image;
  private readonly attackAnimator?: TowerAttackAnimator;
  /** Efeito resolvido, aguardando a deixa da animação (`visualCuePolicy: 'onCue'`). */
  private pendingOutcome: AttackOutcome<Enemy> | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, type: TowerType, fire: FireFn) {
    super(scene, x, y);
    this.def = type;
    this.radius = type.radius;
    this.behavior = attackBehaviorOf(type);
    this.fire = fire;
    this.fireInterval = cooldownSeconds(this.behavior);

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
        getOrigin: () => ({ x: this.x, y: this.y }),
        onFireCue: this.handleFireCue,
        // Rede de segurança do FR-014: se a animação terminar sem dar a deixa
        // (frames quebrados, estágio sem cue), o efeito ainda é aplicado. Uma
        // animação defeituosa nunca desliga o dano da torre.
        onComplete: this.handleFireCue,
        onCancel: this.discardPendingOutcome,
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
  ): Phaser.GameObjects.Image {
    const image = scene.add.image(0, 0, spriteKey).setOrigin(0.5);
    const src = image.texture.getSourceImage();
    const aspect = src.height / src.width;
    image.setDisplaySize(displayWidth, displayWidth * aspect);
    return image;
  }

  /**
   * O comportamento decide o efeito; a animação, no máximo, o instante. Uma torre
   * sem sprite de ataque aplica exatamente o mesmo dano, no tempo de fallback.
   */
  update(deltaSec: number, enemies: Enemy[]): void {
    if (this.cooldown > 0) this.cooldown -= deltaSec;

    if (this.attackAnimator?.isActive) {
      const target = this.attackAnimator.activeTarget;
      if (
        target &&
        !this.attackAnimator.hasEmittedFireCue &&
        !isTargetValid(this.behavior, this, target)
      ) {
        this.attackAnimator.cancel();
        this.pendingOutcome = null;
        return;
      }

      this.attackAnimator.update(deltaSec);
      return;
    }

    if (this.cooldown > 0) return;

    const outcome = resolveAttack(this.behavior, this, enemies);
    if (outcome.kind === 'none') return;

    // `onCue` só adia a aplicação quando existe animação para dar a deixa.
    const waitsForCue = appliesOnCue(this.behavior) && this.attackAnimator !== undefined;
    if (waitsForCue) {
      const target = this.primaryTarget(outcome);
      if (!target || !this.attackAnimator!.start(target)) return;
      this.pendingOutcome = outcome;
    } else {
      this.applyOutcome(outcome);
    }

    this.cooldown = this.fireInterval;
  }

  /** Aplica o efeito descrito pelo comportamento. */
  private applyOutcome(outcome: AttackOutcome<Enemy>): void {
    switch (outcome.kind) {
      case 'none':
        return;

      case 'projectile':
        this.fire(this.x, this.y, outcome.target, outcome.damage, outcome.speed);
        return;

      case 'direct':
      case 'area':
        for (const target of outcome.targets) {
          if (isTargetValid(this.behavior, this, target)) target.takeDamage(outcome.damage);
        }
        return;
    }
  }

  /** Alvo que a animação persegue (o epicentro, no caso de área). */
  private primaryTarget(outcome: AttackOutcome<Enemy>): Enemy | null {
    if (outcome.kind === 'projectile') return outcome.target;
    if (outcome.kind === 'direct' || outcome.kind === 'area') return outcome.targets[0] ?? null;
    return null;
  }

  /**
   * A animação chegou ao frame do golpe: aplica o efeito já resolvido. Os alvos
   * são revalidados dentro de `applyOutcome` — quem morreu ou vazou durante a
   * corrida não leva dano.
   */
  private handleFireCue = (): void => {
    const outcome = this.pendingOutcome;
    this.pendingOutcome = null;
    if (!outcome) return;
    this.applyOutcome(outcome);
  };

  /** O alvo saiu do alcance/morreu durante a animação: o ataque não acontece. */
  private discardPendingOutcome = (): void => {
    this.pendingOutcome = null;
  };

  /** Anel de alcance também usado como feedback (ex.: destaque). */
  showRange(visible: boolean): void {
    this.rangeRing.setVisible(visible);
    this.rangeRing.setStrokeStyle(1.5, COLORS.rangeValid, 0.6);
  }

  destroy(fromScene?: boolean): void {
    this.attackAnimator?.shutdown();
    super.destroy(fromScene);
  }
}
