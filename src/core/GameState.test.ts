import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EventBus, GameEvents, emitGameEvent } from './EventBus';
import { GameState } from './GameState';
import { STARTING_LIVES, STARTING_MONEY } from './constants';

interface RecordedEvent {
  name: string;
  payload: unknown;
}

let disposeRecorder: (() => void) | null = null;

/**
 * Grava a ordem e o payload de tudo que passa pelo barramento.
 *
 * Remove só os próprios ouvintes ao final: o GameState assina ENEMY_KILLED e
 * ENEMY_LEAKED no construtor, e um `removeAllListeners()` derrubaria a economia
 * junto.
 */
function recordEvents(): RecordedEvent[] {
  const log: RecordedEvent[] = [];
  const handlers: [string, (payload: unknown) => void][] = [];

  for (const name of Object.values(GameEvents)) {
    const handler = (payload: unknown): void => {
      log.push({ name, payload });
    };
    EventBus.on(name, handler);
    handlers.push([name, handler]);
  }

  disposeRecorder = () => {
    for (const [name, handler] of handlers) EventBus.off(name, handler);
  };
  return log;
}

describe('GameState', () => {
  beforeEach(() => {
    GameState.reset();
  });

  afterEach(() => {
    disposeRecorder?.();
    disposeRecorder = null;
  });

  describe('economia', () => {
    it('debita e avisa o HUD quando ha saldo', () => {
      const log = recordEvents();

      expect(GameState.spend(50)).toBe(true);
      expect(GameState.money).toBe(STARTING_MONEY - 50);
      expect(log).toEqual([
        { name: GameEvents.MONEY_CHANGED, payload: { money: STARTING_MONEY - 50 } },
      ]);
    });

    it('compra sem saldo nao muda o dinheiro nem emite evento', () => {
      const log = recordEvents();

      expect(GameState.spend(STARTING_MONEY + 1)).toBe(false);
      expect(GameState.money).toBe(STARTING_MONEY);
      expect(log).toEqual([]);
    });

    it('o dinheiro nunca fica negativo gastando', () => {
      while (GameState.spend(50));

      expect(GameState.money).toBeGreaterThanOrEqual(0);
    });

    it('credita a recompensa ao consumir ENEMY_KILLED', () => {
      emitGameEvent(GameEvents.ENEMY_KILLED, { enemyTypeId: 'dois-caras-moto', reward: 8 });

      expect(GameState.money).toBe(STARTING_MONEY + 8);
    });
  });

  describe('vida e derrota', () => {
    it('aplica o dano ao consumir ENEMY_LEAKED', () => {
      emitGameEvent(GameEvents.ENEMY_LEAKED, { enemyTypeId: 'dois-caras-moto', damage: 1 });

      expect(GameState.lives).toBe(STARTING_LIVES - 1);
    });

    it('a vida nunca fica negativa', () => {
      GameState.togglePause(); // setup-paused -> running
      GameState.loseLife(STARTING_LIVES + 5);

      expect(GameState.lives).toBe(0);
    });

    it('perder a ultima vida emite LIVES_CHANGED antes de MATCH_DEFEATED', () => {
      GameState.togglePause(); // precisa estar rodando para a derrota ser valida
      const log = recordEvents();

      GameState.loseLife(STARTING_LIVES);

      const names = log.map((entry) => entry.name);
      expect(names).toEqual([GameEvents.LIVES_CHANGED, GameEvents.MATCH_DEFEATED]);
      expect(log[0].payload).toEqual({ lives: 0 });
      expect(log[1].payload).toEqual({ reason: 'lives-depleted' });
    });

    it('a derrota e terminal: dano extra nao reemite nada', () => {
      GameState.togglePause();
      GameState.loseLife(STARTING_LIVES);
      const log = recordEvents();

      GameState.loseLife(1);

      expect(GameState.isOver).toBe(true);
      expect(log).toEqual([]);
    });

    it('nao ha derrota sem gameplay avancando (pausado ninguem vaza)', () => {
      GameState.loseLife(STARTING_LIVES); // ainda em setup-paused

      expect(GameState.lives).toBe(0);
      expect(GameState.isOver).toBe(false); // transicao rejeitada pelo contrato
    });
  });

  describe('fluxo da partida', () => {
    it('comeca em setup-paused: constroi, mas o gameplay nao avanca', () => {
      expect(GameState.state).toBe('setup-paused');
      expect(GameState.isBuildLocked).toBe(false);
      expect(GameState.advancesGameplay).toBe(false);
    });

    it('iniciar avanca o gameplay e informa o HUD', () => {
      const log = recordEvents();

      GameState.togglePause();

      expect(GameState.state).toBe('running');
      expect(GameState.advancesGameplay).toBe(true);
      expect(log).toEqual([
        { name: GameEvents.PAUSE_STATE_CHANGED, payload: { paused: false, started: true } },
      ]);
    });

    it('pausar depois de iniciar trava a construcao', () => {
      GameState.togglePause(); // iniciar
      GameState.togglePause(); // pausar

      expect(GameState.state).toBe('paused');
      expect(GameState.isBuildLocked).toBe(true);
      expect(GameState.advancesGameplay).toBe(false);
    });

    it('o botao fica inerte apos a derrota', () => {
      GameState.togglePause();
      GameState.loseLife(STARTING_LIVES);
      const log = recordEvents();

      GameState.togglePause();

      expect(GameState.state).toBe('defeated');
      expect(log).toEqual([]);
    });

    it('reset volta ao setup-paused e zera economia, vida e onda', () => {
      GameState.togglePause();
      GameState.spend(50);
      GameState.setWave(7, 0);
      GameState.loseLife(STARTING_LIVES);

      const log = recordEvents();
      GameState.reset();

      expect(GameState.state).toBe('setup-paused');
      expect(GameState.money).toBe(STARTING_MONEY);
      expect(GameState.lives).toBe(STARTING_LIVES);
      expect(GameState.wave).toBe(0);
      expect(log.map((entry) => entry.name)).toEqual([
        GameEvents.MONEY_CHANGED,
        GameEvents.LIVES_CHANGED,
        GameEvents.WAVE_CHANGED,
        GameEvents.MATCH_RESET,
      ]);
    });

    it('a onda infinita viaja com total 0', () => {
      const log = recordEvents();

      GameState.setWave(3, 0);

      expect(log).toEqual([
        { name: GameEvents.WAVE_CHANGED, payload: { wave: 3, total: 0 } },
      ]);
    });
  });
});
