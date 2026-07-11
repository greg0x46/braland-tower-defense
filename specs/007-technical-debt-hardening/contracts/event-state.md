# Contract: Event and State

## Event Lifecycle

Every declared gameplay event has one lifecycle status:

- `active`: emitted by current gameplay and consumed by current systems/UI.
- `reserved`: not emitted by current gameplay; kept as explicit future contract.
- `removed`: no longer available.

## Required Event Catalog

| Event | Status | Producer | Consumer | Payload |
|-------|--------|----------|----------|---------|
| Money changed | active | Economy/state owner | HUD/build affordability | `{ money }` |
| Lives changed | active | Match state owner | HUD/end-state checks | `{ lives }` |
| Wave changed | active | Wave progression owner | HUD/debug | `{ wave, total }` |
| Pause state changed | active | Match state owner | HUD/build/gameplay coordination | `{ paused, started }` |
| Tower selection changed | active | HUD/build owner | Build preview/HUD selection | `{ towerTypeId }` |
| Enemy defeated | active | Combat/gameplay owner | Economy/feedback/debug | `{ enemyTypeId, reward }` |
| Enemy leaked | active | Enemy/path owner | Lives/feedback/debug | `{ enemyTypeId, damage }` |
| Match defeated | active | Match state owner | HUD/gameplay lock | `{ reason }` |
| Match reset | active | Match state owner | HUD/gameplay scenes | `{}` |

## State Invariants

- Money cannot become negative through spending.
- Lives cannot become negative.
- Defeated state is terminal until restart/reset.
- Paused state after start locks building and freezes gameplay progression.
- Setup-paused allows building and does not advance gameplay progression.

## Acceptance Requirements

- Active events must have documented producer and consumer.
- Reserved events must not be emitted in current gameplay.
- Consumers should receive enough payload data to update basic UI/feedback
  without reading unrelated global state.
- Runtime must not emit obsolete events.

## Regression Targets

- Spend failure must not emit a money change.
- Losing the final life must emit lives changed before match defeated.
- Restart/reset must leave no stale tower selection or active end screen state.
