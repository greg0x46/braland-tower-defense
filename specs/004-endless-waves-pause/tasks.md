---
description: "Task list for feature implementation"
---

# Tasks: Ondas Automáticas, Infinitas e Pausa

**Input**: Design documents from `/specs/004-endless-waves-pause/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks ARE included — the spec/quickstart explicitly require pure-logic tests (`waveClock.test.ts`, extended `waves.test.ts`) and Constitution IX mandates testable domains without Phaser.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project** (Phaser + Vite front-end): source at `src/` in repository root. This matches plan.md's Structure Decision (no new layers).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish a green baseline before touching the wave loop.

- [X] T001 Confirm baseline toolchain is green by running `npm install` then `npm run check` (typecheck + tests) from repo root; record the pre-change pass so regressions are attributable.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared timing config and event-channel changes that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Add `WAVE_TIMING` (`initialDelaySec` ~2s, `interWaveSec` ~3s) as an exported const in `src/core/constants.ts` (source of truth for wave timing per FR-003/D7).
- [X] T003 [P] Update `GameEvents` in `src/core/EventBus.ts`: add `PAUSE_STATE_CHANGED` (`pause-state-changed`, payload `boolean`); remove `REQUEST_START_WAVE` and `GAME_WON` keys (FR-001, FR-004, FR-007 per contracts/events.md).

**Checkpoint**: Timing constants and event channel ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Ondas automáticas e infinitas (Priority: P1) 🎯 MVP

**Goal**: A partida flui sozinha — a onda 1 inicia automaticamente após um breve intervalo, e a cada onda limpa um curto intervalo antecede a próxima, indefinidamente, sem clique e sem tela de vitória.

**Independent Test**: Iniciar a partida sem tocar em botão algum e observar a onda 1 começar sozinha, o intervalo curto entre ondas e o ciclo se repetindo além da onda 10/20 sem tela de vitória.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST and ensure they FAIL before implementing the WaveClock.**

- [X] T004 [P] [US1] Create `src/systems/waveClock.test.ts` covering auto-start after `initialDelaySec` → `waveStarted: 1` (FR-001), spawns emitted when `elapsed ≥ atSeconds` (FR-002/SC-002), wave ends only when all spawned AND `aliveEnemyCount === 0`, `interWaveSec` interval then next wave (FR-003), pause = not ticking preserves `remainingSec` without skip/dup (FR-013/SC-007), and ≥20 waves never reach a terminal state (FR-004/SC-003).

### Implementation for User Story 1

- [X] T005 [P] [US1] Replace the fixed `WAVES` array in `src/data/waves.ts` with an exported `PROGRESSION_PROFILE: ProgressionProfile` (`baseCount`, `countGrowth`, `baseIntervalSec`, `intervalDecay`, `minIntervalSec`, `hpGrowthPerWave`, `varietyStep`) and the `ProgressionProfile` type, keeping `Wave`/`SpawnGroup` shapes intact (data-model.md).
- [X] T006 [US1] Implement `generateWave(waveIndex, profile, roster): Wave` and the test helper `waveDifficulty(wave, roster): number` in `src/systems/waves.ts`, producing `groups: SpawnGroup[]` compatible with existing `buildSpawnSchedule`/`totalSpawnCount` for any index (contracts/wave-progression.md). Depends on T005.
- [X] T007 [P] [US1] Implement the pure `WaveClock` state machine in `src/systems/waveClock.ts` — discriminated union `WaveClockPhase` (`initial-delay` → `spawning` → `awaiting-clear` → `interval`), constructor `{ timing, generate }`, and `tick(dt, aliveEnemyCount): WaveTickResult` returning `{ spawns, waveStarted? }`; no Phaser, no per-frame allocation on the empty-spawn path (contracts/wave-progression.md). Makes T004 pass.
- [X] T008 [US1] Refactor `src/managers/WaveManager.ts` into a thin `WaveClock` adapter: `update(dt)` calls `clock.tick(dt, getEnemyCount())`, spawns each returned id via `spawnEnemy`, and calls `GameState.setWave(waveStarted, 0)` on wave start; remove `REQUEST_START_WAVE`, `startNextWave`, `hasMoreWaves`, `GAME_WON`, and the Phaser `timers` array/`delayedCall` scheduling. Depends on T006, T007.
- [X] T009 [US1] Update `src/scenes/GameScene.ts` `update(_time, delta)` to pass real `dt` to `waveManager.update(dt)` and skip the loop when `GameState.isOver` (pause gate added in US3); ensure `WaveManager` receives dt-driven ticks instead of the old no-arg call. Depends on T008.
- [X] T010 [P] [US1] Remove the victory path from `src/scenes/UIScene.ts`: delete the `GAME_WON` listener, `onGameWon`, and the "VITÓRIA" screen (FR-004/D5); leave the "DERROTA"/`GAME_OVER` flow and `restartGame()` intact.

**Checkpoint**: Waves auto-start, loop infinitely with a short interval, and no victory screen appears — US1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Dificuldade progressiva e infinita (Priority: P2)

**Goal**: Cada onda mais avançada é mensuravelmente mais difícil (quantidade, ritmo e resistência crescem monotonicamente), com variedade que incorpora automaticamente novos tipos de inimigo do roster, sem reescrever a escalada.

**Independent Test**: Comparar ondas distantes (ex.: 1 vs 8 vs 15) e verificar de forma mensurável que quantidade e resistência total crescem monotonicamente conforme o índice — provado pelos testes, sem inspecionar a implementação.

### Tests for User Story 2 ⚠️

> **NOTE: Write/extend these tests FIRST and ensure the monotonicity/variety assertions FAIL before tuning generateWave.**

- [X] T011 [P] [US2] Extend `src/systems/waves.test.ts`: determinism (same input → same `Wave`), strict monotonicity of `waveDifficulty` across the progression (SC-004), effective `interval` never increases with index and respects `minIntervalSec` (FR-012), and variety — with a simulated 2+ type roster, advanced waves include new types per `varietyStep` (FR-006) without changing the function signature.

### Implementation for User Story 2

- [X] T012 [US2] Harden the scaling in `generateWave` in `src/systems/waves.ts` so quantity, spawn rate (decaying `interval` floored at `minIntervalSec`), and per-enemy HP grow monotonically with `waveIndex`, and variety draws additional roster types as the index passes `varietyStep` multiples (deterministic, seed from index if randomized). Makes T011 pass. Depends on T006, T011.
- [X] T013 [US2] Tune `PROGRESSION_PROFILE` values in `src/data/waves.ts` for controlled growth (no instant spawn spikes, FR-012/SC-003) while keeping total difficulty strictly increasing (SC-004). Depends on T012.

**Checkpoint**: Difficulty scales measurably and infinitely with automatic variety — US1 and US2 both work.

---

## Phase 5: User Story 3 - Botão de Pausar / Continuar (Priority: P3)

**Goal**: O antigo botão de iniciar onda vira "⏸ Pausar"; pausar congela por completo o jogo (inimigos, torres, projéteis, contagens e construção) e o botão exibe "▶ Continuar"; continuar retoma do ponto exato.

**Independent Test**: Durante uma onda ativa, clicar "Pausar" e confirmar que todo movimento/ataque/contagem congela e o rótulo muda; clicar "Continuar" e confirmar retomada sem perda de estado, inclusive durante o intervalo entre ondas.

### Implementation for User Story 3

- [X] T014 [US3] Add pause state to `src/core/GameState.ts`: `get isPaused()`, `togglePause()` (NO-OP when `isOver`), `setPaused(v)`, emit `PAUSE_STATE_CHANGED` only on change, and `reset()` restoring `isPaused = false` (contracts/pause-state.md). Depends on T003.
- [X] T015 [US3] Add the pause gate to `src/scenes/GameScene.ts` `update`: early-return when `GameState.isPaused` (in addition to `isOver`) so entities, towers, projectiles, and the wave clock all freeze (FR-008/SC-005). Depends on T009, T014.
- [X] T016 [P] [US3] Gate construction in `src/managers/BuildManager.ts`: early-return in `onSelect`, `onPointerMove`, and `onPointerDown` when `GameState.isPaused` (FR-010). Depends on T014.
- [X] T017 [US3] Replace the "▶ Iniciar Onda" button in `src/scenes/UIScene.ts` with the Pausar/Continuar button in the same slot (`GAME_HEIGHT - 44`): click calls `GameState.togglePause()`, listen to `PAUSE_STATE_CHANGED` to swap label/color immediately, ignore tower-card clicks while paused, keep the button inert after `GAME_OVER`, and drop the `WAVE_STATE_CHANGED` enable/disable wiring (contracts/pause-state.md). Depends on T003, T010, T014.

**Checkpoint**: Full-freeze pause/resume works with correct button state — all three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the whole feature end-to-end and confirm the Definition of Done.

- [X] T018 Run `npm run build` and `npm run check` (typecheck + all tests, strict, no `any`/`as`) and confirm green (Constitution XIV / quickstart.md).
- [ ] T019 (MANUAL — awaiting user) Execute the manual quickstart scenarios in `src/` via `npm run dev` — Cenário 1 (auto/infinite, ≥20 waves, no victory), Cenário 2 (progressive difficulty, FPS stable via debug overlay), Cenário 3 (pause/resume incl. mid-interval and rapid toggling, defeat leaves button inert).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3–5)**: All depend on Foundational completion.
  - US1 (P1) is the MVP. US2 refines the progression engine created in US1 (shared file `systems/waves.ts`). US3 is largely independent (pause) but its `GameScene` gate (T015) layers onto US1's `GameScene` change (T009).
- **Polish (Phase 6)**: Depends on all targeted stories being complete.

### User Story Dependencies

- **US1 (P1)**: Foundational only. Delivers the auto/infinite loop plus the `generateWave`/`PROGRESSION_PROFILE` engine (created here because both US1 and US2 need it — placed in the earliest story).
- **US2 (P2)**: Builds on US1's `generateWave`/profile (same file) to make difficulty strictly monotonic and add roster variety; independently testable via `waves.test.ts`.
- **US3 (P3)**: Foundational (event) + `GameState`. Its `GameScene` gate stacks on US1's `GameScene` edit; otherwise independent.

### Within Each User Story

- Tests (US1 T004, US2 T011) are written FIRST and must FAIL before implementation.
- Data/profile (T005) before `generateWave` (T006).
- Pure systems (`generateWave`, `WaveClock`) before the `WaveManager` adapter (T008) before the `GameScene` wiring (T009).
- `GameState` pause (T014) before its consumers (T015–T017).

### Parallel Opportunities

- **Phase 2**: T002 and T003 are different files → run in parallel.
- **US1**: T004 (test) ∥ T005 (data) ∥ T007 (waveClock) ∥ T010 (UIScene victory removal) — all different files with no mutual dependency. T006 waits on T005; T008 waits on T006+T007; T009 waits on T008.
- **US2**: T011 (test) can be written in parallel with US1 wrap-up; T012 waits on it.
- **US3**: T016 (BuildManager) runs parallel to T015/T017 once T014 lands.

---

## Parallel Example: User Story 1

```bash
# After Phase 2, launch these US1 tasks together (different files, no shared deps):
Task: "T004 Create src/systems/waveClock.test.ts (failing WaveClock tests)"
Task: "T005 Replace WAVES with PROGRESSION_PROFILE in src/data/waves.ts"
Task: "T007 Implement WaveClock state machine in src/systems/waveClock.ts"
Task: "T010 Remove victory path from src/scenes/UIScene.ts"

# Then serialize the dependent chain:
# T006 (generateWave) → T008 (WaveManager adapter) → T009 (GameScene wiring)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational — timing + events).
2. Complete Phase 3 (US1): WaveClock + generateWave + WaveManager adapter + GameScene wiring + victory removal.
3. **STOP and VALIDATE**: Start a match, touch nothing, confirm auto-start, short inter-wave interval, infinite loop past wave 10/20, no victory screen.
4. Demo — this alone redefines the core loop.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → auto/infinite loop (MVP) → validate → demo.
3. US2 → measurable progressive difficulty + variety → validate via `waves.test.ts` → demo.
4. US3 → pause/resume full freeze → validate → demo.
5. Polish → build/check green + manual quickstart.

### Notes

- [P] tasks = different files, no dependencies.
- `systems/waves.ts` is touched by both US1 (create) and US2 (harden) — sequence T006 → T012, do not parallelize them.
- Verify the new tests fail before implementing; commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
