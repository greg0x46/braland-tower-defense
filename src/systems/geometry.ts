import type { Point } from '../data/path';

/**
 * Geometria pura do domínio — sem dependência de Phaser, testável sem
 * renderização (Constitution IX). Usada por validação de construção e debug.
 */

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Distância do ponto (px,py) ao segmento AB. */
export function pointSegmentDistance(
  px: number,
  py: number,
  a: Point,
  b: Point,
): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  const t = lenSq === 0 ? 0 : clamp(((px - a.x) * abx + (py - a.y) * aby) / lenSq, 0, 1);
  const cx = a.x + abx * t;
  const cy = a.y + aby * t;
  return Math.hypot(px - cx, py - cy);
}

/** Menor distância do ponto (px,py) a qualquer segmento do caminho. */
export function distanceToPath(px: number, py: number, path: readonly Point[]): number {
  let min = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const d = pointSegmentDistance(px, py, path[i], path[i + 1]);
    if (d < min) min = d;
  }
  return min;
}
