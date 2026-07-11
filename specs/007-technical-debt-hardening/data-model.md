# Data Model: Technical Debt Hardening

This feature defines domain contracts that make the current prototype safer to
extend. Names below describe the model shape and validation rules; implementation
may use existing files or new focused modules as long as the contracts hold.

## Gameplay Contract

Represents an accepted rule or metric that must remain stable unless explicitly
changed by design.

**Fields**

- `id`: stable identifier, e.g. `enemy.dois-caras-moto.base-stats`
- `subject`: enemy, tower, wave profile, match progression, attack behavior, map
- `acceptedValues`: canonical values or behavior expectations
- `reason`: why the value/behavior is accepted
- `changedBy`: optional note/reference when a contract changes intentionally

**Validation Rules**

- Every rule-critical regression test must map to an accepted contract.
- If runtime data changes, either the contract changes intentionally or the test
  must fail.
- Canonical base stats use exact expected values; derived behavior may use
  ranges only when the contract describes a range.

## Match Progression Contract

Defines the lifecycle of a playable session.

**Fields**

- `mode`: `endless`
- `startsPaused`: whether the player can build before first start
- `waveNumbering`: one-based display numbering
- `interWaveBehavior`: automatic interval after all spawned enemies clear
- `endConditions`: defeat only for this feature
- `lockedInteractions`: interactions disabled after defeat or during full pause

**State Transitions**

```text
setup-paused -> running -> paused -> running
running -> defeated
paused -> defeated is not valid directly without gameplay progression
defeated -> setup-paused only through restart/reset
```

**Validation Rules**

- Endless mode must not promise victory.
- Defeat must disable incompatible interactions and expose restart.
- Restart must reset economy, lives, wave display, pause/start status, towers,
  enemies, and projectiles.

## Attack Behavior

Defines gameplay effects caused by a tower attack, independent from visual
presentation.

**Fields**

- `id`: stable behavior identifier
- `kind`: `projectile`, `direct`, or `area`
- `targetRule`: how a target is selected and validated
- `damage`: base damage amount or damage descriptor
- `cadence`: attacks per second or equivalent cooldown
- `range`: max acquisition/application range
- `projectile`: optional projectile speed/lifetime/impact behavior
- `area`: optional radius and max affected targets
- `statusEffects`: optional future-compatible list of effects
- `visualCuePolicy`: whether a visual cue triggers application timing

**Relationships**

- A tower references one attack behavior.
- An attack animation may provide timing cues but does not define gameplay.
- A missing visual asset must not change the attack behavior.

**Validation Rules**

- At least `projectile`, `direct`, and `area` behavior categories must be
  representable.
- Existing tower behavior must remain equivalent after migration.
- Invalid targets are rejected consistently before applying damage/effects.

## Game Event Contract

Defines communication between gameplay, state, and UI.

**Fields**

- `name`: stable event name
- `status`: `active`, `reserved`, or `removed`
- `producer`: system/entity/state owner that emits it, when active
- `consumers`: subscribers that react to it, when active
- `payload`: required fields and their meaning
- `emissionRules`: when the event must and must not fire

**Required Events**

- Money changed
- Lives changed
- Wave changed
- Pause state changed
- Tower selection changed
- Enemy defeated
- Enemy leaked
- Match defeated
- Match restarted/reset

**Validation Rules**

- Active events must have at least one producer and one consumer, unless the
  event is intentionally state-only and documented as such.
- Reserved events must include expected future use and must not be emitted by
  current gameplay.
- Payloads must be complete enough that subscribers do not need to read unrelated
  global state for basic rendering/feedback.

## Map Contract

Groups all data needed for a playable map.

**Fields**

- `id`: stable map identifier
- `visualKey`: asset key for map presentation
- `fallbackVisual`: fallback behavior when visual asset is unavailable
- `playableBounds`: coordinate bounds where gameplay can occur
- `path`: ordered waypoints for enemy movement
- `roadWidth`: total width used for placement blocking and debug overlay
- `buildBounds`: area where towers may be placed
- `debug`: waypoint/path display expectations

**Relationships**

- Enemy movement, placement validation, map background, and debug overlay all
  consume the same active map contract.
- A map may later reference multiple paths, but this feature requires one active
  path.

**Validation Rules**

- Path start and end may touch playable bounds to allow enemy entry/exit.
- Internal path points must stay within playable bounds.
- Road/build-blocking width must be positive and match debug visualization.
- Map fallback must keep gameplay playable.

## Content Roster

Represents the content options exposed to the player and designers.

**Fields**

- `towers`: ordered list of tower entries
- `enemies`: ordered list of enemy entries
- `maps`: ordered list of map contracts
- `defaultSelections`: initial map and available tower set

**Validation Rules**

- Build menu must remain accessible with at least four tower entries.
- Tower cards must show enough information to select and understand cost/status.
- Locked or unaffordable content must remain visually distinct without becoming
  confused with the selected state.

## State Compatibility Matrix

| State | Build | Start/Pause | Combat Advances | Restart |
|-------|-------|-------------|-----------------|---------|
| `setup-paused` | Allowed | Start allowed | No | Optional |
| `running` | Allowed unless separately locked | Pause allowed | Yes | Optional |
| `paused` | Locked after start | Continue allowed | No | Optional |
| `defeated` | Disabled | Disabled | No | Required |
