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
  AUDIO_SETTINGS_CHANGED: 'audio-settings-changed',
  COMBAT_AUDIO_EVENT: 'combat-audio-event',
} as const;

export type GameEventName = (typeof GameEvents)[keyof typeof GameEvents];

/** As quatro coisas que o combate faz e que valem um som (contrato C2). */
export type CombatSfxCategory =
  | 'tower-attack'
  | 'enemy-damaged'
  | 'enemy-killed'
  | 'enemy-leaked';

/**
 * Id estável de um efeito no catálogo (`data/audio.ts`). Fica aberto aqui de
 * propósito: se o `core/` conhecesse os ids concretos, trocar um som viraria
 * mudança de contrato global (Constitution XI). Ele é estreitado onde é autorado —
 * um perfil sonoro de torre/inimigo só aceita id que existe no catálogo — e a
 * resolução em runtime cai no padrão da categoria quando o id não existe.
 */
export type CombatSfxId = string;

/**
 * O que o gameplay sabe no instante do acontecimento. A cena completa com
 * `eventId` e `occurredAtMs` (relógio dela) e emite — a entidade não gera tempo
 * nem id, e nunca conhece o Sound Manager.
 */
export type CombatAudioSignal =
  | { category: 'tower-attack'; towerTypeId: string; x: number; y: number }
  | {
      category: 'enemy-damaged';
      /** Quem bateu: uma torre com som de impacto próprio tem prioridade sobre o do alvo. */
      towerTypeId: string;
      enemyTypeId: string;
      x: number;
      y: number;
    };

/** Como `Tower` e `Projectile` anunciam um efeito audível sem depender de áudio. */
export type AnnounceCombatAudio = (signal: CombatAudioSignal) => void;

/**
 * Payload do evento de áudio de combate. Completo o bastante para o consumidor
 * resolver perfil/fallback sem ler estado global (C2) — e sem dano, recompensa ou
 * vida, que não são fonte de verdade de áudio.
 */
export interface CombatAudioEventPayload {
  eventId: string;
  category: CombatSfxCategory;
  /** Sempre presente em `tower-attack`. */
  towerTypeId?: string;
  /** Sempre presente nos eventos de inimigo. */
  enemyTypeId?: string;
  /** Override quando o produtor já conhece o efeito; normalmente resolvido por perfil. */
  effectId?: CombatSfxId;
  x?: number;
  y?: number;
  occurredAtMs: number;
}

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
  /** `effectiveVolume` é derivado (`muted ? 0 : volume`) — o consumidor não recalcula a regra. */
  [GameEvents.AUDIO_SETTINGS_CHANGED]: {
    muted: boolean;
    volume: number;
    effectiveVolume: number;
  };
  [GameEvents.COMBAT_AUDIO_EVENT]: CombatAudioEventPayload;
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
    consumers: [
      'GameState (credita a recompensa)',
      'CombatSfxManager (som de derrota — apresentação, não mexe na recompensa)',
    ],
    emissionRules: 'Emitido uma vez por inimigo abatido, no frame em que ele morre.',
  },
  [GameEvents.ENEMY_LEAKED]: {
    status: 'active',
    producer: 'GameScene (fim do caminho)',
    consumers: [
      'GameState (aplica o dano à base)',
      'CombatSfxManager (alerta de vazamento — apresentação, não mexe na vida)',
    ],
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
    consumers: [
      'BuildManager (limpa seleção e preview pendentes)',
      'CombatSfxManager (para os sons ativos e zera as janelas de throttle)',
    ],
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
  [GameEvents.AUDIO_SETTINGS_CHANGED]: {
    status: 'active',
    producer: 'AudioSettings (preferência de mudo/volume)',
    consumers: [
      'MusicManager (aplica o volume efetivo no som)',
      'CombatSfxManager (volume dos efeitos; silencia os ativos quando chega a 0)',
      'UIScene (ícone de mudo + posição da alça do slider)',
    ],
    emissionRules:
      'Emitido apenas quando a preferência muda de fato (mesma disciplina de PAUSE_STATE_CHANGED). ' +
      'Arrastar o slider sem mudar o volume resultante não emite. Emitido uma vez no boot, após ' +
      'carregar a preferência salva, para o HUD nascer sincronizado.',
  },
  [GameEvents.COMBAT_AUDIO_EVENT]: {
    status: 'active',
    producer: 'GameScene (ataque real de torre e impacto real em inimigo vivo)',
    consumers: ['CombatSfxManager (resolve o efeito no catálogo e toca)'],
    emissionRules:
      'Só nasce de ação de combate confirmada (contrato C1): torre sem alvo, em recarga ou com ' +
      'strike cancelado NÃO emite; projétil que expira sem acertar alvo vivo NÃO emite. Derrota e ' +
      'vazamento não passam por aqui — continuam em ENEMY_KILLED/ENEMY_LEAKED, que já são os ' +
      'eventos de domínio. O payload é apresentação: nunca carrega dano, recompensa ou vida.',
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
