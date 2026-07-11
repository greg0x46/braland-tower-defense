import type { Wave } from '../data/waves';

/**
 * Cronograma de spawn — transforma a definição declarativa de uma onda numa
 * lista determinística de spawns com o instante (em segundos) de cada um
 * (Constitution VIII). Puro e testável; o WaveManager só agenda timers a partir
 * daqui.
 */

export interface ScheduledSpawn {
  enemyTypeId: string;
  /** Segundos a partir do início da onda. */
  atSeconds: number;
}

/** Total de inimigos que a onda vai spawnar. */
export function totalSpawnCount(wave: Wave): number {
  return wave.groups.reduce((sum, g) => sum + g.count, 0);
}

/** Lista ordenada de spawns da onda com seus tempos. */
export function buildSpawnSchedule(wave: Wave): ScheduledSpawn[] {
  const schedule: ScheduledSpawn[] = [];
  for (const group of wave.groups) {
    const base = group.delay ?? 0;
    for (let i = 0; i < group.count; i++) {
      schedule.push({
        enemyTypeId: group.enemyTypeId,
        atSeconds: base + i * group.interval,
      });
    }
  }
  return schedule.sort((a, b) => a.atSeconds - b.atSeconds);
}
