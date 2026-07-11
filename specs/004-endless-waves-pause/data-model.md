# Data Model: Ondas Automáticas, Infinitas e Pausa

**Fase 1** — Entidades, estados e transições. Modelagem em tipos TypeScript
(uniões discriminadas onde há estados), aderente à Constituição VII. Nenhuma entidade
depende de asset/emoji.

---

## Entidade: Perfil de Progressão (`ProgressionProfile`)

Regra data-driven, em `src/data/waves.ts`, que dado o índice da onda determina de forma
mensurável e monotônica a composição da onda. Não referencia inimigos por dado
embutido: consulta o roster (`ENEMY_TYPES`) para incorporar novos tipos (FR-006).

| Campo | Tipo | Descrição | Regra |
|-------|------|-----------|-------|
| `baseCount` | `number` | Quantidade de inimigos da onda 1 | > 0 |
| `countGrowth` | `number` | Incremento de quantidade por onda | ≥ 0; crescimento controlado (FR-012) |
| `baseIntervalSec` | `number` | Intervalo inicial entre spawns | > `minIntervalSec` |
| `intervalDecay` | `number` | Redução do intervalo por onda (ritmo ↑) | ≥ 0 |
| `minIntervalSec` | `number` | Piso do intervalo (anti-transbordo) | > 0 |
| `hpGrowthPerWave` | `number` | Fator de resistência aplicado por onda | ≥ 0; monotônico |
| `varietyStep` | `number` | A cada quantas ondas um novo tipo do roster entra na variedade | ≥ 1 |

**Validações**: crescimento sempre não-decrescente (nenhum campo de escalada negativo);
`baseIntervalSec > minIntervalSec`; a dificuldade total resultante (quantidade ×
resistência) é estritamente crescente ao longo da progressão (garante SC-004).

## Entidade: Onda (`Wave`) — *existente, reutilizada*

Estrutura já consumida por `buildSpawnSchedule`. Deixa de vir de uma lista fixa e passa
a ser **produzida** por `generateWave(index, profile, roster)`.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `groups` | `SpawnGroup[]` | Grupos de spawn (tipo, count, interval, delay) |

Identidade da onda = seu **índice** (0-based interno; 1-based exibido no HUD). Infinita:
não há índice máximo. `SpawnGroup` e `Wave` permanecem como em `data/waves.ts`.

## Entidade: Relógio de Ondas (`WaveClock`) — *novo, `src/systems/waveClock.ts`*

Máquina de estados pura (sem Phaser) que controla auto-início, agendamento de spawns e
intervalo entre ondas. Recebe `dt` e a contagem de inimigos vivos por tick; devolve os
eventos daquele tick. Não avança quando não é tickado (pausa = não chamar `tick`).

**Estado (união discriminada — Constituição VII):**

```text
WaveClockPhase =
  | { kind: 'initial-delay';  remainingSec }        // antes da onda 1
  | { kind: 'spawning'; waveIndex; elapsedSec; nextSpawnCursor }
  | { kind: 'awaiting-clear'; waveIndex }            // tudo spawnado, esperando limpar
  | { kind: 'interval'; nextWaveIndex; remainingSec } // contagem entre ondas
```

**Entrada de `tick(dt, aliveEnemyCount)` → Saída (`WaveTickResult`):**

| Campo | Tipo | Significado |
|-------|------|-------------|
| `spawns` | `string[]` | enemyTypeIds a spawnar neste tick (ordem determinística) |
| `waveStarted` | `number \| undefined` | índice (1-based) da onda que começou agora → HUD |

**Transições:**

| De | Condição | Para | Efeito |
|----|----------|------|--------|
| `initial-delay` | `remainingSec ≤ 0` | `spawning`(onda 0) | `waveStarted = 1` |
| `spawning` | schedule tem spawn com `atSeconds ≤ elapsed` | `spawning` | emite esses `spawns`, avança cursor |
| `spawning` | todos os spawns emitidos | `awaiting-clear` | — |
| `awaiting-clear` | `aliveEnemyCount === 0` | `interval` | inicia contagem `interWaveSec` |
| `interval` | `remainingSec ≤ 0` | `spawning`(próxima) | `waveStarted = índice+1` |

Determinístico: mesma sequência de `(dt, aliveEnemyCount)` produz a mesma saída
(Constituição VIII). O `WaveClock` gera a onda sob demanda via `generateWave` ao entrar
em `spawning`.

## Entidade: Estado de Pausa — *em `core/GameState`*

Condição global booleana da partida. Fonte única de verdade.

| Membro | Tipo | Descrição |
|--------|------|-----------|
| `isPaused` | `boolean` (getter) | jogando (`false`) vs. pausado (`true`) |
| `togglePause()` | `() => void` | inverte; **inerte se `isOver`** (edge case da spec) |
| `setPaused(v)` | `(boolean) => void` | define e emite se mudou |

Emite `PAUSE_STATE_CHANGED: boolean` ao mudar. `reset()` volta a `false`.

**Máquina de estados da partida (efeito da pausa):**

```text
                 togglePause (se !isOver)
   [Jogando] <───────────────────────────> [Pausado]
       │                                        │
       │ loseLife → 0 (GAME_OVER)               │ (togglePause inerte)
       ▼                                        ▼
   [Encerrada — derrota]  ◄──────── (pausa não impede derrota já ocorrida)
```

Regras: em **Pausado**, nenhum estado de gameplay avança (entidades, relógio de ondas,
timers, construção). Em **Encerrada**, o botão Pausar/Continuar fica inerte.

## Intervalo entre Ondas

Não é entidade própria: é a fase `interval` do `WaveClock`, sujeita à pausa (não tickada
quando pausado). Duração = `WAVE_TIMING.interWaveSec`. Ao continuar, retoma de onde
parou — nunca reinicia nem pula (FR-013, SC-006/SC-007), pois o `remainingSec` é
preservado no estado congelado.

## Constantes de Timing (`WAVE_TIMING` em `core/constants.ts`)

| Campo | Padrão | Origem |
|-------|--------|--------|
| `initialDelaySec` | breve (~2s) | FR-001 / Assumption |
| `interWaveSec` | ~3s | FR-003 / Assumption |

---

## Relações

```text
PROGRESSION_PROFILE ──┐
ENEMY_TYPES (roster) ─┼─► generateWave(index) ─► Wave ─► buildSpawnSchedule ─► ScheduledSpawn[]
                      │                                          │
WaveClock (phase) ◄───┘  tick(dt, aliveCount) ─► spawns[] ──────┘► WaveManager.spawnEnemy
     ▲                                                             └► GameState.setWave (HUD)
     │ não tickado quando
GameState.isPaused ──► GameScene.update (gate) ; BuildManager (gate) ; UIScene (botão)
```
