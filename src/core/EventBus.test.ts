import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  emitGameEvent,
  EventBus,
  EVENT_CATALOG,
  GameEvents,
  offGameEvent,
  onGameEvent,
  type CombatAudioEventPayload,
  type CombatSfxCategory,
  type GameEventName,
} from './EventBus';

const SRC_DIR = join(import.meta.dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) return [];
    return [path];
  });
}

/** Código de produção (sem testes) — onde um evento reservado nunca pode ser emitido. */
const PRODUCTION_SOURCE = sourceFiles(SRC_DIR)
  .filter((path) => !path.endsWith(join('core', 'EventBus.ts')))
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n');

const catalogEntries = Object.entries(EVENT_CATALOG) as [GameEventName, (typeof EVENT_CATALOG)[GameEventName]][];

/** Nome da constante (`MONEY_CHANGED`) a partir do valor do evento (`money-changed`). */
function constantName(event: GameEventName): string {
  const found = Object.entries(GameEvents).find(([, value]) => value === event);
  return found![0];
}

describe('EVENT_CATALOG', () => {
  it('descreve todo evento declarado em GameEvents', () => {
    for (const event of Object.values(GameEvents)) {
      expect(EVENT_CATALOG[event], `evento "${event}" fora do catalogo`).toBeDefined();
    }
    expect(catalogEntries).toHaveLength(Object.values(GameEvents).length);
  });

  it('todo evento ativo tem produtor e ao menos um consumidor (SC-004)', () => {
    for (const [event, contract] of catalogEntries) {
      if (contract.status !== 'active') continue;
      expect(contract.producer.trim(), `evento ativo "${event}" sem produtor`).not.toBe('');
      expect(contract.consumers.length, `evento ativo "${event}" sem consumidor`).toBeGreaterThan(0);
    }
  });

  it('todo evento tem regra de emissao declarada', () => {
    for (const [event, contract] of catalogEntries) {
      expect(contract.emissionRules.trim(), `evento "${event}" sem regra de emissao`).not.toBe('');
    }
  });

  it('todo evento reservado declara o uso futuro esperado e nao tem consumidor', () => {
    for (const [event, contract] of catalogEntries) {
      if (contract.status !== 'reserved') continue;
      expect(contract.reservedFor?.trim(), `reservado "${event}" sem uso futuro`).toBeTruthy();
      expect(contract.consumers, `reservado "${event}" nao deveria ter consumidor`).toEqual([]);
    }
  });

  /**
   * O ponto da US4: um evento reservado nao pode ser emitido pelo gameplay atual.
   * Varre o codigo de producao atras de `emitGameEvent(GameEvents.X` — se alguem
   * ativar um evento reservado sem atualizar o catalogo, o portao acusa.
   */
  it('nenhum evento reservado e emitido pelo gameplay atual (FR-009)', () => {
    for (const [event, contract] of catalogEntries) {
      if (contract.status !== 'reserved') continue;
      const emission = `emitGameEvent(GameEvents.${constantName(event)}`;
      expect(
        PRODUCTION_SOURCE.includes(emission),
        `evento reservado "${event}" esta sendo emitido; ative-o no catalogo ou remova a emissao`,
      ).toBe(false);
    }
  });

  it('todo evento ativo e de fato emitido pelo codigo de producao', () => {
    for (const [event, contract] of catalogEntries) {
      if (contract.status !== 'active') continue;
      const emission = `emitGameEvent(GameEvents.${constantName(event)}`;
      expect(
        PRODUCTION_SOURCE.includes(emission),
        `evento ativo "${event}" nao tem produtor real; marque-o como reservado`,
      ).toBe(true);
    }
  });

  it('todo evento ativo e de fato consumido pelo codigo de producao', () => {
    for (const [event, contract] of catalogEntries) {
      if (contract.status !== 'active') continue;
      const subscription = `onGameEvent(GameEvents.${constantName(event)}`;
      expect(
        PRODUCTION_SOURCE.includes(subscription),
        `evento ativo "${event}" nao tem consumidor real; marque-o como reservado`,
      ).toBe(true);
    }
  });
});

