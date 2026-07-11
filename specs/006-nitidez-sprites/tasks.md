# Tasks: Nitidez dos sprites do inimigo

**Input**: Design documents from `/specs/006-nitidez-sprites/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/sprite-sharpness.md`, `quickstart.md`, `.specify/memory/constitution.md`

**Tests**: Included because the specification, research, and quickstart require Vitest coverage for sheet validation/configuration and regression coverage for unchanged gameplay stats.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the shared files that will hold sprite-sheet and render-sharpness contracts without changing gameplay behavior.

- [X] T001 [P] Create the sprite-sheet presentation contract module in `src/core/spriteSheets.ts`
- [X] T002 [P] Create the render sharpness helper module in `src/core/renderSharpness.ts`
- [X] T003 [P] Create sprite-sheet validation test scaffold in `src/core/spriteSheets.test.ts`
- [X] T004 [P] Create render sharpness test scaffold in `src/core/renderSharpness.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared typed contracts, centralized configuration, and gameplay invariants that every story relies on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Define `SpriteSheetSpec`, `SpriteAnimationSpec`, `ResolvedSpriteSheetSpec`, and `VisualScaleSpec` types in `src/core/spriteSheets.ts`
- [X] T006 Define the centralized motoboy sheet spec with raw texture key, public texture key, `8` columns, `2` rows, ride frames `0..7`, and shoot frames `8..15` in `src/core/spriteSheets.ts`
- [X] T007 Define `RenderSharpnessConfig` defaults with `snapSpriteToPixel: true`, `preserveLogicalPosition: true`, `maxDevicePixelRatio: 2`, and `pixelArt: false` in `src/core/renderSharpness.ts`
- [X] T008 [P] Add regression tests proving `ENEMY_TYPES['dois-caras-moto']` keeps `maxHp`, `speed`, `reward`, and `radius` unchanged in `src/data/enemies.test.ts`
- [X] T009 [P] Update the sprite-sheet normalization guidance to reference the centralized sheet contract instead of hardcoded BootScene frame values in `README.md`

**Checkpoint**: Foundation ready - user story implementation can now begin in priority order or in parallel by story.

---

## Phase 3: User Story 1 - Moto sem fantasma nem tremor nas bordas (Priority: P1) MVP

**Goal**: A motoboy sheet is sliced on exact frame boundaries, uses sufficient source detail, and falls back visibly when the asset is missing or invalid.

**Independent Test**: Follow one motoboy through the path and inspect the ride loop frame by frame; no frame may show adjacent-frame strips, clipped borders, or animation jitter. Run `npm run check` and confirm sheet/config tests pass.

### Tests for User Story 1

- [X] T010 [US1] Add failing tests for exact `8x2` frame derivation, integer frame dimensions, and valid animation ranges in `src/core/spriteSheets.test.ts`
- [X] T011 [US1] Add failing tests for invalid motoboy sheet dimensions such as `1774x887` returning a logged invalid result instead of silently accepting the sheet in `src/core/spriteSheets.test.ts`

### Implementation for User Story 1

- [X] T012 [US1] Implement frame derivation and dimension validation helpers for `SpriteSheetSpec` in `src/core/spriteSheets.ts`
- [X] T013 [US1] Replace hardcoded `221x443` spritesheet loading with raw image loading and validated spritesheet materialization from the central motoboy spec in `src/scenes/BootScene.ts`
- [X] T014 [US1] Register `motoboyRide` and `motoboyShoot` animations by iterating the centralized animation specs in `src/scenes/BootScene.ts`
- [X] T015 [US1] Log missing or invalid motoboy sheet dimensions and leave the public sprite texture unavailable so `Enemy` uses fallback in `src/scenes/BootScene.ts`
- [X] T016 [US1] Size the textured `Enemy` from the active frame dimensions instead of `sprite.texture.getSourceImage()` dimensions in `src/entities/Enemy.ts`
- [X] T017 [US1] Normalize or replace the motoboy sheet with an exact `8x2` high-resolution asset in `src/assets/enemies/dois-caras-numa-moto-sheet.png`
- [X] T018 [US1] Confirm the fallback path still draws circle plus emoji when the public motoboy texture is absent in `src/entities/Enemy.ts`

**Checkpoint**: US1 is complete when the motoboy ride animation has zero adjacent-frame bleed or clipped borders, fallback remains playable, and no gameplay stat regression test fails.

---

## Phase 4: User Story 2 - Sprite nitido em movimento (Priority: P2)

**Goal**: Textured sprites render on pixel-aligned visual coordinates while the enemy's logical position, path progress, targeting, and collision remain fractional and smooth.

**Independent Test**: Capture the motoboy while moving, zoom the capture, and confirm the edges have no perceptible sub-pixel halo while movement remains fluid.

### Tests for User Story 2

- [X] T019 [US2] Add failing tests for visual pixel snapping that preserves logical `x/y` and returns only a render offset in `src/core/renderSharpness.test.ts`
- [X] T020 [US2] Add failing tests proving snap helpers do not mutate distance, segment index, or status-like logical inputs in `src/core/renderSharpness.test.ts`

### Implementation for User Story 2

- [X] T021 [US2] Implement `snapVisualPosition` and related pure helpers in `src/core/renderSharpness.ts`
- [X] T022 [US2] Apply pixel snap as a visual offset to the textured sprite child while keeping the `Enemy` container `x/y` unchanged in `src/entities/Enemy.ts`
- [X] T023 [US2] Keep the health bar visually aligned above the snapped sprite without changing damage, death, reward, or leak behavior in `src/entities/Enemy.ts`
- [X] T024 [US2] Enable Phaser render/camera pixel rounding only through presentation config without enabling pixel-art filtering in `src/main.ts`
- [X] T025 [US2] Add the movement capture and zoom validation result checklist to `specs/006-nitidez-sprites/quickstart.md`

**Checkpoint**: US2 is complete when the motoboy is sharper in motion, motion remains smooth, and gameplay targeting/collision behavior is unchanged.

---

## Phase 5: User Story 3 - Nitidez em telas HiDPI/Retina (Priority: P3)

**Goal**: The canvas uses bounded device pixel ratio for sharper HiDPI rendering while preserving `FIT`, `CENTER_BOTH`, framing, and performance.

**Independent Test**: Open the game on a HiDPI/Retina display or simulated high DPR, resize the window, and confirm the field remains centered and uncropped with no extra upscale blur.

### Tests for User Story 3

- [X] T026 [US3] Add failing tests for clamping `devicePixelRatio` to `RenderSharpnessConfig.maxDevicePixelRatio` in `src/core/renderSharpness.test.ts`
- [X] T027 [US3] Add failing tests proving HiDPI config keeps `pixelArt` false and preserves FIT/CENTER scale assumptions in `src/core/renderSharpness.test.ts`

### Implementation for User Story 3

- [X] T028 [US3] Implement bounded DPR resolution helpers for browser and test environments in `src/core/renderSharpness.ts`
- [X] T029 [US3] Apply HiDPI render resolution config while preserving `Phaser.Scale.FIT` and `Phaser.Scale.CENTER_BOTH` in `src/main.ts`
- [X] T030 [US3] Verify resize handling keeps the play field and sidebar framed correctly after DPR changes in `src/scenes/GameScene.ts`
- [X] T031 [US3] Add HiDPI resize and advanced-wave performance validation notes to `specs/006-nitidez-sprites/quickstart.md`

**Checkpoint**: US3 is complete when HiDPI rendering is sharper, resizing does not crop content, and a dense wave remains perceptibly fluid.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the full feature, update traceability, and keep the implementation reusable for future enemy sheets.

- [X] T032 [P] Update reusable sprite-sheet contract notes for future enemies in `specs/006-nitidez-sprites/contracts/sprite-sharpness.md`
- [X] T033 [P] Verify the public constants and animation keys still match existing consumers in `src/core/constants.ts`
- [X] T034 Run `npm run check` and fix any TypeScript or Vitest failures in `src/core/spriteSheets.ts`, `src/core/renderSharpness.ts`, `src/scenes/BootScene.ts`, and `src/entities/Enemy.ts`
- [X] T035 Run `npm run build` and fix any production build failures in `src/main.ts`
- [X] T036 Complete manual visual validation for US1, US2, US3, and fallback, then record any remaining validation caveats in `specs/006-nitidez-sprites/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - blocks every user story.
- **User Story 1 (Phase 3)**: Depends on Foundational completion - MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational completion; can be implemented independently but should be validated after US1 for best visual comparison.
- **User Story 3 (Phase 5)**: Depends on Foundational completion; safest after US1 and US2 because it changes global render scale.
- **Polish (Phase 6)**: Depends on whichever user stories are included in the release.

