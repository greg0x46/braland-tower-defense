import { describe, it, expect } from 'vitest';
import { totalSpawnCount, buildSpawnSchedule } from './waves';
import type { Wave } from '../data/waves';

const wave: Wave = {
  groups: [
    { enemyTypeId: 'a', count: 2, interval: 1 },
    { enemyTypeId: 'b', count: 2, interval: 0.5, delay: 0.25 },
  ],
};

describe('totalSpawnCount', () => {
  it('soma os counts de todos os grupos', () => {
    expect(totalSpawnCount(wave)).toBe(4);
  });

  it('é zero para onda vazia', () => {
    expect(totalSpawnCount({ groups: [] })).toBe(0);
  });
});

describe('buildSpawnSchedule', () => {
  it('gera um spawn por inimigo com o instante correto', () => {
    const schedule = buildSpawnSchedule(wave);
    expect(schedule).toHaveLength(4);
    // Ordenado por tempo; delay do grupo b é somado ao índice.
    expect(schedule).toEqual([
      { enemyTypeId: 'a', atSeconds: 0 },
      { enemyTypeId: 'b', atSeconds: 0.25 },
      { enemyTypeId: 'b', atSeconds: 0.75 },
      { enemyTypeId: 'a', atSeconds: 1 },
    ]);
  });

  it('é determinístico: mesma onda gera o mesmo cronograma', () => {
    expect(buildSpawnSchedule(wave)).toEqual(buildSpawnSchedule(wave));
  });
});
