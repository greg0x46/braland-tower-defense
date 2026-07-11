import type { Wave, SpawnGroup, ProgressionProfile } from '../data/waves';
import type { EnemyType } from '../data/enemies';

/**
 * Cronograma de spawn e motor de progressão — regras puras e testáveis
 * (Constituição VIII/IX), sem Phaser. `buildSpawnSchedule` transforma uma onda
 * declarativa numa lista determinística de spawns com o instante (em segundos) de
 * cada um. `generateWave` produz a onda de qualquer índice a partir do perfil.
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

/**
 * HP efetivo de um inimigo cujo HP base é `baseHp`, na onda `waveIndex` (0-based).
 * Cresce monotonicamente com o índice (resistência escala). Fonte única usada tanto
 * por `generateWave` (para `SpawnGroup.hp` / medida de dificuldade) quanto pelo
 * `WaveManager` ao instanciar o inimigo — garante coerência teste ↔ jogo.
 */
export function waveEnemyHp(baseHp: number, waveIndex: number, profile: ProgressionProfile): number {
  return Math.round(baseHp * (1 + profile.hpGrowthPerWave * waveIndex));
}

/**
 * Gera a onda de índice `waveIndex` (0-based) de forma determinística (SC-004,
 * Constituição VIII): mesma entrada → mesma `Wave`.
 *
 * - Quantidade: o tipo **principal** (`roster[0]`) carrega toda a escalada de
 *   `count` (`baseCount + countGrowth·index`). Tipos secundários só somam inimigos
 *   por cima conforme entram na variedade — nunca reduzem o termo principal, o que
 *   mantém a dificuldade total estritamente crescente mesmo com tipos mais fracos.
 * - Ritmo: `interval` decai com o índice e respeita `minIntervalSec` (FR-012).
 * - Resistência: `hp` por grupo escala via `waveEnemyHp` (monotônico).
 * - Variedade (FR-006): a cada `varietyStep` ondas um novo tipo do roster entra,
 *   sem alterar esta função quando o roster cresce.
 */
export function generateWave(
  waveIndex: number,
  profile: ProgressionProfile,
  roster: EnemyType[],
): Wave {
  const interval = Math.max(
    profile.minIntervalSec,
    profile.baseIntervalSec - profile.intervalDecay * waveIndex,
  );
  const varietyCount = Math.min(
    roster.length,
    1 + Math.floor(waveIndex / profile.varietyStep),
  );

  const groups: SpawnGroup[] = [];
  for (let i = 0; i < varietyCount; i++) {
    const type = roster[i];
    // Principal: escalada plena; secundários: quantidade menor, mas ainda crescente.
    const count =
      i === 0
        ? profile.baseCount + Math.round(profile.countGrowth * waveIndex)
        : Math.max(1, Math.round(profile.baseCount / 2 + profile.countGrowth * waveIndex));
    groups.push({
      enemyTypeId: type.id,
      count,
      interval,
      // Escalona a entrada dos grupos secundários para não spawnar tudo junto.
      delay: i === 0 ? undefined : i * 0.5,
      hp: waveEnemyHp(type.maxHp, waveIndex, profile),
    });
  }
  return { groups };
}

/**
 * Dificuldade total da onda = Σ (count × HP efetivo) por grupo. Helper de teste
 * para verificar monotonicidade (SC-004) sem inspecionar a implementação. Usa o
 * `hp` já escalado do grupo quando presente; senão, o `maxHp` do roster.
 */
export function waveDifficulty(wave: Wave, roster: EnemyType[]): number {
  const baseHpOf = (id: string): number => roster.find((r) => r.id === id)?.maxHp ?? 0;
  return wave.groups.reduce(
    (sum, g) => sum + g.count * (g.hp ?? baseHpOf(g.enemyTypeId)),
    0,
  );
}
