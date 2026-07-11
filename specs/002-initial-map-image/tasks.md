# Tasks: Mapa inicial com imagem

**Input**: Design documents from `/specs/002-initial-map-image/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/map-presentation.md, quickstart.md

**Tests**: Include focused Vitest coverage for the gameplay rule affected by the revised road width/path. Scene rendering and fallback are validated manually through quickstart because the current project has no browser/screenshot test harness.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Put the provided map asset in the project asset tree and expose the shared constants required by later stories.

- [X] T001 Move the provided root asset from image.png to src/assets/maps/initial-map.png
- [X] T002 Add TEXTURES.initialMap with value 'map-initial' and update the PATH_WIDTH documentation/value target in src/core/constants.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Centralize map loading before scene work starts.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Import src/assets/maps/initial-map.png and preload it with TEXTURES.initialMap in src/scenes/BootScene.ts
- [X] T004 Update the BootScene loader error log to clearly identify map asset failures without throwing in src/scenes/BootScene.ts

**Checkpoint**: The map texture has a stable key and is loaded centrally before GameScene starts.

---

## Phase 3: User Story 1 - Ver o mapa ilustrado ao iniciar a partida (Priority: P1) MVP

**Goal**: The player sees the provided image as the gameplay-area background, with HUD/sidebar still visible and no old drawn path in normal play.

**Independent Test**: Start the game with the asset available and confirm the image fills only `PLAY_WIDTH x GAME_HEIGHT`, the sidebar/HUD remain usable, and the old simple path is not drawn over the art.

### Implementation for User Story 1

- [X] T005 [US1] Replace the normal green background with TEXTURES.initialMap when the texture exists, using origin (0,0), display size PLAY_WIDTH x GAME_HEIGHT, and background depth in src/scenes/GameScene.ts
- [X] T006 [US1] Remove the normal-mode drawPath call and obsolete path-stroking presentation helpers from src/scenes/GameScene.ts
- [X] T007 [US1] Keep towers, enemies, projectiles, and development debug rendering above the map background by updating scene depth constants in src/scenes/GameScene.ts
- [X] T008 [US1] Manually validate the map-with-asset scenario from quickstart.md and record any implementation notes in specs/002-initial-map-image/quickstart.md

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Jogar com inimigos e construção alinhados à estrada (Priority: P1)

**Goal**: Enemies follow the visible road and build validation blocks the visible road while allowing clearly free areas.

**Independent Test**: Start a wave, observe enemies moving along the illustrated road, then attempt tower placement on the road and in free areas.

### Tests for User Story 2

- [X] T009 [P] [US2] Add placement regression cases for the revised PATH_WIDTH road-blocking boundary in src/systems/placement.test.ts
- [X] T010 [P] [US2] Add path data invariants for visible in-bounds waypoints and nonzero path length in src/systems/geometry.test.ts

### Implementation for User Story 2

- [X] T011 [US2] Adjust PATH waypoints to track the center of the road in the map art while preserving entry/exit behavior in src/data/path.ts
- [X] T012 [US2] Set PATH_WIDTH to the visually validated road width range and keep it as total width in src/core/constants.ts
- [X] T013 [US2] Verify BuildManager still passes PATH and PATH_WIDTH / 2 into pure placement validation without reading map art in src/managers/BuildManager.ts
- [X] T014 [US2] Manually validate enemy alignment and road/free-area placement scenarios from quickstart.md using the debug overlay in specs/002-initial-map-image/quickstart.md

**Checkpoint**: User Story 2 is fully functional and testable independently.

---

## Phase 5: User Story 3 - Continuar jogável quando a arte falhar (Priority: P2)

**Goal**: If the map image is unavailable, the game still starts and remains playable with a simple fallback background and useful development signal.

**Independent Test**: Simulate a missing or failed map asset, start the game, start a wave, place a tower in a valid area, and confirm an error/fallback signal is available for development.

### Implementation for User Story 3

- [X] T015 [US3] Add a GameScene fallback branch that draws a simple PLAY_WIDTH x GAME_HEIGHT rectangle when TEXTURES.initialMap does not exist in src/scenes/GameScene.ts
- [X] T016 [US3] Log or signal the active fallback state once when GameScene renders without TEXTURES.initialMap in src/scenes/GameScene.ts
- [X] T017 [US3] Manually validate the fallback asset-failure scenario from quickstart.md and restore src/assets/maps/initial-map.png after the simulation

**Checkpoint**: User Story 3 is fully functional and testable independently.

---

## Phase 6: User Story 4 - Depurar o caminho real sobre o mapa (Priority: P3)

**Goal**: Developers can toggle the debug overlay to see the real gameplay path over either the image map or fallback, while normal play remains clean.

**Independent Test**: Toggle the debug overlay in development and confirm the path appears above the map/fallback; toggle it off and confirm no path overlay remains.

### Implementation for User Story 4

- [X] T018 [US4] Confirm DebugOverlay draws the PATH line and PATH_WIDTH metrics above the map/fallback without changing gameplay state in src/debug/DebugOverlay.ts
- [X] T019 [US4] Adjust DebugOverlay path visibility or text positioning if the map art reduces readability in src/debug/DebugOverlay.ts
- [X] T020 [US4] Manually validate debug-on and debug-off scenarios from quickstart.md in specs/002-initial-map-image/quickstart.md

**Checkpoint**: User Story 4 is fully functional and testable independently.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, cleanup, and repository hygiene across all stories.

- [X] T021 Run npm run check and fix any TypeScript or Vitest failures in package.json
- [X] T022 Confirm the map asset exists at src/assets/maps/initial-map.png and the old root image.png no longer exists
- [X] T023 Review src/scenes/GameScene.ts, src/scenes/BootScene.ts, src/core/constants.ts, and src/data/path.ts for duplicated map constants or asset paths
- [X] T024 Update specs/002-initial-map-image/quickstart.md with final validation results for asset, fallback, gameplay alignment, and debug overlay

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories.
- **User Story 1 and User Story 2 (P1)**: Depend on Foundational. They can proceed in parallel after T003-T004, but US2 visual validation is more useful after US1 renders the map.
- **User Story 3 (P2)**: Depends on US1 background rendering structure.
- **User Story 4 (P3)**: Depends on US1 and US2 so the overlay can be validated against the final background/path.
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational; no dependency on other stories.
- **User Story 2 (P1)**: Can start after Foundational; independently testable through movement and placement rules.
- **User Story 3 (P2)**: Depends on US1's background-rendering branch.
- **User Story 4 (P3)**: Depends on final PATH/PATH_WIDTH from US2 and rendering from US1/US3.

### Within Each User Story

- US2 tests T009-T010 should be written before implementation tasks T011-T012.
- Map loading tasks must finish before any GameScene texture rendering task.
- PATH and PATH_WIDTH changes must be validated against placement behavior before final polish.
- Manual quickstart validation tasks should run after their story implementation tasks.

### Parallel Opportunities

- T009 and T010 can run in parallel because they update different test files.
- US1 GameScene rendering work and US2 pure path/placement tests can be started in parallel after the foundation is complete.
- T018 and T019 can be evaluated in parallel with fallback validation after US1/US2 are complete if they touch only src/debug/DebugOverlay.ts.
- Final review T023 can run in parallel with quickstart documentation T024 after npm run check passes.

---

## Parallel Example: User Story 2

```bash
# Start focused rule-test work in parallel:
Task: "T009 [P] [US2] Add placement regression cases for the revised PATH_WIDTH road-blocking boundary in src/systems/placement.test.ts"
Task: "T010 [P] [US2] Add path data invariants for visible in-bounds waypoints and nonzero path length in src/systems/geometry.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: move the asset and add shared constants.
2. Complete Phase 2: centralize preload and loader error handling.
3. Complete Phase 3: render the image map and remove the old normal-mode path drawing.
4. Stop and validate User Story 1 independently with the quickstart map/sidebar/HUD checks.

### Incremental Delivery

1. Deliver US1 so the map art is visible in the gameplay area.
2. Deliver US2 so movement and build validation match the visible road.
3. Deliver US3 so missing asset behavior remains playable and observable.
4. Deliver US4 so future alignment work can use the debug overlay without reintroducing normal-mode path drawing.
5. Run Phase 7 checks and record final validation results.

### Parallel Team Strategy

1. One developer completes T001-T004.
2. After foundation, one developer handles US1 rendering while another writes US2 tests and path adjustments.
3. US3 and US4 proceed after the rendering/path shape is stable.
4. Final polish verifies `npm run check`, repository hygiene, and quickstart outcomes.

---

## Notes

- [P] tasks touch different files and can run without depending on incomplete tasks.
- [US1], [US2], [US3], and [US4] labels map directly to the user stories in spec.md.
- The image is presentation only; movement and construction continue to use PATH and PATH_WIDTH.
- Avoid introducing a map registry, map selector, tilemap, or browser screenshot dependency in this feature slice.
