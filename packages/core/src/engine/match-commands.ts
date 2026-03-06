import { getPieceLockTicks } from './create-match.js';
import { lockActivePiece } from './match-step.js';
import { getPieceCells } from '../rules/pieces.js';
import type { MatchState, PlayerCommand } from '../types.js';

function getAnchorStep(state: MatchState): number {
  if (state.mode !== 'solo') {
    return 1;
  }
  return 1 / Math.max(1, state.players[0].cellScale);
}

function snapToAnchorStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

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

  const step = getAnchorStep(state);
  const cells = getPieceCells(activePiece.kind, activePiece.rotation);
  const minX = Math.min(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  const maxX = Math.max(...cells.map((cell) => cell.x));
  const maxY = Math.max(...cells.map((cell) => cell.y));
  const maxAnchorX = player.controlGrid.width - (maxX + 1);
  const maxAnchorY = player.controlGrid.height - (maxY + 1);
  activePiece.anchor.x = snapToAnchorStep(
    Math.min(Math.max(activePiece.anchor.x, -minX), maxAnchorX),
    step,
  );
  activePiece.anchor.y = snapToAnchorStep(
    Math.min(Math.max(activePiece.anchor.y, -minY), maxAnchorY),
    step,
  );
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
      {
        const moveStep = getAnchorStep(state);
        activePiece.anchor.x += command.dx * moveStep;
        activePiece.anchor.y += command.dy * moveStep;
      }
      clampActivePiece(state, command.slot);
      break;
    case 'rotate':
      {
        const rotateStep = getAnchorStep(state);
        const previousCells = getPieceCells(activePiece.kind, activePiece.rotation);
        const previousCenter = getCellsCenter(previousCells);
        const nextRotation = (((activePiece.rotation + command.delta) % 4) + 4) % 4 as 0 | 1 | 2 | 3;
        const nextCells = getPieceCells(activePiece.kind, nextRotation);
        const nextCenter = getCellsCenter(nextCells);
        activePiece.rotation = nextRotation;
        activePiece.anchor.x = snapToAnchorStep(activePiece.anchor.x + previousCenter.x - nextCenter.x, rotateStep);
        activePiece.anchor.y = snapToAnchorStep(activePiece.anchor.y + previousCenter.y - nextCenter.y, rotateStep);
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
    player.activePiece.ticksRemaining = Math.min(
      player.activePiece.ticksRemaining,
      getPieceLockTicks(state.mode, state.phase),
    );
  }
}
