import type { CombatAudioEventPayload, CombatSfxCategory, CombatSfxId } from '../core/EventBus';

export type { CombatSfxCategory, CombatSfxId } from '../core/EventBus';

/**
 * Regras puras dos efeitos de combate: qual efeito tocar, se ele pode tocar agora e
 * em que volume. Sem Phaser, sem cache de áudio, sem relógio próprio — o tempo entra
 * como argumento (Constitution VIII/IX).
 *
 * Este módulo existe porque há uma regra concreta que pode errar: limitar repetição
 * numa onda com dezenas de eventos **sem** deixar o alerta importante sumir junto.
 * A cola com o Phaser (`managers/CombatSfxManager.ts`) não decide nada disso; ela
 * pergunta aqui e obedece.
 */

export interface CombatSfxEffect {
  /** Id estável do domínio, usado por perfis e fallback. Nunca o caminho do arquivo. */
  readonly id: CombatSfxId;
  /** Chave no cache de áudio do Phaser. */
  readonly cacheKey: string;
  readonly category: CombatSfxCategory;
  /** Volume relativo em [0,1], multiplicado pelo volume efetivo do jogador. */
  readonly defaultVolume: number;
  /** Janela mínima antes de o MESMO efeito tocar de novo. */
  readonly cooldownMs: number;
  /** Teto de instâncias ativas do mesmo efeito. */
  readonly maxConcurrent: number;
  /** Desempate quando eventos competem: o vazamento precisa ganhar do impacto. */
  readonly priority: number;
  /** Efeito alternativo quando este não existir ou não carregar. */
  readonly fallbackId?: CombatSfxId;
}

export type CombatSfxCatalog = Readonly<Record<CombatSfxId, CombatSfxEffect>>;

/** O efeito padrão de cada categoria — o piso que impede um tipo novo de ficar mudo. */
export type CombatSfxDefaults = Readonly<Record<CombatSfxCategory, CombatSfxId>>;

/**
 * Perfil sonoro de uma torre. Ausente ⇒ resolve no padrão da categoria (FR-010).
 *
 * `impact` é o som do golpe **chegando** — o baque do chinelo, não o grito de quem
 * apanha. Quando a torre declara um, ele ganha do `damaged` genérico do inimigo (ver
 * `soundProfileEffectId`): a arma tem timbre próprio, o alvo é o mesmo.
 */
export interface TowerSoundProfile {
  readonly attack?: CombatSfxId;
  readonly impact?: CombatSfxId;
}

/** Perfil sonoro de um inimigo. Ausente ⇒ resolve nos padrões por categoria (FR-010). */
export interface EnemySoundProfile {
  readonly damaged?: CombatSfxId;
  readonly killed?: CombatSfxId;
  readonly leaked?: CombatSfxId;
}

export interface CombatSfxLimits {
  /** Teto global de efeitos de combate soando ao mesmo tempo. */
  readonly maxSimultaneous: number;
  /** A partir desta prioridade, o efeito atravessa o teto global e a janela de categoria. */
  readonly alwaysAudiblePriority: number;
  /** Espaçamento mínimo entre dois sons QUALQUER da mesma categoria. */
  readonly categorySpacingMs: number;
}

/** O que o produtor sabe; o resto (perfil, fallback, volume) é resolvido aqui. */
export interface CombatSfxRequest {
  readonly category: CombatSfxCategory;
  readonly towerTypeId?: string;
  readonly enemyTypeId?: string;
  readonly effectId?: CombatSfxId;
}

/** Diz se o efeito está de fato disponível para tocar (no manager: cache do Phaser). */
export type CombatSfxAvailability = (effect: CombatSfxEffect) => boolean;

/**
 * Estado de limitação. Mutável e reutilizado entre eventos de propósito: numa onda
 * intensa isso roda dezenas de vezes por segundo, e alocar um estado novo por evento
 * seria lixo por frame só para tocar som (Constitution III).
 */
export interface CombatSfxState {
  readonly lastPlayedAtByEffect: Map<CombatSfxId, number>;
  readonly activeCountByEffect: Map<CombatSfxId, number>;
  readonly lastPlayedAtByCategory: Map<CombatSfxCategory, number>;
  activeTotal: number;
}

