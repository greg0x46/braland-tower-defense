import { describe, it, expect } from 'vitest';
import { clamp, pointSegmentDistance, distanceToPath } from './geometry';
import { GAME_HEIGHT, PLAY_WIDTH } from '../core/constants';
import { PATH, pathLength } from '../data/path';
import type { Point } from '../data/path';

describe('clamp', () => {
  it('limita abaixo, acima e mantém dentro', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe('pointSegmentDistance', () => {
  const a: Point = { x: 0, y: 0 };
  const b: Point = { x: 10, y: 0 };

  it('mede perpendicular no meio do segmento', () => {
    expect(pointSegmentDistance(5, 4, a, b)).toBe(4);
  });

  it('mede a partir do extremo quando a projeção cai fora do segmento', () => {
    expect(pointSegmentDistance(-3, 4, a, b)).toBe(5); // até o ponto A (3,4)
  });

  it('trata segmento degenerado (A==B) como distância ao ponto', () => {
    expect(pointSegmentDistance(3, 4, a, a)).toBe(5);
  });
});

describe('distanceToPath', () => {
  const path: Point[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  it('usa o segmento mais próximo entre vários', () => {
    // Perto do segmento vertical (x=100), a 10px dele.
    expect(distanceToPath(90, 50, path)).toBe(10);
  });

  it('retorna 0 sobre o caminho', () => {
    expect(distanceToPath(50, 0, path)).toBe(0);
  });
});

describe('PATH data', () => {
  it('mantém waypoints visíveis dentro da área jogável', () => {
    for (const point of PATH.slice(1, -1)) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(PLAY_WIDTH);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(GAME_HEIGHT);
    }
  });

  it('mantém comprimento não nulo', () => {
    expect(pathLength(PATH)).toBeGreaterThan(0);
  });
});
