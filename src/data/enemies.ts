import { COLORS, TEXTURES } from '../core/constants';
import { COMBAT_SFX_IDS, type EnemySoundProfileSpec } from './audio';

/**
 * Configuração de um tipo de inimigo. Estrutura data-driven: adicionar novos
 * inimigos (Ônibus, Político, Carreta Furacão...) é só acrescentar entradas.
 */
export interface EnemyType {
  id: string;
  name: string;
  emoji: string;
  color: number;
  maxHp: number;
  /** Velocidade em pixels por segundo. */
  speed: number;
  /** Dinheiro concedido ao abater. */
  reward: number;
  /** Raio do corpo (para desenho e colisão de projétil). */
  radius: number;
  /** Chave da textura (sprite sheet). Ausente ⇒ fallback círculo + emoji. */
  spriteKey?: string;
  /**
   * Perfil sonoro opcional (apresentação). Ausente ⇒ sons padrão por categoria.
   * Não altera HP, velocidade, recompensa, raio nem status (FR-006).
   */
  sound?: EnemySoundProfileSpec;
}

export const ENEMY_TYPES: Record<string, EnemyType> = {
  'dois-caras-moto': {
    id: 'dois-caras-moto',
    name: 'Dois Caras numa Moto',
    emoji: '🛵',
    color: COLORS.enemyMoto,
    maxHp: 20,
    speed: 90,
    reward: 8,
    radius: 20,
    spriteKey: TEXTURES.enemyMotoboy,
    sound: {
      damaged: COMBAT_SFX_IDS.impactDefault,
      killed: COMBAT_SFX_IDS.killDefault,
      leaked: COMBAT_SFX_IDS.leakDefault,
    },
  },
};
