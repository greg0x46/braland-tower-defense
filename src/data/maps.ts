import { PLAY_WIDTH, GAME_HEIGHT, HUD_HEIGHT, COLORS, TEXTURES } from '../core/constants';
import type { Point } from './path';

/**
 * Contrato de mapa: a fonte única do que compõe uma fase jogável — visual,
 * caminho dos inimigos, área de construção e o que o debug desenha.
 *
 * Antes, o caminho (`data/path.ts`), a largura da estrada (`PATH_WIDTH`), os
 * limites de construção (`BuildManager`) e o overlay de debug eram alinhados
 * *por convenção*, cada um importando sua peça. Bastava mexer numa para o
 * bloqueio de construção divergir do caminho desenhado. Agora todos leem daqui:
 * mudar o mapa muda movimento, construção e debug juntos (FR-012).
 */

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** O que o overlay de depuração espera desenhar para este mapa. */
export interface MapDebugExpectations {
  /** Marca cada waypoint com seu índice. */
  showWaypoints: boolean;
  /** Desenha a faixa de bloqueio com a largura real da estrada. */
  showRoadWidth: boolean;
}

export interface MapContract {
  id: string;
  /** Chave da textura de fundo. */
  visualKey: string;
  /** Cor de fundo quando a textura falha — o mapa continua jogável (FR-014). */
  fallbackVisualColor: number;
  /** Onde o gameplay acontece. */
  playableBounds: Bounds;
  /** Onde torres podem ser construídas (exclui a barra do HUD). */
  buildBounds: Bounds;
  /** Rota ativa dos inimigos, do ponto de entrada ao de saída. */
  path: readonly Point[];
  /** Largura total da estrada — bloqueio de construção E faixa do debug. */
  roadWidth: number;
  debug: MapDebugExpectations;
}

/**
 * Waypoints em pixels na resolução base 1280×720. Os inimigos entram no primeiro
 * ponto e seguem em linha reta de segmento em segmento até o último, onde vazam.
 * Entrada e saída tocam a borda do campo de propósito.
 */
const INITIAL_MAP_PATH: readonly Point[] = (
  [
    [0, 240],
    [80, 240],
    [160, 240],
    [220, 240],
    [260, 228],
    [290, 205],
    [315, 180],
    [350, 162],
    [390, 160],
    [420, 170],
    [446, 196],
    [455, 229],
    [443, 255],
    [430, 285],
    [412, 315],
    [392, 345],
    [369, 374],
    [341, 420],
    [337, 457],
    [369, 494],
    [403, 515],
    [450, 523],
    [515, 509],
    [554, 478],
    [600, 408],
    [631, 333],
    [627, 297],
    [604, 253],
    [590, 200],
    [605, 160],
    [640, 140],
    [683, 142],
    [714, 165],
    [725, 203],
    [716, 245],
    [713, 290],
    [735, 321],
    [757, 333],
    [775, 338],
    [806, 334],
    [838, 311],
    [850, 271],
    [843, 216],
    [844, 186],
    [860, 160],
    [890, 140],
    [920, 145],
    [950, 160],
    [970, 190],
    [980, 230],
    [970, 270],
    [950, 300],
    [921, 345],
    [891, 421],
    [890, 460],
    [918, 492],
    [950, 505],
    [990, 500],
    [1020, 480],
    [1050, 450],
    [1080, 410],
    [1110, 390],
    [1140, 385],
    [1180, 385],
    [1220, 385],
    [1260, 385],
    [1280, 385],
  ] as const
).map(([x, y]) => ({ x, y }));

export const INITIAL_MAP: MapContract = {
  id: 'initial',
  visualKey: TEXTURES.initialMap,
  fallbackVisualColor: COLORS.background,
  playableBounds: { minX: 0, maxX: PLAY_WIDTH, minY: 0, maxY: GAME_HEIGHT },
  // A barra do HUD ocupa o topo do campo: construir ali esconderia a torre.
  buildBounds: { minX: 0, maxX: PLAY_WIDTH, minY: HUD_HEIGHT, maxY: GAME_HEIGHT },
  path: INITIAL_MAP_PATH,
  roadWidth: 55,
  debug: { showWaypoints: true, showRoadWidth: true },
};

/** Mapa em jogo. Uma segunda fase entra como outra entrada + troca desta constante. */
export const ACTIVE_MAP: MapContract = INITIAL_MAP;

export const MAPS: Record<string, MapContract> = {
  [INITIAL_MAP.id]: INITIAL_MAP,
};
