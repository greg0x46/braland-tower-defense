import { describe, expect, it } from 'vitest';
import { animationFrameIndexAt } from './animationFrames';

describe('animationFrameIndexAt', () => {
  it('faz loop para estagio de corrida ate a chegada', () => {
    expect(animationFrameIndexAt('loop', 8, 80, 0)).toBe(0);
    expect(animationFrameIndexAt('loop', 8, 80, 0.64)).toBe(0);
    expect(animationFrameIndexAt('loop', 8, 80, 0.72)).toBe(1);
  });

  it('trava no ultimo frame para estagio once', () => {
    expect(animationFrameIndexAt('once', 5, 32, 0)).toBe(0);
    expect(animationFrameIndexAt('once', 5, 32, 0.16)).toBe(4);
    expect(animationFrameIndexAt('once', 5, 32, 1)).toBe(4);
  });
});
