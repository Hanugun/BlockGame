# Aqua Aqua Reference Manifest (Solo Visual Parity)

Source video: `Aqua Aqua Gameplay HD (PS2) _ NO COMMENTARY.mp4`  
Capture script: [`scripts/capture-reference-frames.mjs`](/C:/Study/aquawetrix/scripts/capture-reference-frames.mjs)

## Purpose

This file defines deterministic visual checkpoints for parity validation.  
Gameplay mechanics still follow [`docs/specs/aqua_aqua_mechanics_full_spec_v2.md`](/C:/Study/aquawetrix/docs/specs/aqua_aqua_mechanics_full_spec_v2.md).

## Frame Checkpoints

1. `00:00:40` (`ref-0040s.png`)
- Tutorial card visible.
- Pink terrain projection clearly shows multi-cell "fat" footprint.
- Background uses warm sky/purple gradient, not dark navy HUD backdrop.

2. `00:00:55` (`ref-0055s.png`)
- Active upper piece silhouette appears thick and compact.
- Terrain board looks like a floating island slab, not a tiny detached tile stack.
- Neon green timer digits are bright and legible.

3. `00:01:30` (`ref-0090s.png`)
- Raised terrain creates readable ridges/trenches with smooth shading.
- Island occupies central gameplay area with strong depth cues.

4. `00:03:10` (`ref-0190s.png`)
- Water basin is clearly visible with reflective surface.
- Fire hazard cue appears high contrast against board and sky.

5. `00:19:00` (`ref-1140s.png`)
- Story gameplay layout present:
  - score cluster at top-left,
  - mini control grid at bottom-left,
  - reservoir tube on right,
  - pink projection grid on terrain.

6. `00:21:00` (`ref-1260s.png`)
- Complex terrain topology still readable.
- Overlay ring/edge effects do not hide board surface.

7. `00:23:00` (`ref-1380s.png`)
- Camera angle supports character + projection + basin context.
- Hazard/object indicators remain visible over terrain.

## Piece Silhouette Notes

- Control pieces are interpreted as macro tetromino-like forms.
- In simulation space, each macro segment expands to a `3x3` brush patch.
- Resulting line arms must read "thick", avoiding one-cell-thin sticks.

## Validation Usage

1. Capture current build screenshots with deterministic seed and action payload.
2. Compare shot composition to the nearest checkpoint above.
3. Fail parity when any of these are violated:
- board appears miniature or detached from scene scale,
- piece projection is thin/noisy and not thick-grid readable,
- HUD anchors do not match the expected corners.
