Original prompt: Aqua Aqua Investor Demo Rebuild Plan: rebuild the app as a solo-first Aqua Aqua parity demo using the v2 mechanics spec as gameplay authority, a PNG-only asset pack rooted at apps/client/public/assets, disabled Versus/Online teaser hooks, and a Render static-site deployment target.

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

## 2026-03-06 - Investor Demo Rebuild (Execution Pass 2)

### Implemented in this pass
- Replaced the SVG-first asset workflow with the PNG-only rebuild contract:
  - added `scripts/asset-contract.mjs`
  - added `scripts/acquire-free-assets.mjs`
  - rewrote `scripts/generate-procedural-aqua-assets.mjs`
  - added `scripts/validate-assets.mjs`
  - added required provenance ledger at `docs/assets/asset-manifest.md`
- Reset the shipped shell to solo-first without online runtime initialization:
  - `apps/client/src/App.tsx` no longer imports or initializes the online hook/lobby path
  - `apps/client/src/screens/menu-screen.tsx` now shows Solo plus disabled `Coming Soon` teaser cards for `Versus` and `Online`
  - `apps/client/src/screens/setup-screen.tsx` now presents a solo-only setup flow
- Removed the live UI dependency on sprite SVGs by replacing `PieceBadge` image usage with deterministic DOM piece previews.
- Extended `render_game_to_text` with explicit `referenceMode`, HUD state, macro footprint, and expanded simulation footprint fields.
- Added `render.yaml` for a single Render static-site Blueprint using repo-root build commands, SPA rewrite rules, and security headers.

### Validation results
- `npm run generate:assets`: PASS
- `npm run validate:assets`: PASS
- `npm run lint`: PASS

## 2026-03-06 - Solo Bug Triage and Fix Pass

### Verified against reference footage/spec
- Early reference frames (`output/reference-frames/ref-0055s.png`, `ref-0090s.png`, `ref-0190s.png`) confirm:
  - the board should fully fit inside a framed stage,
  - the active terrain piece should appear as a separate airborne/falling silhouette over a pink landing projection,
  - early opening play should not show random quake holes / mine spam,
  - the square terrain piece should read as a hollow basin-friendly box, not a filled slab.
- The mechanics spec confirms earthquake pressure should come from overbuilt terrain and unlock ordering should stay structured, not random-chaos-first.

### Implemented in this pass
- Gameplay / rules:
  - Added simulation-footprint helper in `packages/core/src/utils/grid.ts`.
  - `square` and `pit` now use a hollow 6x6 ring footprint in simulation space instead of a filled 2x2 slab expansion.
  - Solo lock-time clamp in `packages/core/src/engine/match-commands.ts` now respects solo calm/surge/tempest timing instead of incorrectly snapping to the versus lock window.
  - Quake gain is no longer inflated directly by every terrain placement; earthquake risk now comes from actual over-height terrain in `match-step-water-systems.ts`.
  - Earthquake damage now targets high terrain first instead of punching random early holes across the map.
  - Solo progression now withholds `trench` / `pit` from the opening bag; reduction pieces unlock later.
  - Solo rain, mines, ice, and boss attacks now require real basin progress (`capturedLakes`) plus score thresholds, preventing speed-drop score from triggering hazards in the opening lesson.
  - Solo no longer inherits the large versus-style speed-drop score bonus, so opening score now stays at `0` until actual basin scoring happens.
- Renderer / layout:
  - Reframed gameplay into a centered responsive 4:3 stage in `game-screen.tsx` / `game-screen.module.css`.
  - Rebuilt the Three scene camera/framing and added a separate airborne active-piece mesh layer in `create-battle-game-three.ts`.
  - Active piece now visibly falls/descends over time while the landing footprint remains pink on the board.
  - Added a board deck fill plane to stop accidental island/base peeking from reading like random cracks.
  - Moved the mini-grid to bottom-left and tightened HUD anchor placement in `solo-hud.tsx` / `solo-hud.module.css`.
