import type { MatchState, PlayerSlot } from '../lib/core.js';

export type OnlineConnectionState = 'idle' | 'connecting' | 'lobby' | 'active' | 'error';
export type Presence = Array<{ slot: PlayerSlot; name: string }>;

export interface OnlineBattleState {
  connectionState: OnlineConnectionState;
  error: string | null;
  localSlot: PlayerSlot | null;
  match: MatchState | null;
  players: Presence;
  roomCode: string | null;
}

export type OnlineBattleAction =
  | { type: 'connect_start' }
  | { type: 'room_ready'; code: string; slot: PlayerSlot }
  | { type: 'presence'; players: Presence }
  | { type: 'snapshot'; match: MatchState }
  | { type: 'error'; message: string }
  | { type: 'socket_closed'; message: string }
  | { type: 'leave' };

export const initialOnlineBattleState: OnlineBattleState = {
  connectionState: 'idle',
  error: null,
  localSlot: null,
  match: null,
  players: [],
  roomCode: null,
};

export function onlineBattleReducer(state: OnlineBattleState, action: OnlineBattleAction): OnlineBattleState {
  switch (action.type) {
    case 'connect_start':
      return {
        connectionState: 'connecting',
        error: null,
        localSlot: null,
        match: null,
        players: [],
        roomCode: null,
      };
    case 'room_ready':
      return {
        ...state,
        connectionState: 'lobby',
        error: null,
        roomCode: action.code,
        localSlot: action.slot,
      };
    case 'presence':
      return {
        ...state,
        players: action.players,
      };
    case 'snapshot':
      return {
        ...state,
        match: action.match,
        connectionState: action.match.status === 'active' ? 'active' : 'lobby',
      };
    case 'error':
      return {
        ...state,
        connectionState: 'error',
        error: action.message,
      };
    case 'socket_closed':
      if (state.connectionState === 'idle') {
        return state;
      }
      return {
        ...state,
        connectionState: 'error',
        error: state.error ?? action.message,
      };
    case 'leave':
      return initialOnlineBattleState;
    default:
      action satisfies never;
      return state;
  }
}
