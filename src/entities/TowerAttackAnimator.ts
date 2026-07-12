import Phaser from 'phaser';
import type {
  AttackAnimationDefinition,
  AttackAnimationStage,
  AttackTarget,
  SpriteFrameRef,
} from '../data/towers';
import type { Origin } from '../systems/combat';
import type { EngagementState } from '../systems/engagement';
import {
  createVisualStateMachine,
  updateVisualStateMachine,
  type VisualCueEvent,
  type VisualStateMachineConfig,
  type VisualStateMachineState,
} from '../systems/visualStateMachine';

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
  private readonly machine: VisualStateMachineState;
  private readonly machineConfig: VisualStateMachineConfig;
  private readonly loggedMissingFrames = new Set<string>();
  private readonly loggedMissingStages = new Set<string>();

  private animationId: string | null = null;
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
    this.machine = createVisualStateMachine();
    this.machineConfig = {
      stateToAnimation: this.definition.stateMap,
      fallbackAnimationId: this.definition.stateMap.idle,
      animations: this.definition.stages.map((stage) => ({
        id: stage.name,
        kind: stage.kind,
        frameCount: Math.max(1, stage.frames.length),
        frameDurationMs: stage.frameDurationMs,
        cueFrameIndex: stage.cueFrameIndex,
        cueName: stage.cueName,
        minDurationMs: stage.minDurationMs,
      })),
    };
    this.resetVisual();
  }

  render<T extends AttackTarget>(
    state: EngagementState<T>,
    base: Origin,
  ): readonly VisualCueEvent[] {
    this.visualRoot.setPosition(state.x - base.x, state.y - base.y);

    const update = updateVisualStateMachine(
      this.machineConfig,
      this.machine,
      state.phase.kind,
      state.phaseElapsedSec * 1000,
    );
    if (!update.animationId) {
      this.resetVisual();
      return update.cues;
    }

    const stage = this.resolveStage(update.animationId);
    if (!stage) {
      this.resetVisual();
      return update.cues;
    }

    if (this.animationId !== update.animationId) {
      this.animationId = update.animationId;
      this.frameIndex = -1;
      this.currentFrames = this.resolveFrames(stage);
    }

    this.applyOrientation(state, base);
    this.displayFrame(update.frameIndex);
    return update.cues;
  }

  private resolveStage(name: string): AttackAnimationStage | null {
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
      case 'windup':
      case 'moving':
      case 'attacking':
        return state.phase.target;
      case 'returning':
        return base;
      case 'recovering':
      case 'idle':
        return null;
    }
  }

  private resetVisual(): void {
    this.animationId = null;
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
