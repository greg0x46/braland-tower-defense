# Tasks: Animacao de ataque do Vira-lata Caramelo

**Input**: Design documents from `/specs/003-vira-attack-animation/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/attack-animation.md`, `quickstart.md`

**Tests**: No TDD or new automated tests were explicitly requested. This task list keeps validation to the existing `npm run check` gate and the manual scenarios in `quickstart.md`.

**Organization**: Tasks are grouped by user story so each increment can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other marked tasks in the same phase because it touches different files or only reads/validates.
- **[Story]**: User story traceability label (`US1`, `US2`, `US3`, `US4`).
- Every task includes an exact file or directory path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the current baseline and available assets before changing gameplay presentation.

- [X] T001 Inventory the current Vira-lata Caramelo image files and intended animation roles in `src/assets/towers/`
- [X] T002 Audit current tower cooldown, target selection, and immediate firing behavior in `src/entities/Tower.ts`
- [X] T003 [P] Audit current texture constants and naming conventions in `src/core/constants.ts`
- [X] T004 [P] Audit current centralized sprite preload and loader error logging in `src/scenes/BootScene.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the shared types, asset keys, preload support, and visual-child structure required before any story implementation.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Add stable texture keys for the initial prepare, run, and attack animation sprites in `src/core/constants.ts`
- [X] T006 Import and preload the initial prepare, run, and attack sprite assets with existing loader error logging in `src/scenes/BootScene.ts`
- [X] T007 Define `SpriteFrameRef`, `AttackAnimationStage`, `AttackAnimationDefinition`, and optional `attackAnimation` on `TowerType` in `src/data/towers.ts`
- [X] T008 [P] Create the reusable `TowerAttackAnimator` class shell with typed constructor inputs, lifecycle methods, and visual state fields in `src/entities/TowerAttackAnimator.ts`
- [X] T009 Refactor tower rendering to keep a dedicated sprite/fallback visual child that can be controlled by the animator in `src/entities/Tower.ts`
- [X] T010 Verify the foundational type changes against the project check command documented in `package.json`

**Checkpoint**: Animation data, assets, and visual presentation plumbing are ready for user story implementation.

---

## Phase 3: User Story 1 - Ver o Vira-lata Caramelo atacar com animacao completa (Priority: P1) MVP

**Goal**: The Vira-lata Caramelo visibly prepares, runs toward the target, attacks, fires at the attack cue, and returns to idle without changing gameplay stats.

**Independent Test**: Build a Vira-lata Caramelo, start a wave, observe at least one full attack, and confirm damage, range, fire rate, cost, targeting, and construction behavior remain equivalent to the previous implementation.

### Implementation for User Story 1

- [X] T011 [US1] Add the Vira-lata Caramelo `attackAnimation` definition with ordered `prepare`, `run`, and `attack` stages in `src/data/towers.ts`
- [X] T012 [US1] Implement `TowerAttackAnimator.start()` to initialize target snapshot, reset offset, enter the first stage, and reject overlapping animations in `src/entities/TowerAttackAnimator.ts`
- [X] T013 [US1] Implement finite frame advancement for `once` stages and final idle reset in `src/entities/TowerAttackAnimator.ts`
- [X] T014 [US1] Implement attack-stage `fireCueFrameIndex` emission exactly once per animation in `src/entities/TowerAttackAnimator.ts`
- [X] T015 [US1] Replace immediate projectile firing with animation start when a valid target is available in `src/entities/Tower.ts`
- [X] T016 [US1] Handle the animator fire cue by revalidating target status/range before calling the existing `fire` callback in `src/entities/Tower.ts`
- [X] T017 [US1] Update `Tower.update()` to advance the animator, preserve cooldown timing, and return to target selection only when no animation is active in `src/entities/Tower.ts`
- [X] T018 [US1] Validate the main attack sequence scenario and record any required adjustments using `specs/003-vira-attack-animation/quickstart.md`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Manter a corrida fluida enquanto o alvo esta distante (Priority: P1)

**Goal**: The run stage loops continuously and moves visually toward near or distant targets using delta time until the arrival threshold is reached.

**Independent Test**: Observe attacks against enemies at short and long distances and confirm the run frames continue looping until the visual transition to the attack stage.

### Implementation for User Story 2

- [X] T019 [US2] Implement `loopUntilArrival` frame cycling so the run stage never freezes on its last frame while still moving in `src/entities/TowerAttackAnimator.ts`
- [X] T020 [US2] Implement delta-time visual movement toward `VisualAttackTarget.lastKnownX/Y` using `visualSpeedPxPerSec` and `arrivalDistancePx` in `src/entities/TowerAttackAnimator.ts`
- [X] T021 [US2] Update the visual target snapshot from a live enemy and fall back to the last known position when needed in `src/entities/TowerAttackAnimator.ts`
- [X] T022 [US2] Apply horizontal orientation toward the target via visual flip/scale without moving the tower container in `src/entities/TowerAttackAnimator.ts`
- [X] T023 [US2] Preserve the tower container position, interactive radius, and range ring as gameplay anchors while the child visual moves in `src/entities/Tower.ts`
- [X] T024 [US2] Validate near-target, distant-target, and clean run-to-attack transition scenarios using `specs/003-vira-attack-animation/quickstart.md`

**Checkpoint**: User Story 2 is fully functional and testable independently.

---

## Phase 5: User Story 3 - Adicionar novos sprites sem redesenhar a animacao (Priority: P2)

**Goal**: New frames can be added to an animation stage by adding a texture key, preloading the asset, and appending the key to the stage frame array without changing gameplay logic.

**Independent Test**: Add an extra sprite to one stage and confirm it appears in the expected order without changing combat behavior or duplicating the animation concept.

### Implementation for User Story 3

- [X] T025 [P] [US3] Add a stable texture key for the extra attack frame asset `vira-lata-ramelo-atack-2.png` in `src/core/constants.ts`
- [X] T026 [US3] Import and preload `src/assets/towers/vira-lata-ramelo-atack-2.png` under its stable texture key in `src/scenes/BootScene.ts`
- [X] T027 [US3] Append the extra attack frame texture key to the Vira-lata Caramelo attack stage frame array in `src/data/towers.ts`
- [X] T028 [US3] Ensure `TowerAttackAnimator` consumes arbitrary stage frame array lengths without hardcoded Vira-lata file names or per-stage sprite limits in `src/entities/TowerAttackAnimator.ts`
- [X] T029 [US3] Validate the extra-frame scenario without gameplay changes using `specs/003-vira-attack-animation/quickstart.md`

**Checkpoint**: User Story 3 is fully functional and testable independently.

---

## Phase 6: User Story 4 - Continuar jogavel com assets incompletos (Priority: P3)

**Goal**: Missing frames or incomplete stages keep the game playable, emit useful development diagnostics, and fall back to an acceptable visual.

**Independent Test**: Simulate a single-frame stage and a missing texture key, then confirm the tower still builds, attacks, logs the issue, and resets cleanly.

### Implementation for User Story 4

- [X] T030 [US4] Filter missing stage frames and emit useful `console.error` diagnostics with animation id, stage name, and texture key in `src/entities/TowerAttackAnimator.ts`
- [X] T031 [US4] Expose the tower idle texture/fallback visual to the animator for reset and fallback display in `src/entities/Tower.ts`
- [X] T032 [US4] Implement stage fallback selection from `fallbackSpriteKey`, `spriteKey`, or the existing placeholder visual when no valid frames remain in `src/entities/TowerAttackAnimator.ts`
- [X] T033 [US4] Cancel or complete the active animation cleanly when the target is dead or out of range before the cue in `src/entities/Tower.ts`
- [X] T034 [US4] Reset visual offset, frame, orientation, and state on complete/cancel/shutdown in `src/entities/TowerAttackAnimator.ts`
- [X] T035 [US4] Validate single-frame, missing-frame, and target-invalid scenarios using `specs/003-vira-attack-animation/quickstart.md`

**Checkpoint**: User Story 4 is fully functional and testable independently.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final checks across stories, integration boundaries, and acceptance criteria.

- [X] T036 Run `npm run check` and fix TypeScript or Vitest regressions reported from `package.json`
- [X] T037 [P] Confirm the debug overlay still reads gameplay anchors rather than moving animation offsets in `src/debug/DebugOverlay.ts`
- [X] T038 [P] Confirm `GameScene` remains animation-agnostic and only constructs towers as before in `src/scenes/GameScene.ts`
- [X] T039 Complete all manual validation scenarios and acceptance notes in `specs/003-vira-attack-animation/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational; delivers the MVP attack animation path.
- **US2 (Phase 4)**: Depends on Foundational and can be implemented alongside US1 once animator basics are coordinated; validates the run loop behavior.
- **US3 (Phase 5)**: Depends on Foundational and benefits from US1 stage definitions.
- **US4 (Phase 6)**: Depends on Foundational and should be integrated after the primary animation path exists.
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Phase 2; no dependency on US2-US4.
- **User Story 2 (P1)**: Starts after Phase 2; shares `TowerAttackAnimator.ts` with US1, so coordinate edits if done in parallel.
- **User Story 3 (P2)**: Starts after Phase 2; easiest after US1 defines the stage arrays.
- **User Story 4 (P3)**: Starts after Phase 2; easiest after US1/US2 expose the normal animation lifecycle.

