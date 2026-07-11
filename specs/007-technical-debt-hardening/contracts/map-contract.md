# Contract: Map

## Purpose

A playable map contract is the single source for visual map presentation, enemy
pathing, build restrictions, and debug visualization.

## Required Fields

| Field | Requirement |
|-------|-------------|
| `id` | Stable map identifier |
| `visualKey` | Key for map visual asset |
| `fallbackVisual` | Playable fallback if the visual asset fails |
| `playableBounds` | Coordinate bounds for gameplay |
| `buildBounds` | Coordinate bounds where towers may be placed |
| `path` | Ordered waypoints for the active enemy route |
| `roadWidth` | Total width used for placement blocking and debug |
| `debug` | Path/waypoint display expectations |

## Validation Rules

- Map id must be unique.
- Path must contain at least two waypoints.
- First and last path points may sit on playable bounds for entry/exit.
- Intermediate path points must be inside playable bounds.
- `roadWidth` must be positive.
- Build bounds must be within playable bounds.
- Fallback visual must not alter gameplay rules.

## Consumers

- Map background rendering uses `visualKey` and fallback.
- Enemy movement uses `path`.
- Placement validation uses `path`, `roadWidth`, and `buildBounds`.
- Debug overlay uses `path`, `roadWidth`, and `playableBounds`.

## Acceptance Requirements

- No consumer should maintain a separate copy of path or road width.
- Updating the active map contract should update gameplay, placement, and debug
  expectations together.
- A missing map asset should be logged and still allow a playable fallback.

## Regression Targets

- Build blocking must align with debug road width.
- Enemy movement must use the same path shown by debug.
- HUD/sidebar areas must remain outside buildable gameplay bounds unless a map
  explicitly says otherwise.
