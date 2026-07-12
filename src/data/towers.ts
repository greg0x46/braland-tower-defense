import { COLORS, ENGAGEMENT_FALLBACK, TEXTURES } from '../core/constants';
import type { EngagementTimings } from '../systems/engagement';
import type { Targetable } from '../systems/targeting';

/* --- Contrato de ataque (gameplay) ------------------------------------------
 *
 * Definido aqui, junto do roster, e resolvido por `systems/combat.ts`. É
 * deliberadamente independente da animação: trocar, quebrar ou remover um sprite
 * não muda dano, alcance, cadência nem regra de alvo (FR-006).
 */

export type AttackKind = 'projectile' | 'direct' | 'area';

export type TargetRule = 'most-advanced-in-range';

/**
 * Quando o efeito é aplicado:
 * - `none`: no instante em que o ataque resolve.
 * - `onCue`: quando a animação sinaliza o golpe — com tempo de fallback se a
 *   animação não existir (o gameplay nunca depende do asset).
 * - `onImpact`: quando o projétil atinge o alvo.
 */
export type VisualCuePolicy = 'none' | 'onCue' | 'onImpact';

/** Como a torre se comporta em relacao ao ataque. */
export type EngagementProfile = 'stationary' | 'pursuer';

/** Alvo de um ataque. `Enemy` satisfaz estruturalmente. */
export type AttackTarget = Targetable;

export interface AttackArea {
  radius: number;
  /** Teto de alvos atingidos; ausente = sem limite. */
  maxTargets?: number;
}

/**
 * O que a torre declara sobre o ataque. Dano, alcance e cadência não entram
 * aqui: eles vivem nos stats da torre, para não existirem em dois lugares (a
 * duplicação seria uma nova fonte de deriva de balanceamento).
 */
export interface AttackBehaviorSpec {
  id: string;
  kind: AttackKind;
  targetRule: TargetRule;
  visualCuePolicy: VisualCuePolicy;
  /** Obrigatorio: esquecer o perfil de uma torre nova deve quebrar a compilacao. */
  engagement: EngagementProfile;
  /** Obrigatório para `kind: 'projectile'`. */
  projectileSpeed?: number;
  /** Obrigatório para `kind: 'area'`. */
  area?: AttackArea;
  /** Espaço para efeitos futuros (lentidão, veneno...) sem mudar os contratos atuais. */
  statusEffects?: readonly string[];
}

/** Contrato de ataque resolvido: o spec somado aos stats da torre. */
export interface AttackBehavior extends AttackBehaviorSpec {
  damage: number;
  range: number;
  /** Ataques por segundo. */
  cadence: number;
}

export interface SpriteFrameRef {
  textureKey: string;
  label?: string;
}

export type AttackAnimationStageKind = 'once' | 'loopUntilArrival';

export interface AttackAnimationStage {
  name: 'prepare' | 'run' | 'attack' | string;
  kind: AttackAnimationStageKind;
  frames: SpriteFrameRef[];
  frameDurationMs: number;
  fireCueFrameIndex?: number;
  minDurationMs?: number;
}

export interface AttackAnimationDefinition {
  id: string;
  visualScale: number;
  visualSpeedPxPerSec: number;
  arrivalDistancePx: number;
  stages: AttackAnimationStage[];
  fallbackSpriteKey?: string;
}

/**
 * Configuração de um tipo de torre. Data-driven: Motoboy e Faria Limer entram
 * como novas entradas (com campos extras) em rodadas futuras.
 */
export interface TowerType {
  id: string;
  name: string;
  emoji: string;
  color: number;
  cost: number;
  /** Alcance em pixels. */
  range: number;
  /** Dano por ataque. */
  damage: number;
  /** Cadência em ataques por segundo. */
  fireRate: number;
  /** Raio do corpo (para desenho e validação de sobreposição). */
  radius: number;
  /** Como o ataque afeta o alvo. Toda torre referencia exatamente um. */
  attack: AttackBehaviorSpec;
  /** Chave de textura da apresentação. Ausente ⇒ usa fallback (círculo+emoji). */
  spriteKey?: string;
  /** Sequência visual opcional para ataques; não altera regras de gameplay. */
  attackAnimation?: AttackAnimationDefinition;
}

