---
description: "Task list for Technical Debt Hardening"
---

# Tasks: Technical Debt Hardening

**Input**: Design documents from `/specs/007-technical-debt-hardening/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks ARE included. research.md D7 explicitly requires pure Vitest
coverage for balance contracts, attack behavior resolution, event/state contracts,
map validation, and roster layout rules.

**Organization**: Tasks are grouped by user story so each story can be implemented,
verified with `npm run check`, and played independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1..US5)
- Every task names the exact file path it touches

## Path Conventions

Single-project Phaser game at repository root. Source in `src/`, tests colocated as
`src/**/*.test.ts` (existing project convention — do not introduce a `tests/` tree).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the starting state before changing contracts

- [X] T001 Run `npm run check` from repository root and record the baseline failure (currently `src/data/enemies.test.ts`: `speed` 300≠200, `radius` 20≠25) so the drift being resolved in US1 is documented rather than assumed
- [X] T002 [P] Verify `.gitignore` at repository root covers `node_modules/`, `dist/`, `*.log`, `.env*`, `.DS_Store`; append only missing patterns

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The Gameplay Contract entity from data-model.md — the registry that US1
balance tests, US3 attack contracts, and US5 map contracts all register against

**⚠️ CRITICAL**: No user story work begins until T003 and T004 are complete

- [X] T003 Create `src/data/contracts.ts` with the `GameplayContract` interface (`id`, `subject`, `acceptedValues`, `reason`, `changedBy?`) and an empty exported `ACCEPTED_CONTRACTS` registry keyed by `id`, per data-model.md "Gameplay Contract"
- [X] T004 [P] Create `src/data/contracts.test.ts` asserting registry integrity: every entry's key matches its `id`, `reason` is non-empty, and `subject` is one of the allowed subjects

**Checkpoint**: Contract registry exists — user stories can now register accepted values

---

## Phase 3: User Story 1 - Restaurar Confiança de Entrega (Priority: P1) 🎯 MVP

**Goal**: `npm run check` is green and trustworthy — balance drift fails loudly and names the metric, while accepted values are recorded as deliberate decisions.

**Independent Test**: Change a gameplay stat in `src/data/enemies.ts`; the gate fails naming the divergent metric. Revert; the gate passes.

### Tests for User Story 1

- [X] T005 [US1] Rewrite `src/data/enemies.test.ts` to assert `ENEMY_TYPES['dois-caras-moto']` against the `enemy.dois-caras-moto.base-stats` entry in `ACCEPTED_CONTRACTS`, with a failure message that names the divergent metric (FR-002, SC-001)
- [X] T006 [P] [US1] Create `src/data/towers.test.ts` asserting `TOWER_TYPES['vira-lata-caramelo']` gameplay stats (`cost` 50, `range` 120, `damage` 5, `fireRate` 2, `projectileSpeed` 420, `radius` 20) against its `ACCEPTED_CONTRACTS` entry
- [X] T007 [P] [US1] Create `src/data/waves.test.ts` asserting `PROGRESSION_PROFILE` in `src/data/waves.ts` against its `ACCEPTED_CONTRACTS` entry (endless progression tuning is rule-critical)

### Implementation for User Story 1

- [X] T008 [US1] Resolve the balance drift as a deliberate decision (research.md D2). Git blame showed `speed` 200→300 and `radius` 25→20 rode in on commit `4a9796a` — the `006-nitidez-sprites` (sprite sharpness) feature, i.e. a presentation change silently altering gameplay. **Decision: accidental drift, reverted.** `src/data/enemies.ts` returns to `speed` 200 / `radius` 25, and `enemy.dois-caras-moto.base-stats` in `src/data/contracts.ts` records those as accepted with `changedBy` documenting the revert
- [X] T009 [P] [US1] Register `tower.vira-lata-caramelo.base-stats` and `wave.progression-profile` entries in `src/data/contracts.ts` with accepted values and reasons
- [X] T010 [US1] Run `npm run check` and confirm it passes with zero failures (SC-001)

**Checkpoint**: Verification gate is green and every rule-critical test maps to an accepted contract

---

## Phase 4: User Story 2 - Alinhar Contrato de Partida (Priority: P1)

**Goal**: One documented match progression contract — endless, defeat-only — with HUD, README, and runtime all describing the same behavior.

**Independent Test**: Play a full match; start/pause/defeat/restart behavior matches contracts/match-progression.md exactly, and no surface promises a final wave or victory.

### Tests for User Story 2

- [X] T011 [P] [US2] Create `src/systems/matchProgression.test.ts` covering the state table in data-model.md "State Compatibility Matrix": `setup-paused` allows build and start, `running` advances combat, `paused` locks build, `defeated` is terminal until reset, and invalid transitions are rejected
- [X] T012 [P] [US2] Add tests to `src/systems/matchProgression.test.ts` for the regression targets in contracts/match-progression.md: starting from setup does not skip wave 1, pausing does not advance timers, defeat stops progression

### Implementation for User Story 2

- [X] T013 [US2] Create `src/systems/matchProgression.ts` as a pure state machine: `MatchState` = `'setup-paused' | 'running' | 'paused' | 'defeated'`, plus `transition(state, action)`, `canBuild(state)`, `canToggleFlow(state)`, and `advancesGameplay(state)` — no Phaser imports (Constitution IX)
- [X] T014 [US2] Refactor `src/core/GameState.ts` to derive its state from `matchProgression.ts` instead of the ad-hoc `_paused`/`_started`/`_over` booleans, exposing a `state` getter while keeping `isPaused`/`isStarted`/`isBuildLocked`/`isOver` as derived accessors so existing callers keep working (depends on T013)
- [X] T015 [US2] Update the guard in `src/scenes/GameScene.ts:119` to gate the update loop on `advancesGameplay(GameState.state)` so enemies, towers, projectiles, and wave timers freeze in every non-running state (FR-005)
- [X] T016 [US2] Update HUD copy in `src/scenes/UIScene.ts`: the wave label must show the current wave without implying a finite total, and the defeat overlay must disable build/start/pause controls while leaving restart reachable (FR-004, FR-005)
- [X] T017 [US2] Harden `restartGame()` in `src/scenes/UIScene.ts:382` so restart returns to `setup-paused` with economy, lives, wave display, towers, enemies, projectiles, and tower selection all cleared (contracts/match-progression.md restart rule)
- [X] T018 [P] [US2] Fix `README.md`: line 107 ("Sobreviva às 3 ondas para vencer") and line 113 ("vitória/derrota") must describe endless progression with defeat-only ending; line 116 must not promise "ondas 4–10"; line 143 must not claim `WaveManager` "detecta fim da onda / vitória" (FR-004, SC-002)
- [X] T019 [US2] Run `npm run check` and play one match via `npm run dev` validating quickstart.md section 2

**Checkpoint**: Match contract is single, documented, and enforced — README, HUD, and runtime agree

---

## Phase 5: User Story 3 - Desacoplar Regras de Combate da Apresentação (Priority: P2)

**Goal**: Attack outcomes come from an attack behavior contract, never from whether a visual asset happens to exist.

**Independent Test**: Two visually different attacks producing identical gameplay results, and two visually similar attacks producing different results, both expressible in data and testable without rendering.

### Tests for User Story 3

- [X] T020 [P] [US3] Create `src/systems/combat.test.ts` covering all three behavior categories from contracts/attack-behavior.md (`projectile`, `direct`, `area`) resolving without any Phaser/texture involvement (SC-003)
- [X] T021 [P] [US3] Add tests to `src/systems/combat.test.ts` for the regression targets: an invalid/dead/leaked target receives no damage; removing the attack sprite does not disable damage; adding an animation does not silently convert a projectile attack into direct damage

### Implementation for User Story 3

- [X] T022 [US3] Add attack behavior types to `src/data/towers.ts` per data-model.md "Attack Behavior": `AttackBehavior` with `id`, `kind` (`projectile` | `direct` | `area`), `targetRule`, `damage`, `cadence`, `range`, optional `projectile`/`area`/`statusEffects`, and `visualCuePolicy` (`none` | `onCue` | `onImpact`)
- [X] T023 [US3] Create `src/systems/combat.ts` with a pure `resolveAttack(behavior, origin, enemies, state)` returning a declarative outcome (spawn projectile / apply direct damage / apply area damage / no-op) and a shared target-validation rule reused by all three kinds
- [X] T024 [US3] Add an `attackBehavior` field to `vira-lata-caramelo` in `src/data/towers.ts` that preserves today's accepted gameplay exactly (`kind: 'projectile'`, damage 5, cadence 2/s, range 120, projectile speed 420, `visualCuePolicy: 'onCue'` with gameplay fallback timing) — behavior equivalence is the acceptance bar (depends on T022)
- [X] T025 [US3] Refactor `src/entities/Tower.ts:130-159` so `update()` resolves the attack through `combat.ts` for every tower, deleting the `if (this.attackAnimator) …direct… else …projectile…` branch that lets asset presence choose the damage path (FR-006, research.md D3)
- [X] T026 [US3] Update `src/entities/TowerAttackAnimator.ts` so its fire cue only *signals timing* to the behavior resolver, and a missing/failed animation asset falls back to the behavior's own timing without changing damage, cadence, range, or target rules (FR-014)
- [X] T027 [US3] Register `tower.vira-lata-caramelo.attack-behavior` in `src/data/contracts.ts` recording the accepted damage/cadence/range/kind, and run `npm run check`

**Checkpoint**: Gameplay damage is asset-independent; a new attack category needs no change to existing behaviors

---

## Phase 6: User Story 4 - Tornar Estado e Eventos Confiáveis (Priority: P2)

**Goal**: Every declared event has a producer, a consumer, and a complete payload — or an explicit reserved status. No dead API surface.

**Independent Test**: Exercise money/lives/wave/pause/selection/defeat/reset cycles; each transition emits exactly the documented payload, and no reserved event fires.

### Tests for User Story 4

- [X] T028 [P] [US4] Create `src/core/EventBus.test.ts` asserting the catalog contract from contracts/event-state.md: every `active` event declares producer, consumer, and payload; every `reserved` event declares an expected future use and is not emitted by current gameplay (SC-004)
- [X] T029 [P] [US4] Create `src/core/GameState.test.ts` for the state invariants: money never goes negative through spending, a failed `spend()` emits no money change, lives never go negative, losing the final life emits lives-changed *before* match-defeated, and defeated is terminal until reset (contracts/event-state.md regression targets)

### Implementation for User Story 4

- [X] T030 [US4] Rework the event catalog in `src/core/EventBus.ts` into a typed contract: a `GameEventPayloads` map giving each event a structured payload, plus a lifecycle status (`active` | `reserved`) with producer/consumer notes, replacing today's comment-only documentation (research.md D4)
- [X] T031 [US4] Resolve the three dead events in `src/core/EventBus.ts` — `WAVE_STATE_CHANGED`, `ENEMY_KILLED`, and `ENEMY_LEAKED` are declared but never emitted or consumed: make each one active with a real producer and consumer, or mark it `reserved` with a documented reason (FR-009)
- [X] T032 [US4] Emit `ENEMY_KILLED` with `{ enemyTypeId, reward }` and `ENEMY_LEAKED` with `{ enemyTypeId, damage }` from the kill/leak paths in `src/scenes/GameScene.ts:135` and `:140`, so economy and life loss stop being silent side effects (FR-008)
- [X] T033 [US4] Add a match-reset event to `src/core/EventBus.ts` and emit it from `reset()` in `src/core/GameState.ts:18`, and give the defeat event a `{ reason }` payload as required by the event catalog
- [X] T034 [US4] Update payload shapes in `src/core/GameState.ts` to the catalog contract (`{ money }`, `{ lives }`, `{ wave, total }`, `{ paused, started }`) so consumers no longer read unrelated global state (depends on T030)
- [X] T035 [US4] Update the six subscribers in `src/scenes/UIScene.ts:295-300` and the selection subscriber in `src/managers/BuildManager.ts:45` to the new payload shapes (depends on T034)
- [X] T036 [US4] Run `npm run check` and validate quickstart.md section 4

**Checkpoint**: The event catalog is auditable; HUD and gameplay communicate through complete, typed payloads

---

## Phase 7: User Story 5 - Preparar Expansão de Conteúdo (Priority: P3)

**Goal**: One map contract feeds visual, path, placement, and debug; the build menu survives a roster larger than one tower.

**Independent Test**: Rehearse with four tower entries (all reachable and legible) and edit the map contract once — movement, placement, and debug all follow.

### Tests for User Story 5

- [X] T037 [P] [US5] Create `src/systems/mapContract.test.ts` for the validation rules in contracts/map-contract.md: unique id, at least two waypoints, first/last points may touch playable bounds while intermediate points must stay inside, `roadWidth` positive, and build bounds contained by playable bounds
- [X] T038 [P] [US5] Create `src/systems/rosterLayout.test.ts` asserting the roster-ui.md growth rule: four tower entries all remain reachable within the sidebar, with no card overflowing its slot (SC-005)

### Implementation for User Story 5

- [X] T039 [P] [US5] Create `src/data/maps.ts` with the `MapContract` interface (`id`, `visualKey`, `fallbackVisual`, `playableBounds`, `buildBounds`, `path`, `roadWidth`, `debug`) and an `INITIAL_MAP` entry carrying the existing waypoints and `PATH_WIDTH` of 55 (research.md D5)
- [X] T040 [P] [US5] Create `src/systems/mapContract.ts` with a pure `validateMapContract(map)` returning structured errors, so a map whose visual diverges from its gameplay path is caught before reaching the player (FR-012)
- [X] T041 [US5] Migrate the waypoints out of `src/data/path.ts` into the `INITIAL_MAP` contract, keeping `Point` and `pathLength` exported for existing consumers (depends on T039)
- [X] T042 [US5] Update `src/scenes/GameScene.ts:9,64-82` to read `visualKey`, `fallbackVisual`, and `path` from the map contract, preserving the existing missing-asset log and playable fallback (FR-014)
- [X] T043 [US5] Update `src/managers/BuildManager.ts:4-5,115` to take `buildBounds` and `roadWidth` from the map contract instead of importing `PATH`, `PATH_WIDTH`, `PLAY_WIDTH`, `GAME_HEIGHT`, and `HUD_HEIGHT` separately (depends on T039)
- [X] T044 [US5] Update `src/debug/DebugOverlay.ts:2-3,108,155,208-209` to draw the path and road width from the same map contract, so debug can no longer disagree with build blocking (contracts/map-contract.md regression targets)
- [X] T045 [US5] Create `src/systems/rosterLayout.ts` with pure layout rules (slot positions, visible window, overflow detection) derived from card size, gap, and available sidebar height
- [X] T046 [US5] Rework the sidebar in `src/scenes/UIScene.ts:113-116` to lay out cards through `rosterLayout.ts` with an explicit access pattern (scroll, page, or compact) so entries beyond the visible window stay reachable and start/pause/restart controls stay on screen (FR-011, depends on T045)
- [X] T047 [US5] Ensure tower cards in `src/scenes/UIScene.ts:271-284` keep selection, affordability, and locked states visually distinct — a selected unaffordable tower must not look like an affordable unselected one (contracts/roster-ui.md)
- [X] T048 [US5] Run the four-entry rehearsal from quickstart.md section 6 using temporary roster entries, confirm every entry is reachable and legible, then run `npm run check`

**Checkpoint**: Map is a single contract and the build menu is ready for more towers

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T049 [P] Update the architecture section of `README.md` (lines 120-150) to list the new modules: `data/contracts.ts`, `data/maps.ts`, `systems/matchProgression.ts`, `systems/combat.ts`, `systems/mapContract.ts`, `systems/rosterLayout.ts`
- [X] T050 [P] Remove now-dead exports left behind by the migrations (`PATH_WIDTH` in `src/core/constants.ts:25` if fully absorbed by the map contract, and any unused re-export in `src/data/path.ts`)
- [X] T051 Run the full quickstart.md validation end to end (sections 1-6)
- [X] T052 Confirm SC-007: build, start, pause, attack, earn money, lose life, defeat, and restart all still work with no regression

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (the contract registry is where US1/US3/US5 record accepted values)
- **User Stories (Phase 3-7)**: All depend on Foundational
- **Polish (Phase 8)**: Depends on the user stories you chose to ship

### User Story Dependencies

- **US1 (P1)**: Independent after Foundational. Ship first — it is the gate every other story's checkpoint relies on.
- **US2 (P1)**: Independent after Foundational.
- **US3 (P2)**: Independent after Foundational. Touches `Tower.ts`/`TowerAttackAnimator.ts`, which no other story modifies.
- **US4 (P2)**: Independent, but T034/T035 change payload shapes consumed by `UIScene.ts` — if US2 (T016) runs in parallel, coordinate on `UIScene.ts`.
- **US5 (P3)**: Independent, but T046/T047 also touch `UIScene.ts`. Run US5's sidebar work after US2's HUD work to avoid conflicting edits.

### Shared-File Coordination (must not run in parallel)

- `src/scenes/UIScene.ts`: T016, T017 (US2) → T035 (US4) → T046, T047 (US5)
- `src/core/GameState.ts`: T014 (US2) → T033, T034 (US4)
- `src/data/towers.ts`: T022 → T024 (US3, sequential)
- `src/data/contracts.ts`: T008, T009 (US1) → T027 (US3)

### Parallel Opportunities

- T004 runs alongside the rest of Foundational setup
- Within US1: T006 and T007 are different new test files; T009 is a separate registry entry
- Within US2: T011 and T012 (same new test file, write together) and T018 (README) are independent of the source refactor
- Within US3: T020 and T021 are test-first and independent of each other
- Within US4: T028 and T029 are different new test files
- Within US5: T037/T038 (tests) and T039/T040 (new modules) are all different files
- Across stories: US3 (entities) and US5's map half (T039-T044) touch disjoint files and can run in parallel by different developers

---

## Parallel Example: User Story 5

```bash
# Tests and new pure modules are all distinct files:
Task: "Create src/systems/mapContract.test.ts with map validation rules"
Task: "Create src/systems/rosterLayout.test.ts with four-entry reachability rules"
Task: "Create src/data/maps.ts with MapContract and INITIAL_MAP"
Task: "Create src/systems/mapContract.ts with validateMapContract()"

