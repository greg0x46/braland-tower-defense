# Quickstart: Technical Debt Hardening Validation

## Prerequisites

- Dependencies installed with `npm install`.
- Feature artifacts reviewed:
  - [data-model.md](./data-model.md)
  - [contracts/match-progression.md](./contracts/match-progression.md)
  - [contracts/attack-behavior.md](./contracts/attack-behavior.md)
  - [contracts/event-state.md](./contracts/event-state.md)
  - [contracts/map-contract.md](./contracts/map-contract.md)
  - [contracts/roster-ui.md](./contracts/roster-ui.md)

## 1. Automated Gate

Run:

```bash
npm run check
```

Expected:

- Typecheck passes.
- Vitest passes.
- Accepted enemy/tower/wave contracts match the current design decision.
- No stale regression failure remains from an intentional balance change.

## 2. Match Progression Validation

Run the game:

```bash
npm run dev
```

Validate:

- New match starts in setup-paused state.
- Building is allowed before first start.
- Starting begins endless wave progression.
- Pause freezes enemies, towers, projectiles, and wave timers.
- Continue resumes without duplicate or skipped spawns.
- README and HUD do not promise a fixed final wave or victory for endless mode.
- Reaching zero lives shows defeat and disables incompatible controls.
- Restart returns to setup-paused with cleared runtime entities.

## 3. Attack Behavior Validation

Validate against [attack-behavior.md](./contracts/attack-behavior.md):

- Existing tower preserves accepted damage, range, cadence, and target validity.
- Removing or failing an attack visual asset does not disable gameplay damage.
- At least `projectile`, `direct`, and `area` behavior categories are represented
  by contracts and pure tests or data validation.
- Invalid/dead/leaked targets do not receive damage.

## 4. Event and State Validation

Validate against [event-state.md](./contracts/event-state.md):

- Each declared active event has producer, consumer, payload, and emission rule.
- Reserved events are not emitted during current gameplay.
- Money/lives/wave/pause/selection/end-state updates reach HUD correctly.
- Spend failure does not emit money changed.
- Losing the final life emits lives changed before defeat.

## 5. Map Contract Validation

Validate against [map-contract.md](./contracts/map-contract.md):

- Enemy movement, placement blocking, and debug overlay all reference the same
  path and road width contract.
- Build blocking aligns with debug path width.
- Map visual fallback remains playable and logs the asset failure.
- Internal path points remain inside playable bounds.

## 6. Roster UI Validation

Validate against [roster-ui.md](./contracts/roster-ui.md):

- Rehearse with at least four tower entries.
- Every entry is reachable and legible.
- Selection, affordability, and locked states are visually distinct.
- Start/pause/restart controls remain reachable.
- Reset clears stale selection/build preview.

## Done When

- All validation sections above pass.
- Existing core loop actions still work: build, start, pause, attack, earn money,
  lose life, defeat, and restart.
- Any intentional contract change is reflected in spec/design artifacts and
  tests.
