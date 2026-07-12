import { describe, it, expect } from 'vitest';
import { isValidPlacement, type PlacementRequest } from './placement';
import { ACTIVE_MAP } from '../data/maps';
import type { Point } from '../data/path';

const PATH: Point[] = [
  { x: 0, y: 300 },
  { x: 400, y: 300 },
];

function base(overrides: Partial<PlacementRequest> = {}): PlacementRequest {
  return {
    x: 200,
    y: 200,
    radius: 20,
    cost: 50,
    money: 100,
    path: PATH,
    pathHalfWidth: 24,
    bounds: { minX: 0, maxX: 800, minY: 64, maxY: 600 },
    towers: [],
    towerGap: 4,
    ...overrides,
  };
}

describe('isValidPlacement', () => {
  it('aceita um ponto livre, longe do caminho, com dinheiro', () => {
    expect(isValidPlacement(base())).toBe(true);
  });

  it('rejeita sem dinheiro suficiente', () => {
    expect(isValidPlacement(base({ money: 49, cost: 50 }))).toBe(false);
  });

  it('rejeita em cima do caminho (dentro de meia-largura + raio)', () => {
    // Caminho em y=300; meia-largura 24 + raio 20 = 44 de folga exigida.
    expect(isValidPlacement(base({ y: 340 }))).toBe(false); // dist 40 < 44
    expect(isValidPlacement(base({ y: 345 }))).toBe(true); // dist 45 >= 44
  });

  it('aplica a largura revisada da estrada como largura total', () => {
    const radius = 18;
    const blockedDistance = ACTIVE_MAP.roadWidth / 2 + radius - 1;
    const freeDistance = ACTIVE_MAP.roadWidth / 2 + radius;

    expect(
      isValidPlacement(
        base({
          y: 300 + blockedDistance,
          radius,
          pathHalfWidth: ACTIVE_MAP.roadWidth / 2,
        }),
      ),
    ).toBe(false);
    expect(
      isValidPlacement(
        base({
          y: 300 + freeDistance,
          radius,
          pathHalfWidth: ACTIVE_MAP.roadWidth / 2,
        }),
      ),
    ).toBe(true);
  });

  it('rejeita fora dos limites do mapa (considerando o raio)', () => {
    expect(isValidPlacement(base({ x: 10 }))).toBe(false); // x < minX + radius
    expect(isValidPlacement(base({ y: 70 }))).toBe(false); // y < minY + radius
  });

  it('rejeita sobreposição com torre existente', () => {
    const towers = [{ x: 200, y: 200, radius: 20 }];
    // Mesma posição → colide.
    expect(isValidPlacement(base({ towers }))).toBe(false);
    // Longe o bastante (>= r+r+gap = 44) → ok.
    expect(isValidPlacement(base({ x: 250, towers }))).toBe(true);
  });
});
