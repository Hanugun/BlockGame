# QA Matrix (Solo + PvP)

## Solo parity scenarios
- Piece pacing:
  - Verify calm/surge/tempest lock timing feels progressive.
- Terrain behavior:
  - Confirm `Upper` always raises and `Downer` always lowers.
- Hazard clarity:
  - Confirm random rain/ice/mines are visible and understandable.
- Fire + mine interaction:
  - Confirm mined cells can detonate from fire and effects are deterministic.
- Bingo behavior:
  - Confirm rows/columns score.
  - Confirm diagonals do not score.
  - Confirm deterministic reward mapping.

## PvP network scenarios
- Lobby lifecycle:
  - Host creates room, code visible, join succeeds.
- Match start sync:
  - Both clients enter active state from authoritative snapshot.
- Latency simulation:
  - 100ms / 250ms / 400ms test rounds.
- Jitter simulation:
  - Burst delay and out-of-order message handling.
- Disconnect/reconnect:
  - Mid-lobby and mid-match disconnect handling.
- Invalid command path:
  - Verify server rejects invalid pre-join commands.

## Performance scenarios
- Client render stability on long sessions.
- Server tick stability under sustained command load.
- Memory growth over repeated match cycles.

## Exit criteria
- No critical gameplay correctness defects.
- No blocker lobby/match sync defects.
- Determinism tests pass for core.
- Build, lint, and test pipelines green.
