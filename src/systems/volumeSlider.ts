import { HUD_HEIGHT, PLAY_WIDTH } from '../core/constants';
import { clampVolume } from './audioSettings';

/**
 * Geometria do slider de volume — regra pura (Constitution IX).
 *
 * O Phaser não tem slider pronto. A parte que pode errar é a matemática (mapear
 * pixel ↔ [0,1], com clamp nas pontas), e é justamente ela que dá para testar sem
 * renderizar nada — mesmo padrão de `rosterLayout.ts` (decisão D9). O desenho na
 * UIScene fica burro; a regra fica coberta.
 *
 * O detalhe que o teste de ida e volta protege: a alça tem largura, então o centro
 * dela não percorre o trilho inteiro — percorre o trilho **menos meia alça de cada
 * lado**. Esquecer essa meia-largura em um dos lados é o erro clássico aqui, e ele
 * se manifesta como "o slider no máximo não chega no volume 1".
 */
export interface SliderLayout {
  /** Borda esquerda do trilho. */
  trackX: number;
  /** Centro vertical do trilho (e da alça). */
  centerY: number;
  trackWidth: number;
  trackHeight: number;
  handleWidth: number;
  handleHeight: number;
}

export interface AudioHudLayout {
  muteButton: { centerX: number; centerY: number; size: number };
  slider: SliderLayout;
}

/**
 * Controles de áudio na barra superior, ancorados à direita (decisão D8).
 *
 * Derivados de `PLAY_WIDTH`/`HUD_HEIGHT`, não de coordenadas mágicas
 * (Constitution XIII): mudar a largura do campo reposiciona os controles sozinho.
 * A barra superior já é zona não-construível (`buildBounds.minY = HUD_HEIGHT`),
 * então nenhum clique daqui vira torre por acidente.
 */
const MARGIN = 24; // respiro até a borda direita do campo
const GAP = 16; // entre o botão de mudo e o trilho
const TRACK_WIDTH = 200;
const BUTTON_SIZE = 40;
const TRACK_X = PLAY_WIDTH - MARGIN - TRACK_WIDTH;
const CENTER_Y = HUD_HEIGHT / 2;

export const AUDIO_HUD_LAYOUT: AudioHudLayout = {
  muteButton: {
    centerX: TRACK_X - GAP - BUTTON_SIZE / 2,
    centerY: CENTER_Y,
    size: BUTTON_SIZE,
  },
  slider: {
    trackX: TRACK_X,
    centerY: CENTER_Y,
    trackWidth: TRACK_WIDTH,
    trackHeight: 8,
    handleWidth: 14,
    handleHeight: 26,
  },
};

/** Onde o centro da alça começa (volume 0) e quanto ele percorre até o volume 1. */
function travelStart(layout: SliderLayout): number {
  return layout.trackX + layout.handleWidth / 2;
}

function travelWidth(layout: SliderLayout): number {
  return Math.max(0, layout.trackWidth - layout.handleWidth);
}

/** Pixel → volume, com clamp: arrastar para fora do trilho satura, não extrapola. */
export function volumeFromPointerX(x: number, layout: SliderLayout = AUDIO_HUD_LAYOUT.slider): number {
  const travel = travelWidth(layout);
  if (travel <= 0) return 0;
  return clampVolume((x - travelStart(layout)) / travel);
}

/** Volume → pixel do centro da alça. Inversa exata de `volumeFromPointerX`. */
export function handleXFromVolume(
  volume: number,
  layout: SliderLayout = AUDIO_HUD_LAYOUT.slider,
): number {
  return travelStart(layout) + clampVolume(volume) * travelWidth(layout);
}
