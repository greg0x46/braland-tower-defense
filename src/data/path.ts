/**
 * Tipo e utilitário de caminho.
 *
 * Os waypoints do mapa **não** moram mais aqui: eles fazem parte do contrato de
 * mapa (`data/maps.ts`), junto com visual, largura da estrada e área de
 * construção. Manter uma lista solta aqui era justamente o que permitia o
 * caminho do gameplay divergir do que o debug desenhava.
 */
export interface Point {
  x: number;
  y: number;
}

/** Comprimento total do caminho — útil para métricas. */
export function pathLength(points: readonly Point[]): number {
  let total = 0;

  for (let i = 0; i < points.length - 1; i++) {
    total += Math.hypot(
      points[i + 1].x - points[i].x,
      points[i + 1].y - points[i].y,
    );
  }

  return total;
}
