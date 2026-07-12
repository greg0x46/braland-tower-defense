# Tasks: Efeitos Sonoros de Combate

**Input**: Design documents from `/specs/011-efeitos-sonoros-combate/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included because the specification and quickstart require automated coverage for fallback resolution, throttling, effective volume, and EventBus contracts.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the concrete default SFX assets and shared constants used by all combat audio.

- [X] T001 Create deterministic WAV generator for the four default combat SFX files in tools/generate_combat_sfx.mjs
- [X] T002 Generate default combat SFX assets in src/assets/audio/combat-attack-default.wav, src/assets/audio/combat-impact-default.wav, src/assets/audio/combat-kill-default.wav, and src/assets/audio/combat-leak-default.wav
- [X] T003 Add combat SFX cache key and mix/throttle constants to src/core/constants.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish typed data, events, pure rules, asset loading, and the Phaser manager before any user story emits sounds.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [P] Extend audio catalog types and add COMBAT_SFX defaults in src/data/audio.ts
- [X] T005 [P] Add optional tower sound profile fields to TowerType in src/data/towers.ts
- [X] T006 [P] Add optional enemy sound profile fields to EnemyType in src/data/enemies.ts
- [X] T007 [P] Add CombatSfxCategory, CombatSfxId, and combat audio event payload types to src/core/EventBus.ts
- [X] T008 [P] Add EventBus catalog coverage for combat audio events and consumers in src/core/EventBus.test.ts
- [X] T009 [P] Add failing tests for fallback resolution, cooldown, concurrency, priority, release, and reset in src/systems/combatSfx.test.ts
- [X] T010 Implement deterministic combat SFX fallback, eligibility, release, and reset rules in src/systems/combatSfx.ts
- [X] T011 Add SFX asset imports, preload calls, and owned-asset load failure logging to src/scenes/BootScene.ts
- [X] T012 Create CombatSfxManager listener lifecycle and Phaser Sound Manager integration shell in src/managers/CombatSfxManager.ts
- [X] T013 Instantiate and destroy CombatSfxManager from the GameScene lifecycle in src/scenes/GameScene.ts

**Checkpoint**: Foundation ready - catalog, events, assets, pure rules, and manager lifecycle exist.

---

## Phase 3: User Story 1 - Torres soam ao atacar (Priority: P1) MVP

**Goal**: Tower attacks emit short SFX only when a real attack is confirmed.

**Independent Test**: Build a tower, start a wave, and confirm every sampled attack sound corresponds to a real tower action, with no sound while the tower has no target or is cooling down.

### Tests for User Story 1

> Write these tests first and confirm they fail before implementation.

- [X] T014 [P] [US1] Add tower-attack EventBus payload and catalog assertions in src/core/EventBus.test.ts
- [X] T015 [P] [US1] Add tower sound profile regression tests for default attack fallback in src/data/towers.test.ts

### Implementation for User Story 1

- [X] T016 [US1] Add attack sound profile values for each tower type in src/data/towers.ts
- [X] T017 [US1] Extend Tower constructor dependencies with a combat audio event callback in src/entities/Tower.ts
- [X] T018 [US1] Emit tower-attack events only after non-none AttackOutcome resolution in src/entities/Tower.ts
- [X] T019 [US1] Provide tower-attack event IDs, tower type IDs, coordinates, and scene time from src/scenes/GameScene.ts
- [X] T020 [US1] Resolve and play tower-attack SFX through COMBAT_SFX and combatSfx eligibility in src/managers/CombatSfxManager.ts
- [X] T021 [US1] Validate the tower attack scenario from specs/011-efeitos-sonoros-combate/quickstart.md

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Inimigos dao feedback sonoro (Priority: P2)

**Goal**: Enemy damage, defeat, and leak events produce distinct, throttled feedback without changing damage, rewards, or lives.

**Independent Test**: Start a wave, cause damage, kill enemies, and allow an enemy to leak, then confirm each event has coherent SFX and gameplay values remain unchanged.

### Tests for User Story 2

> Write these tests first and confirm they fail before implementation.

- [X] T022 [P] [US2] Add enemy sound profile regression tests for damaged, killed, and leaked fallbacks in src/data/enemies.test.ts
- [X] T023 [P] [US2] Add enemy-damaged, enemy-killed, and enemy-leaked audio contract assertions in src/core/EventBus.test.ts
- [X] T024 [P] [US2] Add combatSfx priority tests that preserve enemy-leaked over repeated enemy-damaged events in src/systems/combatSfx.test.ts

### Implementation for User Story 2

- [X] T025 [US2] Add damaged, killed, and leaked sound profile values for each enemy type in src/data/enemies.ts
- [X] T026 [US2] Return a typed TakeDamageResult from Enemy.takeDamage without changing HP or status rules in src/entities/Enemy.ts
- [X] T027 [US2] Emit enemy-damaged events for direct and area tower damage only when TakeDamageResult confirms real damage in src/entities/Tower.ts
- [X] T028 [US2] Extend Projectile with an impact callback that fires only for live target hits in src/entities/Projectile.ts
- [X] T029 [US2] Wire projectile impact callbacks and enemy-damaged event payloads from src/scenes/GameScene.ts
- [X] T030 [US2] Consume ENEMY_KILLED and ENEMY_LEAKED in CombatSfxManager without changing their gameplay payloads in src/managers/CombatSfxManager.ts
- [X] T031 [US2] Resolve and play enemy-damaged, enemy-killed, and enemy-leaked SFX with fallback and priority rules in src/managers/CombatSfxManager.ts
- [X] T032 [US2] Validate the enemy damage, kill, and leak scenario from specs/011-efeitos-sonoros-combate/quickstart.md

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Mixagem confortavel com a trilha (Priority: P3)

**Goal**: Combat SFX respect the existing mute/volume preference, remain comfortable with music, and clear old sounds on reset or shutdown.

**Independent Test**: Play with music and effects enabled, adjust mute/volume during combat, pause or restart the match, and confirm no delayed or duplicate SFX remain.

### Tests for User Story 3

> Write these tests first and confirm they fail before implementation.

- [X] T033 [P] [US3] Add combatSfx final volume tests for effectiveVolume multiplied by defaultVolume in src/systems/combatSfx.test.ts
- [X] T034 [P] [US3] Add EventBus catalog assertions for CombatSfxManager as an AUDIO_SETTINGS_CHANGED and MATCH_RESET consumer in src/core/EventBus.test.ts

### Implementation for User Story 3

- [X] T035 [US3] Apply AudioSettings.effectiveVolume multiplied by effect defaultVolume for every play call in src/managers/CombatSfxManager.ts
- [X] T036 [US3] Stop or silence active combat SFX immediately when effectiveVolume becomes 0 in src/managers/CombatSfxManager.ts
- [X] T037 [US3] Clear active SFX and throttling windows on MATCH_RESET and Phaser scene shutdown in src/managers/CombatSfxManager.ts
- [X] T038 [US3] De-duplicate nonfatal missing-cache and fallback failure logs per SFX key in src/managers/CombatSfxManager.ts
- [X] T039 [US3] Validate the mute, volume, pause, reset, and comfort scenarios from specs/011-efeitos-sonoros-combate/quickstart.md

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation alignment, and comfort/performance checks.

- [X] T040 [P] Update combat audio notes in specs/011-efeitos-sonoros-combate/quickstart.md if implementation-specific fallback behavior differs from the plan
- [X] T041 Run npm run check and fix any TypeScript or Vitest failures in package.json
- [ ] T042 Run a 10-minute manual combat audio comfort pass and record findings in specs/011-efeitos-sonoros-combate/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion - MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational completion and can be implemented after or alongside US1, but full enemy feedback is easier to validate after US1.
- **User Story 3 (Phase 5)**: Depends on Foundational completion and benefits from US1/US2 producing all categories.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other stories after foundation.
- **User Story 2 (P2)**: Can start after foundation, but uses the same manager and event helper patterns created for US1.
- **User Story 3 (P3)**: Can start after foundation, but final comfort validation requires at least US1 and preferably US2.

### Within Each User Story

- Tests before implementation.
- Data/profile tasks before producer wiring.
- Producer wiring before manager category playback validation.
- Quickstart validation after the story implementation is complete.

### Parallel Opportunities

- T004, T005, T006, T007, T008, and T009 can run in parallel after setup.
- T014 and T015 can run in parallel for US1.
- T022, T023, and T024 can run in parallel for US2.
- T033 and T034 can run in parallel for US3.
- Different user stories can be staffed in parallel after Phase 2, with merge care around src/core/EventBus.ts, src/systems/combatSfx.test.ts, src/entities/Tower.ts, src/scenes/GameScene.ts, and src/managers/CombatSfxManager.ts.

---

## Parallel Example: User Story 1

```bash
Task: "T014 [P] [US1] Add tower-attack EventBus payload and catalog assertions in src/core/EventBus.test.ts"
Task: "T015 [P] [US1] Add tower sound profile regression tests for default attack fallback in src/data/towers.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "T022 [P] [US2] Add enemy sound profile regression tests for damaged, killed, and leaked fallbacks in src/data/enemies.test.ts"
Task: "T023 [P] [US2] Add enemy-damaged, enemy-killed, and enemy-leaked audio contract assertions in src/core/EventBus.test.ts"
Task: "T024 [P] [US2] Add combatSfx priority tests that preserve enemy-leaked over repeated enemy-damaged events in src/systems/combatSfx.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "T033 [P] [US3] Add combatSfx final volume tests for effectiveVolume multiplied by defaultVolume in src/systems/combatSfx.test.ts"
Task: "T034 [P] [US3] Add EventBus catalog assertions for CombatSfxManager as an AUDIO_SETTINGS_CHANGED and MATCH_RESET consumer in src/core/EventBus.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Stop and validate tower attack audio independently with the quickstart scenario.

### Incremental Delivery

1. Complete Setup + Foundation.
2. Add US1 tower attack SFX and validate attack-only audio.
3. Add US2 enemy damage, kill, and leak SFX and validate gameplay values are unchanged.
4. Add US3 volume, reset, shutdown, and comfort behavior.
5. Run `npm run check` and manual quickstart validation.

### Parallel Team Strategy

1. One developer handles catalog/assets/EventBus while another handles pure combatSfx tests and implementation.
2. After Phase 2, split US1/US2/US3 test tasks by file ownership.
3. Merge story implementations in priority order to reduce conflicts in GameScene, Tower, and CombatSfxManager.

---

## Notes

- [P] tasks touch different files or are otherwise safe to start independently after their phase prerequisites.
- [US1], [US2], and [US3] labels map directly to the feature spec user stories.
- Combat audio remains presentation only; damage, reward, lives, target selection, cooldown, and wave progression must remain unchanged.
- Avoid hardcoded audio paths outside BootScene imports and the asset generator.