- UI:
  - Replaced the generic launch form with a tighter Aqua-style setup card in `setup-screen.tsx` / `setup-screen.module.css`.
  - Updated the app shell background in `App.module.css`.
- Automation / text state:
  - `render-game-to-text.ts` now uses the same simulation-footprint helper as gameplay, so hollow-square output matches the actual board behavior.

### Validation
- `npm test`: PASS
- `npm run lint`: PASS
- `npm run build`: PASS
- Required Playwright skill loop: PASS
  - Preview URL used: `http://127.0.0.1:4175/?automation=1&autostart=solo&renderer=three&seed=1337`
  - Action burst file: `temp-actions-bugfix.json`
  - Final artifact set:
    - `output/web-game-bugfix-pass5/shot-0.png`
    - `output/web-game-bugfix-pass5/shot-1.png`
    - `output/web-game-bugfix-pass5/shot-2.png`
    - `output/web-game-bugfix-pass5/state-0.json`
    - `output/web-game-bugfix-pass5/state-1.json`
    - `output/web-game-bugfix-pass5/state-2.json`
  - No `errors-*.json` files produced in the final artifact folder.
- Manual setup-screen browser verification:
  - `setup-screen-pass4.png`

### Remaining follow-ups
- Three chunk size is still just over 500 kB after minification.
- The menu/identity flow is improved by the new shell background, but only the setup screen got a dedicated parity-style redesign in this pass.
- Story/hazard thresholds are now data-driven and structurally later, but exact score numbers still need another reference/balance pass if full campaign parity becomes the next milestone.
- `npm test`: PASS
- `npm run build`: PASS
- Playwright deterministic solo run: PASS
  - URL: `http://127.0.0.1:4173/?automation=1&autostart=solo&renderer=three&seed=1337`
  - Artifacts:
    - `output/web-game-investor-pass2/shot-0.png`
    - `output/web-game-investor-pass2/shot-1.png`
    - `output/web-game-investor-pass2/shot-2.png`
    - `output/web-game-investor-pass2/state-0.json`
    - `output/web-game-investor-pass2/state-1.json`
    - `output/web-game-investor-pass2/state-2.json`
  - No `errors-*.json` files were produced.
  - Re-ran after HUD spacing tweak so the reservoir label is no longer clipped in `shot-2.png`.
- Manual browser verification:
  - identity -> menu -> setup flow renders correctly
  - `Versus` and `Online` appear as disabled `Coming Soon` teaser cards
  - setup screen remains solo-only and keeps `Start Match` accessible

### Remaining follow-ups
- Expand `docs/parity/reference-manifest.md` from 7 checkpoints to the requested 12-20 timestamp set with concrete measurements.
- Start breaking `create-battle-game-three.ts` into `apps/client/src/game/three/` composition modules.
- Isolate the remaining solo engine logic into `packages/core/src/solo-v2/` instead of continuing to patch the legacy engine files.

## 2026-03-06 - Solo Movement + Framing Fix Pass

### Verified in this pass
- Pulled a short reference frame strip from the local MP4 at `output/reference-seq-0055/contact.png`.
- Confirmed the active projection advances in smaller board-cell steps than the old rigid `3x3 patch per input` behavior.
- Confirmed the stage should show the whole island with wider margins than the previous too-close camera.

### Implemented in this pass
- Solo movement now advances active pieces by one simulation cell per input while preserving the thick `3x3` terrain footprint:
  - `packages/core/src/engine/match-commands.ts`
- Grid transforms now snap simulation coordinates to integers so fractional solo anchors do not produce float-index rendering/runtime errors:
  - `packages/core/src/utils/grid.ts`
- HUD and automation text output were updated to tolerate fractional solo anchors cleanly:
  - `apps/client/src/components/hud/solo-hud.tsx`
  - `apps/client/src/app/render-game-to-text.ts`
- Three camera framing was widened again so the full board remains visible inside the stage:
  - `apps/client/src/game/create-battle-game-three.ts`