export type CombatSfxSuppression = 'cooldown' | 'category-window' | 'concurrency' | 'saturated';

export type CombatSfxDecision =
  | { kind: 'play' }
  | { kind: 'suppressed'; reason: CombatSfxSuppression };

const PLAY: CombatSfxDecision = { kind: 'play' };

/** Teto de saltos na cadeia de fallback: dado com ciclo desiste em vez de travar. */
const MAX_FALLBACK_HOPS = 8;

export function createCombatSfxState(): CombatSfxState {
  return {
    lastPlayedAtByEffect: new Map(),
    activeCountByEffect: new Map(),
    lastPlayedAtByCategory: new Map(),
    activeTotal: 0,
  };
}

/** Zera tudo: nenhum som nem janela da partida anterior atravessa o reset (FR-011). */
export function resetCombatSfxState(state: CombatSfxState): void {
  state.lastPlayedAtByEffect.clear();
  state.activeCountByEffect.clear();
  state.lastPlayedAtByCategory.clear();
  state.activeTotal = 0;
}

/**
 * Lê o id declarado pelo perfil do conteúdo. O produtor pode sobrescrever no evento.
 *
 * No dano, a **arma ganha do alvo**: se a torre que bateu tem som de impacto próprio
 * (a chinelada da Mãe de Havaianas), é ele que toca; senão, vale o som de dano do
 * inimigo (a mordida do Caramelo no motoboy). Sem essa ordem, todo golpe soaria igual
 * e a torre de elite perderia a assinatura sonora.
 */
export function soundProfileEffectId(
  request: CombatSfxRequest,
  towers: Readonly<Record<string, { readonly sound?: TowerSoundProfile }>>,
  enemies: Readonly<Record<string, { readonly sound?: EnemySoundProfile }>>,
): CombatSfxId | undefined {
  if (request.effectId !== undefined) return request.effectId;

  switch (request.category) {
    case 'tower-attack':
      return request.towerTypeId === undefined
        ? undefined
        : towers[request.towerTypeId]?.sound?.attack;
    case 'enemy-damaged': {
      const fromTower =
        request.towerTypeId === undefined
          ? undefined
          : towers[request.towerTypeId]?.sound?.impact;
      if (fromTower !== undefined) return fromTower;

      return request.enemyTypeId === undefined
        ? undefined
        : enemies[request.enemyTypeId]?.sound?.damaged;
    }
    case 'enemy-killed':
      return request.enemyTypeId === undefined
        ? undefined
        : enemies[request.enemyTypeId]?.sound?.killed;
    case 'enemy-leaked':
      return request.enemyTypeId === undefined
        ? undefined
        : enemies[request.enemyTypeId]?.sound?.leaked;
  }
}

/**
 * Perfil → cadeia de `fallbackId` → padrão da categoria (e a cadeia dele). O primeiro
 * efeito disponível ganha; se nada estiver disponível, devolve `null` e o combate
 * segue em silêncio (P1/FR-009). Um id inexistente no catálogo não é erro fatal: cai
 * no padrão, que é o que impede um conteúdo novo de nascer mudo.
 */
export function resolveCombatSfxEffect(
  catalog: CombatSfxCatalog,
  defaults: CombatSfxDefaults,
  request: { category: CombatSfxCategory; effectId?: CombatSfxId },
  isAvailable: CombatSfxAvailability,
): CombatSfxEffect | null {
  const fromProfile = followFallbackChain(catalog, request.effectId, isAvailable);
  if (fromProfile) return fromProfile;

  return followFallbackChain(catalog, defaults[request.category], isAvailable);
}

function followFallbackChain(
  catalog: CombatSfxCatalog,
  startId: CombatSfxId | undefined,
  isAvailable: CombatSfxAvailability,
): CombatSfxEffect | null {
  let id = startId;

  for (let hop = 0; hop < MAX_FALLBACK_HOPS && id !== undefined; hop++) {
    const effect = catalog[id];
    if (!effect) return null;
    if (isAvailable(effect)) return effect;
    id = effect.fallbackId;
  }

  return null;
}

