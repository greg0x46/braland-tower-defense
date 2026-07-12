import { describe, expect, it } from 'vitest';
import {
  combatSfxVolume,
  createCombatSfxState,
  decideCombatSfx,
  isWellFormedCombatAudioEvent,
  registerCombatSfxPlayback,
  releaseCombatSfxPlayback,
  resetCombatSfxState,
  resolveCombatSfxEffect,
  soundProfileEffectId,
  type CombatSfxCatalog,
  type CombatSfxDefaults,
  type CombatSfxEffect,
  type CombatSfxLimits,
} from './combatSfx';

/**
 * Catálogo de teste, deliberadamente separado do real: estas regras não podem
 * depender do balanceamento de volume/cooldown que o jogo usa hoje (mudar a
 * mixagem não pode quebrar o motor de throttling).
 */
function effect(overrides: Partial<CombatSfxEffect> & Pick<CombatSfxEffect, 'id' | 'category'>): CombatSfxEffect {
  return {
    cacheKey: `cache-${overrides.id}`,
    defaultVolume: 0.5,
    cooldownMs: 100,
    maxConcurrent: 2,
    priority: 10,
    ...overrides,
  };
}

const CATALOG: CombatSfxCatalog = {
  attack: effect({ id: 'attack', category: 'tower-attack' }),
  'attack-caramelo': effect({
    id: 'attack-caramelo',
    category: 'tower-attack',
    fallbackId: 'attack',
  }),
  impact: effect({ id: 'impact', category: 'enemy-damaged' }),
  kill: effect({ id: 'kill', category: 'enemy-killed', priority: 50 }),
  leak: effect({ id: 'leak', category: 'enemy-leaked', priority: 90, cooldownMs: 200 }),
  // Ciclo proposital: a resolução não pode entrar em laço infinito por dado ruim.
  'ciclo-a': effect({ id: 'ciclo-a', category: 'tower-attack', fallbackId: 'ciclo-b' }),
  'ciclo-b': effect({ id: 'ciclo-b', category: 'tower-attack', fallbackId: 'ciclo-a' }),
};

const DEFAULTS: CombatSfxDefaults = {
  'tower-attack': 'attack',
  'enemy-damaged': 'impact',
  'enemy-killed': 'kill',
  'enemy-leaked': 'leak',
};

const LIMITS: CombatSfxLimits = {
  maxSimultaneous: 4,
  alwaysAudiblePriority: 80,
  categorySpacingMs: 40,
};

const ALL_AVAILABLE = (): boolean => true;
const NONE_AVAILABLE = (): boolean => false;
const availableExcept = (...missing: string[]) => (candidate: CombatSfxEffect): boolean =>
  !missing.includes(candidate.id);

describe('resolveCombatSfxEffect', () => {
  it('usa o efeito do perfil quando ele existe e carregou', () => {
    const resolved = resolveCombatSfxEffect(
      CATALOG,
      DEFAULTS,
      { category: 'tower-attack', effectId: 'attack-caramelo' },
      ALL_AVAILABLE,
    );

    expect(resolved?.id).toBe('attack-caramelo');
  });

  it('cai no padrao da categoria quando o tipo nao declara efeito', () => {
    const resolved = resolveCombatSfxEffect(
      CATALOG,
      DEFAULTS,
      { category: 'enemy-killed' },
      ALL_AVAILABLE,
    );

    expect(resolved?.id).toBe('kill');
  });

  it('cai no padrao da categoria quando o id declarado nao existe no catalogo', () => {
    const resolved = resolveCombatSfxEffect(
      CATALOG,
      DEFAULTS,
      { category: 'tower-attack', effectId: 'inexistente' },
      ALL_AVAILABLE,
    );

    expect(resolved?.id).toBe('attack');
  });

  it('segue o fallbackId quando o efeito especifico nao carregou', () => {
    const resolved = resolveCombatSfxEffect(
      CATALOG,
      DEFAULTS,
      { category: 'tower-attack', effectId: 'attack-caramelo' },
      availableExcept('attack-caramelo'),
    );

    expect(resolved?.id).toBe('attack');
  });

  it('devolve null quando nem o efeito, nem o fallback, nem o padrao carregaram', () => {
    const resolved = resolveCombatSfxEffect(
      CATALOG,
      DEFAULTS,
      { category: 'tower-attack', effectId: 'attack-caramelo' },
      NONE_AVAILABLE,
    );

    // Sem som: o jogo segue jogável em silêncio para este efeito (FR-009).
    expect(resolved).toBeNull();
  });

  it('nao entra em laco infinito quando o dado tem ciclo de fallback', () => {
    const resolved = resolveCombatSfxEffect(
      CATALOG,
      DEFAULTS,
      { category: 'tower-attack', effectId: 'ciclo-a' },
      availableExcept('ciclo-a', 'ciclo-b'),
    );

    // Percorre o ciclo uma vez, desiste e usa o padrão da categoria.
    expect(resolved?.id).toBe('attack');
  });

  it('e deterministico: a mesma entrada resolve sempre o mesmo efeito', () => {
    const first = resolveCombatSfxEffect(
      CATALOG,
      DEFAULTS,
      { category: 'enemy-damaged' },
      ALL_AVAILABLE,
    );
    const second = resolveCombatSfxEffect(
      CATALOG,
      DEFAULTS,
      { category: 'enemy-damaged' },
      ALL_AVAILABLE,
    );

    expect(first?.id).toBe(second?.id);
  });
});