### User Story Dependencies

- **US1 (P1)**: No dependency on US2 or US3. Delivers the MVP by fixing frame bleed, clipping, source detail, and fallback behavior.
- **US2 (P2)**: No gameplay dependency on US1, but visual validation is clearer once US1's frame slicing is correct.
- **US3 (P3)**: No gameplay dependency on US1/US2, but should be deferred if DPR scaling threatens framing or performance.

### Within Each User Story

- Write the story's Vitest tasks first and confirm they fail for the missing behavior.
- Implement pure helpers before Phaser integration.
- Integrate BootScene/main config before Enemy presentation changes that consume the contract.
- Validate each story independently before moving to the next priority.

---

## Parallel Opportunities

- Setup tasks T001-T004 can run in parallel because they create separate modules/test files.
- Foundational T008 and T009 can run in parallel with each other after T005-T007 are underway.
- US1 tests T010-T011 target the same file and should be serialized, but T017 can run in parallel with code work after the target frame size is agreed.
- US2 tests T019-T020 target the same file and should be serialized; T024 can run in parallel with T022-T023 after T021 defines the helper contract.
- US3 tests T026-T027 target the same file and should be serialized; T030 can run in parallel with T029 after T028 defines DPR helpers.
- Polish T032-T033 can run in parallel; T034-T036 should run after selected story implementation is complete.

