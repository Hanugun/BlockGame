import { describe, expect, it } from 'vitest';
import { createMatch } from '../lib/core.js';
import { initialOnlineBattleState, onlineBattleReducer } from './online-battle-state.js';

describe('onlineBattleReducer', () => {
  it('moves from connecting to lobby on room assignment', () => {
    const connecting = onlineBattleReducer(initialOnlineBattleState, { type: 'connect_start' });
    const lobby = onlineBattleReducer(connecting, { type: 'room_ready', code: 'AB123', slot: 0 });

    expect(lobby.connectionState).toBe('lobby');
    expect(lobby.roomCode).toBe('AB123');
    expect(lobby.localSlot).toBe(0);
  });

  it('switches to active when authoritative snapshot is active', () => {
    const waiting = onlineBattleReducer(initialOnlineBattleState, { type: 'room_ready', code: 'AB123', slot: 1 });
    const match = createMatch({
      mode: 'versus',
      playerNames: ['Host', 'Guest'],
      status: 'active',
    });
    const active = onlineBattleReducer(waiting, { type: 'snapshot', match });

    expect(active.connectionState).toBe('active');
  });

  it('resets state on leave', () => {
    const connected = onlineBattleReducer(initialOnlineBattleState, { type: 'room_ready', code: 'AB123', slot: 1 });
    const left = onlineBattleReducer(connected, { type: 'leave' });

    expect(left).toEqual(initialOnlineBattleState);
  });
});
