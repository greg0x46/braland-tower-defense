/**
 * Caminho do mapa único, definido como uma lista de waypoints em pixels na
 * resolução base 1280×720. Os inimigos entram no primeiro ponto e seguem em
 * linha reta de segmento em segmento até o último, onde "vazam".
 *
 * Os pontos intermediários acompanham as curvas da estrada e não precisam
 * estar alinhados à grid de posicionamento de 40 px.
 */
export interface Point {
  x: number;
  y: number;
}

export const PATH: Point[] = [
  // Entrada e reta inicial
  [0, 240], // 0
  [80, 240], // 1
  [160, 240], // 2
  [220, 240], // 3
  [260, 228], // 4
  [290, 205], // 5
  [315, 180], // 6
  [350, 162], // 7
  [390, 160], // 8
  [420, 170], // 9
  [446, 196], // 10
  [455, 229], // 11
  [443, 255], // 12
  [430, 285], // 13
  [412, 315], // 14
  [392, 345], // 15
  [369, 374], // 16
  [341, 420], // 17
  [337, 457], // 18
  [369, 494], // 19
  [403, 515], // 20
  [450, 523], // 21
  [515, 509], // 22
  [554, 478], //23
  [600, 408], //24
  [631, 333], //25
  [627, 297], //26
  [604, 253], //27
  [590, 200], //28
  [605, 160], //28
  [640, 140], //29
  [683, 142], //30
  [714, 165], //31
  [725, 203], //32
  [716, 245], //33
  [713, 290], //34
  [735, 321], //35
  [757, 333], //36
  [775, 338], //37
  [806, 334], //38
  [838, 311], //39
  [850, 271], //40
  [843, 216], //41
  [844, 186], //42
  [860, 160], //43
  [890, 140], //44
  [920, 145], //45
  [950, 160], //46
  [970, 190], //47
  [980, 230], //48
  [970, 270], //49
  [950, 300], //50
  [921, 345], //51
  [891, 421], //52
  [890, 460], //53
  [918, 492], //54
  [950, 505], //55
  [990, 500], //56
  [1020, 480], //57
  [1050, 450], //58
  [1080, 410], //59
  [1110, 390], //60
  [1140, 385], //61
  [1180, 385], //62
  [1220, 385], //63
  [1260, 385], //64
  [1280, 385], //65
].map(([x, y]) => ({ x, y }));

/** Comprimento total do caminho — útil para métricas. */
export function pathLength(points: Point[] = PATH): number {
  let total = 0;

  for (let i = 0; i < points.length - 1; i++) {
    total += Math.hypot(
      points[i + 1].x - points[i].x,
      points[i + 1].y - points[i].y,
    );
  }

  return total;
}
