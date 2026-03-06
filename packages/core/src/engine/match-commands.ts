import { PIECE_LOCK_TICKS } from '../constants.js';
import { lockActivePiece } from './match-step.js';
import { getPieceCells } from '../rules/pieces.js';
import type { MatchState, PlayerCommand } from '../types.js';

function getCellsCenter(cells: { x: number; y: number }[]): { x: number; y: number } {
  const minX = Math.min(...cells.map((cell) => cell.x));
  const maxX = Math.max(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  const maxY = Math.max(...cells.map((cell) => cell.y));
  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
}

function clampActivePiece(state: MatchState, slot: 0 | 1): void {
  const player = state.players[slot];
  const activePiece = player.activePiece;
  if (!activePiece) {
    return;
  }

  const cells = getPieceCells(activePiece.kind, activePiece.rotation);
  const maxX = Math.max(...cells.map((cell) => cell.x));
  const maxY = Math.max(...cells.map((cell) => cell.y));
  activePiece.anchor.x = Math.min(Math.max(activePiece.anchor.x, 0), player.controlGrid.width - (maxX + 1));
  activePiece.anchor.y = Math.min(Math.max(activePiece.anchor.y, 0), player.controlGrid.height - (maxY + 1));
}

export function applyPlayerCommand(state: MatchState, command: PlayerCommand): void {
  if (state.status !== 'active') {
    return;
  }

  const player = state.players[command.slot];
  const activePiece = player.activePiece;
  if (!activePiece) {
    return;
  }

  switch (command.type) {
    case 'move':
      activePiece.anchor.x += command.dx;
      activePiece.anchor.y += command.dy;
      clampActivePiece(state, command.slot);
      break;
    case 'rotate':
      {
        const previousCells = getPieceCells(activePiece.kind, activePiece.rotation);
        const previousCenter = getCellsCenter(previousCells);
        const nextRotation = (((activePiece.rotation + command.delta) % 4) + 4) % 4 as 0 | 1 | 2 | 3;
        const nextCells = getPieceCells(activePiece.kind, nextRotation);
        const nextCenter = getCellsCenter(nextCells);
        activePiece.rotation = nextRotation;
        activePiece.anchor.x = Math.round(activePiece.anchor.x + previousCenter.x - nextCenter.x);
        activePiece.anchor.y = Math.round(activePiece.anchor.y + previousCenter.y - nextCenter.y);
      }
      clampActivePiece(state, command.slot);
      break;
    case 'drop':
      lockActivePiece(state, command.slot, 'drop');
      break;
    default:
      command satisfies never;
      break;
  }

  if (player.activePiece) {
    player.activePiece.ticksRemaining = Math.min(player.activePiece.ticksRemaining, PIECE_LOCK_TICKS);
  }
}