## Parallel Example: User Story 1

```text
Task: "Normalize or replace the motoboy sheet with an exact 8x2 high-resolution asset in src/assets/enemies/dois-caras-numa-moto-sheet.png"
Task: "Register motoboyRide and motoboyShoot animations by iterating the centralized animation specs in src/scenes/BootScene.ts"
```

## Parallel Example: User Story 2

```text
Task: "Enable Phaser render/camera pixel rounding only through presentation config without enabling pixel-art filtering in src/main.ts"
Task: "Apply pixel snap as a visual offset to the textured sprite child while keeping the Enemy container x/y unchanged in src/entities/Enemy.ts"
```

## Parallel Example: User Story 3

```text
Task: "Verify resize handling keeps the play field and sidebar framed correctly after DPR changes in src/scenes/GameScene.ts"
Task: "Add HiDPI resize and advanced-wave performance validation notes to specs/006-nitidez-sprites/quickstart.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational contracts and invariants.
3. Complete Phase 3: US1 exact sheet slicing, high-resolution asset, fallback, and frame-based sizing.
4. Stop and validate US1 independently with `npm run check` plus frame-by-frame visual inspection.

### Incremental Delivery

1. Deliver US1 to remove visible frame bleed and clipping.
2. Deliver US2 to reduce sub-pixel blur in motion without changing logical movement.
3. Deliver US3 to improve HiDPI sharpness, only if framing and performance remain acceptable.
4. Finish Polish after the chosen scope is validated.

### Suggested MVP Scope

The MVP is **Phase 1 + Phase 2 + Phase 3 (US1)**. This fixes the most visible defect and leaves US2/US3 as independent improvements.

---

## Format Validation

All executable tasks above use the required checklist format:

```text
checkbox + T### + optional [P] + optional [US#] + description with file path
```

Setup, Foundational, and Polish tasks omit story labels. User story tasks include `[US1]`, `[US2]`, or `[US3]`. Each task includes one or more concrete repository file paths.
