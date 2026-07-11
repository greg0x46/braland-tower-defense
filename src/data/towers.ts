import { COLORS, TEXTURES } from '../core/constants';

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
  },
};
