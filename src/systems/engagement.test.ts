import { describe, expect, it } from 'vitest';
import { ENGAGEMENT_FALLBACK } from '../core/constants';
import {
  TOWER_TYPES,
  attackBehaviorOf,
  engagementTimingsOf,
  type AttackBehavior,
  type EngagementProfile,
} from '../data/towers';
import {
  createEngagementState,
  stepEngagement,
  type EngagementCommand,
  type EngagementConfig,
  type EngagementState,
  type EngagementTimings,
} from './engagement';

interface TestTarget {
  id: string;
  x: number;
  y: number;
  alive: boolean;
  distanceTravelled: number;
}

const BASE = { x: 0, y: 0 };

function target(
  id: string,
  x: number,
  distanceTravelled: number,
  alive = true,
): TestTarget {
  return { id, x, y: 0, alive, distanceTravelled };
}

function behavior(profile: EngagementProfile, overrides: Partial<AttackBehavior> = {}): AttackBehavior {
  return {
    id: 'test-bite',
    kind: 'direct',
    targetRule: 'most-advanced-in-range',
    visualCuePolicy: 'onCue',
    engagement: profile,
    damage: 5,
    range: 200,
    cadence: 2,
    ...overrides,
  };
}

function config(profile: EngagementProfile, timings?: Partial<EngagementTimings>): EngagementConfig {
  return {
    behavior: behavior(profile),
    base: BASE,
    timings: {
      prepareSec: 0,
      strikeSec: 0.1,
      cueAtSec: 0,
      pursuitSpeedPxPerSec: 1000,
      arrivalDistancePx: 1,
      ...timings,
    },
  };
}

function runFor(
  cfg: EngagementConfig,
  state: EngagementState<TestTarget>,
  candidates: readonly TestTarget[],
  totalSec: number,
  onStrike?: (command: EngagementCommand<TestTarget>, timeSec: number) => void,
): void {
  const dt = 0.01;
  for (let t = 0; t < totalSec; t += dt) {
    const commands = stepEngagement(cfg, state, candidates, dt);
    for (const command of commands) onStrike?.(command, t);
  }
}

function expectAtBase(state: EngagementState<TestTarget>): void {
  expect(state.x).toBeCloseTo(BASE.x, 6);
  expect(state.y).toBeCloseTo(BASE.y, 6);
}

function distanceFromBase(state: EngagementState<TestTarget>): number {
  return Math.hypot(state.x - BASE.x, state.y - BASE.y);
}

describe('engagement structural invariants', () => {
  it('produces the same returning state for one delta or split deltas', () => {
    const cfg = config('pursuer');
    const one = createEngagementState<TestTarget>(BASE);
    const split = createEngagementState<TestTarget>(BASE);
    one.phase = { kind: 'returning' };
    split.phase = { kind: 'returning' };
    one.x = 150;
    split.x = 150;

    stepEngagement(cfg, one, [], 0.05);
    for (let i = 0; i < 5; i++) stepEngagement(cfg, split, [], 0.01);

    expect(one.phase.kind).toBe(split.phase.kind);
    expect(one.x).toBeCloseTo(split.x, 6);
    expect(one.y).toBeCloseTo(split.y, 6);
  });

  it('does not throw when the current target disappears from the candidate list', () => {
    const cfg = config('pursuer');
    const state = createEngagementState<TestTarget>(BASE);
    const first = target('first', 40, 100);

    stepEngagement(cfg, state, [first], 0.01);

    expect(() => stepEngagement(cfg, state, [], 0.05)).not.toThrow();
    expect(['idle', 'returning']).toContain(state.phase.kind);
  });
});

describe('pursuer engagement', () => {
  it('chains from the current position to the next most advanced target without returning', () => {
    const cfg = config('pursuer');
    const state = createEngagementState<TestTarget>(BASE);
    const first = target('first', 50, 100);
    const second = target('second', 80, 90);

    const commands = stepEngagement(cfg, state, [first, second], 0.1);

    expect(commands).toEqual([{ kind: 'strike', target: first, damage: cfg.behavior.damage }]);
    expect(state.phase.kind).toBe('striking');
    expect(distanceFromBase(state)).toBeGreaterThan(0);

    first.alive = false;
    stepEngagement(cfg, state, [first, second], 0.11);

    expect(state.phase.kind).toBe('pursuing');
    if (state.phase.kind !== 'pursuing') throw new Error('esperado pursuing');
    expect(state.phase.target).toBe(second);
    expect(distanceFromBase(state)).toBeGreaterThan(0);
  });

  it('reacquires when the target dies during pursuit and does not emit damage for it', () => {
    const cfg = config('pursuer', { pursuitSpeedPxPerSec: 100 });
    const state = createEngagementState<TestTarget>(BASE);
    const first = target('first', 100, 100);
    const second = target('second', 80, 90);

    stepEngagement(cfg, state, [first, second], 0.1);
    first.alive = false;
    const commands = stepEngagement(cfg, state, [first, second], 0.1);

    expect(commands).toEqual([]);
    expect(state.phase.kind).toBe('pursuing');
    if (state.phase.kind !== 'pursuing') throw new Error('esperado pursuing');
    expect(state.phase.target).toBe(second);
  });

  it('does not attack faster than cadence while movement can continue', () => {
    const cfg = config('pursuer');
    const state = createEngagementState<TestTarget>(BASE);
    const enemy = target('enemy', 50, 100);
    const strikeTimes: number[] = [];

    runFor(cfg, state, [enemy], 1.5, (_command, timeSec) => strikeTimes.push(timeSec));

    expect(strikeTimes.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < strikeTimes.length; i++) {
      expect(strikeTimes[i] - strikeTimes[i - 1]).toBeGreaterThanOrEqual(0.49);
    }
  });

  it('keeps the pursuer inside the leash when the target crosses the range edge', () => {
    const cfg = config('pursuer', { pursuitSpeedPxPerSec: 500 });
    const state = createEngagementState<TestTarget>(BASE);
    const enemy = target('enemy', 190, 100);

    stepEngagement(cfg, state, [enemy], 0.1);
    enemy.x = 250;

    for (let i = 0; i < 20; i++) {
      const commands = stepEngagement(cfg, state, [enemy], 0.05);
      expect(commands).toEqual([]);
      expect(distanceFromBase(state)).toBeLessThanOrEqual(cfg.behavior.range + 0.0001);
    }
  });
});

