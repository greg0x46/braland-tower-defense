import { describe, expect, it } from 'vitest';
import { TOWER_TYPES } from './towers';
import { ACCEPTED_CONTRACTS, describeContractDrift, findContractDrift } from './contracts';

describe('TOWER_TYPES regressions', () => {
  it('mantem os stats aceitos do Vira-lata Caramelo', () => {
    const contract = ACCEPTED_CONTRACTS['tower.vira-lata-caramelo.base-stats'];
    const drift = findContractDrift(contract, TOWER_TYPES['vira-lata-caramelo']);

    expect(drift, describeContractDrift(contract, drift)).toEqual([]);
  });

  it('trata a animacao de ataque como apresentacao opcional', () => {
    const tower = TOWER_TYPES['vira-lata-caramelo'];

    // O contrato de stats acima nao menciona sprite/animacao: trocar ou remover
    // a apresentacao nao pode derrubar este teste (FR-006).
    expect(tower.attackAnimation?.fallbackSpriteKey).toBeDefined();
  });
});
