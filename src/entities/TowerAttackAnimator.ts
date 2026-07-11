import Phaser from 'phaser';
import type {
  AttackAnimationDefinition,
  AttackAnimationStage,
  SpriteFrameRef,
} from '../data/towers';
import type { Enemy } from './Enemy';

type VisualState = 'idle' | 'preparing' | 'running' | 'attacking' | 'cancelled';

export interface TowerAttackAnimatorOptions {
  scene: Phaser.Scene;
  definition: AttackAnimationDefinition;
  visualRoot: Phaser.GameObjects.Container;
  spriteVisual?: Phaser.GameObjects.Image;
  spriteDisplayWidth: number;
  idleSpriteKey?: string;
  getOrigin: () => { x: number; y: number };
  onFireCue: (target: Enemy) => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

export interface VisualAttackTarget {
  enemy: Enemy;
  initialX: number;
  initialY: number;
  lastKnownX: number;
  lastKnownY: number;
}

export class TowerAttackAnimator {
  private readonly scene: Phaser.Scene;
  private readonly definition: AttackAnimationDefinition;
  private readonly visualRoot: Phaser.GameObjects.Container;
  private readonly spriteVisual?: Phaser.GameObjects.Image;
  private readonly spriteDisplayWidth: number;
  private readonly idleSpriteKey?: string;
  private readonly getOrigin: () => { x: number; y: number };
  private readonly onFireCue: (target: Enemy) => void;
  private readonly onComplete?: () => void;
  private readonly onCancel?: () => void;
  private readonly loggedMissingFrames = new Set<string>();
  private readonly loggedMissingStages = new Set<string>();

  private visualState: VisualState = 'idle';
  private target: VisualAttackTarget | null = null;
  private stageIndex = 0;
  private frameIndex = 0;
  private frameTimerMs = 0;
  private stageElapsedMs = 0;
  private currentFrames: SpriteFrameRef[] = [];
  private fireCueEmitted = false;

  constructor(options: TowerAttackAnimatorOptions) {
    this.scene = options.scene;
    this.definition = options.definition;
    this.visualRoot = options.visualRoot;
    this.spriteVisual = options.spriteVisual;
    this.spriteDisplayWidth = options.spriteDisplayWidth;
    this.idleSpriteKey = options.idleSpriteKey;
    this.getOrigin = options.getOrigin;
    this.onFireCue = options.onFireCue;
    this.onComplete = options.onComplete;
    this.onCancel = options.onCancel;
    this.resetVisual();
  }

  get isActive(): boolean {
    return this.target !== null && this.visualState !== 'idle';
  }

  get hasEmittedFireCue(): boolean {
    return this.fireCueEmitted;
  }

  get activeTarget(): Enemy | null {
    return this.target?.enemy ?? null;
  }

  start(enemy: Enemy): boolean {
    if (this.isActive) return false;

    this.target = {
      enemy,
      initialX: enemy.x,
      initialY: enemy.y,
      lastKnownX: enemy.x,
      lastKnownY: enemy.y,
    };
    this.stageIndex = 0;
    this.frameIndex = 0;
    this.frameTimerMs = 0;
    this.stageElapsedMs = 0;
    this.fireCueEmitted = false;
    this.visualRoot.setPosition(0, 0);
    this.enterStage(0);
    return true;
  }

  update(deltaSec: number): void {
    if (!this.isActive) return;

    const stage = this.currentStage();
    if (!stage) {
      this.complete();
      return;
    }

    this.refreshTargetSnapshot();
    this.applyOrientation();

    const deltaMs = deltaSec * 1000;
    this.stageElapsedMs += deltaMs;
    this.advanceFrame(stage, deltaMs);

    if (!this.isActive) return;

    if (stage.kind === 'loopUntilArrival') {
      this.moveTowardTarget(deltaSec);
      if (this.hasArrived() && this.hasMetStageDuration(stage)) {
        this.enterStage(this.stageIndex + 1);
      }
      return;
    }

    if (this.hasMetStageDuration(stage)) {
      this.enterStage(this.stageIndex + 1);
    }
  }

  cancel(): void {
    if (!this.isActive) return;
    this.visualState = 'cancelled';
    this.reset();
    this.onCancel?.();
  }

  shutdown(): void {
    this.reset();
  }

  private currentStage(): AttackAnimationStage | null {
    return this.definition.stages[this.stageIndex] ?? null;
  }

  private enterStage(nextStageIndex: number): void {
    const stage = this.definition.stages[nextStageIndex];
    if (!stage) {
      this.complete();
      return;
    }

    this.stageIndex = nextStageIndex;
    this.frameIndex = 0;
    this.frameTimerMs = 0;
    this.stageElapsedMs = 0;
    this.currentFrames = this.resolveFrames(stage);
    this.visualState = this.stateForStage(stage);
    this.displayFrame(0);
    this.checkFireCue(stage);
  }

