import { COLORS, ENGAGEMENT_FALLBACK, TEXTURES } from '../core/constants';
import { COMBAT_SFX_IDS, type TowerSoundProfileSpec } from './audio';
import type { EngagementPhaseKind, EngagementTimings } from '../systems/engagement';
import type { Targetable } from '../systems/targeting';
import type { VisualAnimationPlayback } from '../systems/visualStateMachine';

/* --- Contrato de ataque (gameplay) ------------------------------------------
 *
 * Definido aqui, junto do roster, e resolvido por `systems/combat.ts`. É
 * deliberadamente independente da animação: trocar, quebrar ou remover um sprite
 * não muda dano, alcance, cadência nem regra de alvo (FR-006).
 */

export type AttackKind = 'projectile' | 'direct' | 'area';

export type TargetRule = 'most-advanced-in-range' | 'highest-current-health-in-range';

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
  frame?: number;
  label?: string;
}

export interface ProjectileVisualSpec {
  frame: SpriteFrameRef;
  displayWidth: number;
  rotationOffsetRad?: number;
  spinRadPerSec?: number;
}

export type VisualAnimationStageName = string;

export interface AttackAnimationStage {
  name: VisualAnimationStageName;
  kind: VisualAnimationPlayback;
  frames: SpriteFrameRef[];
  frameDurationMs: number;
  cueFrameIndex?: number;
  cueName?: string;
  minDurationMs?: number;
}

export interface AttackAnimationDefinition {
  id: string;
  visualScale: number;
  visualSpeedPxPerSec: number;
  arrivalDistancePx: number;
  idleFrame?: SpriteFrameRef;
  stateMap: Partial<Record<EngagementPhaseKind, VisualAnimationStageName>>;
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
  /** Frame inicial da apresentação quando a torre usa uma sprite sheet. */
  spriteFrame?: SpriteFrameRef;
  /** Sequência visual opcional para ataques; não altera regras de gameplay. */
  attackAnimation?: AttackAnimationDefinition;
  /** Apresentação opcional do projétil; sem textura, o projétil usa fallback. */
  projectileVisual?: ProjectileVisualSpec;
  /**
   * Perfil sonoro opcional (apresentação). Ausente ⇒ som padrão da categoria. Não
   * altera dano, alcance, cadência, regra de alvo nem `visualCuePolicy` (FR-006).
   */
  sound?: TowerSoundProfileSpec;
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

  const windup = animationStageFor(animation, 'windup');
  const attacking = animationStageFor(animation, 'attacking');
  const recovering = animationStageFor(animation, 'recovering');
  const strikeSec = stageDurationSec(attacking);
  const cueAtSec =
    attacking?.cueFrameIndex === undefined
      ? 0
      : Math.min(
          strikeSec,
          (attacking.cueFrameIndex * Math.max(1, attacking.frameDurationMs)) / 1000,
        );

  return {
    standUpSec: stageDurationSec(windup),
    strikeSec,
    cueAtSec,
    lieDownSec: stageDurationSec(recovering),
    pursuitSpeedPxPerSec: animation.visualSpeedPxPerSec,
    arrivalDistancePx: animation.arrivalDistancePx,
  };
}

function animationStageFor(
  animation: AttackAnimationDefinition,
  state: EngagementPhaseKind,
): AttackAnimationStage | undefined {
  const stageName = animation.stateMap[state];
  return stageName === undefined
    ? undefined
    : animation.stages.find((stage) => stage.name === stageName);
}

function sheetFrames(
  textureKey: string,
  start: number,
  end: number,
  labelPrefix: string,
): SpriteFrameRef[] {
  return Array.from({ length: end - start + 1 }, (_, offset) => ({
    textureKey,
    frame: start + offset,
    label: `${labelPrefix} ${offset + 1}`,
  }));
}

