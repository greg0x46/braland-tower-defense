import { describe, expect, it } from 'vitest';
import { PROGRESSION_PROFILE } from './waves';
import { ACCEPTED_CONTRACTS, describeContractDrift, findContractDrift } from './contracts';

describe('PROGRESSION_PROFILE regressions', () => {
  it('mantem o perfil de progressao aceito', () => {
    const contract = ACCEPTED_CONTRACTS['wave.progression-profile'];
    const drift = findContractDrift(contract, PROGRESSION_PROFILE);

    expect(drift, describeContractDrift(contract, drift)).toEqual([]);
  });
});
