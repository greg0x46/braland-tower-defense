import { AUDIO, COMBAT_SFX } from '../core/constants';
import type {
  CombatSfxCatalog,
  CombatSfxDefaults,
  CombatSfxLimits,
} from '../systems/combatSfx';

/**
 * Catálogo de faixas — dados, não código (Constitution V). Trocar a música é
 * trocar uma entrada aqui.
 *
 * O caminho do arquivo NÃO aparece neste módulo: a faixa é referenciada por
 * `cacheKey`, e só o `MusicManager` conhece o `.mp3` (Constitution XI). Uma faixa
 * ausente deixa o jogo em silêncio, nunca quebrado.
 */
export interface MusicTrack {
  /** Identificador estável do domínio. Nunca o caminho do arquivo. */
  id: string;
  /** Chave no cache de áudio do Phaser. */
  cacheKey: string;
  /** Volume base em [0,1]. */
  defaultVolume: number;
  loop: boolean;
}

export const MUSIC_TRACKS: Record<string, MusicTrack> = {
  sidewaysSamba: {
    id: 'sideways-samba',
    cacheKey: 'bgm-sideways-samba',
    defaultVolume: AUDIO.defaultVolume,
    loop: true,
  },
};

/** A trilha que toca durante a partida. Uma faixa só, em loop (FR-001). */
export const BACKGROUND_TRACK: MusicTrack = MUSIC_TRACKS.sidewaysSamba;

/* --- Efeitos sonoros de combate ---------------------------------------------
 *
 * Mesma disciplina da trilha: o efeito é referenciado por `id` (domínio) e
 * `cacheKey` (motor), nunca por caminho de arquivo — só a BootScene conhece o
 * `.wav` (Constitution XI). Trocar o som de uma torre é trocar o `id` no perfil
 * dela; nenhuma regra de combate muda.
 *
 * A primeira entrega tem um efeito padrão por categoria. Um tipo novo de torre ou
 * inimigo que não declare perfil nasce **audível**, não mudo: a resolução cai no
 * padrão da categoria (FR-010).
 */

export const COMBAT_SFX_IDS = {
  attackDefault: 'combat-attack-default',
  impactDefault: 'combat-impact-default',
  killDefault: 'combat-kill-default',
  leakDefault: 'combat-leak-default',
  /** Chinelada da Mãe de Havaianas: o arremesso e o baque são gravações distintas. */
  attackChinelada: 'combat-attack-chinelada',
  impactChinelada: 'combat-impact-chinelada',
  /** Latido do Vira-lata Caramelo (gravação CC0). */
  attackLatido: 'combat-attack-latido',
} as const;

/** Ids que um perfil sonoro pode declarar — id inventado quebra a compilação. */
export type CombatSfxCatalogId = (typeof COMBAT_SFX_IDS)[keyof typeof COMBAT_SFX_IDS];

