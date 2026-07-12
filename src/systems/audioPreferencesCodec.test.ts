import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PreferenceStorage } from '../core/preferenceStorage';
import { PREFERENCES_VERSION, parse, serialize } from './audioPreferencesCodec';
import { DEFAULT_PREFERENCES, type AudioPreferences } from './audioSettings';

/**
 * Storage falso: o Vitest roda em `environment: 'node'`, sem `localStorage`. É
 * também o que permite simular o Safari privado, onde o storage **lança**.
 */
class FakeStorage implements PreferenceStorage {
  private data = new Map<string, string>();
  throwOnRead = false;

  read(key: string): string | null {
    if (this.throwOnRead) throw new Error('storage indisponível (modo privado)');
    return this.data.get(key) ?? null;
  }

  write(key: string, value: string): void {
    this.data.set(key, value);
  }

  seed(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const KEY = 'br-td:audio';
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('serialize', () => {
  it('grava o formato versionado', () => {
    expect(serialize({ muted: true, volume: 0.6 })).toEqual({
      v: PREFERENCES_VERSION,
      muted: true,
      volume: 0.6,
    });
  });
});

describe('parse — tabela P4 (a leitura nunca lança)', () => {
  it('chave ausente cai no default SEM warn (primeira visita não é anomalia)', () => {
    const storage = new FakeStorage();
    expect(parse(storage.read(KEY))).toEqual(DEFAULT_PREFERENCES);
    expect(warn).not.toHaveBeenCalled();
  });

  it('JSON inválido / lixo cai no default + warn', () => {
    const storage = new FakeStorage();
    storage.seed(KEY, 'não é json {{{');
    expect(parse(storage.read(KEY))).toEqual(DEFAULT_PREFERENCES);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('versão desconhecida cai no default + warn', () => {
    expect(parse(JSON.stringify({ v: 2, muted: true, volume: 0.5 }))).toEqual(DEFAULT_PREFERENCES);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('campo faltando cai no default + warn', () => {
    expect(parse(JSON.stringify({ v: 1, volume: 0.5 }))).toEqual(DEFAULT_PREFERENCES);
    expect(parse(JSON.stringify({ v: 1, muted: true }))).toEqual(DEFAULT_PREFERENCES);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('tipo errado (volume: "alto") cai no default + warn', () => {
    expect(parse(JSON.stringify({ v: 1, muted: false, volume: 'alto' }))).toEqual(
      DEFAULT_PREFERENCES,
    );
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('valor não-objeto cai no default + warn', () => {
    expect(parse('42')).toEqual(DEFAULT_PREFERENCES);
    expect(parse('null')).toEqual(DEFAULT_PREFERENCES);
    expect(parse('[1,2,3]')).toEqual(DEFAULT_PREFERENCES);
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it('volume fora de [0,1] é CLAMPADO, não descartado', () => {
    expect(parse(JSON.stringify({ v: 1, muted: false, volume: 5 }))).toEqual({
      muted: false,
      volume: 1,
    });
    expect(parse(JSON.stringify({ v: 1, muted: true, volume: -2 }))).toEqual({
      muted: true,
      volume: DEFAULT_PREFERENCES.volume,
    });
  });

  it('storage adulterado não consegue produzir "desmutado e inaudível"', () => {
    const parsed = parse(JSON.stringify({ v: 1, muted: false, volume: 0 }));
    expect(parsed.muted).toBe(true);
    expect(parsed.volume).toBeGreaterThan(0);
  });

  it('nenhuma entrada, por pior que seja, lança', () => {
    const garbage = ['', '{', 'undefined', '{"v":1}', '{"v":"1","muted":1,"volume":{}}', 'true'];
    for (const raw of garbage) {
      expect(() => parse(raw)).not.toThrow();
    }
  });
});

describe('ida e volta serialize/parse', () => {
  it('preserva o estado através do storage', () => {
    const storage = new FakeStorage();
    const states: AudioPreferences[] = [
      DEFAULT_PREFERENCES,
      { muted: true, volume: 0.6 },
      { muted: false, volume: 1 },
      { muted: false, volume: 0.01 },
    ];

    for (const prefs of states) {
      storage.write(KEY, JSON.stringify(serialize(prefs)));
      expect(parse(storage.read(KEY))).toEqual(prefs);
    }
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('storage que lança (Safari em modo privado)', () => {
  it('o adaptador é quem protege — a leitura falha, mas o jogo segue no default', () => {
    const storage = new FakeStorage();
    storage.throwOnRead = true;

    // Este é o contrato do adaptador real (localStorageAdapter): capturar e devolver null.
    const readSafely = (): string | null => {
      try {
        return storage.read(KEY);
      } catch {
        return null;
      }
    };

    expect(() => parse(readSafely())).not.toThrow();
    expect(parse(readSafely())).toEqual(DEFAULT_PREFERENCES);
  });
});