/**
 * Contrato de ataque da torre, com os stats já aplicados. Fonte única: dano,
 * alcance e cadência vêm dos campos da torre, nunca de uma cópia no spec.
 */
export function attackBehaviorOf(type: TowerType): AttackBehavior {
  return {
    ...type.attack,
    damage: type.damage,
    range: type.range,
    cadence: type.fireRate,
  };
}

function stageDurationSec(stage: AttackAnimationStage | undefined): number {
  if (!stage) return 0;
  const frameCount = Math.max(1, stage.frames.length);
  const framesMs = frameCount * Math.max(1, stage.frameDurationMs);
  return Math.max(framesMs, stage.minDurationMs ?? 0) / 1000;
}

/** Deriva tempos de engajamento dos dados da animacao, nunca do asset carregado. */
export function engagementTimingsOf(type: TowerType): EngagementTimings {
  const animation = type.attackAnimation;
  if (!animation) return ENGAGEMENT_FALLBACK;

  const prepare = animation.stages.find((stage) => stage.name === 'prepare');
  const attack = animation.stages.find((stage) => stage.name === 'attack');
  const strikeSec = stageDurationSec(attack);
  const cueAtSec =
    attack?.fireCueFrameIndex === undefined
      ? 0
      : Math.min(strikeSec, (attack.fireCueFrameIndex * Math.max(1, attack.frameDurationMs)) / 1000);

  return {
    prepareSec: stageDurationSec(prepare),
    strikeSec,
    cueAtSec,
    pursuitSpeedPxPerSec: animation.visualSpeedPxPerSec,
    arrivalDistancePx: animation.arrivalDistancePx,
  };
}

export const TOWER_TYPES: Record<string, TowerType> = {
  'vira-lata-caramelo': {
    id: 'vira-lata-caramelo',
    name: 'Vira-lata Caramelo',
    emoji: '🐕',
    color: COLORS.towerCaramelo,
    cost: 50,
    range: 200,
    damage: 5,
    fireRate: 2,
    radius: 20,
    // Corpo-a-corpo: o cachorro corre até o alvo e morde. A mordida sai na deixa
    // da animação; sem o sprite, sai no tempo de fallback — o dano é o mesmo.
    attack: {
      id: 'vira-lata-caramelo-bite',
      kind: 'direct',
      targetRule: 'most-advanced-in-range',
      visualCuePolicy: 'onCue',
      engagement: 'pursuer',
    },
    spriteKey: TEXTURES.towerCaramelo,
    attackAnimation: {
      id: 'vira-lata-caramelo-attack',
      visualScale: 3,
      visualSpeedPxPerSec: 520,
      arrivalDistancePx: 22,
      fallbackSpriteKey: TEXTURES.towerCaramelo,
      stages: [
        {
          name: 'prepare',
          kind: 'once',
          frameDurationMs: 90,
          minDurationMs: 120,
          frames: [
            {
              textureKey: TEXTURES.towerCarameloPrepare,
              label: 'levantar',
            },
          ],
        },
        {
          name: 'run',
          kind: 'loopUntilArrival',
          frameDurationMs: 80,
          minDurationMs: 80,
          frames: [
            {
              textureKey: TEXTURES.towerCarameloRun,
              label: 'corrida 1',
            },
            {
              textureKey: TEXTURES.towerCarameloRunAlt,
              label: 'corrida 2',
            },
          ],
        },
        {
          name: 'attack',
          kind: 'once',
          frameDurationMs: 80,
          fireCueFrameIndex: 0,
          frames: [
            {
              textureKey: TEXTURES.towerCarameloAttack,
              label: 'ataque 1',
            },
            {
              textureKey: TEXTURES.towerCarameloAttackAlt,
              label: 'ataque 2',
            },
          ],
        },
      ],
    },
  },
};
