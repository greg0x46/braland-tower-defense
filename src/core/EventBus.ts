import EventEmitter from 'eventemitter3';

/**
 * Barramento de eventos global (singleton) para desacoplar a cena de gameplay
 * (GameScene) do HUD (UIScene) e do estado de partida (GameState).
 *
 * O emissor vem do `eventemitter3` — a mesma implementação que o
 * `Phaser.Events.EventEmitter` embrulha — e não do Phaser. Assim o `core/` não
 * arrasta o motor gráfico, e estado/eventos ficam testáveis sem DOM
 * (Constitution IV e IX).
 *
 * O catálogo abaixo é o contrato: cada evento declara produtor, consumidores,
 * payload e regra de emissão. Um evento `reserved` é um gancho de roadmap sem
 * consumidor — e não pode ser emitido pelo gameplay atual. `EVENT_CATALOG` é
 * verificado por `EventBus.test.ts`, então um evento morto quebra o portão em vez
 * de apodrecer como API fantasma.
 */
export const EventBus = new EventEmitter();

export const GameEvents = {
  MONEY_CHANGED: 'money-changed',
  LIVES_CHANGED: 'lives-changed',
  WAVE_CHANGED: 'wave-changed',
  PAUSE_STATE_CHANGED: 'pause-state-changed',
  SELECT_TOWER: 'select-tower',
  ENEMY_KILLED: 'enemy-killed',
  ENEMY_LEAKED: 'enemy-leaked',
  MATCH_DEFEATED: 'match-defeated',
  MATCH_RESET: 'match-reset',
  WAVE_STATE_CHANGED: 'wave-state-changed',
} as const;

export type GameEventName = (typeof GameEvents)[keyof typeof GameEvents];

/** Payload de cada evento. Completo o bastante para o consumidor não precisar ler estado global. */
export interface GameEventPayloads {
  [GameEvents.MONEY_CHANGED]: { money: number };
  [GameEvents.LIVES_CHANGED]: { lives: number };
  /** `total: 0` = progressão infinita (modo endless). */
  [GameEvents.WAVE_CHANGED]: { wave: number; total: number };
  [GameEvents.PAUSE_STATE_CHANGED]: { paused: boolean; started: boolean };
  [GameEvents.SELECT_TOWER]: { towerTypeId: string | null };
  [GameEvents.ENEMY_KILLED]: { enemyTypeId: string; reward: number };
  [GameEvents.ENEMY_LEAKED]: { enemyTypeId: string; damage: number };
  [GameEvents.MATCH_DEFEATED]: { reason: 'lives-depleted' };
  [GameEvents.MATCH_RESET]: void;
  [GameEvents.WAVE_STATE_CHANGED]: { waveActive: boolean };
}

export type EventStatus = 'active' | 'reserved';

export interface EventContract {
  status: EventStatus;
  /** Quem emite (vazio quando reservado). */
  producer: string;
  /** Quem reage (vazio quando reservado). */
  consumers: string[];
  emissionRules: string;
  /** Uso futuro esperado — obrigatório para eventos reservados. */
  reservedFor?: string;
}

export const EVENT_CATALOG: Record<GameEventName, EventContract> = {
  [GameEvents.MONEY_CHANGED]: {
    status: 'active',
    producer: 'GameState (economia)',
    consumers: ['UIScene (saldo + affordability dos cards)'],
    emissionRules:
      'Emitido ao creditar ou debitar. Uma compra sem saldo NÃO emite (o saldo não mudou).',
  },
  [GameEvents.LIVES_CHANGED]: {
    status: 'active',
    producer: 'GameState (vida)',
    consumers: ['UIScene (contador de vida)'],
    emissionRules:
      'Emitido a cada dano à base, inclusive o que zera a vida — sempre ANTES de MATCH_DEFEATED.',
  },
  [GameEvents.WAVE_CHANGED]: {
    status: 'active',
    producer: 'GameState (onda), acionado pelo WaveManager',
    consumers: ['UIScene (rótulo da onda)'],
    emissionRules: 'Emitido ao iniciar cada onda e no reset (onda 0). `total: 0` no modo endless.',
  },
  [GameEvents.PAUSE_STATE_CHANGED]: {
    status: 'active',
    producer: 'GameState (contrato de progressão)',
    consumers: ['UIScene (botão Iniciar/Pausar/Continuar)'],
    emissionRules: 'Emitido apenas quando o estado da partida muda de fato.',
  },
  [GameEvents.SELECT_TOWER]: {
    status: 'active',
    producer: 'UIScene (card) e BuildManager (limpa a seleção ao construir)',
    consumers: ['BuildManager (preview de construção)', 'UIScene (destaque do card)'],
    emissionRules: '`towerTypeId: null` desmarca. Ignorado quando a construção está travada.',
  },
  [GameEvents.ENEMY_KILLED]: {
    status: 'active',
    producer: 'GameScene (resolução de combate)',
    consumers: ['GameState (credita a recompensa)'],
    emissionRules: 'Emitido uma vez por inimigo abatido, no frame em que ele morre.',
  },
  [GameEvents.ENEMY_LEAKED]: {
    status: 'active',
    producer: 'GameScene (fim do caminho)',
    consumers: ['GameState (aplica o dano à base)'],
    emissionRules: 'Emitido uma vez por inimigo que chega ao fim do caminho.',
  },
  [GameEvents.MATCH_DEFEATED]: {
    status: 'active',
    producer: 'GameState (vida zerada)',
    consumers: ['UIScene (tela de derrota + trava de controles)'],
    emissionRules: 'Emitido uma única vez, após o LIVES_CHANGED que zera a vida. Terminal até o reset.',
  },
  [GameEvents.MATCH_RESET]: {
    status: 'active',
    producer: 'GameState.reset()',
    consumers: ['BuildManager (limpa seleção e preview pendentes)'],
    emissionRules: 'Emitido ao reiniciar a partida, depois dos eventos de estado inicial.',
  },
  [GameEvents.WAVE_STATE_CHANGED]: {
    status: 'reserved',
    producer: '',
    consumers: [],
    emissionRules: 'Não emitido pelo gameplay atual.',
    reservedFor:
      'Indicador de "onda em andamento" no HUD (ex.: aviso de intervalo entre ondas). ' +
      'O HUD ainda não tem esse indicador; ativar junto com ele.',
  },
};

/** Emissão tipada: o payload é conferido contra o catálogo em tempo de compilação. */
export function emitGameEvent<K extends GameEventName>(
  ...[event, payload]: GameEventPayloads[K] extends void ? [K] : [K, GameEventPayloads[K]]
): void {
  EventBus.emit(event, payload);
}

export function onGameEvent<K extends GameEventName>(
  event: K,
  handler: (payload: GameEventPayloads[K]) => void,
  context?: unknown,
): void {
  EventBus.on(event, handler, context);
}

export function offGameEvent<K extends GameEventName>(
  event: K,
  handler: (payload: GameEventPayloads[K]) => void,
  context?: unknown,
): void {
  EventBus.off(event, handler, context);
}
