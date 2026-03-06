import { createServer } from 'node:http';
import {
  applyPlayerCommand,
  createMatch,
  stepMatch,
  TICK_RATE,
  type MatchState,
  type PlayerCommand,
  type PlayerSlot,
} from './core.js';
import { WebSocketServer, type RawData, type WebSocket } from 'ws';

type ClientToServerMessage =
  | { type: 'create_room'; name: string }
  | { type: 'join_room'; code: string; name: string }
  | { type: 'command'; command: Omit<PlayerCommand, 'slot'> }
  | { type: 'leave_room' };

type ServerToClientMessage =
  | { type: 'connected' }
  | { type: 'room_created'; code: string; slot: PlayerSlot }
  | { type: 'room_joined'; code: string; slot: PlayerSlot }
  | { type: 'presence'; code: string; players: Array<{ slot: PlayerSlot; name: string }> }
  | { type: 'snapshot'; state: MatchState }
  | { type: 'room_error'; message: string };

interface Session {
  id: string;
  socket: WebSocket;
  roomCode: string | null;
  slot: PlayerSlot | null;
  name: string;
}

interface Room {
  code: string;
  match: MatchState;
  sessions: Partial<Record<PlayerSlot, Session>>;
  loop: NodeJS.Timeout | null;
}

const PORT = Number(process.env.PORT ?? 2567);
const rooms = new Map<string, Room>();
let sessionCounter = 0;

function send(socket: WebSocket, message: ServerToClientMessage): void {
  socket.send(JSON.stringify(message));
}

function randomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  while (code.length < 5) {
    code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return code;
}

function createRoomCode(): string {
  let code = randomCode();
  while (rooms.has(code)) {
    code = randomCode();
  }
  return code;
}

function serializePresence(room: Room): Array<{ slot: PlayerSlot; name: string }> {
  return ([0, 1] as const)
    .flatMap((slot) => {
      const session = room.sessions[slot];
      return session ? [{ slot, name: session.name }] : [];
    });
}

function broadcast(room: Room, message: ServerToClientMessage): void {
  for (const slot of [0, 1] as const) {
    const session = room.sessions[slot];
    if (session) {
      send(session.socket, message);
    }
  }
}

function broadcastPresence(room: Room): void {
  broadcast(room, {
    type: 'presence',
    code: room.code,
    players: serializePresence(room),
  });
}

function stopLoop(room: Room): void {
  if (room.loop) {
    clearInterval(room.loop);
    room.loop = null;
  }
}

function broadcastSnapshot(room: Room): void {
  broadcast(room, {
    type: 'snapshot',
    state: structuredClone(room.match),
  });
}

function maybeStartRoom(room: Room): void {
  if (!room.sessions[0] || !room.sessions[1] || room.loop) {
    return;
  }

  room.match.status = 'active';
  room.loop = setInterval(() => {
    stepMatch(room.match);
    broadcastSnapshot(room);
    if (room.match.status === 'complete') {
      stopLoop(room);
    }
  }, Math.floor(1_000 / TICK_RATE));

  broadcastSnapshot(room);
}

function leaveRoom(session: Session): void {
  if (!session.roomCode || session.slot === null) {
    return;
  }

  const room = rooms.get(session.roomCode);
  if (!room) {
    session.roomCode = null;
    session.slot = null;
    return;
  }

  delete room.sessions[session.slot];
  stopLoop(room);

  if (room.match.status === 'active' && room.match.winner === null) {
    const winner = session.slot === 0 ? 1 : 0;
    room.match.winner = winner;
    room.match.status = 'complete';
  }

  broadcastPresence(room);
  broadcastSnapshot(room);

  if (!room.sessions[0] && !room.sessions[1]) {
    rooms.delete(room.code);
  }

  session.roomCode = null;
  session.slot = null;
}

function parseMessage(raw: RawData): ClientToServerMessage | null {
  try {
    const payload =
      typeof raw === 'string'
        ? raw
        : Buffer.isBuffer(raw)
          ? raw.toString('utf8')
          : Array.isArray(raw)
            ? Buffer.concat(raw).toString('utf8')
            : Buffer.from(raw).toString('utf8');
    return JSON.parse(payload) as ClientToServerMessage;
  } catch {
    return null;
  }
}

const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'not_found' }));
});

const wss = new WebSocketServer({ server });

wss.on('connection', (socket) => {
  const session: Session = {
    id: `session-${sessionCounter += 1}`,
    socket,
    roomCode: null,
    slot: null,
    name: 'Guest',
  };

  send(socket, { type: 'connected' });

  socket.on('message', (raw) => {
    const message = parseMessage(raw);
    if (!message) {
      send(socket, { type: 'room_error', message: 'Malformed payload.' });
      return;
    }

    switch (message.type) {
      case 'create_room': {
        leaveRoom(session);
        const code = createRoomCode();
        const room: Room = {
          code,
          match: createMatch({
            playerNames: [message.name.trim() || 'Host', 'Challenger'],
            status: 'waiting',
          }),
          sessions: { 0: session },
          loop: null,
        };
        rooms.set(code, room);
        session.roomCode = code;
        session.slot = 0;
        session.name = message.name.trim() || 'Host';
        room.match.players[0].name = session.name;
        send(socket, { type: 'room_created', code, slot: 0 });
        broadcastPresence(room);
        broadcastSnapshot(room);
        break;
      }
      case 'join_room': {
        leaveRoom(session);
        const code = message.code.trim().toUpperCase();
        const room = rooms.get(code);
        if (!room || room.sessions[1]) {
          send(socket, { type: 'room_error', message: 'Room is unavailable.' });
          return;
        }
        session.roomCode = code;
        session.slot = 1;
        session.name = message.name.trim() || 'Guest';
        room.sessions[1] = session;
        room.match.players[1].name = session.name;
        send(socket, { type: 'room_joined', code, slot: 1 });
        broadcastPresence(room);
        maybeStartRoom(room);
        break;
      }
      case 'command': {
        if (!session.roomCode || session.slot === null) {
          send(socket, { type: 'room_error', message: 'Join a room before sending commands.' });
          return;
        }
        const room = rooms.get(session.roomCode);
        if (!room || room.match.status !== 'active') {
          return;
        }
        applyPlayerCommand(room.match, {
          ...message.command,
          slot: session.slot,
        } as PlayerCommand);
        broadcastSnapshot(room);
        break;
      }
      case 'leave_room':
        leaveRoom(session);
        break;
      default:
        message satisfies never;
        break;
    }
  });

  socket.on('close', () => {
    leaveRoom(session);
  });
});

server.listen(PORT, () => {
  console.log(`Aquawetrix server listening on http://localhost:${PORT}`);
});