export const COMBAT_SFX_CATALOG: CombatSfxCatalog = {
  [COMBAT_SFX_IDS.attackDefault]: {
    id: COMBAT_SFX_IDS.attackDefault,
    cacheKey: COMBAT_SFX.cacheKeys.attackDefault,
    category: 'tower-attack',
    defaultVolume: COMBAT_SFX.mix.towerAttack,
    cooldownMs: COMBAT_SFX.throttle.towerAttackCooldownMs,
    maxConcurrent: COMBAT_SFX.throttle.towerAttackMaxConcurrent,
    priority: COMBAT_SFX.priority.towerAttack,
  },
  [COMBAT_SFX_IDS.impactDefault]: {
    id: COMBAT_SFX_IDS.impactDefault,
    cacheKey: COMBAT_SFX.cacheKeys.impactDefault,
    category: 'enemy-damaged',
    defaultVolume: COMBAT_SFX.mix.enemyDamaged,
    cooldownMs: COMBAT_SFX.throttle.enemyDamagedCooldownMs,
    maxConcurrent: COMBAT_SFX.throttle.enemyDamagedMaxConcurrent,
    priority: COMBAT_SFX.priority.enemyDamaged,
  },
  [COMBAT_SFX_IDS.killDefault]: {
    id: COMBAT_SFX_IDS.killDefault,
    cacheKey: COMBAT_SFX.cacheKeys.killDefault,
    category: 'enemy-killed',
    defaultVolume: COMBAT_SFX.mix.enemyKilled,
    cooldownMs: COMBAT_SFX.throttle.enemyKilledCooldownMs,
    maxConcurrent: COMBAT_SFX.throttle.enemyKilledMaxConcurrent,
    priority: COMBAT_SFX.priority.enemyKilled,
    // Se o som de derrota faltar, o impacto é o parente mais próximo: o jogador
    // continua ouvindo que algo aconteceu, em vez de silêncio.
    fallbackId: COMBAT_SFX_IDS.impactDefault,
  },
  [COMBAT_SFX_IDS.leakDefault]: {
    id: COMBAT_SFX_IDS.leakDefault,
    cacheKey: COMBAT_SFX.cacheKeys.leakDefault,
    category: 'enemy-leaked',
    defaultVolume: COMBAT_SFX.mix.enemyLeaked,
    cooldownMs: COMBAT_SFX.throttle.enemyLeakedCooldownMs,
    maxConcurrent: COMBAT_SFX.throttle.enemyLeakedMaxConcurrent,
    priority: COMBAT_SFX.priority.enemyLeaked,
    fallbackId: COMBAT_SFX_IDS.killDefault,
  },
  // Gravações reais da chinelada. Cadência da Mãe de Havaianas é 0,55/s (um ataque a
  // cada ~1,8 s), então o cooldown pode ser bem mais folgado que o do padrão: dois
  // arremessos nunca se atropelam, e o som pode respirar inteiro.
  [COMBAT_SFX_IDS.attackChinelada]: {
    id: COMBAT_SFX_IDS.attackChinelada,
    cacheKey: COMBAT_SFX.cacheKeys.attackChinelada,
    category: 'tower-attack',
    defaultVolume: COMBAT_SFX.mix.towerAttack,
    cooldownMs: COMBAT_SFX.throttle.towerAttackCooldownMs,
    maxConcurrent: COMBAT_SFX.throttle.towerAttackMaxConcurrent,
    priority: COMBAT_SFX.priority.towerAttack,
    fallbackId: COMBAT_SFX_IDS.attackDefault,
  },
  [COMBAT_SFX_IDS.impactChinelada]: {
    id: COMBAT_SFX_IDS.impactChinelada,
    cacheKey: COMBAT_SFX.cacheKeys.impactChinelada,
    category: 'enemy-damaged',
    defaultVolume: COMBAT_SFX.mix.enemyDamaged,
    cooldownMs: COMBAT_SFX.throttle.enemyDamagedCooldownMs,
    maxConcurrent: COMBAT_SFX.throttle.enemyDamagedMaxConcurrent,
    priority: COMBAT_SFX.priority.enemyDamaged,
    fallbackId: COMBAT_SFX_IDS.impactDefault,
  },
  // O Caramelo morde 2x por segundo — o latido tem 0,21 s e o cooldown padrão (70 ms)
  // deixa dois ataques seguidos soarem sem virar parede de som.
  [COMBAT_SFX_IDS.attackLatido]: {
    id: COMBAT_SFX_IDS.attackLatido,
    cacheKey: COMBAT_SFX.cacheKeys.attackLatido,
    category: 'tower-attack',
    defaultVolume: COMBAT_SFX.mix.towerAttack,
    cooldownMs: COMBAT_SFX.throttle.towerAttackCooldownMs,
    maxConcurrent: COMBAT_SFX.throttle.towerAttackMaxConcurrent,
    priority: COMBAT_SFX.priority.towerAttack,
    fallbackId: COMBAT_SFX_IDS.attackDefault,
  },
};

/** O piso de cada categoria. Sem isso, um conteúdo sem perfil ficaria mudo. */
export const COMBAT_SFX_DEFAULTS: CombatSfxDefaults = {
  'tower-attack': COMBAT_SFX_IDS.attackDefault,
  'enemy-damaged': COMBAT_SFX_IDS.impactDefault,
  'enemy-killed': COMBAT_SFX_IDS.killDefault,
  'enemy-leaked': COMBAT_SFX_IDS.leakDefault,
};

/**
 * Perfil sonoro que um tipo de torre pode declarar. Os ids são fechados no catálogo:
 * escrever um som que não existe quebra a compilação em vez de virar silêncio em
 * runtime (Constitution VII).
 */
export interface TowerSoundProfileSpec {
  readonly attack?: CombatSfxCatalogId;
  /** Som do golpe chegando. Vence o `damaged` do inimigo quando declarado. */
  readonly impact?: CombatSfxCatalogId;
}

/** Idem para inimigos: dano, derrota e vazamento. */
export interface EnemySoundProfileSpec {
  readonly damaged?: CombatSfxCatalogId;
  readonly killed?: CombatSfxCatalogId;
  readonly leaked?: CombatSfxCatalogId;
}

/** Limites de conforto da mixagem, consumidos pela regra pura de elegibilidade. */
export const COMBAT_SFX_LIMITS: CombatSfxLimits = {
  maxSimultaneous: COMBAT_SFX.throttle.maxSimultaneous,
  alwaysAudiblePriority: COMBAT_SFX.throttle.alwaysAudiblePriority,
  categorySpacingMs: COMBAT_SFX.throttle.categorySpacingMs,
};
