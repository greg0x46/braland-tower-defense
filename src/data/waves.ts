/**
 * Definição de ondas. Cada onda é uma lista de "grupos" de spawn; cada grupo
 * despeja `count` inimigos de um tipo, com `interval` segundos entre eles e um
 * `delay` opcional antes do grupo começar.
 *
 * As ondas deixam de ser uma lista fixa e passam a ser **geradas** pelo motor de
 * progressão (`generateWave`) a partir do `PROGRESSION_PROFILE` abaixo. A estrutura
 * `Wave`/`SpawnGroup` permanece a mesma consumida por `buildSpawnSchedule` — a única
 * adição é o campo opcional `hp` (resistência efetiva já escalada pela onda).
 */
export interface SpawnGroup {
  enemyTypeId: string;
  count: number;
  /** Segundos entre spawns dentro do grupo. */
  interval: number;
  /** Segundos de espera antes do grupo iniciar. */
  delay?: number;
  /** HP efetivo por inimigo nesta onda (já escalado); ausente = usa o maxHp do roster. */
  hp?: number;
}

export interface Wave {
  groups: SpawnGroup[];
}

/**
 * Perfil de progressão data-driven (fonte de verdade da escalada). Dado o índice
 * da onda, determina de forma mensurável e monotônica a composição da onda:
 * quantidade cresce, o ritmo (intervalo) diminui com piso anti-transbordo, a
 * resistência cresce e novos tipos do roster entram na variedade a cada
 * `varietyStep` ondas. Nenhum inimigo é referenciado por dado embutido — os tipos
 * saem do roster (`ENEMY_TYPES`), incorporando novos automaticamente (FR-006).
 */
export interface ProgressionProfile {
  /** Quantidade de inimigos do tipo principal na onda 1. */
  baseCount: number;
  /** Incremento de quantidade por onda (não-decrescente). */
  countGrowth: number;
  /** Intervalo inicial entre spawns (segundos). */
  baseIntervalSec: number;
  /** Redução do intervalo por onda (ritmo sobe). */
  intervalDecay: number;
  /** Piso do intervalo (anti-transbordo, FR-012). */
  minIntervalSec: number;
  /** Fator de resistência aplicado por onda (HP escala com o índice). */
  hpGrowthPerWave: number;
  /** A cada quantas ondas um novo tipo do roster entra na variedade (≥ 1). */
  varietyStep: number;
}

/**
 * Valores tunados para crescimento controlado (sem picos instantâneos, FR-012) e
 * dificuldade estritamente crescente (SC-004): `countGrowth` inteiro garante que a
 * quantidade do tipo principal aumenta a cada onda; `hpGrowthPerWave` reforça a
 * resistência; o intervalo decai suavemente até `minIntervalSec`.
 */
export const PROGRESSION_PROFILE: ProgressionProfile = {
  baseCount: 200,
  countGrowth: 10,
  baseIntervalSec: 0.1,
  intervalDecay: 0.03,
  minIntervalSec: 0.35,
  hpGrowthPerWave: 0.12,
  varietyStep: 4,
};