- Added regression coverage for the new solo move step:
  - `packages/core/src/engine/match-step.test.ts`

### Validation
- `npm test`: PASS
- `npm run lint`: PASS
- `npm run build`: PASS
- Required Playwright loop: PASS
  - Main gameplay artifacts:
    - `output/web-game-bugfix-pass7b/shot-0.png`
    - `output/web-game-bugfix-pass7b/shot-1.png`
    - `output/web-game-bugfix-pass7b/shot-2.png`
    - `output/web-game-bugfix-pass7b/state-0.json`
    - `output/web-game-bugfix-pass7b/state-1.json`
    - `output/web-game-bugfix-pass7b/state-2.json`
  - No `errors-*.json` files were produced in `output/web-game-bugfix-pass7b`.
- Targeted movement proof:
  - `output/web-game-bugfix-pass7-moveonly/state-0.json` shows solo anchor `x: 2.333333333333333`, confirming a one-simulation-cell move instead of a full macro jump.
- Idle hazard check:
  - `output/web-game-bugfix-pass7-idle/state-0.json`
  - No active hazard cells, no hole damage, no console/page errors during the early solo phase.

### Remaining follow-ups
- Camera parity is materially better now, but the scene is still a simplified investor-demo framing rather than a fully character-driven PS2 composition.
- `render_game_to_text` now exposes fractional solo anchors during active movement; if stricter text contracts are needed later, add a separate explicit `simulationAnchor` field instead of rounding away that detail.

## 2026-03-06 - Camera Position Pass

### Implemented in this pass
- Focused only on the main camera/framing issue in `apps/client/src/game/create-battle-game-three.ts`.
- Reduced the excessive sky space by tilting the camera down harder and moving the focal point toward the board surface.
- Kept the board fully visible while pulling it into the center of the stage instead of the lower third.

### Validation
- `npm run lint`: PASS
- `npm run build`: PASS
- Required Playwright visual pass: PASS
  - Artifact: `output/web-game-camera-pass/shot-0.png`
  - State: `output/web-game-camera-pass/state-0.json`
  - No `errors-*.json` files were produced.

### Remaining follow-ups
- The framing is now functionally centered and readable, but it is still a simplified solo-stage composition rather than full PS2 character/island staging.

## 2026-03-06 - Grid Control Alignment Pass

### Implemented in this pass
- Rebuilt the bottom-left grid control in `apps/client/src/components/hud/solo-hud.tsx` to use the real `18x18` simulation board instead of the old `6x6` macro approximation.
- The grid now draws:
  - active terrain footprint in the exact simulation cells used by placement,
  - settled terrain cells from the live board state,
  - primed cells on the same coordinate system.
- Added thicker guide lines every 3 cells in `apps/client/src/components/hud/solo-hud.module.css` so the simulation grid still reads as grouped Aqua-style macro patches.

### Validation
- `npm run lint`: PASS
- `npm test`: PASS
- `npm run build`: PASS
- Required Playwright visual checks: PASS
  - Active footprint capture: `output/web-game-grid-active/shot-0.png`
  - Locked terrain capture: `output/web-game-grid-drop/shot-0.png`
  - No `errors-*.json` files were produced in either capture folder.

### Remaining follow-ups
- The grid control is now accurate to simulation placement, but if stronger PS2 parity is needed later the HUD art treatment itself still needs a dedicated polish pass.

## 2026-03-06 - Edge Placement Renderer Fix Pass

### Root cause
- The active projection and active terrain piece groups were attached directly to the scene while the board mesh lived under a scaled `boardGroup`.
- That mismatch made edge placements appear to drift outside the island even when the HUD grid and placement state were correct.

### Implemented in this pass
- Moved the active projection group and active piece group under `boardGroup` in `apps/client/src/game/create-battle-game-three.ts`.
- Retuned the camera slightly wider/farther so the full board stays inside the frame with edge placements visible.

