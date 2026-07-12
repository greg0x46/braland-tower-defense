import { describe, expect, it } from 'vitest';
import {
  BACKGROUND_TRACK,
  COMBAT_SFX_CATALOG,
  COMBAT_SFX_DEFAULTS,
  COMBAT_SFX_IDS,
  COMBAT_SFX_LIMITS,
} from './audio';
import type { CombatSfxCategory, CombatSfxEffect } from '../systems/combatSfx';

const CATEGORIES: CombatSfxCategory[] = [
  'tower-attack',
  'enemy-damaged',
  'enemy-killed',
  'enemy-leaked',
];

const EFFECTS: CombatSfxEffect[] = Object.values(COMBAT_SFX_CATALOG);

describe('COMBAT_SFX_CATALOG', () => {
  it('tem um efeito padrao para cada categoria audivel', () => {
    for (const category of CATEGORIES) {
      const defaultId = COMBAT_SFX_DEFAULTS[category];
      const effect = COMBAT_SFX_CATALOG[defaultId];

      expect(effect, `categoria "${category}" sem efeito padrao`).toBeDefined();
      expect(effect.category).toBe(category);
    }
  });

  it('materializa no catalogo todo id que um perfil sonoro pode declarar', () => {
    for (const id of Object.values(COMBAT_SFX_IDS)) {
      expect(COMBAT_SFX_CATALOG[id], `id "${id}" declarado mas ausente do catalogo`).toBeDefined();
      expect(COMBAT_SFX_CATALOG[id].id).toBe(id);
    }

    expect(Object.keys(COMBAT_SFX_CATALOG)).toHaveLength(Object.values(COMBAT_SFX_IDS).length);
  });

  it('mantem id e cacheKey preenchidos e unicos', () => {
    for (const effect of EFFECTS) {
      expect(effect.id.trim()).not.toBe('');
      expect(effect.cacheKey.trim()).not.toBe('');
    }

    expect(new Set(EFFECTS.map((effect) => effect.id)).size).toBe(EFFECTS.length);
    expect(new Set(EFFECTS.map((effect) => effect.cacheKey)).size).toBe(EFFECTS.length);
  });

  it('respeita os limites do modelo de dados (volume, cooldown, concorrencia)', () => {
    for (const effect of EFFECTS) {
      expect(effect.defaultVolume).toBeGreaterThanOrEqual(0);
      expect(effect.defaultVolume).toBeLessThanOrEqual(1);
      expect(effect.cooldownMs).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(effect.maxConcurrent)).toBe(true);
      expect(effect.maxConcurrent).toBeGreaterThan(0);
    }
  });

  it('aponta fallback para efeito existente e sem ciclo', () => {
    for (const effect of EFFECTS) {
      const visited = new Set<string>([effect.id]);
      let current = effect.fallbackId;

      while (current !== undefined) {
        expect(COMBAT_SFX_CATALOG[current], `fallback "${current}" nao existe`).toBeDefined();
        expect(visited.has(current), `ciclo de fallback a partir de "${effect.id}"`).toBe(false);
        visited.add(current);
        current = COMBAT_SFX_CATALOG[current].fallbackId;
      }
    }
  });

  /**
   * FR-007: o efeito é um destaque momentâneo, não uma segunda camada de música. Se
   * um SFX passar o volume da trilha, ele abafa o que deveria acompanhar.
   */
  it('mantem os efeitos abaixo do volume base da trilha', () => {
    for (const effect of EFFECTS) {
      expect(effect.defaultVolume).toBeLessThan(BACKGROUND_TRACK.defaultVolume * 2);
      expect(effect.defaultVolume).toBeGreaterThan(0);
    }
  });

  /** SC-005: o alerta de vazamento precisa furar a rajada de impactos. */
  it('da ao vazamento prioridade suficiente para atravessar o teto global', () => {
    const leak = COMBAT_SFX_CATALOG[COMBAT_SFX_DEFAULTS['enemy-leaked']];
    const damaged = COMBAT_SFX_CATALOG[COMBAT_SFX_DEFAULTS['enemy-damaged']];

    expect(leak.priority).toBeGreaterThanOrEqual(COMBAT_SFX_LIMITS.alwaysAudiblePriority);
    expect(damaged.priority).toBeLessThan(COMBAT_SFX_LIMITS.alwaysAudiblePriority);
    expect(leak.priority).toBeGreaterThan(damaged.priority);
  });
});
