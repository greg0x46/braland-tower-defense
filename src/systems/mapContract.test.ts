import { describe, expect, it } from 'vitest';
import { describeMapContractErrors, validateMapContract } from './mapContract';
import { ACTIVE_MAP, INITIAL_MAP, MAPS, type MapContract } from '../data/maps';
import { pathLength } from '../data/path';

function mapWith(overrides: Partial<MapContract>): MapContract {
  return { ...INITIAL_MAP, ...overrides };
}

describe('mapa ativo', () => {
  it('o mapa inicial satisfaz o proprio contrato', () => {
    const errors = validateMapContract(ACTIVE_MAP);

    expect(errors, describeMapContractErrors(ACTIVE_MAP, errors)).toEqual([]);
  });

  it('todo mapa registrado e valido', () => {
    for (const map of Object.values(MAPS)) {
      const errors = validateMapContract(map);
      expect(errors, describeMapContractErrors(map, errors)).toEqual([]);
    }
  });

  it('indexa cada mapa pelo proprio id', () => {
    for (const [key, map] of Object.entries(MAPS)) {
      expect(map.id).toBe(key);
    }
  });

  it('o caminho entra por uma borda e sai pela outra', () => {
    const first = ACTIVE_MAP.path[0];
    const last = ACTIVE_MAP.path[ACTIVE_MAP.path.length - 1];

    expect(first.x).toBe(ACTIVE_MAP.playableBounds.minX);
    expect(last.x).toBe(ACTIVE_MAP.playableBounds.maxX);
    expect(pathLength(ACTIVE_MAP.path)).toBeGreaterThan(0);
  });

  it('a area de construcao exclui a barra do HUD', () => {
    expect(ACTIVE_MAP.buildBounds.minY).toBeGreaterThan(ACTIVE_MAP.playableBounds.minY);
  });
});

describe('validateMapContract', () => {
  it('exige ao menos dois waypoints', () => {
    const errors = validateMapContract(mapWith({ path: [{ x: 0, y: 0 }] }));

    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('path');
  });

  it('rejeita largura de estrada nao positiva', () => {
    for (const roadWidth of [0, -10]) {
      const errors = validateMapContract(mapWith({ roadWidth }));
      expect(errors.map((error) => error.field)).toContain('roadWidth');
    }
  });

  it('aceita pontas do caminho encostadas na borda (entrada e saida)', () => {
    const errors = validateMapContract(
      mapWith({
        path: [
          { x: 0, y: 100 }, // entra pela borda esquerda
          { x: 640, y: 300 },
          { x: 1280, y: 400 }, // sai pela borda direita
        ],
      }),
    );

    expect(errors).toEqual([]);
  });

  it('rejeita ponto interno fora dos limites jogaveis', () => {
    const errors = validateMapContract(
      mapWith({
        path: [
          { x: 0, y: 100 },
          { x: 640, y: 5000 }, // fora do campo
          { x: 1280, y: 400 },
        ],
      }),
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('path[1]');
    expect(errors[0].message).toContain('interno');
  });

  it('rejeita area de construcao maior que o campo', () => {
    const errors = validateMapContract(
      mapWith({ buildBounds: { minX: -50, maxX: 9999, minY: 0, maxY: 9999 } }),
    );

    expect(errors.map((error) => error.field)).toContain('buildBounds');
  });

  it('descreve todos os erros numa mensagem so', () => {
    const broken = mapWith({ roadWidth: 0, path: [{ x: 0, y: 0 }] });
    const errors = validateMapContract(broken);
    const message = describeMapContractErrors(broken, errors);

    expect(message).toContain('roadWidth');
    expect(message).toContain('path');
  });
});
