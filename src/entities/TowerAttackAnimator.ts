import Phaser from 'phaser';
import type {
  AttackAnimationDefinition,
  AttackAnimationStage,
  AttackTarget,
  SpriteFrameRef,
} from '../data/towers';
import type { Origin } from '../systems/combat';
import type { EngagementState } from '../systems/engagement';

type StageName = 'prepare' | 'run' | 'attack';

export interface TowerAttackAnimatorOptions {
  scene: Phaser.Scene;
  definition: AttackAnimationDefinition;
  visualRoot: Phaser.GameObjects.Container;
  spriteVisual?: Phaser.GameObjects.Image;
  spriteDisplayWidth: number;
  idleSpriteKey?: string;
}

export class TowerAttackAnimator {
  private readonly scene: Phaser.Scene;
  private readonly definition: AttackAnimationDefinition;
  private readonly visualRoot: Phaser.GameObjects.Container;
  private readonly spriteVisual?: Phaser.GameObjects.Image;
  private readonly spriteDisplayWidth: number;
  private readonly idleSpriteKey?: string;
  private readonly loggedMissingFrames = new Set<string>();
  private readonly loggedMissingStages = new Set<string>();

  private stageName: StageName | null = null;
  private frameIndex = -1;
  private currentFrames: SpriteFrameRef[] = [];

  constructor(options: TowerAttackAnimatorOptions) {
    this.scene = options.scene;
    this.definition = options.definition;
    this.visualRoot = options.visualRoot;
    this.spriteVisual = options.spriteVisual;
    this.spriteDisplayWidth = options.spriteDisplayWidth;
    this.idleSpriteKey = options.idleSpriteKey;
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

  private stageForPhase<T extends AttackTarget>(state: EngagementState<T>): StageName | null {
    switch (state.phase.kind) {
      case 'idle':
        return null;
      case 'preparing':
        return 'prepare';
      case 'pursuing':
      case 'returning':
        return 'run';
      case 'striking':
        return 'attack';
    }
  }

  private resolveStage(name: StageName): AttackAnimationStage | null {
    return this.definition.stages.find((stage) => stage.name === name) ?? null;
  }

  private resolveFrames(stage: AttackAnimationStage): SpriteFrameRef[] {
    const frames: SpriteFrameRef[] = [];

    for (const frame of stage.frames) {
      if (this.scene.textures.exists(frame.textureKey)) {
        frames.push(frame);
        continue;
      }

      const logKey = `${this.definition.id}:${stage.name}:${frame.textureKey}`;
      if (!this.loggedMissingFrames.has(logKey)) {
        this.loggedMissingFrames.add(logKey);
        console.error(
          `[TowerAttackAnimator] Animation "${this.definition.id}" stage "${stage.name}" missing texture "${frame.textureKey}".`,
        );
      }
    }

    if (frames.length > 0) return frames;

    const fallbackKey = this.resolveFallbackTextureKey();
    if (fallbackKey) {
      const stageKey = `${this.definition.id}:${stage.name}:fallback`;
      if (!this.loggedMissingStages.has(stageKey)) {
        this.loggedMissingStages.add(stageKey);
        console.error(
          `[TowerAttackAnimator] Animation "${this.definition.id}" stage "${stage.name}" has no valid frames; using fallback texture "${fallbackKey}".`,
        );
      }
      return [{ textureKey: fallbackKey, label: 'fallback' }];
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

  private resolveFallbackTextureKey(): string | null {
    if (
      this.definition.fallbackSpriteKey &&
      this.scene.textures.exists(this.definition.fallbackSpriteKey)
    ) {
      return this.definition.fallbackSpriteKey;
    }

    if (this.idleSpriteKey && this.scene.textures.exists(this.idleSpriteKey)) {
      return this.idleSpriteKey;
    }

    for (const stage of this.definition.stages) {
      for (const frame of stage.frames) {
        if (this.scene.textures.exists(frame.textureKey)) return frame.textureKey;
      }
    }

    return null;
  }

  private frameIndexFor(stage: AttackAnimationStage, phaseElapsedSec: number): number {
    const frameCount = Math.max(1, this.currentFrames.length);
    const frameDurationMs = Math.max(1, stage.frameDurationMs);
    const rawIndex = Math.floor((phaseElapsedSec * 1000) / frameDurationMs);

    if (stage.kind === 'loopUntilArrival') return rawIndex % frameCount;
    return Math.min(rawIndex, frameCount - 1);
  }

  private displayFrame(index: number): void {
    if (index === this.frameIndex) return;
    this.frameIndex = index;

    const frame = this.currentFrames[index];
    if (!frame || !this.spriteVisual) return;
    this.spriteVisual.setTexture(frame.textureKey);
    this.applySpriteDisplaySize();
  }

  private applySpriteDisplaySize(): void {
    if (!this.spriteVisual) return;
    const src = this.spriteVisual.texture.getSourceImage();
    const aspect = src.height / src.width;
    this.spriteVisual.setDisplaySize(this.spriteDisplayWidth, this.spriteDisplayWidth * aspect);
  }

  private applyOrientation<T extends AttackTarget>(state: EngagementState<T>, base: Origin): void {
    const point = this.orientationPoint(state, base);
    const direction = point.x >= state.x ? 1 : -1;
    this.visualRoot.setScale(direction, 1);
  }

  private orientationPoint<T extends AttackTarget>(
    state: EngagementState<T>,
    base: Origin,
  ): Origin {
    switch (state.phase.kind) {
      case 'preparing':
      case 'pursuing':
      case 'striking':
        return state.phase.target;
      case 'returning':
      case 'idle':
        return base;
    }
  }

  private resetVisual(): void {
    this.stageName = null;
    this.frameIndex = -1;
    this.currentFrames = [];
    this.visualRoot.setPosition(0, 0);
    this.visualRoot.setScale(1, 1);
    if (this.spriteVisual && this.idleSpriteKey && this.scene.textures.exists(this.idleSpriteKey)) {
      this.spriteVisual.setTexture(this.idleSpriteKey);
      this.applySpriteDisplaySize();
    }
  }
}
