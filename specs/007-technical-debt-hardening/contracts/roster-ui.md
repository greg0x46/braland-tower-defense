# Contract: Roster UI

## Purpose

The build UI must remain usable as tower content grows beyond the current single
tower prototype.

## Minimum Roster Rehearsal

The UI must be validated with at least four tower entries. These may be temporary
test/rehearsal entries if the final content is not ready.

## Required Card Information

Each tower entry must expose:

- Name or recognizable label
- Cost
- Primary attack information useful for selection
- Selection state
- Affordability/locked state

## Interaction Requirements

- Every tower entry remains reachable.
- Selection and deselection remain clear.
- Unaffordable entries remain visually distinct.
- Text must not overlap or overflow its card/control.
- Build mode cannot be activated in states where building is locked.

## Acceptance Requirements

- Four tower entries fit through scrolling, paging, compact layout, or another
  explicit access pattern.
- Pointer/selection feedback remains immediate.
- The build preview still reflects the selected tower.
- Restart/reset clears stale selection.

## Regression Targets

- Adding tower entries must not push the start/pause/restart controls outside
  reachable UI.
- A selected unaffordable tower must not look identical to an affordable
  unselected tower.
- Paused-after-start state must block tower selection/building.
