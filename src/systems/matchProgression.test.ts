import { describe, expect, it } from 'vitest';
import {
  advancesGameplay,
  canBuild,
  canToggleFlow,
  hasStarted,
  isDefeated,
  INITIAL_MATCH_STATE,
  MATCH_MODE,
  transition,
  type MatchAction,
  type MatchState,
} from './matchProgression';

const ALL_STATES: MatchState[] = ['setup-paused', 'running', 'paused', 'defeated'];
const ALL_ACTIONS: MatchAction[] = ['start', 'pause', 'resume', 'defeat', 'reset'];

describe('modo de partida', () => {
  it('e endless: a partida comeca no setup pausado e nao promete vitoria', () => {
    expect(MATCH_MODE).toBe('endless');
    expect(INITIAL_MATCH_STATE).toBe('setup-paused');
  });
});

describe('matriz de compatibilidade de estados', () => {
  // Espelha a tabela "State Compatibility Matrix" do data-model.md.
  const matrix: Record<MatchState, { build: boolean; flow: boolean; advances: boolean }> = {
    'setup-paused': { build: true, flow: true, advances: false },
    running: { build: true, flow: true, advances: true },
    paused: { build: false, flow: true, advances: false },
    defeated: { build: false, flow: false, advances: false },
  };

  for (const state of ALL_STATES) {
    it(`${state}: build=${matrix[state].build} flow=${matrix[state].flow} advances=${matrix[state].advances}`, () => {
      expect(canBuild(state)).toBe(matrix[state].build);
      expect(canToggleFlow(state)).toBe(matrix[state].flow);
      expect(advancesGameplay(state)).toBe(matrix[state].advances);
    });
  }
});

describe('transicoes', () => {
  it('setup-paused -> running ao iniciar', () => {
    expect(transition('setup-paused', 'start')).toBe('running');
  });

  it('running -> paused -> running sem perder o progresso', () => {
    const paused = transition('running', 'pause');
    expect(paused).toBe('paused');
    expect(transition(paused!, 'resume')).toBe('running');
  });

  it('running -> defeated quando a vida zera', () => {
    expect(transition('running', 'defeat')).toBe('defeated');
  });

  it('reset volta ao setup-paused a partir de qualquer estado', () => {
    for (const state of ALL_STATES) {
      expect(transition(state, 'reset')).toBe('setup-paused');
    }
  });

  it('rejeita derrota direta a partir da pausa (derrota exige gameplay avancando)', () => {
    expect(transition('paused', 'defeat')).toBeNull();
  });

  it('rejeita iniciar duas vezes e continuar sem estar pausado', () => {
    expect(transition('running', 'start')).toBeNull();
    expect(transition('setup-paused', 'resume')).toBeNull();
    expect(transition('setup-paused', 'pause')).toBeNull();
  });

  it('derrota e terminal: so o reset sai dela', () => {
    for (const action of ALL_ACTIONS) {
      const next = transition('defeated', action);
      if (action === 'reset') expect(next).toBe('setup-paused');
      else expect(next).toBeNull();
    }
  });

  it('nunca produz um estado fora do contrato', () => {
    for (const state of ALL_STATES) {
      for (const action of ALL_ACTIONS) {
        const next = transition(state, action);
        if (next !== null) expect(ALL_STATES).toContain(next);
      }
    }
  });
});

describe('alvos de regressao do contrato de partida', () => {
  it('iniciar do setup nao pula a onda 1: gameplay so avanca depois do start', () => {
    expect(advancesGameplay('setup-paused')).toBe(false);
    expect(advancesGameplay(transition('setup-paused', 'start')!)).toBe(true);
  });

  it('pausar nao avanca timers, inimigos, torres nem projeteis', () => {
    expect(advancesGameplay('paused')).toBe(false);
  });

  it('derrota interrompe a progressao do gameplay', () => {
    expect(advancesGameplay('defeated')).toBe(false);
    expect(isDefeated('defeated')).toBe(true);
  });

  it('a pausa apos o inicio trava a construcao, mas o setup nao', () => {
    expect(canBuild('setup-paused')).toBe(true);
    expect(canBuild('paused')).toBe(false);
  });

  it('distingue Iniciar de Continuar', () => {
    expect(hasStarted('setup-paused')).toBe(false);
    expect(hasStarted('paused')).toBe(true);
    expect(hasStarted('running')).toBe(true);
  });
});
