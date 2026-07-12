import type { AttackBehavior, AttackTarget } from '../data/towers';
import {
  acquireTarget,
  cooldownSeconds,
  isTargetValid,
  type Origin,
} from './combat';

export interface EngagementTimings {
  prepareSec: number;
  strikeSec: number;
  cueAtSec: number;
  pursuitSpeedPxPerSec: number;
  arrivalDistancePx: number;
}

export interface EngagementConfig {
  behavior: AttackBehavior;
  timings: EngagementTimings;
  base: Origin;
}

export type EngagementPhase<T> =
  | { kind: 'idle' }
  | { kind: 'preparing'; target: T }
  | { kind: 'pursuing'; target: T }
  | { kind: 'striking'; target: T }
  | { kind: 'returning' };

export interface EngagementState<T> {
  phase: EngagementPhase<T>;
  x: number;
  y: number;
  phaseElapsedSec: number;
  cooldownSec: number;
  strikeEmitted: boolean;
}

export type EngagementCommand<T> = { kind: 'strike'; target: T; damage: number };

export const EMPTY: readonly never[] = [];

const EPSILON = 0.000001;
const MAX_TRANSITIONS_PER_STEP = 32;

export function createEngagementState<T extends AttackTarget>(
  base: Origin,
): EngagementState<T> {
  return {
    phase: { kind: 'idle' },
    x: base.x,
    y: base.y,
    phaseElapsedSec: 0,
    cooldownSec: 0,
    strikeEmitted: false,
  };
}

export function stepEngagement<T extends AttackTarget>(
  config: EngagementConfig,
  state: EngagementState<T>,
  candidates: readonly T[],
  deltaSec: number,
): readonly EngagementCommand<T>[] {
  let remainingSec = normalizeDelta(deltaSec);
  let commands: EngagementCommand<T>[] | null = null;
  let transitions = 0;

  clampToLeash(config, state);

  while (transitions < MAX_TRANSITIONS_PER_STEP) {
    transitions++;

    switch (state.phase.kind) {
      case 'idle': {
        setPosition(state, config.base);
        if (config.behavior.engagement === 'stationary') setPosition(state, config.base);

        const target = acquireTarget(config.behavior, config.base, candidates);
        if (target && state.cooldownSec <= EPSILON) {
          enterPhase(state, { kind: 'preparing', target });
          continue;
        }

        advanceClock(state, remainingSec);
        remainingSec = 0;
        break;
      }

      case 'preparing': {
        const target = validCurrentOrReplacement(config, state.phase.target, candidates);
        if (!target) {
          enterPhase(state, { kind: 'idle' });
          continue;
        }
        if (target !== state.phase.target) enterPhase(state, { kind: 'preparing', target });

        if (config.behavior.engagement === 'stationary') setPosition(state, config.base);

        const prepareSec = Math.max(0, config.timings.prepareSec);
        const untilPrepared = prepareSec - state.phaseElapsedSec;
        if (untilPrepared <= EPSILON) {
          if (config.behavior.engagement === 'stationary') {
            enterStriking(config, state, target);
          } else {
            enterPhase(state, { kind: 'pursuing', target });
          }
          continue;
        }

        const stepSec = Math.min(remainingSec, untilPrepared);
        advanceClock(state, stepSec);
        remainingSec -= stepSec;
        if (remainingSec > EPSILON) continue;
        break;
      }

      case 'pursuing': {
        if (config.behavior.engagement === 'stationary') {
          enterPhase(state, { kind: 'idle' });
          continue;
        }

        const target = validCurrentOrReplacement(config, state.phase.target, candidates);
        if (!target) {
          enterPhase(state, { kind: 'returning' });
          continue;
        }
        if (target !== state.phase.target) enterPhase(state, { kind: 'pursuing', target });

        if (hasArrived(config, state, target) && state.cooldownSec <= EPSILON) {
          enterStriking(config, state, target);
          continue;
        }

        const eventSec = Math.max(
          secondsUntilArrival(config, state, target),
          Math.max(0, state.cooldownSec),
        );
        const stepSec = Math.min(remainingSec, eventSec);
        moveToward(state, target, config.timings.pursuitSpeedPxPerSec, stepSec);
        clampToLeash(config, state);
        advanceClock(state, stepSec);
        remainingSec -= stepSec;

        if (remainingSec > EPSILON || eventSec <= EPSILON) continue;
        break;
      }

      case 'striking': {
        const targetIsValid = isCurrentTargetValid(config, state.phase.target, candidates);
        if (!state.strikeEmitted && !targetIsValid) {
          transitionAfterStrike(config, state, candidates);
          continue;
        }

        const cueAtSec = clamp(
          config.timings.cueAtSec,
          0,
          Math.max(0, config.timings.strikeSec),
        );
        if (!state.strikeEmitted && state.phaseElapsedSec >= cueAtSec - EPSILON) {
          state.strikeEmitted = true;
          commands ??= [];
          commands.push({
            kind: 'strike',
            target: state.phase.target,
            damage: config.behavior.damage,
          });
          remainingSec = 0;
          break;
        }

        const strikeSec = Math.max(0, config.timings.strikeSec);
        if (state.phaseElapsedSec >= strikeSec - EPSILON) {
          transitionAfterStrike(config, state, candidates);
          continue;
        }

        const nextEventSec = state.strikeEmitted
          ? strikeSec - state.phaseElapsedSec
          : Math.min(cueAtSec, strikeSec) - state.phaseElapsedSec;
        const stepSec = Math.min(remainingSec, Math.max(0, nextEventSec));
        advanceClock(state, stepSec);
        remainingSec -= stepSec;
        if (remainingSec > EPSILON || stepSec <= EPSILON) continue;
        break;
      }

      case 'returning': {
        if (config.behavior.engagement === 'stationary') {
          enterPhase(state, { kind: 'idle' });
          continue;
        }

        const target = acquireTarget(config.behavior, config.base, candidates);
        if (target) {
          enterPhase(state, { kind: 'pursuing', target });
          continue;
        }

        if (distance(state, config.base) <= EPSILON) {
          setPosition(state, config.base);
          enterPhase(state, { kind: 'idle' });
          continue;
        }

        const stepSec = Math.min(
          remainingSec,
          distance(state, config.base) / Math.max(EPSILON, config.timings.pursuitSpeedPxPerSec),
        );
        moveToward(state, config.base, config.timings.pursuitSpeedPxPerSec, stepSec);
        clampToLeash(config, state);
        advanceClock(state, stepSec);
        remainingSec -= stepSec;

        if (distance(state, config.base) <= EPSILON) {
          setPosition(state, config.base);
          enterPhase(state, { kind: 'idle' });
          continue;
        }

        if (remainingSec > EPSILON || stepSec <= EPSILON) continue;
        break;
      }
    }

    break;
  }

  if (config.behavior.engagement === 'stationary') setPosition(state, config.base);
  clampToLeash(config, state);

  return commands ?? EMPTY;
}

