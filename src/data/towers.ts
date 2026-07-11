import { COLORS, TEXTURES } from '../core/constants';

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
  /** Dano por projétil. */
  damage: number;
  /** Cadência de tiro em disparos por segundo. */
  fireRate: number;
  /** Velocidade do projétil em pixels por segundo. */
  projectileSpeed: number;
  /** Raio do corpo (para desenho e validação de sobreposição). */
  radius: number;
  /** Chave de textura da apresentação. Ausente ⇒ usa fallback (círculo+emoji). */
  spriteKey?: string;
  /** Sequência visual opcional para ataques; não altera regras de gameplay. */
  attackAnimation?: AttackAnimationDefinition;
}

export const TOWER_TYPES: Record<string, TowerType> = {
  'vira-lata-caramelo': {
    id: 'vira-lata-caramelo',
    name: 'Vira-lata Caramelo',
    emoji: '🐕',
    color: COLORS.towerCaramelo,
    cost: 50,
    range: 120,
    damage: 5,
    fireRate: 2,
    projectileSpeed: 420,
    radius: 20,
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
