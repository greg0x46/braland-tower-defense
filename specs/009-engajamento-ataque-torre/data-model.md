# Fase 1 — Modelo de Dados

**Feature**: 009-engajamento-ataque-torre

Mapeia as *Key Entities* da spec para tipos concretos. Onde um tipo já existe, o
delta está marcado. Nada aqui depende de Phaser.

---

## 1. Perfil de Engajamento (`EngagementProfile`)

> *Spec*: característica declarada da torre que define como ela se comporta em
> relação ao ataque. Não carrega dano, alcance nem cadência.

**Onde vive**: `src/data/towers.ts`

```ts
/** Como a torre se comporta em relação ao ataque (FR-001, FR-002). */
export type EngagementProfile =
  | 'stationary'   // ataca sem sair da base — comportamento do roster atual
  | 'pursuer';     // sai da base, encadeia alvos e retorna quando o alcance esvazia
```

**Delta em `AttackBehaviorSpec`** — campo **obrigatório** (o compilador passa a
exigir de toda torre nova, FR-001):

| Campo | Tipo | Regra |
|-------|------|-------|
| `engagement` | `EngagementProfile` | Obrigatório. Sem default: esquecer é erro de compilação, não silêncio. |

`attackBehaviorOf(type)` propaga `engagement` para o `AttackBehavior` resolvido,
junto de `damage` / `range` / `cadence`. Fonte única preservada: o perfil é
declarado uma vez, no dado.

**Validação**: `src/data/towers.test.ts` verifica que toda entrada de `TOWER_TYPES`
declara um `engagement` conhecido (rede contra `as`/cast futuro).

---

## 2. Timings de Engajamento (`EngagementTimings`)

> Derivados dos **dados** da animação — nunca da existência da textura (FR-015, D3).

**Onde vive**: `src/systems/engagement.ts` (tipo) + derivação em `src/entities/Tower.ts`

| Campo | Tipo | Origem |
|-------|------|--------|
| `prepareSec` | `number` | Duração do estágio `prepare` (`frames.length × frameDurationMs`, no mínimo `minDurationMs`). Sem animação ⇒ constante de fallback. |
| `strikeSec` | `number` | Duração do estágio `attack`, mesma regra. |
| `cueAtSec` | `number` | Instante do golpe dentro do estágio `attack`, de `fireCueFrameIndex × frameDurationMs`. Ausente ⇒ `0` (golpe ao entrar na fase). |
| `pursuitSpeedPxPerSec` | `number` | `attackAnimation.visualSpeedPxPerSec` (hoje 520). Apresentação injetada — o sistema não lê `attackAnimation`. |
| `arrivalDistancePx` | `number` | `attackAnimation.arrivalDistancePx` (hoje 22). Idem. |

**Fallbacks** (`src/core/constants.ts`, para torre sem `attackAnimation`):
`ENGAGEMENT_FALLBACK = { prepareSec, strikeSec, cueAtSec, pursuitSpeedPxPerSec, arrivalDistancePx }`.

**Invariantes**: todos `>= 0`; `cueAtSec <= strikeSec`.

---

## 3. Estado de Engajamento (`EngagementState<T>`)

> *Spec — Torre Perseguidora*: possui um estado de engajamento (ocioso na base,
> perseguindo alvo, atacando, retornando) e uma posição corrente que pode diferir
> da base.

**Onde vive**: `src/systems/engagement.ts`

Fase como **união discriminada** (Constitution VII — nada de flags soltas):

```ts
export type EngagementPhase<T> =
  | { kind: 'idle' }                        // na base, sem alvo
  | { kind: 'preparing'; target: T }        // alvo adquirido, ainda saindo
  | { kind: 'pursuing';  target: T }        // correndo até o alvo
  | { kind: 'striking';  target: T }        // mordendo (o golpe sai em cueAtSec)
  | { kind: 'returning' };                  // voltando à base, sem alvo válido

export interface EngagementState<T> {
  phase: EngagementPhase<T>;
  /** Posição corrente do perseguidor. Para `stationary`, sempre a base. */
  x: number;
  y: number;
  /** Tempo na fase atual (s). Zerado em toda transição. */
  phaseElapsedSec: number;
  /** Cadência: >0 impede uma nova mordida, mas NÃO impede o deslocamento (D6). */
  cooldownSec: number;
  /** O golpe desta mordida já foi emitido? (evita dano duplo dentro da fase) */
  strikeEmitted: boolean;
}
```

