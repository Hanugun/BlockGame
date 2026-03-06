Original prompt: PLEASE IMPLEMENT THIS PLAN: Solo Readability + Automation Parity (Phaser Default, Three Parity)

## Completed
- Added automation query parsing (`automation`, `autostart`, `renderer`, `seed`) in `apps/client/src/app/automation-config.ts` with unit coverage.
- Added solo text-state serializer for automation hooks in `apps/client/src/app/render-game-to-text.ts` with unit coverage.
- Extended local solo loop with deterministic `advanceTime(ms)`, optional `seed`, and `clockMode` in `apps/client/src/hooks/use-local-battle.ts`.
- Wired automation behavior in `apps/client/src/App.tsx`:
  - query-driven solo autostart,
  - query-gated `window.render_game_to_text`,
  - query-gated `window.advanceTime`.
- Added automation-only input aliases and fullscreen behavior in `apps/client/src/hooks/use-game-input.ts`.
- Added runtime renderer query override precedence in `apps/client/src/game/create-battle-game.ts`.
- Applied readability pass to both renderers:
  - Phaser: stronger terrain/water/hazard readability in `apps/client/src/game/scenes/battle-scene-board-renderers.ts`.
  - Three: material/light/hazard tuning in `apps/client/src/game/create-battle-game-three.ts`.
- Fixed Phaser crash from fractional active-piece coordinates in `apps/client/src/game/scenes/battle-scene-piece-renderers.ts`.
- Enabled Phaser automation capture reliability with `preserveDrawingBuffer` (automation-only) in `apps/client/src/game/create-battle-game-phaser.ts`.
- Added `apps/client/public/favicon.ico` placeholder to avoid favicon 404 console noise in automation runs.
- Added global window typing for hooks in `apps/client/src/automation-window.d.ts`.
- Installed `playwright` as a dev dependency to run the required web-game Playwright client script locally.

## Verification
- `npm run lint` passed.
- `npm test` passed (including new parser/serializer tests).
- `npm run build` passed.
- Playwright client runs completed with no captured console/page errors:
  - `output/web-game-phaser-3`
  - `output/web-game-three-3`
- Screenshot inspection completed:
  - `output/web-game-phaser-3/shot-2.png`
  - `output/web-game-three-3/shot-2.png`
- `render_game_to_text` state snapshots generated for both renderers with matching schema.
- Fullscreen behavior validated via Playwright:
  - `f` enters fullscreen,
  - `Esc` exits fullscreen,
  - pause menu does not open on that `Esc` path.

## Remaining Follow-ups
- Optional: expose richer `render_game_to_text.board.activeCells` in early match moments by adding deterministic hazard/setup actions that produce water/hole/ice/mine cells in automation scripts.
- Added full gameplay spec/audit document at `docs/gameplay-instructions.md` covering controls, tick-order, piece formulas, solo/versus systems, hidden state, and audit targets.

## 2026-03-06 - Aqua Aqua v2 Solo Refactor

### Milestone: Step 1 Docs Canonicalization
- Added `docs/specs/spec-index.md`.
- Deprecated conflicting solo-spec docs and converted them to non-authoritative stubs:
  - `docs/specs/solo-parity-spec.md`
  - `docs/specs/balance-targets.md`
  - `docs/specs/ui-ux-guidelines.md`
  - `docs/research.md`
  - `docs/gameplay-instructions.md`
  - `docs/architecture.md`
  - `docs/pvp-agent-framework.md`
  - `README.md`
- Active solo source of truth now explicitly points to `docs/specs/aqua_aqua_mechanics_full_spec_v2.md`.

Next: Step 2 core config/types and mode-specific board dimensions.

### Milestone: Steps 2-10 Implementation

#### Core engine changes
- Added solo v2 config: `packages/core/src/config/solo-v2-config.ts` and exported it in `packages/core/src/index.ts`.
- Added API/type extensions:
  - `CreateMatchOptions.soloVariant?: 'story' | 'endless'`
  - `MatchState.soloVariant`
  - `MatchState.soloBossAttackIndex`
  - `PlayerState.drainMax`
  - `PlayerState.quakeMeter`
  - `MatchEvent.type` includes `system_unlock` and `boss_attack`.
- Implemented mode-specific board dimensions:
  - solo `6x6`
  - versus `10x10`
- Updated solo queue progression in `create-match.ts`:
  - terrain-first cadence
  - unlocks: water@9, fire@17, bomb@25 placed pieces
  - removed `zig` from solo bag
- Updated terrain pieces for tetromino-like baseline:
  - `ridge` and `trench` are `I4`
  - `corner` is a 4-cell `L` form
- Implemented cumulative leak model:
  - no ordinary fire-based drain recovery
  - spill increases drain
  - bigger-drain now scales `drainMax` capacity (1.25x)
- Rebalanced solo bonus thresholds via config:
  - lake mate depth/volume and rainbow retained-water thresholds
- Replaced quake trigger logic with quake-meter progression:
  - overbuild and imbalance feed `quakeMeter`
  - thresholded earthquake event applies terrain damage and partial reset
- Added solo story boss orchestration:
  - deterministic checkpoint attacks in `story` variant
  - `endless` variant skips boss orchestration and timer win condition

#### Client/render updates
- Added solo variant plumbing in UI/start flow:
  - `App.tsx`
  - `use-local-battle.ts`
  - `setup-screen.tsx`
  - `menu-screen.tsx`
- Updated HUD/tactical text for new drain capacity semantics.
- Updated `render_game_to_text` payload with `soloVariant`, `drainMax`, and `quakeMeter`.
- Made Phaser board rendering use live board dimensions.
- Updated Three renderer to safely render dynamic board dimensions (solo 6x6 / versus 10x10) without OOB indexing.