describe('soundProfileEffectId', () => {
  const TOWERS = {
    'vira-lata-caramelo': { sound: { attack: 'attack-caramelo' } },
    // Torre com timbre próprio no golpe que chega (a chinelada).
    'mae-de-havaianas': { sound: { attack: 'attack', impact: 'impact-chinelada' } },
    'sem-som': {},
  };
  const ENEMIES = {
    'dois-caras-moto': {
      sound: { damaged: 'impact', killed: 'kill', leaked: 'leak' },
    },
    'sem-som': {},
  };

  it('le o efeito de ataque do perfil da torre', () => {
    const id = soundProfileEffectId(
      { category: 'tower-attack', towerTypeId: 'vira-lata-caramelo' },
      TOWERS,
      ENEMIES,
    );

    expect(id).toBe('attack-caramelo');
  });

  it('le dano, derrota e vazamento do perfil do inimigo', () => {
    const damaged = soundProfileEffectId(
      { category: 'enemy-damaged', enemyTypeId: 'dois-caras-moto' },
      TOWERS,
      ENEMIES,
    );
    const killed = soundProfileEffectId(
      { category: 'enemy-killed', enemyTypeId: 'dois-caras-moto' },
      TOWERS,
      ENEMIES,
    );
    const leaked = soundProfileEffectId(
      { category: 'enemy-leaked', enemyTypeId: 'dois-caras-moto' },
      TOWERS,
      ENEMIES,
    );

    expect([damaged, killed, leaked]).toEqual(['impact', 'kill', 'leak']);
  });

  it('devolve undefined quando o tipo nao declara perfil (resolve no padrao depois)', () => {
    expect(
      soundProfileEffectId({ category: 'tower-attack', towerTypeId: 'sem-som' }, TOWERS, ENEMIES),
    ).toBeUndefined();
    expect(
      soundProfileEffectId({ category: 'enemy-damaged', enemyTypeId: 'desconhecido' }, TOWERS, ENEMIES),
    ).toBeUndefined();
  });

  /**
   * A arma ganha do alvo: o baque do chinelo é do chinelo. Sem esta ordem, a torre de
   * elite soaria igual à mordida do cachorro e perderia a assinatura sonora.
   */
  it('prefere o impacto declarado pela torre ao som de dano do inimigo', () => {
    const id = soundProfileEffectId(
      {
        category: 'enemy-damaged',
        towerTypeId: 'mae-de-havaianas',
        enemyTypeId: 'dois-caras-moto',
      },
      TOWERS,
      ENEMIES,
    );

    expect(id).toBe('impact-chinelada');
  });

  it('usa o som de dano do inimigo quando a torre nao declara impacto proprio', () => {
    const id = soundProfileEffectId(
      {
        category: 'enemy-damaged',
        towerTypeId: 'vira-lata-caramelo',
        enemyTypeId: 'dois-caras-moto',
      },
      TOWERS,
      ENEMIES,
    );

    expect(id).toBe('impact');
  });

  it('respeita o override explicito do produtor', () => {
    const id = soundProfileEffectId(
      { category: 'tower-attack', towerTypeId: 'vira-lata-caramelo', effectId: 'attack' },
      TOWERS,
      ENEMIES,
    );

    expect(id).toBe('attack');
  });
});

