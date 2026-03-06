# PvP Rules Spec (Post-Solo Lock)

## Scope
Define online PvP gameplay rules that reuse deterministic core mechanics.

## Match format
- Two pilots, two basins, one authoritative server match instance.
- Default mode: real-time PvP.
- Optional later mode: turn-based variant (deferred).

## Win/loss conditions
- Primary win: opponent stability collapses to `0`.
- Secondary win at timeout: higher score.
- Tiebreaker: higher stability, then higher captured-lake count.

## Shared versus objective system
- Keep 3x3 versus objective board for PvP.
- Claim cells via eligible firebank events.
- Complete line => send attack event to opponent.
- Board resets after line-resolution sequence.

## PvP interference contracts
- Interference is server-authoritative only.
- Candidate interference set:
  - Water pressure event
  - Bomb disruption event
  - Fire pressure event
  - Ice suppression event
  - Terrain raise/lower event
- Interference power scales with validated harvest strength.

## Fairness contracts
- No client-side authority over:
  - Timer
  - Piece lock resolution
  - Water simulation
  - Damage application
- Clients send commands only; server sends snapshots/events.

## Matchmaking phase order
1. Create/join lobby.
2. Presence sync.
3. Authoritative match start.
4. Active state.
5. Result.

## Out of scope (initial PvP release)
- Ranked ladder
- Spectator mode
- Tournament brackets
- Cross-region matchmaking policies