describe('returning engagement', () => {
  it('returns to base when no valid target remains after a bite', () => {
    const cfg = config('pursuer');
    const state = createEngagementState<TestTarget>(BASE);
    const enemy = target('enemy', 50, 100);

    const commands = stepEngagement(cfg, state, [enemy], 0.1);
    expect(commands).toHaveLength(1);
    enemy.alive = false;

    stepEngagement(cfg, state, [enemy], 0.11);
    expect(state.phase.kind).toBe('returning');

    stepEngagement(cfg, state, [enemy], 1);
    expect(state.phase.kind).toBe('idle');
    expectAtBase(state);
  });

  it('reengages from the current return position when a new target enters range', () => {
    const cfg = config('pursuer');
    const state = createEngagementState<TestTarget>(BASE);
    const enemy = target('enemy', 80, 100);
    state.phase = { kind: 'returning' };
    state.x = 100;

    stepEngagement(cfg, state, [enemy], 0);

    expect(state.phase.kind).toBe('pursuing');
    expect(state.x).toBeCloseTo(100, 6);
  });

  it('gets from the leash edge back to idle within two seconds', () => {
    const cfg = config('pursuer', { pursuitSpeedPxPerSec: 520 });
    const state = createEngagementState<TestTarget>(BASE);
    state.phase = { kind: 'returning' };
    state.x = cfg.behavior.range;

    stepEngagement(cfg, state, [], 2);

    expect(state.phase.kind).toBe('idle');
    expectAtBase(state);
  });
});

describe('stationary engagement', () => {
  it('attacks from base without ever entering pursuing or returning', () => {
    const cfg = config('stationary');
    const state = createEngagementState<TestTarget>(BASE);
    const enemy = target('enemy', 50, 100);
    const phases: string[] = [];
    const strikeTimes: number[] = [];

    runFor(cfg, state, [enemy], 1.5, (_command, timeSec) => strikeTimes.push(timeSec));
    phases.push(state.phase.kind);

    expectAtBase(state);
    expect(phases).not.toContain('pursuing');
    expect(phases).not.toContain('returning');
    expect(strikeTimes.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < strikeTimes.length; i++) {
      expect(strikeTimes[i] - strikeTimes[i - 1]).toBeGreaterThanOrEqual(0.49);
    }
  });

  it('reactivates pursuit by changing only the engagement profile in config', () => {
    const stationary = config('stationary');
    const pursuer = { ...stationary, behavior: behavior('pursuer') };
    const stationaryState = createEngagementState<TestTarget>(BASE);
    const pursuerState = createEngagementState<TestTarget>(BASE);
    const enemy = target('enemy', 80, 100);

    stepEngagement(stationary, stationaryState, [enemy], 0.1);
    stepEngagement(pursuer, pursuerState, [enemy], 0.1);

    expectAtBase(stationaryState);
    expect(distanceFromBase(pursuerState)).toBeGreaterThan(0);
  });
});

describe('fallback timings', () => {
  it('produce the same strike count as the derived Caramelo timings over the same window', () => {
    const tower = TOWER_TYPES['vira-lata-caramelo'];
    const derived = engagementTimingsOf(tower);
    const fallbackTower = { ...tower, attackAnimation: undefined };
    const fallback = engagementTimingsOf(fallbackTower);
    const baseBehavior: AttackBehavior = {
      ...attackBehaviorOf(tower),
      engagement: 'stationary',
    };

    const withDerived: EngagementConfig = {
      behavior: baseBehavior,
      base: BASE,
      timings: derived,
    };
    const withFallback: EngagementConfig = {
      behavior: baseBehavior,
      base: BASE,
      timings: fallback,
    };
    const targetA = target('a', 50, 100);
    const targetB = target('b', 50, 100);
    const stateA = createEngagementState<TestTarget>(BASE);
    const stateB = createEngagementState<TestTarget>(BASE);
    let derivedStrikes = 0;
    let fallbackStrikes = 0;

    runFor(withDerived, stateA, [targetA], 2, () => derivedStrikes++);
    runFor(withFallback, stateB, [targetB], 2, () => fallbackStrikes++);

    expect(fallback).toEqual(ENGAGEMENT_FALLBACK);
    expect(fallbackStrikes).toBe(derivedStrikes);
  });
});
