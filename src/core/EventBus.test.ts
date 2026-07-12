import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EVENT_CATALOG, GameEvents, type GameEventName } from './EventBus';

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
