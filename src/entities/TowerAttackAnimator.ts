import Phaser from 'phaser';
import type {
  AttackAnimationDefinition,
  AttackAnimationStageName,
  AttackAnimationStage,
  AttackTarget,
  SpriteFrameRef,
} from '../data/towers';
import type { Origin } from '../systems/combat';
import type { EngagementState } from '../systems/engagement';
import { animationFrameIndexAt } from '../systems/animationFrames';

const ORIENTATION_DEADZONE_PX = 2;

export interface TowerAttackAnimatorOptions {
  scene: Phaser.Scene;
  definition: AttackAnimationDefinition;
  visualRoot: Phaser.GameObjects.Container;
  spriteVisual?: Phaser.GameObjects.Image;
  spriteDisplayWidth: number;
  idleSpriteKey?: string;
  idleFrame?: SpriteFrameRef;
}

export class TowerAttackAnimator {
  private readonly scene: Phaser.Scene;
  private readonly definition: AttackAnimationDefinition;
  private readonly visualRoot: Phaser.GameObjects.Container;
  private readonly spriteVisual?: Phaser.GameObjects.Image;
  private readonly spriteDisplayWidth: number;
  private readonly idleSpriteKey?: string;
  private readonly idleFrame?: SpriteFrameRef;
  private readonly loggedMissingFrames = new Set<string>();
  private readonly loggedMissingStages = new Set<string>();

  private stageName: AttackAnimationStageName | null = null;
  private frameIndex = -1;
  private currentFrames: SpriteFrameRef[] = [];
  private facingX: 1 | -1 = 1;

  constructor(options: TowerAttackAnimatorOptions) {
    this.scene = options.scene;
    this.definition = options.definition;
    this.visualRoot = options.visualRoot;
    this.spriteVisual = options.spriteVisual;
    this.spriteDisplayWidth = options.spriteDisplayWidth;
    this.idleSpriteKey = options.idleSpriteKey;
    this.idleFrame = options.idleFrame;
    this.resetVisual();
  }

  render<T extends AttackTarget>(state: EngagementState<T>, base: Origin): void {
    this.visualRoot.setPosition(state.x - base.x, state.y - base.y);

    const stageName = this.stageForPhase(state);
    if (!stageName) {
      this.resetVisual();
      return;
    }

    const stage = this.resolveStage(stageName);
    if (!stage) {
      this.resetVisual();
      return;
    }

    if (this.stageName !== stageName) {
      this.stageName = stageName;
      this.frameIndex = -1;
      this.currentFrames = this.resolveFrames(stage);
    }

    this.applyOrientation(state, base);
    this.displayFrame(this.frameIndexFor(stage, state.phaseElapsedSec));
  }

  private stageForPhase<T extends AttackTarget>(
    state: EngagementState<T>,
  ): AttackAnimationStageName {
    switch (state.phase.kind) {
      case 'lying_idle':
        return 'lying_idle';
      case 'standing_up':
        return 'standing_up';
      case 'chasing':
        return 'chasing';
      case 'biting':
        return 'biting';
      case 'returning':
        return 'returning';
      case 'lying_down':
        return 'lying_down';
    }
  }

  private resolveStage(name: AttackAnimationStageName): AttackAnimationStage | null {
    return this.definition.stages.find((stage) => stage.name === name) ?? null;
  }

  private resolveFrames(stage: AttackAnimationStage): SpriteFrameRef[] {
    const frames: SpriteFrameRef[] = [];

    for (const frame of stage.frames) {
      if (this.scene.textures.exists(frame.textureKey)) {
        frames.push(frame);
        continue;
      }

      const logKey = this.frameLogKey(stage.name, frame);
      if (!this.loggedMissingFrames.has(logKey)) {
        this.loggedMissingFrames.add(logKey);
        console.error(
          `[TowerAttackAnimator] Animation "${this.definition.id}" stage "${stage.name}" missing texture "${this.frameLabel(frame)}".`,
        );
      }
    }

    if (frames.length > 0) return frames;

    const fallbackFrame = this.resolveFallbackFrame();
    if (fallbackFrame) {
      const stageKey = `${this.definition.id}:${stage.name}:fallback`;
      if (!this.loggedMissingStages.has(stageKey)) {
        this.loggedMissingStages.add(stageKey);
        console.error(
          `[TowerAttackAnimator] Animation "${this.definition.id}" stage "${stage.name}" has no valid frames; using fallback texture "${this.frameLabel(fallbackFrame)}".`,
        );
      }
      return [fallbackFrame];
    }

    const stageKey = `${this.definition.id}:${stage.name}:placeholder`;
    if (!this.loggedMissingStages.has(stageKey)) {
      this.loggedMissingStages.add(stageKey);
      console.error(
        `[TowerAttackAnimator] Animation "${this.definition.id}" stage "${stage.name}" has no valid frames and no fallback texture; keeping placeholder visual.`,
      );
    }
    return [];
  }

