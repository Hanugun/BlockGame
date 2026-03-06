# Aquawetrix Gameplay Instructions (v2 Solo Refactor)

This document describes the current player-facing gameplay behavior after the v2 solo refactor.

## 1) Source Of Truth

- Solo mechanics: `docs/specs/aqua_aqua_mechanics_full_spec_v2.md`
- Deprecated solo-spec docs are listed in `docs/specs/spec-index.md`

## 2) Modes

### Solo
- Board size: `6x6`
- You play as slot 0 (`Pilot`).
- Drain tube is a cumulative leak meter.
- Story variant: survive to timer end while handling boss attacks.
- Endless variant: no timer win; survive as long as possible.

### Versus (Local/Online)
- Board size: `10x10`
- Versus behavior remains stable in this pass.

## 3) Controls

### Solo / Online
- Move: `W A S D`
- Rotate: `Q` / `E`
- Drop: `Space`

### Local Versus
- P1: `W A S D`, `Q/E`, `Space`
- P2: arrows, `,` `/` `.`, `Enter`

### Global
- Fullscreen toggle: `F`
- `Esc` exits fullscreen first, then toggles pause menu when not fullscreen.

### Automation-only (`?automation=1`)
- Move: arrows
- Rotate: `A` / `B`
- Drop: `Enter`

## 4) Solo Piece Progression

Solo queue is staged by placed-piece count:
- Start: terrain-only
- `water` unlock: after 9 placed pieces
- `fire` unlock: after 17 placed pieces
- `bomb` unlock: after 25 placed pieces
- `ice` is not a controllable solo queue piece

Hazard unlock by phase:
- `surge`: mines can appear
- `tempest`: ice strikes can appear

## 5) Core Solo Loop

1. Build terrain enclosures.
2. Retain water safely.
3. Evaporate with fire for score.
4. Maintain terrain under hazards and quake pressure.

## 6) Drain / Loss Model

- Spilled water increases `drainLevel`.
- No natural drain recovery during normal play.
- Loss occurs when drain reaches capacity (`drainMax`).
- `Bigger Drain` bonus increases capacity by 25% while active.

## 7) Fire, Ice, Rainbow, Lake Mates

- Fire on liquid water evaporates and scores.
- Fire on frozen water thaws first.
- Lake Mate and Rainbow require retained mature water states.
- Rainbow is not a simple short combo trigger.

## 8) Earthquake

- Earthquake uses a quake-risk meter (`quakeMeter`), not just a silent hard cap.
- Overbuilding raises risk.
- Triggered quake damages terrain and can open new leak paths.

## 9) Solo Variants

### Story Pressure
- Boss attack waves trigger at deterministic progression checkpoints.
- Attacks damage terrain and create recovery pressure.

### Endless
- No story boss orchestration.
- Survival-focused free run.
