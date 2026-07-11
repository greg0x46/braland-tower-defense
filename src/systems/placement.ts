import type { Point } from '../data/path';
import { distanceToPath } from './geometry';

/**
 * Validação de posicionamento de torre — regra pura (Constitution IX). Reúne
 * os quatro critérios: dentro dos limites, longe do caminho, sem sobreposição
 * e com dinheiro suficiente.
 */

export interface PlacementBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface PlacedTower {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface PlacementRequest {
  x: number;
  y: number;
  /** Raio do corpo da torre a construir. */
  radius: number;
  /** Custo da torre — comparado a `money`. */
  cost: number;
  money: number;
  path: readonly Point[];
  /** Meia-largura da trilha (raio livre exigido em torno do caminho). */
  pathHalfWidth: number;
  bounds: PlacementBounds;
  towers: readonly PlacedTower[];
  /** Folga mínima extra entre bordas de duas torres. */
  towerGap: number;
}

export function isValidPlacement(r: PlacementRequest): boolean {
  if (r.money < r.cost) return false;
  if (r.x < r.bounds.minX + r.radius || r.x > r.bounds.maxX - r.radius) return false;
  if (r.y < r.bounds.minY + r.radius || r.y > r.bounds.maxY - r.radius) return false;
  if (distanceToPath(r.x, r.y, r.path) < r.pathHalfWidth + r.radius) return false;
  for (const t of r.towers) {
    const minDist = t.radius + r.radius + r.towerGap;
    if (Math.hypot(t.x - r.x, t.y - r.y) < minDist) return false;
  }
  return true;
}
