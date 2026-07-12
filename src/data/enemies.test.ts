import { describe, expect, it } from 'vitest';
import { ENEMY_TYPES } from './enemies';
import { ACCEPTED_CONTRACTS, describeContractDrift, findContractDrift } from './contracts';

describe('ENEMY_TYPES regressions', () => {
  it('mantem os stats aceitos do Dois Caras numa Moto', () => {
    const contract = ACCEPTED_CONTRACTS['enemy.dois-caras-moto.base-stats'];
    const drift = findContractDrift(contract, ENEMY_TYPES['dois-caras-moto']);

    expect(drift, describeContractDrift(contract, drift)).toEqual([]);
  });
});
