# Contract: Attack Behavior

## Purpose

Attack behavior defines gameplay. Visual animation defines presentation. Missing,
changed, or fallback visuals must not alter damage, target rules, cadence, or
effects.

## Behavior Categories

### Projectile

- Acquires a valid target using the tower target rule.
- Creates a moving projectile or equivalent gameplay object.
- Applies damage/effects on valid impact.
- May expire if it cannot reach a target within its lifetime.

### Direct

- Acquires and validates a target.
- Applies damage/effects at a defined cue time.
- Does not require a projectile.
- Must revalidate target before application.

### Area

- Acquires an origin or target.
- Applies damage/effects to targets within an area rule.
- May limit affected targets.
- Must define whether damage occurs instantly, at cue time, or on impact.

## Visual Cue Policy

Visuals may provide timing cues:

- `none`: apply according to behavior timing without waiting for visual cues.
- `onCue`: apply when animation emits a cue, with gameplay fallback timing if
  the animation is unavailable.
- `onImpact`: apply when a projectile/area impact resolves.

## Acceptance Requirements

- A tower references exactly one attack behavior.
- Attack animation references must be optional for gameplay.
- Existing Vira-lata Caramelo damage, cadence, range, and target validity must
  remain equivalent after migration.
- At least three behavior categories (`projectile`, `direct`, `area`) must be
  representable in data and testable without rendering.
- Invalid targets must not receive damage.

## Regression Targets

- Removing an attack sprite must not disable tower damage.
- Adding an animation must not silently change a projectile attack into direct
  damage unless the attack behavior explicitly says so.
- Cooldown begins consistently according to the behavior contract.
