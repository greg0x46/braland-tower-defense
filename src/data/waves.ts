/**
 * Definição das ondas. Cada onda é uma lista de "grupos" de spawn; cada grupo
 * despeja `count` inimigos de um tipo, com `interval` segundos entre eles e um
 * `delay` opcional antes do grupo começar. Estrutura extensível para as ondas
 * 4–10 e para o chefe (basta referenciar novos enemyTypeId).
 */
export interface SpawnGroup {
  enemyTypeId: string;
  count: number;
  /** Segundos entre spawns dentro do grupo. */
  interval: number;
  /** Segundos de espera antes do grupo iniciar. */
  delay?: number;
}

export interface Wave {
  groups: SpawnGroup[];
}

export const WAVES: Wave[] = [
  { groups: [{ enemyTypeId: 'dois-caras-moto', count: 8, interval: 0.8 }] },
  { groups: [{ enemyTypeId: 'dois-caras-moto', count: 12, interval: 0.7 }] },
  { groups: [{ enemyTypeId: 'dois-caras-moto', count: 16, interval: 0.6 }] },
];
