# Implementation Plan: Technical Debt Hardening

**Branch**: `[007-technical-debt-hardening]` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-technical-debt-hardening/spec.md`

**Note**: This plan ends after Phase 1 design. Implementation tasks are generated later by `/speckit-tasks`.

## Summary

Harden the current playable prototype before adding more content by turning the
identified technical debt into explicit, testable contracts. The plan preserves
the existing endless-wave gameplay as the active progression mode, restores a
trusted verification gate, separates attack gameplay from visual attack
presentation, makes game state/events auditable, prepares the tower roster UI for
growth, and introduces a single map contract for visual map, pathing, placement,
and debug views.

The technical approach is incremental: add or tighten pure contracts first, keep
the existing Phaser scenes as coordinators, preserve fallback behavior for
assets, and ensure each rule-critical change has Vitest coverage.

## Technical Context

**Language/Version**: TypeScript 5.6.3 with `strict` mode

**Primary Dependencies**: Phaser 3.88.2, Vite 5.4.10

**Storage**: N/A; all contracts are in repository data/configuration for this feature

**Testing**: Vitest 2.1.8 for pure rules; `npm run check` as the full verification gate

**Target Platform**: Browser canvas game

**Project Type**: Single frontend game prototype

**Performance Goals**: Preserve stable gameplay loop with dozens of enemies, towers, and projectiles; avoid new per-frame allocations in hot paths introduced by this feature

**Constraints**: Existing playable loop must not regress; gameplay rules must remain independent of sprite/emoji dimensions; no backend, persistence, multiplayer, or upgrade tree in this feature

**Scale/Scope**: One active map contract, one active endless match progression contract, at least three attack behavior categories specified, at least four tower roster entries supported in a rehearsal/validation scenario

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Gameplay em Primeiro Lugar | PASS | Preserves build -> wave -> combat -> economy/life loop and clarifies end-state behavior. |
| II. Responsividade e Sensação de Controle | PASS | UI and state locking requirements preserve immediate feedback and valid interactions. |
| III. Performance desde o Início | PASS | Plan avoids new hot-path allocation patterns; performance changes require measurement. |
| IV. Arquitetura Desacoplada | PASS | Main focus is separating attack rules, events, state, and map contracts from presentation. |
| V. Separação entre Dados, Lógica e Apresentação | PASS | Contracts move gameplay decisions into data/rule definitions, not visual assets. |
| VI. Evolução Incremental | PASS | Only abstractions tied to current blockers are introduced; no backend or speculative systems. |
| VII. TypeScript Rigoroso | PASS | Event/state/attack/map contracts are planned as typed domain contracts. |
| VIII. Determinismo e Consistência | PASS | Wave and attack rules remain deterministic and testable. |
| IX. Testabilidade | PASS | Rule-critical changes require Vitest coverage and quickstart validation. |
| X. Observabilidade e Depuração | PASS | Map/debug contract keeps path, placement, and visualization aligned. |
| XI. Assets Substituíveis | PASS | Attack behavior and fallback requirements remain independent from visual assets. |
| XII. Qualidade de Código | PASS | Scope reduces dead contracts and aligns docs/tests/runtime. |
| XIII. Compatibilidade e Escalabilidade Visual | PASS | Roster UI growth and map contract address near-term visual scalability. |
| XIV. Definição de Concluído | PASS | Completion requires working loop, feedback, types, tests, and green verification. |

**Gate Result**: PASS. No constitution violations or unresolved clarifications.

## Project Structure

### Documentation (this feature)

```text
specs/007-technical-debt-hardening/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── attack-behavior.md
│   ├── event-state.md
│   ├── map-contract.md
│   ├── match-progression.md
│   └── roster-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── EventBus.ts          # event names/payload contracts
│   ├── GameState.ts         # match state transitions
│   └── constants.ts         # shared dimensions/timing/fallback values
├── data/
│   ├── enemies.ts           # accepted enemy balance contracts
│   ├── maps.ts              # planned map contract home
│   ├── path.ts              # legacy path source to migrate into map contract
│   ├── towers.ts            # tower roster and attack behavior references
│   └── waves.ts             # endless progression profile
├── systems/
│   ├── combat.ts            # planned pure attack behavior resolution
│   ├── gameState.ts         # planned pure state transition helpers, if needed
│   ├── mapContract.ts       # planned map validation helpers
│   └── *.test.ts            # rule regression coverage
├── managers/
│   ├── BuildManager.ts      # consumes map/roster contracts
│   └── WaveManager.ts       # consumes match progression/event contracts
├── entities/
│   ├── Tower.ts             # applies attack behavior, delegates visuals
│   ├── TowerAttackAnimator.ts
│   ├── Enemy.ts
│   └── Projectile.ts
├── scenes/
│   ├── GameScene.ts
│   └── UIScene.ts
└── debug/
    └── DebugOverlay.ts      # consumes map contract
```

**Structure Decision**: Keep the single-project game layout. New work should
extend the existing `data`, `systems`, `core`, `managers`, `entities`, and
`scenes` boundaries instead of introducing a new app, backend, or package.

## Phase 0: Research Output

Research decisions are recorded in [research.md](./research.md). All planning
unknowns were resolved without requiring product clarification:

- Active match mode: endless, matching current runtime behavior.
- Balance regression gate: update/restore accepted contracts instead of dropping tests.
- Attack behavior model: separate gameplay behavior from animation presentation.
- Event/state contracts: typed event catalog with active/reserved lifecycle.
- Map contract: single source for visual, path, placement, and debug.
- Roster UI growth: minimum four-tower rehearsal with scroll or equivalent access.

## Phase 1: Design Output

Design artifacts generated:

- [data-model.md](./data-model.md)
- [contracts/match-progression.md](./contracts/match-progression.md)
- [contracts/attack-behavior.md](./contracts/attack-behavior.md)
- [contracts/event-state.md](./contracts/event-state.md)
- [contracts/map-contract.md](./contracts/map-contract.md)
- [contracts/roster-ui.md](./contracts/roster-ui.md)
- [quickstart.md](./quickstart.md)

## Post-Design Constitution Check

| Principle | Status | Post-Design Result |
|-----------|--------|--------------------|
| I. Gameplay em Primeiro Lugar | PASS | Quickstart covers build, start, pause, attack, earn money, lose life, restart. |
| IV/V/XI. Decoupled Data/Logic/Presentation | PASS | Attack and map contracts explicitly separate rules from assets and visuals. |
| VI. Evolução Incremental | PASS | Contracts are bounded to current blockers and current code ownership. |
| VII/VIII/IX. Types, Determinism, Tests | PASS | Data model defines state transitions and validation targets for pure tests. |
| X/XIII. Debug/Visual Scalability | PASS | Map and roster contracts include debug and growth validation. |
| XIV. Definition of Done | PASS | Quickstart requires `npm run check` and core loop acceptance validation. |

**Post-Design Gate Result**: PASS. No Complexity Tracking entries required.

## Complexity Tracking

No constitution violations. No added backend, storage layer, package split, or
speculative subsystem is planned.
