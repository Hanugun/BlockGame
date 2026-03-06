import { startTransition, useEffect, useReducer, useRef } from 'react';
import type { MatchState, PlayerSlot } from '../lib/core.js';
import {
  initialOnlineBattleState,
  onlineBattleReducer,
  type OnlineConnectionState,
  type Presence,
} from '../state/online-battle-state.js';
type OutboundCommand =
  | { type: 'move'; dx: -1 | 0 | 1; dy: -1 | 0 | 1 }
  | { type: 'rotate'; delta: -1 | 1 }
  | { type: 'drop' };

type ClientMessage =
  | { type: 'create_room'; name: string }
  | { type: 'join_room'; code: string; name: string }
  | { type: 'command'; command: OutboundCommand }
  | { type: 'leave_room' };

type ServerMessage =
  | { type: 'connected' }
  | { type: 'room_created'; code: string; slot: PlayerSlot }
  | { type: 'room_joined'; code: string; slot: PlayerSlot }
  | { type: 'presence'; code: string; players: Presence }
  | { type: 'snapshot'; state: MatchState }
  | { type: 'room_error'; message: string };

interface OnlineBattleControls {
  connectionState: OnlineConnectionState;
  error: string | null;
  localSlot: PlayerSlot | null;
  match: MatchState | null;
  players: Presence;
  roomCode: string | null;
  isHost: boolean;
  canEnterMatch: boolean;
  createRoom: (name: string) => void;
  joinRoom: (name: string, code: string) => void;
  leaveRoom: () => void;
  sendCommand: (command: OutboundCommand) => void;
}

function resolveSocketUrl(): string {
  const custom = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (custom) {
    return custom;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:2567`;
}

export function useOnlineBattle(): OnlineBattleControls {
  const [state, dispatch] = useReducer(onlineBattleReducer, initialOnlineBattleState);
  const socketRef = useRef<{ socket: WebSocket; generation: number } | null>(null);
  const generationRef = useRef(0);
  const intentionalCloseRef = useRef(false);

  const closeSocket = (intentional: boolean) => {
    const current = socketRef.current;
    if (!current) {
      return;
    }
    if (intentional) {
      intentionalCloseRef.current = true;
    }
    current.socket.close();
    socketRef.current = null;
  };

  const handleMessage = (message: ServerMessage) => {
    switch (message.type) {
      case 'connected':
        break;
      case 'room_created':
      case 'room_joined':
        dispatch({ type: 'room_ready', code: message.code, slot: message.slot });
        break;
      case 'presence':
        dispatch({ type: 'presence', players: message.players });
        break;
      case 'snapshot':
        startTransition(() => {
          dispatch({ type: 'snapshot', match: message.state });
        });
        break;
      case 'room_error':
        dispatch({ type: 'error', message: message.message });
        break;
      default:
        message satisfies never;
        break;
    }
  };

  const connect = (payload: Extract<ClientMessage, { type: 'create_room' | 'join_room' }>) => {
    closeSocket(true);
    dispatch({ type: 'connect_start' });

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    intentionalCloseRef.current = false;

    const socket = new WebSocket(resolveSocketUrl());
    socketRef.current = { socket, generation };

    socket.addEventListener('open', () => {
      if (generation !== generationRef.current) {
        return;
      }
      socket.send(JSON.stringify(payload));
    });

    socket.addEventListener('message', (event) => {
      if (generation !== generationRef.current) {
        return;
      }

      try {
        const message = JSON.parse(event.data as string) as ServerMessage;
        handleMessage(message);
      } catch {
        dispatch({ type: 'error', message: 'Received malformed server payload.' });
      }
    });

    socket.addEventListener('close', () => {
      if (generation !== generationRef.current) {
        return;
      }
      socketRef.current = null;
      if (intentionalCloseRef.current) {
        intentionalCloseRef.current = false;
        return;
      }
      dispatch({ type: 'socket_closed', message: 'Connection closed unexpectedly.' });
    });

    socket.addEventListener('error', () => {
      if (generation !== generationRef.current) {
        return;
      }
      dispatch({ type: 'error', message: 'Network connection failed.' });
    });
  };

  useEffect(() => () => {
    closeSocket(true);
  }, []);

  const canEnterMatch = state.connectionState === 'active' && state.match?.status === 'active';
  const isHost = state.localSlot === 0;

  return {
    connectionState: state.connectionState,
    error: state.error,
    localSlot: state.localSlot,
    match: state.match,
    players: state.players,
    roomCode: state.roomCode,
    isHost,
    canEnterMatch,
    createRoom(name) {
      connect({ type: 'create_room', name });
    },
    joinRoom(name, code) {
      connect({ type: 'join_room', code, name });
    },
    leaveRoom() {
      const socket = socketRef.current?.socket;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'leave_room' } satisfies ClientMessage));
      }
      closeSocket(true);
      dispatch({ type: 'leave' });
    },
    sendCommand(command) {
      const socket = socketRef.current?.socket;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      socket.send(JSON.stringify({ type: 'command', command } satisfies ClientMessage));
    },
  };
}