**Estados inválidos que o tipo já torna irrepresentáveis**: "perseguindo sem alvo",
"atacando sem alvo", "ocioso com alvo" — o alvo vive dentro da variante, não ao
lado dela.

**Transições** (todas por `deltaSec`, FR-017):

| De | Para | Condição |
|----|------|----------|
| `idle` | `preparing` | Existe alvo válido **e** `cooldownSec <= 0` |
| `preparing` | `pursuing` | `phaseElapsedSec >= prepareSec` (perfil `pursuer`) |
| `preparing` | `striking` | `phaseElapsedSec >= prepareSec` (perfil `stationary` — não há trajeto) |
| `pursuing` | `striking` | Chegou (`dist <= arrivalDistancePx`) **e** `cooldownSec <= 0` (D6) |
| `pursuing` | `pursuing` | Alvo inválido, mas há outro alvo válido → reaquisição (FR-014) |
| `pursuing` | `returning` | Nenhum alvo válido no alcance (FR-009) |
| `striking` | `pursuing` | `phaseElapsedSec >= strikeSec` **e** há alvo válido → encadeia **da posição atual** (FR-008) |
| `striking` | `returning` | `phaseElapsedSec >= strikeSec` e não há alvo válido (FR-009) |
| `returning` | `pursuing` | Surge alvo válido no alcance → interrompe o retorno (FR-010) |
| `returning` | `idle` | Chegou à base (FR-011) |

`striking → preparing` **não existe**: o `prepare` ("levantar") é a saída da base,
não parte do encadeamento — encadear vai direto para a corrida.

---

## 4. Alvo Válido

> *Spec*: inimigo vivo, ainda no caminho, dentro do alcance da torre.

**Reuso, sem tipo novo**: `Targetable` (`src/systems/targeting.ts`) já expõe
`x`, `y`, `alive`, `distanceTravelled`, e `Enemy` o satisfaz estruturalmente
(`alive` é `status === 'alive'`, então morto **e** vazado já caem fora).

Validade = `isTargetValid(behavior, base, target)` de `src/systems/combat.ts` —
vivo **e** dentro de `range` medido **da base** (FR-012). A única mudança é
documental: o parâmetro `origin` passa a se chamar/ler explicitamente como a base
da torre, nunca a posição corrente do perseguidor.

Seleção = `pickMostAdvancedInRange(base.x, base.y, range, candidates)` — inalterada
(FR-007), desempate pelo primeiro na ordem de avaliação (D5).

---

## 5. Base

> *Spec*: posição fixa em que a torre foi construída; origem do alcance e destino
> do retorno.

Sem entidade nova: é o `{ x, y }` da `Tower` (imutável após a construção, já que o
jogo não permite mover nem vender torre). Entra no sistema puro como um `Origin`
(`src/systems/combat.ts`), o mesmo tipo que `resolveAttack` já consome.

**Invariante da coleira (FR-012a / SC-008)**: a posição do estado é sempre
grampeada ao disco `|pos - base| <= range`. Testável sem renderizar.

---

## Resumo do delta de tipos

| Tipo | Arquivo | Status |
|------|---------|--------|
| `EngagementProfile` | `src/data/towers.ts` | **novo** |
| `AttackBehaviorSpec.engagement` | `src/data/towers.ts` | **novo campo (obrigatório)** |
| `EngagementTimings` | `src/systems/engagement.ts` | **novo** |
| `EngagementPhase<T>` / `EngagementState<T>` | `src/systems/engagement.ts` | **novo** |
| `EngagementCommand<T>` | `src/systems/engagement.ts` | **novo** (ver `contracts/engagement-system.md`) |
| `Targetable` | `src/systems/targeting.ts` | reusado, sem mudança |
| `AttackBehavior` | `src/data/towers.ts` | ganha `engagement` por propagação |
| `TowerType.range` (Caramelo) | `src/data/towers.ts` | 120 → **200** (+ contrato) |