function normalizeDelta(deltaSec: number): number {
  return Number.isFinite(deltaSec) ? Math.max(0, deltaSec) : 0;
}

function enterPhase<T>(state: EngagementState<T>, phase: EngagementPhase<T>): void {
  state.phase = phase;
  state.phaseElapsedSec = 0;
  state.strikeEmitted = false;
}

function enterStriking<T extends AttackTarget>(
  config: EngagementConfig,
  state: EngagementState<T>,
  target: T,
): void {
  enterPhase(state, { kind: 'striking', target });
  state.cooldownSec = cooldownSeconds(config.behavior);
}

function transitionAfterStrike<T extends AttackTarget>(
  config: EngagementConfig,
  state: EngagementState<T>,
  candidates: readonly T[],
): void {
  if (config.behavior.engagement === 'stationary') {
    enterPhase(state, { kind: 'idle' });
    return;
  }

  const target = acquireTarget(config.behavior, config.base, candidates);
  enterPhase(state, target ? { kind: 'pursuing', target } : { kind: 'returning' });
}

function advanceClock<T>(state: EngagementState<T>, deltaSec: number): void {
  if (deltaSec <= 0) return;
  state.phaseElapsedSec += deltaSec;
  state.cooldownSec = Math.max(0, state.cooldownSec - deltaSec);
}

function isCurrentTargetValid<T extends AttackTarget>(
  config: EngagementConfig,
  target: T,
  candidates: readonly T[],
): boolean {
  return candidates.includes(target) && isTargetValid(config.behavior, config.base, target);
}

function validCurrentOrReplacement<T extends AttackTarget>(
  config: EngagementConfig,
  target: T,
  candidates: readonly T[],
): T | null {
  if (isCurrentTargetValid(config, target, candidates)) return target;
  return acquireTarget(config.behavior, config.base, candidates);
}

function secondsUntilArrival<T extends AttackTarget>(
  config: EngagementConfig,
  state: EngagementState<T>,
  target: T,
): number {
  const remaining = distance(state, target) - Math.max(0, config.timings.arrivalDistancePx);
  if (remaining <= 0) return 0;
  return remaining / Math.max(EPSILON, config.timings.pursuitSpeedPxPerSec);
}

function hasArrived<T extends AttackTarget>(
  config: EngagementConfig,
  state: EngagementState<T>,
  target: T,
): boolean {
  return distance(state, target) <= Math.max(0, config.timings.arrivalDistancePx) + EPSILON;
}

function moveToward(
  state: { x: number; y: number },
  target: Origin,
  speedPxPerSec: number,
  deltaSec: number,
): void {
  if (deltaSec <= 0) return;
  const dx = target.x - state.x;
  const dy = target.y - state.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= EPSILON) return;

  const travel = Math.min(dist, Math.max(0, speedPxPerSec) * deltaSec);
  state.x += (dx / dist) * travel;
  state.y += (dy / dist) * travel;
}

function clampToLeash<T extends AttackTarget>(
  config: EngagementConfig,
  state: EngagementState<T>,
): void {
  const dx = state.x - config.base.x;
  const dy = state.y - config.base.y;
  const dist = Math.hypot(dx, dy);
  const range = Math.max(0, config.behavior.range);
  if (dist <= range || dist <= EPSILON) return;
  state.x = config.base.x + (dx / dist) * range;
  state.y = config.base.y + (dy / dist) * range;
}

function setPosition(state: { x: number; y: number }, point: Origin): void {
  state.x = point.x;
  state.y = point.y;
}

function distance(a: Origin, b: Origin): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
