import { describe, it, expect } from 'vitest';
import {
  totalSpawnCount,
  buildSpawnSchedule,
  generateWave,
  waveDifficulty,
} from './waves';
import type { Wave } from '../data/waves';
import { PROGRESSION_PROFILE } from '../data/waves';
import type { EnemyType } from '../data/enemies';

/** Roster de teste com um segundo tipo mais fraco, para provar que a variedade
 *  não quebra a monotonicidade da dificuldade. */
const enemy = (id: string, maxHp: number): EnemyType => ({
  id,
  name: id,
  emoji: '',
  color: 0,
  maxHp,
  speed: 90,
  reward: 5,
  radius: 16,
});
const roster1: EnemyType[] = [enemy('a', 20)];
const roster2: EnemyType[] = [enemy('a', 20), enemy('b', 5)];

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

describe('generateWave: determinismo', () => {
  it('mesma entrada gera exatamente a mesma Wave', () => {
    for (const i of [0, 5, 17]) {
      expect(generateWave(i, PROGRESSION_PROFILE, roster2)).toEqual(
        generateWave(i, PROGRESSION_PROFILE, roster2),
      );
    }
  });
});

describe('generateWave: monotonicidade da dificuldade (SC-004)', () => {
  it('waveDifficulty é estritamente crescente ao longo da progressão (roster 1 tipo)', () => {
    let prev = -Infinity;
    for (let i = 0; i < 40; i++) {
      const d = waveDifficulty(generateWave(i, PROGRESSION_PROFILE, roster1), roster1);
      expect(d).toBeGreaterThan(prev);
      prev = d;
    }
  });

  it('permanece estritamente crescente mesmo quando a variedade adiciona um tipo mais fraco', () => {
    let prev = -Infinity;
    for (let i = 0; i < 40; i++) {
      const d = waveDifficulty(generateWave(i, PROGRESSION_PROFILE, roster2), roster2);
      expect(d).toBeGreaterThan(prev);
      prev = d;
    }
  });
});

describe('generateWave: ritmo (FR-012)', () => {
  it('o interval efetivo nunca aumenta com o índice e respeita minIntervalSec', () => {
    let prev = Infinity;
    for (let i = 0; i < 60; i++) {
      const wave = generateWave(i, PROGRESSION_PROFILE, roster1);
      const interval = wave.groups[0].interval;
      expect(interval).toBeLessThanOrEqual(prev);
      expect(interval).toBeGreaterThanOrEqual(PROGRESSION_PROFILE.minIntervalSec);
      prev = interval;
    }
  });
});

describe('generateWave: variedade data-driven (FR-006)', () => {
  it('ondas iniciais usam só o tipo principal; ondas avançadas incorporam novos tipos', () => {
    const early = generateWave(0, PROGRESSION_PROFILE, roster2);
    expect(early.groups.map((g) => g.enemyTypeId)).toEqual(['a']);

    const step = PROGRESSION_PROFILE.varietyStep;
    const later = generateWave(step, PROGRESSION_PROFILE, roster2);
    expect(later.groups.map((g) => g.enemyTypeId)).toContain('b');
  });

  it('com roster de 1 tipo, a variedade permanece nesse único tipo', () => {
    const wave = generateWave(PROGRESSION_PROFILE.varietyStep * 3, PROGRESSION_PROFILE, roster1);
    expect(wave.groups.every((g) => g.enemyTypeId === 'a')).toBe(true);
  });
});
