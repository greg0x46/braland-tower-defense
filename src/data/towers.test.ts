import { describe, expect, it } from 'vitest';
import { ENGAGEMENT_FALLBACK, TEXTURES } from '../core/constants';
import { CARAMELO_SPRITE_SHEET } from '../core/spriteSheets';
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
    expect(tower.spriteFrame).toEqual({
      textureKey: CARAMELO_SPRITE_SHEET.textureKey,
      frame: 8,
      label: 'deitado',
    });
    expect(tower.attackAnimation?.fallbackSpriteKey).toBeDefined();
  });

  it('usa a sheet final do Caramelo para prepare, run e attack', () => {
    const animation = TOWER_TYPES['vira-lata-caramelo'].attackAnimation;
    if (!animation) throw new Error('expected attack animation');

    expect(animation.idleFrame).toEqual({
      textureKey: TEXTURES.towerCarameloSheet,
      frame: 8,
      label: 'deitado',
    });

    for (const stage of animation.stages) {
      for (const frame of stage.frames) {
        expect(frame.textureKey).toBe(CARAMELO_SPRITE_SHEET.textureKey);
        expect(frame.frame).toBeGreaterThanOrEqual(0);
        expect(frame.frame).toBeLessThan(
          CARAMELO_SPRITE_SHEET.columns * CARAMELO_SPRITE_SHEET.rows,
        );
      }
    }

    const idle = animation.stages.find((stage) => stage.name === 'lying_idle');
    expect(idle?.kind).toBe('loop');
    expect(idle?.frames.map((frame) => frame.frame)).toEqual([8, 9]);

    const standingUp = animation.stages.find((stage) => stage.name === 'standing_up');
    expect(standingUp?.kind).toBe('once');
    expect(standingUp?.frames.map((frame) => frame.frame)).toEqual([10, 11, 12, 13, 14, 15]);

    const chasing = animation.stages.find((stage) => stage.name === 'chasing');
    expect(chasing?.kind).toBe('loop');
    expect(new Set(chasing?.frames.map((frame) => frame.frame)).size).toBeGreaterThanOrEqual(6);

    const biting = animation.stages.find((stage) => stage.name === 'biting');
    expect(biting?.fireCueFrameIndex).toBe(2);
    expect(biting?.fireCueFrameIndex).toBeLessThan(biting?.frames.length ?? 0);

    const lyingDown = animation.stages.find((stage) => stage.name === 'lying_down');
    expect(lyingDown?.kind).toBe('once');
    expect(lyingDown?.frames.map((frame) => frame.frame)).toEqual([15, 14, 13, 12, 11, 10, 9, 8]);
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

    expect(timings.standUpSec).toBe(0.36);
    expect(timings.strikeSec).toBe(0.16);
    expect(timings.cueAtSec).toBe(0.064);
    expect(timings.lieDownSec).toBe(0.36);
    expect(timings.pursuitSpeedPxPerSec).toBe(520);
    expect(timings.arrivalDistancePx).toBe(22);
    expect(timings.standUpSec).toBeGreaterThanOrEqual(0);
    expect(timings.strikeSec).toBeGreaterThanOrEqual(0);
    expect(timings.cueAtSec).toBeLessThanOrEqual(timings.strikeSec);
  });

  it('usa fallback de timings quando nao ha animacao de ataque', () => {
    const tower = TOWER_TYPES['vira-lata-caramelo'];
    const timings = engagementTimingsOf({ ...tower, attackAnimation: undefined });

    expect(timings).toEqual(ENGAGEMENT_FALLBACK);
  });
});
