import { describe, expect, it } from 'vitest';
import {
  AUDIO_HUD_LAYOUT,
  handleXFromVolume,
  volumeFromPointerX,
  type SliderLayout,
} from './volumeSlider';

const LAYOUT = AUDIO_HUD_LAYOUT.slider;

/** Extremos do percurso do centro da alça (não do trilho — a alça tem largura). */
const MIN_X = LAYOUT.trackX + LAYOUT.handleWidth / 2;
const MAX_X = LAYOUT.trackX + LAYOUT.trackWidth - LAYOUT.handleWidth / 2;

describe('invariante de ida e volta', () => {
  it('volumeFromPointerX(handleXFromVolume(v)) === v para todo v em [0,1]', () => {
    for (let v = 0; v <= 1.0001; v += 0.01) {
      const volume = Math.min(v, 1);
      expect(volumeFromPointerX(handleXFromVolume(volume))).toBeCloseTo(volume, 10);
    }
  });

  it('a volta também fecha: handleXFromVolume(volumeFromPointerX(x)) === x dentro do trilho', () => {
    for (let x = MIN_X; x <= MAX_X; x += 3) {
      expect(handleXFromVolume(volumeFromPointerX(x))).toBeCloseTo(x, 10);
    }
  });
});

describe('extremos do trilho', () => {
  it('volume 0 põe a alça no início do percurso, e 1 no fim', () => {
    expect(handleXFromVolume(0)).toBeCloseTo(MIN_X, 10);
    expect(handleXFromVolume(1)).toBeCloseTo(MAX_X, 10);
  });

  /** O erro clássico: esquecer a meia-largura da alça faz o máximo não chegar em 1. */
  it('a ponta direita do percurso vale exatamente volume 1', () => {
    expect(volumeFromPointerX(MAX_X)).toBe(1);
    expect(volumeFromPointerX(MIN_X)).toBe(0);
  });

  it('o centro do percurso vale meio volume', () => {
    expect(volumeFromPointerX((MIN_X + MAX_X) / 2)).toBeCloseTo(0.5, 10);
  });
});

describe('clamp nas duas pontas', () => {
  it('arrastar para fora do trilho satura em 0 ou 1, não extrapola', () => {
    expect(volumeFromPointerX(MIN_X - 1)).toBe(0);
    expect(volumeFromPointerX(MIN_X - 500)).toBe(0);
    expect(volumeFromPointerX(MAX_X + 1)).toBe(1);
    expect(volumeFromPointerX(MAX_X + 500)).toBe(1);
  });

  it('a alça nunca sai do trilho, nem com volume fora da faixa', () => {
    for (const volume of [-5, -0.01, 1.01, 42]) {
      const x = handleXFromVolume(volume);
      expect(x).toBeGreaterThanOrEqual(MIN_X);
      expect(x).toBeLessThanOrEqual(MAX_X);
    }
  });

  it('nenhuma entrada produz volume fora de [0,1]', () => {
    for (let x = LAYOUT.trackX - 100; x <= LAYOUT.trackX + LAYOUT.trackWidth + 100; x += 7) {
      const volume = volumeFromPointerX(x);
      expect(volume).toBeGreaterThanOrEqual(0);
      expect(volume).toBeLessThanOrEqual(1);
    }
  });
});

describe('layout do HUD de áudio (Constitution XIII)', () => {
  it('mantém os controles dentro da barra superior e do campo de jogo', () => {
    const { muteButton, slider } = AUDIO_HUD_LAYOUT;
    // Barra superior tem 64 px: os controles cabem nela inteiros.
    expect(muteButton.centerY - muteButton.size / 2).toBeGreaterThanOrEqual(0);
    expect(muteButton.centerY + muteButton.size / 2).toBeLessThanOrEqual(64);
    expect(slider.centerY + slider.handleHeight / 2).toBeLessThanOrEqual(64);
    // E não invadem a sidebar (o campo termina em PLAY_WIDTH = 1280).
    expect(slider.trackX + slider.trackWidth).toBeLessThanOrEqual(1280);
    // O botão fica à esquerda do trilho, sem sobrepor.
    expect(muteButton.centerX + muteButton.size / 2).toBeLessThanOrEqual(slider.trackX);
  });

  it('funciona com um trilho de outra geometria (nada de coordenada mágica embutida)', () => {
    const custom: SliderLayout = {
      trackX: 0,
      centerY: 10,
      trackWidth: 100,
      trackHeight: 4,
      handleWidth: 20,
      handleHeight: 12,
    };
    expect(handleXFromVolume(0, custom)).toBe(10);
    expect(handleXFromVolume(1, custom)).toBe(90);
    expect(volumeFromPointerX(50, custom)).toBeCloseTo(0.5, 10);
  });
});