function sheetFramesReverse(
  textureKey: string,
  start: number,
  end: number,
  labelPrefix: string,
): SpriteFrameRef[] {
  return Array.from({ length: start - end + 1 }, (_, offset) => ({
    textureKey,
    frame: start - offset,
    label: `${labelPrefix} ${offset + 1}`,
  }));
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
    // Latido gravado (CC0). O impacto continua sendo o som de dano do alvo: a mordida
    // não tem timbre próprio como a chinelada tem.
    sound: { attack: COMBAT_SFX_IDS.attackLatido },
    spriteKey: TEXTURES.towerCaramelo,
    spriteFrame: {
      textureKey: TEXTURES.towerCarameloSheet,
      frame: 8,
      label: 'deitado',
    },
    attackAnimation: {
      id: 'vira-lata-caramelo-attack',
      visualScale: 3,
      visualSpeedPxPerSec: 520,
      arrivalDistancePx: 22,
      idleFrame: {
        textureKey: TEXTURES.towerCarameloSheet,
        frame: 8,
        label: 'deitado',
      },
      fallbackSpriteKey: TEXTURES.towerCaramelo,
      stateMap: {
        idle: 'lying_idle',
        windup: 'standing_up',
        moving: 'chasing',
        attacking: 'biting',
        returning: 'returning',
        recovering: 'lying_down',
      },
      stages: [
        {
          name: 'lying_idle',
          kind: 'loop',
          frameDurationMs: 360,
          frames: sheetFrames(TEXTURES.towerCarameloSheet, 8, 9, 'deitado'),
        },
        {
          name: 'standing_up',
          kind: 'once',
          frameDurationMs: 60,
          minDurationMs: 120,
          frames: sheetFrames(TEXTURES.towerCarameloSheet, 10, 15, 'levantando'),
        },
        {
          name: 'chasing',
          kind: 'loop',
          frameDurationMs: 80,
          minDurationMs: 80,
          frames: sheetFrames(TEXTURES.towerCarameloSheet, 16, 23, 'corrida'),
        },
        {
          name: 'biting',
          kind: 'once',
          frameDurationMs: 32,
          cueFrameIndex: 2,
          cueName: 'impact',
          frames: sheetFrames(TEXTURES.towerCarameloSheet, 25, 29, 'mordida'),
        },
        {
          name: 'returning',
          kind: 'loop',
          frameDurationMs: 80,
          minDurationMs: 80,
          frames: sheetFrames(TEXTURES.towerCarameloSheet, 16, 23, 'retorno'),
        },
        {
          name: 'lying_down',
          kind: 'once',
          frameDurationMs: 45,
          minDurationMs: 180,
          frames: sheetFramesReverse(TEXTURES.towerCarameloSheet, 15, 8, 'deitando'),
        },
      ],
    },
  },
  'mae-de-havaianas': {
    id: 'mae-de-havaianas',
    name: 'Mãe de Havaianas',
    emoji: '🩴',
    color: COLORS.towerMaeHavaianas,
    cost: 140,
    range: 420,
    damage: 18,
    fireRate: 0.55,
    radius: 22,
    attack: {
      id: 'mae-de-havaianas-slipper-shot',
      kind: 'projectile',
      targetRule: 'highest-current-health-in-range',
      visualCuePolicy: 'onCue',
      engagement: 'stationary',
      projectileSpeed: 620,
    },
    // A chinelada é gravação própria: o arremesso sai quando ela joga, o baque quando
    // o chinelo chega. O impacto declarado aqui vence o som de dano do motoboy.
    sound: {
      attack: COMBAT_SFX_IDS.attackChinelada,
      impact: COMBAT_SFX_IDS.impactChinelada,
    },
    spriteKey: TEXTURES.towerMaeHavaianasSheet,
    spriteFrame: {
      textureKey: TEXTURES.towerMaeHavaianasSheet,
      frame: 0,
      label: 'alerta',
    },
    projectileVisual: {
      frame: {
        textureKey: TEXTURES.towerMaeHavaianasSheet,
        frame: 28,
        label: 'chinelo',
      },
      displayWidth: 34,
      rotationOffsetRad: Math.PI / 2,
      spinRadPerSec: Math.PI * 9,
    },
    attackAnimation: {
      id: 'mae-de-havaianas-attack',
      visualScale: 3.1,
      visualSpeedPxPerSec: ENGAGEMENT_FALLBACK.pursuitSpeedPxPerSec,
      arrivalDistancePx: ENGAGEMENT_FALLBACK.arrivalDistancePx,
      idleFrame: {
        textureKey: TEXTURES.towerMaeHavaianasSheet,
        frame: 0,
        label: 'alerta',
      },
      fallbackSpriteKey: TEXTURES.towerMaeHavaianasSheet,
      stateMap: {
        idle: 'idle',
        windup: 'readying',
        attacking: 'throwing',
        recovering: 'recovering',
      },
      stages: [
        {
          name: 'idle',
          kind: 'loop',
          frameDurationMs: 260,
          frames: sheetFrames(TEXTURES.towerMaeHavaianasSheet, 0, 7, 'alerta'),
        },
        {
          name: 'readying',
          kind: 'once',
          frameDurationMs: 70,
          minDurationMs: 180,
          frames: sheetFrames(TEXTURES.towerMaeHavaianasSheet, 9, 13, 'preparando chinelo'),
        },
        {
          name: 'throwing',
          kind: 'once',
          frameDurationMs: 58,
          cueFrameIndex: 3,
          cueName: 'impact',
          frames: sheetFrames(TEXTURES.towerMaeHavaianasSheet, 24, 27, 'arremesso'),
        },
        {
          name: 'recovering',
          kind: 'once',
          frameDurationMs: 80,
          minDurationMs: 180,
          frames: sheetFrames(TEXTURES.towerMaeHavaianasSheet, 30, 31, 'recuperando'),
        },
      ],
    },
  },
};
