import { animationFrameIndexAt } from './animationFrames';

export type VisualAnimationPlayback = 'once' | 'loop';

export interface VisualAnimationClip {
  readonly id: string;
  readonly kind: VisualAnimationPlayback;
  readonly frameCount: number;
  readonly frameDurationMs: number;
  readonly cueFrameIndex?: number;
  readonly cueName?: string;
  readonly minDurationMs?: number;
  readonly fallbackAnimationId?: string;
}

export interface VisualStateMachineConfig<StateName extends string = string> {
  readonly stateToAnimation: Readonly<Partial<Record<StateName, string>>>;
  readonly animations: readonly VisualAnimationClip[];
  readonly fallbackAnimationId?: string;
}

export interface VisualCueEvent {
  readonly name: string;
  readonly animationId: string;
  readonly frameIndex: number;
  readonly cycle: number;
}

export interface VisualStateMachineState {
  activeState: string | null;
  activeAnimationId: string | null;
  lastElapsedMs: number;
  emittedCueKeys: Set<string>;
}

export interface VisualStateMachineUpdate {
  readonly animationId: string | null;
  readonly frameIndex: number;
  readonly changed: boolean;
  readonly cues: readonly VisualCueEvent[];
}

export function createVisualStateMachine(): VisualStateMachineState {
  return {
    activeState: null,
    activeAnimationId: null,
    lastElapsedMs: 0,
    emittedCueKeys: new Set<string>(),
  };
}

export function updateVisualStateMachine<StateName extends string>(
  config: VisualStateMachineConfig<StateName>,
  state: VisualStateMachineState,
  stateName: StateName,
  elapsedMs: number,
): VisualStateMachineUpdate {
  const resolved = resolveClip(config, stateName);
  const normalizedElapsedMs = normalizeElapsed(elapsedMs);
  const changed =
    state.activeState !== stateName ||
    state.activeAnimationId !== resolved?.id ||
    normalizedElapsedMs < state.lastElapsedMs;

  if (changed) {
    state.activeState = stateName;
    state.activeAnimationId = resolved?.id ?? null;
    state.emittedCueKeys.clear();
  }
  state.lastElapsedMs = normalizedElapsedMs;

  if (!resolved) {
    return { animationId: null, frameIndex: -1, changed, cues: [] };
  }

  const frameIndex = animationFrameIndexAt(
    resolved.kind,
    resolved.frameCount,
    resolved.frameDurationMs,
    normalizedElapsedMs / 1000,
  );
  const cues = cueEventsFor(resolved, normalizedElapsedMs, state.emittedCueKeys);

  return {
    animationId: resolved.id,
    frameIndex,
    changed,
    cues,
  };
}

export function visualAnimationDurationMs(clip: VisualAnimationClip): number {
  const frameCount = Math.max(1, clip.frameCount);
  const frameDurationMs = Math.max(1, clip.frameDurationMs);
  return Math.max(frameCount * frameDurationMs, clip.minDurationMs ?? 0);
}

function resolveClip<StateName extends string>(
  config: VisualStateMachineConfig<StateName>,
  stateName: StateName,
): VisualAnimationClip | null {
  const byId = new Map(config.animations.map((clip) => [clip.id, clip]));
  const animationId = config.stateToAnimation[stateName] ?? config.fallbackAnimationId;
  const clip = animationId ? byId.get(animationId) : undefined;
  if (clip) return clip;
  return config.fallbackAnimationId ? byId.get(config.fallbackAnimationId) ?? null : null;
}

function cueEventsFor(
  clip: VisualAnimationClip,
  elapsedMs: number,
  emittedCueKeys: Set<string>,
): VisualCueEvent[] {
  if (clip.cueFrameIndex === undefined) return [];

  const frameCount = Math.max(1, clip.frameCount);
  const frameDurationMs = Math.max(1, clip.frameDurationMs);
  const cueFrameIndex = Math.min(frameCount - 1, Math.max(0, clip.cueFrameIndex));
  const cycleDurationMs = frameCount * frameDurationMs;
  const cycle =
    clip.kind === 'loop' ? Math.floor(elapsedMs / Math.max(1, cycleDurationMs)) : 0;
  const cycleElapsedMs =
    clip.kind === 'loop' ? elapsedMs - cycle * cycleDurationMs : elapsedMs;
  const cueReached = cycleElapsedMs >= cueFrameIndex * frameDurationMs;

  if (!cueReached) return [];

  const cueName = clip.cueName ?? 'cue';
  const key = `${clip.id}:${cycle}:${cueName}`;
  if (emittedCueKeys.has(key)) return [];

  emittedCueKeys.add(key);
  return [{ name: cueName, animationId: clip.id, frameIndex: cueFrameIndex, cycle }];
}

function normalizeElapsed(elapsedMs: number): number {
  return Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
}
