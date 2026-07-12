import { describe, expect, it } from 'vitest';
import { ENGAGEMENT_FALLBACK } from '../core/constants';
import { attackBehaviorOf, engagementTimingsOf, TOWER_TYPES } from './towers';
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

  it('mantem o contrato aceito do comportamento de ataque do Caramelo', () => {
    const contract = ACCEPTED_CONTRACTS['tower.vira-lata-caramelo.attack-behavior'];
    const runtime = attackBehaviorOf(TOWER_TYPES['vira-lata-caramelo']);
    const drift = findContractDrift(contract, runtime);

    expect(drift, describeContractDrift(contract, drift)).toEqual([]);
  });

  it('declara e propaga um perfil de engajamento conhecido para toda torre', () => {
    for (const tower of Object.values(TOWER_TYPES)) {
      expect(['stationary', 'pursuer']).toContain(tower.attack.engagement);
      expect(attackBehaviorOf(tower).engagement).toBe(tower.attack.engagement);
    }
  });

  it('deriva timings de engajamento dos dados da animacao', () => {
    const timings = engagementTimingsOf(TOWER_TYPES['vira-lata-caramelo']);

    expect(timings.prepareSec).toBe(0.12);
    expect(timings.strikeSec).toBe(0.16);
    expect(timings.cueAtSec).toBe(0);
    expect(timings.pursuitSpeedPxPerSec).toBe(520);
    expect(timings.arrivalDistancePx).toBe(22);
    expect(timings.prepareSec).toBeGreaterThanOrEqual(0);
    expect(timings.strikeSec).toBeGreaterThanOrEqual(0);
    expect(timings.cueAtSec).toBeLessThanOrEqual(timings.strikeSec);
  });

  it('usa fallback de timings quando nao ha animacao de ataque', () => {
    const tower = TOWER_TYPES['vira-lata-caramelo'];
    const timings = engagementTimingsOf({ ...tower, attackAnimation: undefined });

    expect(timings).toEqual(ENGAGEMENT_FALLBACK);
  });
});
