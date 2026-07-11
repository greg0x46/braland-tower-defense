# Research: Technical Debt Hardening

## D1 - Active Match Progression Mode

**Decision**: Treat the current game as endless-wave mode for this hardening pass.

**Rationale**: The runtime already generates waves indefinitely, the wave event
contract uses `total=0` to indicate infinite progression, and recent feature work
focused on endless waves and pause. Hardening should align docs, HUD, tests, and
contracts to the current playable behavior instead of redesigning the product
goal.

**Alternatives considered**:

- Restore finite 3-wave victory: rejected for this feature because it changes
  gameplay scope rather than hardening the current implementation.
- Support both finite and endless immediately: rejected as premature until there
  is a concrete mode selection need.

## D2 - Balance Regression Gate

**Decision**: Keep regression tests for accepted gameplay stats, but make the
accepted values explicit and update them only when a balance decision is made.

**Rationale**: The current failure is valuable signal: either the enemy stats
changed accidentally or the regression contract is stale. Removing the test would
hide future regressions; accepting the current values should be a deliberate
design action.

**Alternatives considered**:

- Delete stat regression tests: rejected because balance drift is a core TD risk.
- Allow wide numeric tolerances: rejected for base stats; tolerances belong in
  derived difficulty/behavior tests, not canonical roster values.

## D3 - Attack Behavior vs Visual Presentation

**Decision**: Model attack gameplay as a behavior contract separate from attack
animation. Visual animation may emit cues, but the selected behavior owns damage,
target validation, projectile creation, immediate hits, area effects, and future
status effects.

**Rationale**: The current tower path uses projectile damage when no animation is
present and direct damage when animation is present. That couples combat rules to
asset availability and makes future tower types fragile. A small behavior union
keeps current ranged/projectile and melee/direct patterns while allowing area or
status effects later.

**Alternatives considered**:

- Keep animation-specific damage paths: rejected because adding content would
  multiply exceptions.
- Create a large combat framework now: rejected as overengineering; three small
  behavior categories are enough for the near roadmap.

## D4 - Event and State Contracts

**Decision**: Maintain an explicit event catalog with payloads and lifecycle
status: active, reserved, or removed. State transitions must reject invalid
actions or preserve a valid state.

**Rationale**: The current event list contains unused events and payloads are
documented only in comments. A typed/auditable catalog reduces HUD/gameplay
ambiguity and prevents reserved future events from becoming dead API surface.

**Alternatives considered**:

- Keep comments as the event contract: rejected because comments do not protect
  producers and consumers from drift.
- Remove all unused events without reserved status: rejected for events that are
  clearly near-term roadmap hooks, but they still need lifecycle documentation.

## D5 - Map Contract

**Decision**: Introduce a single map contract that groups visual map key,
playable bounds, path waypoints, road/build-blocking width, fallback behavior,
and debug visualization expectations.

**Rationale**: The current path, map texture, placement bounds, and debug overlay
are aligned by convention across separate modules. Multiple maps or route edits
would be error-prone without a single contract.

**Alternatives considered**:

- Leave path and visual map separate until a second map exists: rejected because
  the current divergence risk already affects placement/debug correctness.
- Build a full map editor/registry: rejected as beyond hardening scope.

## D6 - Roster UI Growth

**Decision**: Require the build UI to remain usable with at least four tower
entries in a rehearsal scenario, using scrolling, paging, compact layout, or an
equivalent accessible pattern.

**Rationale**: The current fixed sidebar is fine for one tower but fragile for
content expansion. Four entries is enough to validate layout growth without
designing a full upgrade/shop system.

**Alternatives considered**:

- Redesign the full HUD/shop now: rejected as too broad.
- Ignore UI until content exists: rejected because the next likely features add
  towers and would immediately hit this limit.

## D7 - Testing Strategy

**Decision**: Keep browser/manual validation for scene rendering, but require
pure Vitest coverage for balance contracts, attack behavior resolution, event
payload/state contracts, map validation helpers, and roster layout rules that can
be expressed without rendering.

**Rationale**: The project already isolates many rules in pure systems. Extending
that pattern gives high leverage without adding a browser test harness during
this hardening pass.

**Alternatives considered**:

- Add screenshot/browser automation now: useful later, rejected for this feature
  because the main risks are domain contracts and data drift.
- Rely only on manual playtest: rejected for repeatable rule-critical behavior.
