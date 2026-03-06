# PvP State Contract (Client <-> Server)

## Transport
- WebSocket, server-authoritative.

## Client -> server messages
- `create_room`
  - payload: `{ name }`
- `join_room`
  - payload: `{ code, name }`
- `command`
  - payload: `{ command }`
  - command shapes:
    - `{ type: 'move', dx, dy }`
    - `{ type: 'rotate', delta }`
    - `{ type: 'drop' }`
- `leave_room`

## Server -> client messages
- `connected`
- `room_created`
  - payload: `{ code, slot }`
- `room_joined`
  - payload: `{ code, slot }`
- `presence`
  - payload: `{ code, players }`
- `snapshot`
  - payload: `{ state }`
- `room_error`
  - payload: `{ message }`

## Client state phases
- `idle`
- `connecting`
- `lobby`
- `active`
- `error`

## Invariants
- Server is source of truth for match state.
- Client may predict input feel visually, but gameplay outcome comes from server snapshot.
- Commands from non-joined clients are rejected.
- Stale sockets must not overwrite newer connection state.

## Error policy
- Malformed payload -> `room_error`.
- Unavailable room -> `room_error`.
- Unexpected disconnect -> move client to `error` with recovery path.