describe('decideCombatSfx', () => {
  it('toca o primeiro evento de um efeito', () => {
    const state = createCombatSfxState();

    expect(decideCombatSfx(state, CATALOG.attack, 0, LIMITS).kind).toBe('play');
  });

  it('suprime o mesmo efeito dentro do cooldown e libera depois dele', () => {
    const state = createCombatSfxState();
    registerCombatSfxPlayback(state, CATALOG.attack, 1_000);

    const cedo = decideCombatSfx(state, CATALOG.attack, 1_050, LIMITS);
    expect(cedo).toEqual({ kind: 'suppressed', reason: 'cooldown' });

    const noPrazo = decideCombatSfx(state, CATALOG.attack, 1_100, LIMITS);
    expect(noPrazo.kind).toBe('play');
  });

  it('suprime alem do limite de instancias simultaneas do mesmo efeito', () => {
    const state = createCombatSfxState();
    // maxConcurrent = 2; o cooldown não pode mascarar o teste, então espaça os tempos.
    registerCombatSfxPlayback(state, CATALOG.impact, 0);
    registerCombatSfxPlayback(state, CATALOG.impact, 200);

    expect(decideCombatSfx(state, CATALOG.impact, 400, LIMITS)).toEqual({
      kind: 'suppressed',
      reason: 'concurrency',
    });

    releaseCombatSfxPlayback(state, CATALOG.impact);
    expect(decideCombatSfx(state, CATALOG.impact, 400, LIMITS).kind).toBe('play');
  });

  it('espaca sons diferentes da mesma categoria (janela de categoria)', () => {
    const state = createCombatSfxState();
    registerCombatSfxPlayback(state, CATALOG['attack-caramelo'], 1_000);

    // Efeito diferente, mesma categoria: o cooldown próprio dele não protegeria nada.
    expect(decideCombatSfx(state, CATALOG.attack, 1_020, LIMITS)).toEqual({
      kind: 'suppressed',
      reason: 'category-window',
    });
    expect(decideCombatSfx(state, CATALOG.attack, 1_045, LIMITS).kind).toBe('play');
  });

  it('suprime efeito comum quando o teto global de sons ativos esta cheio', () => {
    const state = createCombatSfxState();
    registerCombatSfxPlayback(state, CATALOG.attack, 0);
    registerCombatSfxPlayback(state, CATALOG['attack-caramelo'], 0);
    registerCombatSfxPlayback(state, CATALOG.impact, 0);
    registerCombatSfxPlayback(state, CATALOG.kill, 0);

    expect(decideCombatSfx(state, CATALOG.impact, 500, LIMITS)).toEqual({
      kind: 'suppressed',
      reason: 'saturated',
    });
  });

  /**
   * O ponto de SC-005: numa onda intensa o alerta de vazamento não pode sumir
   * atrás da massa de impactos. Ele fura o teto global — mas não o próprio limite.
   */
  it('preserva o alerta de vazamento sob rajada de impactos', () => {
    const state = createCombatSfxState();
    let now = 0;

    for (let i = 0; i < 30; i++) {
      now += 10;
      const decision = decideCombatSfx(state, CATALOG.impact, now, LIMITS);
      if (decision.kind === 'play') registerCombatSfxPlayback(state, CATALOG.impact, now);
    }

    expect(decideCombatSfx(state, CATALOG.leak, now, LIMITS).kind).toBe('play');

    registerCombatSfxPlayback(state, CATALOG.leak, now);
    // ...mas o próprio limite continua valendo: dois vazamentos colados não empilham.
    expect(decideCombatSfx(state, CATALOG.leak, now + 10, LIMITS)).toEqual({
      kind: 'suppressed',
      reason: 'cooldown',
    });
  });

  it('limita a rajada de impactos em vez de tocar todos', () => {
    const state = createCombatSfxState();
    let played = 0;
    let now = 0;

    // 40 inimigos levando dano em 400ms: sem limitação, seriam 40 sons.
    for (let i = 0; i < 40; i++) {
      now += 10;
      if (decideCombatSfx(state, CATALOG.impact, now, LIMITS).kind === 'play') {
        registerCombatSfxPlayback(state, CATALOG.impact, now);
        played++;
      }
    }

    expect(played).toBeLessThanOrEqual(5);
    expect(played).toBeGreaterThan(0);
  });

  it('toca quando o relogio anda para tras (partida nova comeca do zero)', () => {
    const state = createCombatSfxState();
    registerCombatSfxPlayback(state, CATALOG.attack, 90_000);

    expect(decideCombatSfx(state, CATALOG.attack, 5, LIMITS).kind).toBe('play');
  });
});