### Parallel Opportunities

- T003 and T004 can run in parallel during setup.
- T008 can run in parallel with T005-T007 because it creates a new file.
- T025 can run in parallel with US3 validation planning because it touches `src/core/constants.ts`.
- T037 and T038 can run in parallel during polish.
- US1 and US2 can be split across developers if changes to `src/entities/TowerAttackAnimator.ts` are coordinated by method ownership.

---

## Parallel Example: User Story 1

```bash
# Coordinate method ownership, then work in parallel:
Task: "Implement `TowerAttackAnimator.start()` to initialize target snapshot, reset offset, enter the first stage, and reject overlapping animations in src/entities/TowerAttackAnimator.ts"
Task: "Replace immediate projectile firing with animation start when a valid target is available in src/entities/Tower.ts"
```

## Parallel Example: User Story 2

```bash
# Coordinate animator sections, then split run-loop and tower-anchor work:
Task: "Implement `loopUntilArrival` frame cycling so the run stage never freezes on its last frame while still moving in src/entities/TowerAttackAnimator.ts"
Task: "Preserve the tower container position, interactive radius, and range ring as gameplay anchors while the child visual moves in src/entities/Tower.ts"
```

## Parallel Example: User Story 3

```bash
# These touch different files and can be split:
Task: "Add a stable texture key for the extra attack frame asset `vira-lata-ramelo-atack-2.png` in src/core/constants.ts"
Task: "Import and preload src/assets/towers/vira-lata-ramelo-atack-2.png under its stable texture key in src/scenes/BootScene.ts"
```

## Parallel Example: User Story 4

```bash
# These can be split once the normal lifecycle exists:
Task: "Cancel or complete the active animation cleanly when the target is dead or out of range before the cue in src/entities/Tower.ts"
Task: "Reset visual offset, frame, orientation, and state on complete/cancel/shutdown in src/entities/TowerAttackAnimator.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundational tasks.
3. Complete Phase 3 User Story 1.
4. Stop and validate the main attack sequence using `specs/003-vira-attack-animation/quickstart.md`.

### Incremental Delivery

1. Deliver US1 so the Vira-lata Caramelo has a complete visible attack.
2. Deliver US2 to make the run loop robust across target distances.
3. Deliver US3 to prove the data-driven frame extension workflow.
4. Deliver US4 to harden missing-asset and cancellation behavior.
5. Run Phase 7 and complete the full quickstart validation.

### Quality Gates

- `npm run check` from `package.json` passes.
- No gameplay rule reads sprite dimensions, offsets, paths, or frame counts.
- `GameScene` remains unaware of Vira-lata-specific animation assets.
- Missing assets are visible to developers through useful logs and do not block gameplay.