  private resolveFallbackFrame(): SpriteFrameRef | null {
    if (this.idleFrame && this.scene.textures.exists(this.idleFrame.textureKey)) {
      return this.idleFrame;
    }

    if (
      this.definition.fallbackSpriteKey &&
      this.scene.textures.exists(this.definition.fallbackSpriteKey)
    ) {
      return { textureKey: this.definition.fallbackSpriteKey, label: 'fallback' };
    }

    if (this.idleSpriteKey && this.scene.textures.exists(this.idleSpriteKey)) {
      return { textureKey: this.idleSpriteKey, label: 'idle fallback' };
    }

    for (const stage of this.definition.stages) {
      for (const frame of stage.frames) {
        if (this.scene.textures.exists(frame.textureKey)) return frame;
      }
    }

    return null;
  }

  private frameIndexFor(stage: AttackAnimationStage, phaseElapsedSec: number): number {
    return animationFrameIndexAt(
      stage.kind,
      this.currentFrames.length,
      stage.frameDurationMs,
      phaseElapsedSec,
    );
  }

  private displayFrame(index: number): void {
    if (index === this.frameIndex) return;
    this.frameIndex = index;

    const frame = this.currentFrames[index];
    if (!frame || !this.spriteVisual) return;
    this.spriteVisual.setTexture(frame.textureKey, frame.frame);
    this.applySpriteDisplaySize();
  }

  private applySpriteDisplaySize(): void {
    if (!this.spriteVisual) return;
    const aspect = this.spriteVisual.frame.realHeight / this.spriteVisual.frame.realWidth;
    this.spriteVisual.setDisplaySize(this.spriteDisplayWidth, this.spriteDisplayWidth * aspect);
  }

  private applyOrientation<T extends AttackTarget>(state: EngagementState<T>, base: Origin): void {
    const point = this.orientationPoint(state, base);
    if (!point) {
      this.visualRoot.setScale(this.facingX, 1);
      return;
    }
    const dx = point.x - state.x;
    if (Math.abs(dx) > ORIENTATION_DEADZONE_PX) this.facingX = dx >= 0 ? 1 : -1;
    this.visualRoot.setScale(this.facingX, 1);
  }

  private orientationPoint<T extends AttackTarget>(
    state: EngagementState<T>,
    base: Origin,
  ): Origin | null {
    switch (state.phase.kind) {
      case 'standing_up':
      case 'chasing':
      case 'biting':
        return state.phase.target;
      case 'returning':
        return base;
      case 'lying_down':
      case 'lying_idle':
        return null;
    }
  }

  private resetVisual(): void {
    this.stageName = null;
    this.frameIndex = -1;
    this.currentFrames = [];
    this.facingX = 1;
    this.visualRoot.setPosition(0, 0);
    this.visualRoot.setScale(1, 1);
    const idleFrame = this.resolveIdleFrame();
    if (this.spriteVisual && idleFrame) {
      this.spriteVisual.setTexture(idleFrame.textureKey, idleFrame.frame);
      this.applySpriteDisplaySize();
    }
  }

  private resolveIdleFrame(): SpriteFrameRef | null {
    if (this.idleFrame && this.scene.textures.exists(this.idleFrame.textureKey)) {
      return this.idleFrame;
    }
    if (this.idleSpriteKey && this.scene.textures.exists(this.idleSpriteKey)) {
      return { textureKey: this.idleSpriteKey, label: 'idle fallback' };
    }
    return null;
  }

  private frameLogKey(stageName: string, frame: SpriteFrameRef): string {
    return `${this.definition.id}:${stageName}:${this.frameLabel(frame)}`;
  }

  private frameLabel(frame: SpriteFrameRef): string {
    return frame.frame === undefined ? frame.textureKey : `${frame.textureKey}:${frame.frame}`;
  }
}