describe('resetCombatSfxState', () => {
  it('limpa janelas de throttle e contagem de ativos (FR-011)', () => {
    const state = createCombatSfxState();
    registerCombatSfxPlayback(state, CATALOG.impact, 1_000);
    registerCombatSfxPlayback(state, CATALOG.impact, 1_200);
    registerCombatSfxPlayback(state, CATALOG.leak, 1_200);

    expect(decideCombatSfx(state, CATALOG.impact, 1_250, LIMITS).kind).toBe('suppressed');

    resetCombatSfxState(state);

    // Depois do reset, o mesmo instante que estava bloqueado volta a tocar: nenhum
    // som da partida anterior atravessa para a nova.
    expect(decideCombatSfx(state, CATALOG.impact, 1_250, LIMITS).kind).toBe('play');
    expect(decideCombatSfx(state, CATALOG.leak, 1_250, LIMITS).kind).toBe('play');
  });
});

describe('combatSfxVolume', () => {
  it('multiplica o volume efetivo pelo volume relativo do efeito (P2)', () => {
    expect(combatSfxVolume(1, CATALOG.attack)).toBeCloseTo(0.5);
    expect(combatSfxVolume(0.5, CATALOG.attack)).toBeCloseTo(0.25);
    expect(combatSfxVolume(0.35, CATALOG.leak)).toBeCloseTo(0.175);
  });

  it('mudo (volume efetivo 0) zera o volume de qualquer efeito', () => {
    for (const candidate of Object.values(CATALOG)) {
      expect(combatSfxVolume(0, candidate)).toBe(0);
    }
  });

  it('nunca sai de [0,1] mesmo com entrada fora de faixa', () => {
    expect(combatSfxVolume(-1, CATALOG.attack)).toBe(0);
    expect(combatSfxVolume(4, { ...CATALOG.attack, defaultVolume: 4 })).toBe(1);
  });
});

describe('isWellFormedCombatAudioEvent', () => {
  it('exige towerTypeId no ataque e enemyTypeId nos eventos de inimigo (C2)', () => {
    expect(
      isWellFormedCombatAudioEvent({
        eventId: 'a',
        category: 'tower-attack',
        towerTypeId: 'vira-lata-caramelo',
        occurredAtMs: 1,
      }),
    ).toBe(true);
    expect(
      isWellFormedCombatAudioEvent({ eventId: 'a', category: 'tower-attack', occurredAtMs: 1 }),
    ).toBe(false);
    expect(
      isWellFormedCombatAudioEvent({
        eventId: 'b',
        category: 'enemy-damaged',
        enemyTypeId: 'dois-caras-moto',
        occurredAtMs: 1,
      }),
    ).toBe(true);
    expect(
      isWellFormedCombatAudioEvent({ eventId: 'b', category: 'enemy-damaged', occurredAtMs: 1 }),
    ).toBe(false);
  });

  it('rejeita tempo invalido', () => {
    expect(
      isWellFormedCombatAudioEvent({
        eventId: 'c',
        category: 'enemy-killed',
        enemyTypeId: 'dois-caras-moto',
        occurredAtMs: Number.NaN,
      }),
    ).toBe(false);
  });
});
