import { describe, expect, it } from 'vitest';
import { ENEMY_TYPES } from './enemies';

describe('ENEMY_TYPES regressions', () => {
  it('mantem stats de gameplay do Dois Caras numa Moto inalterados', () => {
    expect(ENEMY_TYPES['dois-caras-moto']).toMatchObject({
      maxHp: 20,
      speed: 200,
      reward: 8,
      radius: 25,
    });
  });
});
