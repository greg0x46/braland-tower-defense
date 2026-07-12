# Contrato — Módulo `src/systems/engagement.ts`

Interface pública do sistema de engajamento. É a fronteira entre **regra** (este
módulo, sem Phaser) e **apresentação** (`Tower` / `TowerAttackAnimator`).

Regra de ouro: este módulo **não importa Phaser, não lê texturas e não conhece
`attackAnimation`**. Tudo o que vem da apresentação (velocidade de perseguição,
distância de chegada, durações) chega como número, injetado pelo chamador.

---

## Entradas

```ts
import type { AttackBehavior, AttackTarget } from '../data/towers';
import type { Origin } from './combat';

/** Tudo que a apresentação empresta à regra, já reduzido a números (D3). */
export interface EngagementTimings {
  prepareSec: number;
  strikeSec: number;
  /** Instante do golpe DENTRO da fase de ataque. Invariante: 0 <= cueAtSec <= strikeSec. */
  cueAtSec: number;
  pursuitSpeedPxPerSec: number;
  arrivalDistancePx: number;
}

export interface EngagementConfig {
  behavior: AttackBehavior;   // traz engagement, range, damage, cadence
  timings: EngagementTimings;
  base: Origin;               // posição fixa da torre; origem do alcance (FR-012)
}
```

## Estado

Ver `data-model.md §3`. Criado por:

```ts
export function createEngagementState<T extends AttackTarget>(
  base: Origin,
): EngagementState<T>;
// → { phase: { kind: 'idle' }, x: base.x, y: base.y, phaseElapsedSec: 0,
//     cooldownSec: 0, strikeEmitted: false }
```

## Passo da simulação

```ts
export type EngagementCommand<T> = { kind: 'strike'; target: T; damage: number };

/**
 * Avança o engajamento em `deltaSec` e devolve os comandos a aplicar AGORA.
 * Muta `state` in-place (sem alocação por frame — Constitution III).
 * Determinístico: mesma entrada ⇒ mesma saída (FR-017).
 */
export function stepEngagement<T extends AttackTarget>(
  config: EngagementConfig,
  state: EngagementState<T>,
  candidates: readonly T[],
  deltaSec: number,
): readonly EngagementCommand<T>[];
```

**Sobre o retorno**: hoje o único comando é `strike` — o efeito de área/projétil
continua sendo resolvido por `combat.resolveAttack`, que o chamador invoca com o
alvo do comando. Manter `EngagementCommand` como união (mesmo com um único membro)
é o que permite `slow`, `knockback` etc. entrarem depois sem quebrar a assinatura.
Na prática o array é vazio na esmagadora maioria dos frames; usar uma constante
`EMPTY` compartilhada evita alocar lixo no hot path.

---

## Invariantes verificáveis (viram teste)

| # | Invariante | Origem |
|---|-----------|--------|
| I1 | `|(state.x, state.y) - base| <= behavior.range` **sempre**, em toda fase | FR-012a / SC-008 |
| I2 | `stationary` ⇒ `(state.x, state.y) === base` em todo passo, e `phase.kind` nunca é `pursuing`/`returning` | FR-003 / D7 |
| I3 | Dois `strike` sobre o mesmo alvo distam `>= 1 / behavior.cadence` | FR-013 |
| I4 | Nenhum `strike` é emitido para alvo inválido (morto, vazado ou fora do alcance) | FR-014 |
| I5 | Após um `strike`, se há alvo válido, a fase seguinte é `pursuing` — **nunca** `returning`/`idle` | FR-008 / SC-001 |
| I6 | `returning` + alvo válido no alcance ⇒ próxima fase é `pursuing`, a partir da posição corrente | FR-010 |
| I7 | Avançar `deltaSec` em N passos de `deltaSec/N` produz o mesmo estado (dentro de epsilon) | FR-017 |
| I8 | `stepEngagement` nunca lança; alvo que some da lista de candidatos é tratado como inválido | Constitution X |

---

## Contrato de uso (`Tower`, camada de apresentação)

```ts
// 1. Uma vez, na construção:
const timings = engagementTimingsOf(type);      // deriva de attackAnimation OU fallback
const state   = createEngagementState<Enemy>({ x, y });

// 2. A cada frame:
const commands = stepEngagement(config, state, enemies, deltaSec);
for (const c of commands) {
  if (isTargetValid(behavior, base, c.target)) c.target.takeDamage(c.damage);
}
animator.render(state);   // frames + espelhamento + posição — só isso
```

`TowerAttackAnimator` **perde** `moveTowardTarget`, `hasArrived`, `onFireCue`,
`onComplete` e `cancel`: a fase e a posição passam a vir do estado. O que sobra é
"dada a fase e o tempo nela, mostre este frame nesta posição" — apresentação pura,
sem poder de mudar o gameplay.
