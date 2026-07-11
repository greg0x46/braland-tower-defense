/**
 * Caminho do mapa único, definido como uma lista de waypoints (em pixels na
 * resolução base 1280×720). Os inimigos entram no primeiro ponto e seguem em
 * linha reta de segmento em segmento até o último (onde "vazam").
 *
 * Formato serpenteante para criar zonas de construção variadas ao redor.
 */
export interface Point {
  x: number;
  y: number;
}

export const PATH: Point[] = [
  { x: -40, y: 140 },
  { x: 320, y: 140 },
  { x: 320, y: 400 },
  { x: 620, y: 400 },
  { x: 620, y: 150 },
  { x: 940, y: 150 },
  { x: 940, y: 560 },
  { x: 480, y: 560 },
  { x: 480, y: 680 },
  { x: 1320, y: 680 },
];

/** Comprimento total do caminho (soma dos segmentos) — útil para métricas. */
export function pathLength(points: Point[] = PATH): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return total;
}