### Validation
- `npm run lint`: PASS
- `npm run build`: PASS
- Required Playwright visual checks on fresh preview port `4178`: PASS
  - Left-edge placement: `output/web-game-edge-left-pass3/shot-0.png`
  - Neutral framing: `output/web-game-neutral-view-pass3/shot-0.png`
  - No `errors-*.json` files were produced in either capture folder.

### Notes
- The old preview on `4176` was stale after a rebuild because chunk names changed; the validated preview for this pass is `http://127.0.0.1:4178/`.

## 2026-03-06 - Terrain Relief And Higher Camera Pass

### Implemented in this pass
- Reworked the solo Three camera in `apps/client/src/game/create-battle-game-three.ts` to use a higher, more top-down perspective with a fixed framing instead of the previous slight side-orbit.
- Pulled the whole board farther into frame by slightly reducing `boardGroup` scale and re-centering the camera target so the right edge stays readable during gameplay.
- Strengthened terrain relief rendering:
  - increased terrain height scale,
  - switched the smooth terrain shell to a more faceted low-poly hill look via `flatShading`,
  - increased terrain color contrast from basin floor to peak,
  - retuned the blended surface height so placed terrain reads as raised mounds instead of disappearing into a flat sheet,
  - adjusted key/fill lights to make elevation changes cast clearer readable shading.

### Validation
- `npm run lint`: PASS
- `npm run build`: PASS
- Required Playwright visual checks on fresh preview port `4182`: PASS
  - Neutral framing: `output/web-game-neutral-view-pass7/shot-0.png`
  - Far-right placement visibility: `output/web-game-edge-right-pass2/shot-0.png`
  - Built-terrain relief check: `output/web-game-terrain-hills-pass5/shot-0.png`
  - State proof: `output/web-game-terrain-hills-pass5/state-0.json`
  - No `errors-*.json` files were produced in the new capture folders.

### Remaining follow-ups
- Terrain now reads as softer hills/mounds instead of exposed cubes, but the island is still a stylized approximation rather than frame-matched Aqua Aqua terrain sculpting.
- The large Three production chunk warning remains and should be addressed in a later optimization pass.

## 2026-03-06 - Whole Board Camera Pass

### Implemented in this pass
- Focused only on camera/framing in `apps/client/src/game/create-battle-game-three.ts`.
- Raised the camera, pulled it farther back, widened the field of view, and reduced `boardGroup` scale so the full solo board remains visible during gameplay instead of cropping the bottom/right side.
- Replaced duplicated inline camera positioning with a single `applyBoardCamera()` helper so constructor and render loop use the same framing.

### Validation
- `npm run lint`: PASS
- `npm run build`: PASS
- Required Playwright visual checks on fresh preview port `4183`: PASS
  - Neutral whole-board framing: `output/web-game-camera-whole-board-pass1/shot-0.png`
  - Built-terrain whole-board framing: `output/web-game-camera-whole-board-built-pass1/shot-0.png`
  - No `errors-*.json` files were produced in either capture folder.

### Remaining follow-ups
- Camera framing is now corrected for whole-board readability, but if later parity work tightens the island composition again, re-validate against a late-game tall-terrain scenario before shipping.

## 2026-03-06 - Camera Right And Down Pass

### Implemented in this pass
- Applied a narrow camera-only translation in `apps/client/src/game/create-battle-game-three.ts`.
- Moved the board camera to the right and slightly lower while keeping the same look target, so the board shifts left/up on screen without changing the rest of the renderer.

### Validation
- `npm run lint`: PASS
- `npm run build`: PASS
- Required Playwright visual checks on fresh preview port `4184`: PASS
  - Neutral framing after right/down move: `output/web-game-camera-right-down-neutral/shot-0.png`
  - Built-terrain framing after right/down move: `output/web-game-camera-right-down-built/shot-0.png`
  - No `errors-*.json` files were produced in either capture folder.

## 2026-03-06 - Camera Recentering Fix

### Root cause
- The previous `right/down` camera translation was a regression.
- It pushed the board back into the lower-right corner, which matches the user-reported screenshot where only part of the field was visible.