  private stateForStage(stage: AttackAnimationStage): VisualState {
    if (stage.name === 'prepare') return 'preparing';
    if (stage.name === 'run') return 'running';
    if (stage.name === 'attack') return 'attacking';
    return stage.kind === 'loopUntilArrival' ? 'running' : 'preparing';
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

  private advanceFrame(stage: AttackAnimationStage, deltaMs: number): void {
    const frameCount = Math.max(1, this.currentFrames.length);
    const frameDurationMs = Math.max(1, stage.frameDurationMs);
    this.frameTimerMs += deltaMs;

    while (this.frameTimerMs >= frameDurationMs) {
      this.frameTimerMs -= frameDurationMs;

      if (stage.kind === 'loopUntilArrival') {
        this.frameIndex = (this.frameIndex + 1) % frameCount;
      } else {
        this.frameIndex = Math.min(this.frameIndex + 1, frameCount - 1);
      }

      this.displayFrame(this.frameIndex);
      this.checkFireCue(stage);
      if (!this.isActive) return;
    }
  }

  private displayFrame(index: number): void {
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

  private checkFireCue(stage: AttackAnimationStage): void {
    if (this.fireCueEmitted || stage.fireCueFrameIndex === undefined || !this.target) {
      return;
    }

    const lastFrameIndex = Math.max(0, Math.max(stage.frames.length, this.currentFrames.length) - 1);
    const cueFrameIndex = Math.min(stage.fireCueFrameIndex, lastFrameIndex);
    if (this.frameIndex < cueFrameIndex) return;

    this.fireCueEmitted = true;
    this.onFireCue(this.target.enemy);
  }

  private hasMetStageDuration(stage: AttackAnimationStage): boolean {
    const frameCount = Math.max(1, this.currentFrames.length || stage.frames.length);
    const frameDuration = frameCount * Math.max(1, stage.frameDurationMs);
    const minDuration = stage.minDurationMs ?? 0;
    return this.stageElapsedMs >= Math.max(frameDuration, minDuration);
  }

  private refreshTargetSnapshot(): void {
    if (!this.target) return;
    if (this.target.enemy.status !== 'alive') return;
    this.target.lastKnownX = this.target.enemy.x;
    this.target.lastKnownY = this.target.enemy.y;
  }

  private applyOrientation(): void {
    if (!this.target) return;
    const origin = this.getOrigin();
    const targetX = this.target.lastKnownX;
    const direction = targetX >= origin.x ? 1 : -1;
    this.visualRoot.setScale(direction, 1);
  }

  private moveTowardTarget(deltaSec: number): void {
    if (!this.target) return;

    const origin = this.getOrigin();
    const targetLocalX = this.target.lastKnownX - origin.x;
    const targetLocalY = this.target.lastKnownY - origin.y;
    const dx = targetLocalX - this.visualRoot.x;
    const dy = targetLocalY - this.visualRoot.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= this.definition.arrivalDistancePx || dist === 0) return;

    const travel = Math.min(
      this.definition.visualSpeedPxPerSec * deltaSec,
      dist - this.definition.arrivalDistancePx,
    );
    this.visualRoot.setPosition(
      this.visualRoot.x + (dx / dist) * travel,
      this.visualRoot.y + (dy / dist) * travel,
    );
  }

  private hasArrived(): boolean {
    if (!this.target) return true;
    const origin = this.getOrigin();
    const targetLocalX = this.target.lastKnownX - origin.x;
    const targetLocalY = this.target.lastKnownY - origin.y;
    const dx = targetLocalX - this.visualRoot.x;
    const dy = targetLocalY - this.visualRoot.y;
    return Math.hypot(dx, dy) <= this.definition.arrivalDistancePx;
  }

  private complete(): void {
    this.reset();
    this.onComplete?.();
  }

  private reset(): void {
    this.target = null;
    this.stageIndex = 0;
    this.frameIndex = 0;
    this.frameTimerMs = 0;
    this.stageElapsedMs = 0;
    this.currentFrames = [];
    this.fireCueEmitted = false;
    this.visualState = 'idle';
    this.resetVisual();
  }

  private resetVisual(): void {
    this.visualRoot.setPosition(0, 0);
    this.visualRoot.setScale(1, 1);
    if (this.spriteVisual && this.idleSpriteKey && this.scene.textures.exists(this.idleSpriteKey)) {
      this.spriteVisual.setTexture(this.idleSpriteKey);
      this.applySpriteDisplaySize();
    }
  }
}