/**
 * Pode tocar agora? A ordem das guardas é o contrato: cooldown e janela de categoria
 * cortam a repetição (FR-008); o teto global corta a massa sonora; e a prioridade é a
 * porta de escape que mantém o vazamento audível no meio da rajada (SC-005). O que
 * ela **não** faz é furar o limite do próprio efeito.
 */
export function decideCombatSfx(
  state: CombatSfxState,
  effect: CombatSfxEffect,
  occurredAtMs: number,
  limits: CombatSfxLimits,
): CombatSfxDecision {
  const alwaysAudible = effect.priority >= limits.alwaysAudiblePriority;

  if (withinWindow(state.lastPlayedAtByEffect.get(effect.id), occurredAtMs, effect.cooldownMs)) {
    return { kind: 'suppressed', reason: 'cooldown' };
  }

  if (
    !alwaysAudible &&
    withinWindow(
      state.lastPlayedAtByCategory.get(effect.category),
      occurredAtMs,
      limits.categorySpacingMs,
    )
  ) {
    return { kind: 'suppressed', reason: 'category-window' };
  }

  if ((state.activeCountByEffect.get(effect.id) ?? 0) >= effect.maxConcurrent) {
    return { kind: 'suppressed', reason: 'concurrency' };
  }

  if (!alwaysAudible && state.activeTotal >= limits.maxSimultaneous) {
    return { kind: 'suppressed', reason: 'saturated' };
  }

  return PLAY;
}

/**
 * Relógio para trás = partida nova (o tempo da cena recomeça do zero). Tratar isso
 * como "janela ainda aberta" deixaria a primeira onda muda até o relógio alcançar a
 * marca da partida anterior.
 */
function withinWindow(lastAtMs: number | undefined, nowMs: number, windowMs: number): boolean {
  if (lastAtMs === undefined || nowMs < lastAtMs) return false;
  return nowMs - lastAtMs < windowMs;
}

/** Contabiliza o som que começou. Todo `play` precisa de um `release` no fim. */
export function registerCombatSfxPlayback(
  state: CombatSfxState,
  effect: CombatSfxEffect,
  occurredAtMs: number,
): void {
  state.lastPlayedAtByEffect.set(effect.id, occurredAtMs);
  state.lastPlayedAtByCategory.set(effect.category, occurredAtMs);
  state.activeCountByEffect.set(effect.id, (state.activeCountByEffect.get(effect.id) ?? 0) + 1);
  state.activeTotal++;
}

/** Devolve a vaga quando o som termina ou é parado. Nunca conta negativo. */
export function releaseCombatSfxPlayback(state: CombatSfxState, effect: CombatSfxEffect): void {
  const active = state.activeCountByEffect.get(effect.id) ?? 0;
  if (active <= 1) state.activeCountByEffect.delete(effect.id);
  else state.activeCountByEffect.set(effect.id, active - 1);

  state.activeTotal = Math.max(0, state.activeTotal - 1);
}

/**
 * Volume final = volume efetivo do jogador × volume relativo do efeito (P2). A regra
 * `muted ? 0 : volume` NÃO é recalculada aqui: ela tem uma fonte só
 * (`systems/audioSettings.ts`), e este módulo consome o resultado.
 */
export function combatSfxVolume(effectiveVolume: number, effect: CombatSfxEffect): number {
  return clamp01(clamp01(effectiveVolume) * clamp01(effect.defaultVolume));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * O payload cumpre o contrato C2? Um evento sem o tipo do conteúdo ainda tocaria (cai
 * no padrão da categoria), mas seria um produtor quebrado tocando som por acidente —
 * e isso precisa aparecer, não passar batido (Constitution X).
 */
export function isWellFormedCombatAudioEvent(event: CombatAudioEventPayload): boolean {
  if (!Number.isFinite(event.occurredAtMs)) return false;

  return event.category === 'tower-attack'
    ? event.towerTypeId !== undefined
    : event.enemyTypeId !== undefined;
}