/** Contratos de audio de combate (011) — C2, C3 e C5 de `combat-audio-events.md`. */
describe('COMBAT_AUDIO_EVENT', () => {
  const contract = EVENT_CATALOG[GameEvents.COMBAT_AUDIO_EVENT];

  it('e um evento ativo de apresentacao, produzido pela cena e consumido pelo manager de SFX', () => {
    expect(contract.status).toBe('active');
    expect(contract.producer).toContain('GameScene');
    expect(contract.consumers.join(' ')).toContain('CombatSfxManager');
  });

  it('entrega ao consumidor o payload suficiente para resolver perfil e fallback (C2)', () => {
    const received: CombatAudioEventPayload[] = [];
    const listener = (payload: CombatAudioEventPayload): void => {
      received.push(payload);
    };
    onGameEvent(GameEvents.COMBAT_AUDIO_EVENT, listener);

    emitGameEvent(GameEvents.COMBAT_AUDIO_EVENT, {
      eventId: 'sfx-1',
      category: 'tower-attack',
      towerTypeId: 'vira-lata-caramelo',
      x: 100,
      y: 200,
      occurredAtMs: 1_500,
    });
    emitGameEvent(GameEvents.COMBAT_AUDIO_EVENT, {
      eventId: 'sfx-2',
      category: 'enemy-damaged',
      enemyTypeId: 'dois-caras-moto',
      x: 110,
      y: 210,
      occurredAtMs: 1_520,
    });

    offGameEvent(GameEvents.COMBAT_AUDIO_EVENT, listener);

    expect(received).toHaveLength(2);
    // `tower-attack` sempre traz o tipo da torre; eventos de inimigo, o do inimigo.
    expect(received[0].towerTypeId).toBe('vira-lata-caramelo');
    expect(received[1].enemyTypeId).toBe('dois-caras-moto');
    // O payload nao e fonte de verdade de dano/recompensa/vida.
    for (const payload of received) {
      expect(payload).not.toHaveProperty('damage');
      expect(payload).not.toHaveProperty('reward');
      expect(payload).not.toHaveProperty('lives');
      expect(payload.occurredAtMs).toBeGreaterThan(0);
    }
  });

  it('nao entrega mais nada depois que o consumidor sai (C5: reset nao duplica listener)', () => {
    let calls = 0;
    const listener = (): void => {
      calls++;
    };

    onGameEvent(GameEvents.COMBAT_AUDIO_EVENT, listener);
    emitGameEvent(GameEvents.COMBAT_AUDIO_EVENT, {
      eventId: 'sfx-3',
      category: 'enemy-damaged',
      enemyTypeId: 'dois-caras-moto',
      occurredAtMs: 10,
    });
    offGameEvent(GameEvents.COMBAT_AUDIO_EVENT, listener);
    emitGameEvent(GameEvents.COMBAT_AUDIO_EVENT, {
      eventId: 'sfx-4',
      category: 'enemy-damaged',
      enemyTypeId: 'dois-caras-moto',
      occurredAtMs: 20,
    });

    expect(calls).toBe(1);
    expect(EventBus.listenerCount(GameEvents.COMBAT_AUDIO_EVENT)).toBe(0);
  });

  it('cobre as quatro categorias audiveis do combate', () => {
    const categories: CombatSfxCategory[] = [
      'tower-attack',
      'enemy-damaged',
      'enemy-killed',
      'enemy-leaked',
    ];
    expect(new Set(categories).size).toBe(4);
  });
});

describe('CombatSfxManager como consumidor dos eventos existentes', () => {
  it('escuta derrota, vazamento, preferencia de audio e reset', () => {
    const listened = [
      GameEvents.ENEMY_KILLED,
      GameEvents.ENEMY_LEAKED,
      GameEvents.AUDIO_SETTINGS_CHANGED,
      GameEvents.MATCH_RESET,
    ] as const;

    for (const event of listened) {
      expect(
        EVENT_CATALOG[event].consumers.join(' '),
        `"${event}" deveria listar o CombatSfxManager como consumidor`,
      ).toContain('CombatSfxManager');
    }
  });

  /**
   * C3: som de derrota/vazamento e efeito colateral de apresentacao. Recompensa e
   * dano a base continuam no GameState — mover isso para o audio quebraria o jogo
   * quando o som falhasse.
   */
  it('nao toma para si a recompensa nem o dano a base (C3)', () => {
    expect(EVENT_CATALOG[GameEvents.ENEMY_KILLED].consumers.join(' ')).toContain('GameState');
    expect(EVENT_CATALOG[GameEvents.ENEMY_LEAKED].consumers.join(' ')).toContain('GameState');
  });
});