#### Documentation updates
- Canonicalized solo spec authority to `docs/specs/aqua_aqua_mechanics_full_spec_v2.md`.
- Added `docs/specs/spec-index.md`.
- Deprecated conflicting spec/docs and removed contradictory numeric authority from them.
- Replaced `docs/gameplay-instructions.md` with v2-aligned player-facing instructions.

#### Validation
- `npm test` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Playwright automation runs completed:
  - `output/web-game-v2-phaser`
  - `output/web-game-v2-three`
- `render_game_to_text` schema matched across Phaser/Three for the same seed/actions.
- No `errors-*.json` files produced in the new Playwright output folders.

#### Follow-up TODOs
- Improve Three visual centering further for non-10x10 boards by building board meshes per-dimension instead of fixed max-grid hiding.
- Add explicit UI indicator for current solo variant during active match HUD.
- Add dedicated tests for boss checkpoint timing/messages and endless long-run behavior over extended ticks.
- Consider adding deterministic unlock telemetry snapshot fields for easier automation assertions.

#### Additional validation
- Fullscreen toggle regression check (Playwright inline):
  - `f` entered fullscreen
  - `Esc` exited fullscreen
  - pause modal (`Match Menu`) did not open on the fullscreen-exit escape keypress path

## 2026-03-06 - Aqua Aqua Clean Rebuild (Execution Pass 1)

### Implemented in this pass
- Milestone 1:
  - Added deterministic reference frame capture script:
    - `scripts/capture-reference-frames.mjs`
    - npm script: `capture:reference`
  - Added parity checkpoint document:
    - `docs/parity/reference-manifest.md`
- Milestone 2:
  - Solo-only shell cutover:
    - `apps/client/src/screens/menu-screen.tsx` now exposes only Solo entry.
    - `apps/client/src/screens/setup-screen.tsx` is solo-focused; local/online fields are intentionally inactive.
    - `apps/client/src/App.tsx` launch flow now routes active runtime to solo local match only.
- Milestone 3:
  - Three-only runtime cutover:
    - `apps/client/src/game/create-battle-game.ts` now loads Three renderer only for rebuild phase.
- Milestone 4:
  - Added parity config:
    - `packages/core/src/config/solo-aqua-parity-config.ts`
  - Added grid transform utilities:
    - `packages/core/src/utils/grid.ts`
  - Core type/interface expansion:
    - `PlayerState.controlGrid`
    - `PlayerState.cellScale`
    - `MatchState.referenceProfile`, `rendererProfile`, `referenceMode`
    - `CreateMatchOptions.referenceMode`
  - Solo runtime now uses:
    - control grid `6x6`
    - simulation board `18x18`
    - `cellScale=3`
- Milestone 5:
  - Implemented 3x brush expansion for macro piece placement in lock path:
    - `packages/core/src/engine/match-step.ts`
    - Control-cell piece footprint now expands to `3x3` simulation patches.
- Milestone 8:
  - Replaced Three scene implementation with a solo parity-oriented scene:
    - `apps/client/src/game/create-battle-game-three.ts`
  - Includes purple-space backdrop, island-style board context, 18x18 simulation render, and thick projection visualization.
- Milestone 9:
  - Rebuilt solo HUD overlay with reference-style compact anchors + mini control grid:
    - `apps/client/src/components/hud/solo-hud.tsx`
    - `apps/client/src/components/hud/solo-hud.module.css`
- Milestone 10:
  - Added deterministic procedural asset pipeline (fallback while no API key):
    - `scripts/generate-procedural-aqua-assets.mjs`
    - npm script: `assets:procedural`
  - Generated textures/UI placeholders in `apps/client/public/assets`.
- Milestone 11:
  - Added automated parity comparator script:
    - `scripts/run-parity-check.mjs`
    - npm script: `parity:check`
  - Upgraded automation text output:
    - `apps/client/src/app/render-game-to-text.ts` now includes control/simulation dimensions and active footprint mapping.

### Test and validation outcomes
- `npm test`: PASS
- `npm run lint`: PASS
- `npm run build`: PASS
- `npm run capture:reference`: PASS
  - Generated:
    - `output/reference-frames/ref-0040s.png`
    - `output/reference-frames/ref-0055s.png`
    - `output/reference-frames/ref-0090s.png`
    - `output/reference-frames/ref-0190s.png`
    - `output/reference-frames/ref-1140s.png`
    - `output/reference-frames/ref-1260s.png`
    - `output/reference-frames/ref-1380s.png`
- Playwright deterministic run (three-only, solo autostart):
  - URL: `?automation=1&autostart=solo&renderer=three&seed=1337`
  - Artifacts:
    - `output/web-game-aqua-three/shot-0.png`
    - `output/web-game-aqua-three/shot-1.png`
    - `output/web-game-aqua-three/shot-2.png`
    - `output/web-game-aqua-three/state-0.json`
    - `output/web-game-aqua-three/state-1.json`
    - `output/web-game-aqua-three/state-2.json`
  - No `errors-*.json` produced.
- `npm run parity:check -- --candidate-dir output/web-game-aqua-three`: PASS (heuristic RMSE threshold check).

### Immediate TODOs (next pass)
- Visual parity still needs another pass for:
  - terrain silhouette smoothness (currently too grid-visible),
  - camera angle and framing closer to PS2 reference composition,
  - stronger projection/readability styling for hazards and active macro pieces.
- Replace procedural fallback assets with AI-generated assets once `OPENAI_API_KEY` is available.
- Add direct visual regression script for fullscreen gameplay states and mid-game hazard scenes.
