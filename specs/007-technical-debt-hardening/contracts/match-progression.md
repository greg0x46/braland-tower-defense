# Contract: Match Progression

## Active Mode

The active mode for this hardening feature is `endless`.

## Player-Facing Rules

- The player may build before the first start.
- Starting the match begins automatic endless wave progression after the
  configured initial delay.
- Pausing after the match has started freezes gameplay progression and locks
  build interactions.
- Continuing resumes from the same wave/spawn state.
- Defeat occurs when lives reach zero.
- Endless mode does not have a victory screen or final wave.
- Restart returns the match to the pre-start setup state.

## Required State Contract

| State | Meaning | Allowed Transitions |
|-------|---------|---------------------|
| `setup-paused` | New/restarted match, build allowed, waves not advancing | `running` |
| `running` | Gameplay advances | `paused`, `defeated` |
| `paused` | Gameplay frozen after start, build locked | `running` |
| `defeated` | Match ended by lives reaching zero | `setup-paused` via restart |

## Acceptance Requirements

- HUD copy and README must not mention surviving a fixed number of waves for
  this mode.
- Wave display must communicate current wave without implying a finite total.
- Defeat must disable incompatible controls and provide restart.
- Restart must clear runtime entities and reset economy, lives, wave, pause, and
  start status.

## Regression Targets

- Starting from setup must not skip wave 1.
- Pausing must not advance wave timers, enemies, towers, or projectiles.
- Continuing must not duplicate or skip scheduled spawns.
- Defeat must stop gameplay progression.
