import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  clampVolume,
  effectiveVolume,
  normalize,
  setVolume,
  toggleMute,
  type AudioPreferences,
} from './audioSettings';

afterEach(() => {
  vi.restoreAllMocks();
});

/** Todos os estados que a UI e o storage conseguem produzir. */
const REACHABLE_STATES: AudioPreferences[] = [
  DEFAULT_PREFERENCES,
  { muted: false, volume: 1 },
  { muted: false, volume: 0.01 },
  { muted: true, volume: 0.6 },
  { muted: true, volume: 1 },
];

describe('effectiveVolume (P1)', () => {
  it('entrega o volume quando não está mudo, e zero quando está', () => {
    expect(effectiveVolume({ muted: false, volume: 0.6 })).toBe(0.6);
    expect(effectiveVolume({ muted: true, volume: 0.6 })).toBe(0);
  });

  it('invariante 2: effectiveVolume === 0 ⟺ muted === true', () => {
    for (const state of REACHABLE_STATES) {
      expect(effectiveVolume(state) === 0).toBe(state.muted);
    }
  });

  it('invariante 3: desmutado implica volume > 0', () => {
    for (const state of REACHABLE_STATES) {
      if (!state.muted) expect(state.volume).toBeGreaterThan(0);
    }
  });
});

describe('clampVolume (invariante 1)', () => {
  it('mantém o volume dentro de [0,1]', () => {
    expect(clampVolume(1.7)).toBe(1);
    expect(clampVolume(-0.2)).toBe(0);
    expect(clampVolume(0.5)).toBe(0.5);
    expect(clampVolume(0)).toBe(0);
    expect(clampVolume(1)).toBe(1);
  });
});

describe('toggleMute (P2)', () => {
  it('muta preservando o volume', () => {
    expect(toggleMute({ muted: false, volume: 0.6 })).toEqual({ muted: true, volume: 0.6 });
  });

  it('desmuta devolvendo o som no mesmo volume de antes', () => {
    const muted = toggleMute({ muted: false, volume: 0.6 });
    const back = toggleMute(muted);
    expect(back).toEqual({ muted: false, volume: 0.6 });
    expect(effectiveVolume(back)).toBe(0.6);
  });

  it('nunca toca no volume, em nenhum estado alcançável', () => {
    for (const state of REACHABLE_STATES) {
      expect(toggleMute(state).volume).toBe(state.volume);
    }
  });

  it('é involutivo: mutar e desmutar volta ao estado original', () => {
    for (const state of REACHABLE_STATES) {
      expect(toggleMute(toggleMute(state))).toEqual(state);
    }
  });
});

describe('setVolume (P3)', () => {
  it('define o volume no caso comum', () => {
    expect(setVolume({ muted: false, volume: 0.35 }, 0.5)).toEqual({ muted: false, volume: 0.5 });
  });

  it('acorda o áudio quando o slider sobe acima de zero', () => {
    expect(setVolume({ muted: true, volume: 0.35 }, 0.5)).toEqual({ muted: false, volume: 0.5 });
  });

  it('colapsa volume zero em mudo, preservando o volume anterior para o retorno', () => {
    const silenced = setVolume({ muted: false, volume: 0.8 }, 0);
    expect(silenced).toEqual({ muted: true, volume: 0.8 });
    expect(effectiveVolume(silenced)).toBe(0);
    // E o retorno: desmutar devolve exatamente o 0.8 que o jogador tinha escolhido.
    expect(effectiveVolume(toggleMute(silenced))).toBe(0.8);
  });

  it('clampa acima de 1', () => {
    expect(setVolume({ muted: false, volume: 0.35 }, 1.7)).toEqual({ muted: false, volume: 1 });
  });

  it('clampa abaixo de 0 e daí aplica a regra de zero', () => {
    expect(setVolume({ muted: false, volume: 0.8 }, -0.2)).toEqual({ muted: true, volume: 0.8 });
  });

  it('NaN não corrompe o estado e registra o descarte', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const before: AudioPreferences = { muted: false, volume: 0.42 };

    expect(setVolume(before, Number.NaN)).toEqual(before);
    expect(setVolume(before, Number.POSITIVE_INFINITY)).toEqual(before);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('preserva as invariantes para qualquer entrada, a partir de qualquer estado', () => {
    const inputs = [-1, -0.001, 0, 0.001, 0.5, 0.999, 1, 2];
    for (const state of REACHABLE_STATES) {
      for (const input of inputs) {
        const next = setVolume(state, input);
        expect(next.volume).toBeGreaterThan(0); // invariante 3 (o volume guardado nunca zera)
        expect(next.volume).toBeLessThanOrEqual(1); // invariante 1
        expect(effectiveVolume(next) === 0).toBe(next.muted); // invariante 2
      }
    }
  });
});

describe('normalize (estado vindo de storage adulterado)', () => {
  it('clampa volume fora da faixa', () => {
    expect(normalize({ muted: false, volume: 5 })).toEqual({ muted: false, volume: 1 });
    expect(normalize({ muted: true, volume: -3 })).toEqual({
      muted: true,
      volume: DEFAULT_PREFERENCES.volume,
    });
  });

  it('torna "desmutado com volume zero" irrepresentável (invariantes 2 e 3)', () => {
    const normalized = normalize({ muted: false, volume: 0 });
    expect(normalized.muted).toBe(true);
    expect(normalized.volume).toBeGreaterThan(0);
  });

  it('cai no default quando o volume não é finito', () => {
    expect(normalize({ muted: false, volume: Number.NaN })).toEqual(DEFAULT_PREFERENCES);
  });

  it('é idempotente e preserva estados já válidos', () => {
    for (const state of REACHABLE_STATES) {
      expect(normalize(state)).toEqual(state);
      expect(normalize(normalize(state))).toEqual(normalize(state));
    }
  });
});
