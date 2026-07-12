import { describe, expect, it } from 'vitest';
import {
  createVisualStateMachine,
  updateVisualStateMachine,
  visualAnimationDurationMs,
  type VisualStateMachineConfig,
} from './visualStateMachine';

type GameplayState = 'idle' | 'windup' | 'attacking';

const config: VisualStateMachineConfig<GameplayState> = {
  stateToAnimation: {
    idle: 'idle-loop',
    windup: 'prepare-once',
    attacking: 'strike-once',
  },
  fallbackAnimationId: 'idle-loop',
  animations: [
    { id: 'idle-loop', kind: 'loop', frameCount: 2, frameDurationMs: 100 },
    { id: 'prepare-once', kind: 'once', frameCount: 3, frameDurationMs: 50 },
    {
      id: 'strike-once',
      kind: 'once',
      frameCount: 4,
      frameDurationMs: 40,
      cueFrameIndex: 2,
      cueName: 'impact',
      minDurationMs: 200,
    },
  ],
};

describe('visual state machine', () => {
  it('mapeia estado de gameplay para animacao visual configurada', () => {
    const state = createVisualStateMachine();

    const update = updateVisualStateMachine(config, state, 'windup', 60);

    expect(update.animationId).toBe('prepare-once');
    expect(update.frameIndex).toBe(1);
    expect(update.changed).toBe(true);
  });

  it('nao reinicia animacao quando o estado permanece o mesmo entre updates', () => {
    const state = createVisualStateMachine();

    const first = updateVisualStateMachine(config, state, 'windup', 60);
    const second = updateVisualStateMachine(config, state, 'windup', 110);

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(second.frameIndex).toBe(2);
  });

  it('emite cue uma unica vez em animacao once', () => {
    const state = createVisualStateMachine();

    expect(updateVisualStateMachine(config, state, 'attacking', 79).cues).toEqual([]);
    expect(updateVisualStateMachine(config, state, 'attacking', 80).cues).toEqual([
      { name: 'impact', animationId: 'strike-once', frameIndex: 2, cycle: 0 },
    ]);
    expect(updateVisualStateMachine(config, state, 'attacking', 120).cues).toEqual([]);
  });

  it('emite cue uma unica vez por ciclo em animacao loop', () => {
    const state = createVisualStateMachine();
    const looping: VisualStateMachineConfig<'idle'> = {
      stateToAnimation: { idle: 'loop' },
      animations: [
        {
          id: 'loop',
          kind: 'loop',
          frameCount: 3,
          frameDurationMs: 50,
          cueFrameIndex: 1,
          cueName: 'step',
        },
      ],
    };

    expect(updateVisualStateMachine(looping, state, 'idle', 50).cues).toEqual([
      { name: 'step', animationId: 'loop', frameIndex: 1, cycle: 0 },
    ]);
    expect(updateVisualStateMachine(looping, state, 'idle', 90).cues).toEqual([]);
    expect(updateVisualStateMachine(looping, state, 'idle', 200).cues).toEqual([
      { name: 'step', animationId: 'loop', frameIndex: 1, cycle: 1 },
    ]);
  });

  it('usa duracao minima declarada quando ela excede a soma dos frames', () => {
    const clip = config.animations.find((animation) => animation.id === 'strike-once');

    if (!clip) throw new Error('expected clip');
    expect(visualAnimationDurationMs(clip)).toBe(200);
  });
});
