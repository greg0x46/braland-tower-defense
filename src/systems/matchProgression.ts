/**
 * Contrato de progressao da partida — regra pura, sem Phaser (Constitution IX).
 *
 * Modo ativo: `endless`. Nao existe vitoria nem onda final; a partida so termina
 * em derrota (vida zerada). Este modulo e a fonte unica de "o que pode acontecer
 * em cada estado" — HUD, gameplay e construcao consultam daqui em vez de recombinar
 * booleanos soltos (`paused` + `started` + `over`), combinacao que admitia estados
 * impossiveis.
 */

export const MATCH_MODE = 'endless' as const;

export type MatchState = 'setup-paused' | 'running' | 'paused' | 'defeated';

export type MatchAction = 'start' | 'pause' | 'resume' | 'defeat' | 'reset';

export const INITIAL_MATCH_STATE: MatchState = 'setup-paused';

/**
 * Transicoes validas. Ausente = transicao rejeitada (o estado se preserva).
 *
 * Note que `paused -> defeated` nao existe: derrota exige progressao de gameplay,
 * e gameplay nao avanca pausado. Um vazamento so pode ocorrer em `running`.
 */
const TRANSITIONS: Record<MatchState, Partial<Record<MatchAction, MatchState>>> = {
  'setup-paused': { start: 'running', reset: 'setup-paused' },
  running: { pause: 'paused', defeat: 'defeated', reset: 'setup-paused' },
  paused: { resume: 'running', reset: 'setup-paused' },
  defeated: { reset: 'setup-paused' },
};

/** Proximo estado, ou `null` quando a acao e invalida no estado atual. */
export function transition(state: MatchState, action: MatchAction): MatchState | null {
  return TRANSITIONS[state][action] ?? null;
}

/** Construcao liberada no setup e durante o jogo; travada em pausa e derrota. */
export function canBuild(state: MatchState): boolean {
  return state === 'setup-paused' || state === 'running';
}

/** Iniciar / Pausar / Continuar. Inerte apos a derrota. */
export function canToggleFlow(state: MatchState): boolean {
  return state !== 'defeated';
}

/** Unico estado em que inimigos, torres, projeteis e o relogio de ondas avancam. */
export function advancesGameplay(state: MatchState): boolean {
  return state === 'running';
}

/** Distingue "Iniciar" (primeira vez) de "Continuar" (ja jogou). */
export function hasStarted(state: MatchState): boolean {
  return state !== 'setup-paused';
}

/** Gameplay congelado — inclui o setup pre-inicio e a derrota. */
export function isFrozen(state: MatchState): boolean {
  return !advancesGameplay(state);
}

/** Estado terminal: so sai por reset/restart. */
export function isDefeated(state: MatchState): boolean {
  return state === 'defeated';
}