# Then the consumers, sequentially (each touches a different file but depends on maps.ts):
Task: "Update src/scenes/GameScene.ts to read the map contract"
Task: "Update src/managers/BuildManager.ts to read buildBounds and roadWidth"
Task: "Update src/debug/DebugOverlay.ts to draw from the map contract"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (contract registry — blocks everything)
3. Phase 3: User Story 1
4. **STOP and VALIDATE**: `npm run check` is green, and a deliberate stat change fails the gate naming the metric
5. This alone restores trusted delivery — every later story can now prove it did not regress anything

### Incremental Delivery

1. Setup + Foundational → registry ready
2. US1 → green, trustworthy gate (MVP)
3. US2 → match contract aligned across README, HUD, runtime
4. US3 → combat rules independent from assets
5. US4 → auditable events and state
6. US5 → map contract and roster UI ready for content
7. Each story ends on a green `npm run check` and a still-playable loop (SC-007)

### Parallel Team Strategy

After Foundational: Developer A takes US1 then US2 (both P1, both touch state/docs); Developer B takes US3 (entities/combat, disjoint files); Developer C takes the map half of US5 (T039-T044). Serialize all `UIScene.ts` work through one developer.

---

## Notes

- Every story checkpoint requires `npm run check` green — that is the point of US1
- Rule-critical logic goes in `src/systems/*.ts` as pure functions with colocated `*.test.ts` (Constitution IX); Phaser scenes stay coordinators
- Any intentional balance change must update its `ACCEPTED_CONTRACTS` entry with a reason — never loosen a test to make the gate pass
- Commit after each task or logical group