### Implemented in this pass
- Reverted the last camera translation in `apps/client/src/game/create-battle-game-three.ts`.
- Restored the centered whole-board framing by moving `applyBoardCamera()` back to the neutral centered position.

### Validation
- `npm run lint`: PASS
- `npm run build`: PASS
- Required Playwright visual checks on fresh preview port `4185`: PASS
  - Neutral recentered framing: `output/web-game-camera-recenter-neutral/shot-0.png`
  - Built-terrain recentered framing: `output/web-game-camera-recenter-built/shot-0.png`
  - No `errors-*.json` files were produced in either capture folder.

## 2026-03-06 - Mini Grid 1.5x Size Pass

### Implemented in this pass
- Treated the user request as the bottom-left HUD map grid.
- Increased the solo HUD mini-grid width in `apps/client/src/components/hud/solo-hud.module.css` by `1.5x`:
  - desktop `10.8rem -> 16.2rem`
  - small-screen `8.9rem -> 13.35rem`

### Validation
- `npm run lint`: PASS
- `npm run build`: PASS
- Required Playwright visual check on fresh preview port `4186`: PASS
  - Enlarged mini-grid proof: `output/web-game-minigrid-150-pass1/shot-0.png`
  - No `errors-*.json` files were produced.

## 2026-03-06 - Terrain Hill Profile And Solo Queue Rebalance

### Research / constraint used
- Re-checked `docs/specs/aqua_aqua_mechanics_full_spec_v2.md` and the local reference frames.
- The local evidence supports soft hill visuals over a discrete grid and strongly supports staged content order:
  1. terrain
  2. water
  3. fire
  4. terrain reduction
  5. bombs
- The footage/spec do **not** prove an exact `1-2-1` simulation formula, so the terrain hill profile implemented here is an informed approximation rather than a hard factual claim.

### Implemented in this pass
- Added normalized solo terrain height profiling:
  - `packages/core/src/utils/grid.ts`
  - `packages/core/src/engine/match-step.ts`
  - `packages/core/src/engine/match-step-piece-effects.ts`
- Regular solo terrain pieces now apply a mounded `3x3` profile with higher centers and lower shoulders while preserving total earth volume across the patch.
- Square / pit hollow pieces keep their box shape but now raise/lower wall middles more than wall corners instead of acting like a uniform border.
- Rebalanced solo queue pacing:
  - earlier unlocks in `packages/core/src/config/solo-v2-config.ts`
    - water `5`
    - fire `8`
    - terrain reduction `12`
    - bomb `18`
  - adaptive solo bag logic in `packages/core/src/engine/create-match.ts`
    - fewer repetitive wall-building terrain lines,
    - more early water access after the terrain opening,
    - stronger fire bias once the board has real water / a primed lake,
    - bombs remain late and sparse.

### Validation
- `npm test`: PASS
- `npm run lint`: PASS
- `npm run build`: PASS
- Required Playwright checks on fresh preview port `4187`: PASS
  - Built-terrain hill profile capture: `output/web-game-terrain-hill-profile-pass1/shot-0.png`
  - Longer queue progression capture: `output/web-game-queue-balance-pass2/shot-0.png`
  - Queue/state proof with early water access: `output/web-game-queue-balance-pass2/state-0.json`
  - No `errors-*.json` files were produced.

### Remaining follow-ups
- The engine now builds terrain as mounded patches, but the Three renderer still smooths some of that relief away; a dedicated renderer pass could exaggerate the new hill profile further.
- If stronger small-lake incentives are still needed after playtesting, the next tuning knobs should be fire weighting during `primedWater > 0`, `LAKE_CAPTURE_VOLUME`, and primed-lake score multipliers rather than moving back toward a terrain-heavy static bag.

## 2026-03-07 - Terrain Readability Cleanup

