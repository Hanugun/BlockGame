import {
  MATCH_DURATION_TICKS,
  SOLO_STORM_INTERVAL_CALM,
  SOLO_STORM_INTERVAL_SURGE,
  SOLO_STORM_INTERVAL_TEMPEST,
  STORM_INTERVAL_CALM,
  STORM_INTERVAL_SURGE,
  STORM_INTERVAL_TEMPEST,
} from '../constants.js';
import { getPieceCells } from '../rules/pieces.js';
import type {
  AttackKind,
  AttackSource,
  MatchEvent,
  MatchPhase,
  MatchMode,
  MatchState,
  PendingAttack,
  PieceKind,
  PlayerSlot,
  PlayerState,
  Vec2,
} from '../types.js';

export function createEvent(
  state: MatchState,
  slot: PlayerSlot,
  type: MatchEvent['type'],
  message: string,
  extras: Omit<MatchEvent, 'id' | 'tick' | 'slot' | 'type' | 'message'> = {},
): void {
  state.events.push({
    id: `${state.tick}:${slot}:${state.events.length}:${type}`,
    tick: state.tick,
    slot,
    type,
    message,
    ...extras,
  });
}

export function getPhaseForProgress(progressTicks: number): MatchPhase {
  const progress = progressTicks / MATCH_DURATION_TICKS;
  if (progress >= 0.72) {
    return 'tempest';
  }
  if (progress >= 0.38) {
    return 'surge';
  }
  return 'calm';
}

export function getStormInterval(phase: MatchPhase, mode: MatchMode): number {
  if (mode === 'solo') {
    switch (phase) {
      case 'calm':
        return SOLO_STORM_INTERVAL_CALM;
      case 'surge':
        return SOLO_STORM_INTERVAL_SURGE;
      case 'tempest':
        return SOLO_STORM_INTERVAL_TEMPEST;
      default:
        phase satisfies never;
        return SOLO_STORM_INTERVAL_CALM;
    }
  }

  switch (phase) {
    case 'calm':
      return STORM_INTERVAL_CALM;
    case 'surge':
      return STORM_INTERVAL_SURGE;
    case 'tempest':
      return STORM_INTERVAL_TEMPEST;
    default:
      phase satisfies never;
      return STORM_INTERVAL_CALM;
  }
}

export function getStormSpec(phase: MatchPhase, mode: MatchMode): { cells: number; water: number } {
  if (mode === 'solo') {
    switch (phase) {
      case 'calm':
        return { cells: 2, water: 0.22 };
      case 'surge':
        return { cells: 3, water: 0.34 };
      case 'tempest':
        return { cells: 4, water: 0.46 };
      default:
        phase satisfies never;
        return { cells: 2, water: 0.22 };
    }
  }

  switch (phase) {
    case 'calm':
      return { cells: 3, water: 0.3 };
    case 'surge':
      return { cells: 4, water: 0.45 };
    case 'tempest':
      return { cells: 5, water: 0.6 };
    default:
      phase satisfies never;
      return { cells: 3, water: 0.3 };
  }
}

export function absoluteCells(pieceKind: PieceKind, rotation: 0 | 1 | 2 | 3, anchor: Vec2): Vec2[] {
  return getPieceCells(pieceKind, rotation).map((cell) => ({
    x: cell.x + anchor.x,
    y: cell.y + anchor.y,
  }));
}

export function isPilot(player: PlayerState): boolean {
  return player.role === 'pilot';
}

export function activeSlots(state: MatchState): PlayerSlot[] {
  return state.mode === 'solo' ? [0] : [0, 1];
}

export function getProgressTicks(state: MatchState): number {
  return MATCH_DURATION_TICKS - state.remainingTicks;
}

export function attackLabel(kind: AttackKind): string {
  switch (kind) {
    case 'water_attack':
      return 'water attack';
    case 'bomb_attack':
      return 'bomb attack';
    case 'fireball_attack':
      return 'fireball attack';
    case 'ice_attack':
      return 'ice attack';
    case 'upper_attack':
      return 'upper attack';
    case 'downer_attack':
      return 'downer attack';
    default:
      kind satisfies never;
      return kind;
  }
}

export function attackThreat(kind: AttackKind, power: number): number {
  switch (kind) {
    case 'water_attack':
      return power * 9;
    case 'bomb_attack':
      return power * 14;
    case 'fireball_attack':
      return power * 12;
    case 'ice_attack':
      return power * 10;
    case 'upper_attack':
      return power * 13;
    case 'downer_attack':
      return power * 12;
    default:
      kind satisfies never;
      return power * 8;
  }
}

export function queueAttack(
  state: MatchState,
  sourceSlot: PlayerSlot,
  kind: AttackKind,
  power: number,
  source: AttackSource = 'versus_board',
): void {
  const sourcePlayer = state.players[sourceSlot];
  sourcePlayer.stats.attacksSent += 1;

  const targetSlot = sourceSlot === 0 ? 1 : 0;
  const etaTicks = state.phase === 'tempest' ? 7 : state.phase === 'surge' ? 9 : 11;
  const pending: PendingAttack = {
    id: `${state.tick}:${sourceSlot}:${kind}:${state.players[targetSlot].pendingAttacks.length}`,
    kind,
    source,
    power,
    etaTicks,
  };
  state.players[targetSlot].pendingAttacks.push(pending);
  createEvent(
    state,
    sourceSlot,
    'attack_sent',
    `${sourcePlayer.name} primed ${attackLabel(kind)}.`,
    { attackKind: kind, amount: power },
  );
  createEvent(
    state,
    targetSlot,
    'attack_received',
    `${state.players[targetSlot].name} is about to receive ${attackLabel(kind)}.`,
    { attackKind: kind, amount: power },
  );
}
