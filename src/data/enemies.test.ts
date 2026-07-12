import { describe, expect, it } from 'vitest';
import { ENEMY_TYPES } from './enemies';
import { ACCEPTED_CONTRACTS, describeContractDrift, findContractDrift } from './contracts';
import { COMBAT_SFX_CATALOG, COMBAT_SFX_DEFAULTS, COMBAT_SFX_IDS } from './audio';
import {
  resolveCombatSfxEffect,
  soundProfileEffectId,
  type CombatSfxCategory,
} from '../systems/combatSfx';

describe('ENEMY_TYPES regressions', () => {
  it('mantem os stats aceitos do Dois Caras numa Moto', () => {
    const contract = ACCEPTED_CONTRACTS['enemy.dois-caras-moto.base-stats'];
    const drift = findContractDrift(contract, ENEMY_TYPES['dois-caras-moto']);

    expect(drift, describeContractDrift(contract, drift)).toEqual([]);
  });
});

/** Perfil sonoro é apresentação: existe, resolve, e não toca em nada de gameplay (011). */
describe('perfil sonoro dos inimigos', () => {
  const available = (): boolean => true;
  const ENEMY_CATEGORIES: CombatSfxCategory[] = [
    'enemy-damaged',
    'enemy-killed',
    'enemy-leaked',
  ];

  it('todo inimigo resolve dano, derrota e vazamento no catalogo', () => {
    for (const enemy of Object.values(ENEMY_TYPES)) {
      for (const category of ENEMY_CATEGORIES) {
        const effectId = soundProfileEffectId({ category, enemyTypeId: enemy.id }, {}, ENEMY_TYPES);
        const resolved = resolveCombatSfxEffect(
          COMBAT_SFX_CATALOG,
          COMBAT_SFX_DEFAULTS,
          { category, effectId },
          available,
        );

        expect(resolved, `inimigo "${enemy.id}" sem som de "${category}"`).not.toBeNull();
        expect(resolved?.category).toBe(category);
      }
    }
  });

  it('mantem dano, derrota e vazamento distinguiveis entre si (FR-004)', () => {
    const enemy = ENEMY_TYPES['dois-caras-moto'];
    const ids = ENEMY_CATEGORIES.map((category) =>
      soundProfileEffectId({ category, enemyTypeId: enemy.id }, {}, ENEMY_TYPES),
    );

    expect(new Set(ids).size).toBe(3);
  });

  it('um inimigo sem perfil declarado cai nos sons padrao por categoria (FR-010)', () => {
    const semSom = { ...ENEMY_TYPES['dois-caras-moto'], sound: undefined };
    const roster = { [semSom.id]: semSom };
    const esperados = [
      COMBAT_SFX_IDS.impactDefault,
      COMBAT_SFX_IDS.killDefault,
      COMBAT_SFX_IDS.leakDefault,
    ];

    const resolvidos = ENEMY_CATEGORIES.map((category) => {
      const effectId = soundProfileEffectId({ category, enemyTypeId: semSom.id }, {}, roster);
      expect(effectId).toBeUndefined();
      return resolveCombatSfxEffect(
        COMBAT_SFX_CATALOG,
        COMBAT_SFX_DEFAULTS,
        { category, effectId },
        available,
      )?.id;
    });

    expect(resolvidos).toEqual(esperados);
  });

  it('nao altera HP, velocidade, recompensa nem raio (FR-006)', () => {
    const contract = ACCEPTED_CONTRACTS['enemy.dois-caras-moto.base-stats'];
    const semSom = { ...ENEMY_TYPES['dois-caras-moto'], sound: undefined };

    expect(findContractDrift(contract, semSom)).toEqual(
      findContractDrift(contract, ENEMY_TYPES['dois-caras-moto']),
    );
  });
});