### Root cause
- After many terrain placements, the Three scene was rendering too much local terrain micro-detail:
  - the terrain surface used `flatShading`,
  - the surface height exaggeration over-emphasized every simulation-cell bump,
  - individual terrain boxes were still visible across interior plateau cells instead of only on meaningful cliff edges.
- The result was a noisy field of tiny facets that made basin/wall reading break down in midgame.

### Implemented in this pass
- Cleaned up the terrain renderer in `apps/client/src/game/create-battle-game-three.ts`.
- Terrain surface changes:
  - disabled `flatShading`,
  - made the terrain shell opaque,
  - reduced per-cell center exaggeration,
  - increased neighbor smoothing weights so the surface reads as larger landforms instead of a per-cell spike map.
- Terrain box changes:
  - added `isTerrainCliffCell()` and now only render box geometry for structural edges / cliffs / hole boundaries,
  - interior plateau cells no longer draw their own visible box meshes underneath the surface.

### Validation
- `npm run lint`: PASS
- `npm run build`: PASS
- Required Playwright busy-board check on fresh preview port `4188`: PASS
  - Busy terrain readability capture: `output/web-game-terrain-readability-pass1/shot-0.png`
  - State snapshot: `output/web-game-terrain-readability-pass1/state-0.json`
  - No `errors-*.json` files were produced.

### Remaining follow-ups
- The board is much less cluttered now, but if later playtests still feel muddy the next renderer pass should explicitly strengthen only macro ridges / basin rims instead of reintroducing cell-by-cell texture noise.

## 2026-03-07 - Final Cleanup And Codebase Hardening

### Implemented in this pass
- Reduced the client shell to the actual shipped runtime surface:
  - `App.tsx`, `game-screen.tsx`, `battle-canvas.tsx`, `use-game-input.ts`, and `render-game-to-text.ts` are now explicitly solo-first / solo-only instead of carrying dead local-online branches.
  - `game-screen-helpers.ts` now contains only the live solo phase-label helper.
  - `use-ui-preferences.ts` no longer stores the dead `showTips` preference.
  - automation parsing no longer carries a fake `rendererOverride` branch for removed Phaser support.
- Removed dead client runtime/code paths that are no longer part of the shipped or planned investor-demo surface:
  - Phaser renderer and scene stack
  - online battle hook/state
  - lobby screen
  - non-solo HUD/detail components (`CoreStrip`, `DetailDrawer`, `PieceBadge`, `SoloBonusBoard`, `VersusBoard`)
  - stale helper modules that only existed for those removed paths
- Removed the `phaser` dependency from `apps/client/package.json` and updated `package-lock.json`.
- Strengthened root test reliability:
  - `npm test` now builds `@aquawetrix/core` first so workspace tests do not depend on stale `dist/` state.
- Cleaned the repo itself, not just source code:
  - removed tracked `*.tsbuildinfo`
  - removed tracked `output/` and `temp/` artifacts
  - removed tracked one-off `temp-actions-*.json` / temp log files
  - added ignore rules for generated outputs and build metadata in `.gitignore`

### Validation
- `npm run lint`: PASS
- `npm test`: PASS
- `npm run build`: PASS
- Required Playwright cleanup smoke pass: PASS
  - Preview URL: `http://127.0.0.1:4190/?automation=1&autostart=solo&renderer=three&seed=1337`
  - Artifacts:
    - `output/web-game-cleanup-pass/shot-0.png`
    - `output/web-game-cleanup-pass/shot-1.png`
    - `output/web-game-cleanup-pass/shot-2.png`
    - `output/web-game-cleanup-pass/state-0.json`
    - `output/web-game-cleanup-pass/state-1.json`
    - `output/web-game-cleanup-pass/state-2.json`
  - No `errors-*.json` files were produced.

### Notes
- Historical artifact paths mentioned earlier in this log are now just history; validation outputs are no longer tracked in git and should be regenerated locally when needed.
- The remaining notable technical issue is still the large Three production chunk warning; runtime correctness is intact, but further code-splitting is still open if bundle size becomes the next target.
