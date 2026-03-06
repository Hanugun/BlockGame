import { getPieceCells } from '../rules/pieces.js';
import type { BoardState, PieceKind, Rotation, Vec2 } from '../types.js';
import { isInBounds, roundWater } from './board.js';

export interface TerrainHeightDelta extends Vec2 {
  amount: number;
}

const MACRO_HILL_PROFILE = [
  [0.7, 1.1, 0.7],
  [1.1, 1.8, 1.1],
  [0.7, 1.1, 0.7],
] as const;

function toSimulationCoordinate(value: number, cellScale: number): number {
  return Math.round(value * cellScale);
}

export function controlToSimulationOrigin(control: Vec2, cellScale: number): Vec2 {
  return {
    x: toSimulationCoordinate(control.x, cellScale),
    y: toSimulationCoordinate(control.y, cellScale),
  };
}

export function controlToSimulationCenter(control: Vec2, cellScale: number): Vec2 {
  return {
    x: toSimulationCoordinate(control.x, cellScale) + Math.floor(cellScale / 2),
    y: toSimulationCoordinate(control.y, cellScale) + Math.floor(cellScale / 2),
  };
}

export function expandControlCellsToSimulation(
  board: BoardState,
  controlCells: Vec2[],
  cellScale: number,
): Vec2[] {
  const expanded: Vec2[] = [];
  const seen = new Set<string>();
  for (const controlCell of controlCells) {
    const origin = controlToSimulationOrigin(controlCell, cellScale);
    for (let dy = 0; dy < cellScale; dy += 1) {
      for (let dx = 0; dx < cellScale; dx += 1) {
        const simulationCell = { x: origin.x + dx, y: origin.y + dy };
        if (!isInBounds(board, simulationCell.x, simulationCell.y)) {
          continue;
        }
        const key = `${simulationCell.x}:${simulationCell.y}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        expanded.push(simulationCell);
      }
    }
  }
  return expanded;
}

function appendHeightDelta(
  deltas: TerrainHeightDelta[],
  amounts: Map<string, number>,
  board: BoardState,
  x: number,
  y: number,
  amount: number,
): void {
  if (!isInBounds(board, x, y)) {
    return;
  }
  const key = `${x}:${y}`;
  const nextAmount = roundWater((amounts.get(key) ?? 0) + amount);
  if (amounts.has(key)) {
    amounts.set(key, nextAmount);
    const existing = deltas.find((delta) => delta.x === x && delta.y === y);
    if (existing) {
      existing.amount = nextAmount;
    }
    return;
  }
  amounts.set(key, nextAmount);
  deltas.push({ x, y, amount: nextAmount });
}

function ringFootprint(origin: Vec2, size: number, board: BoardState): Vec2[] {
  const expanded: Vec2[] = [];
  const seen = new Set<string>();
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const onBorder = x === 0 || y === 0 || x === size - 1 || y === size - 1;
      if (!onBorder) {
        continue;
      }
      const simulationCell = {
        x: origin.x + x,
        y: origin.y + y,
      };
      if (!isInBounds(board, simulationCell.x, simulationCell.y)) {
        continue;
      }
      const key = `${simulationCell.x}:${simulationCell.y}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      expanded.push(simulationCell);
    }
  }
  return expanded;
}

function ringHeightProfile(board: BoardState, cells: Vec2[]): TerrainHeightDelta[] {
  const occupied = new Set(cells.map((cell) => `${cell.x}:${cell.y}`));
  const weighted = cells.map((cell) => {
    const left = occupied.has(`${cell.x - 1}:${cell.y}`);
    const right = occupied.has(`${cell.x + 1}:${cell.y}`);
    const up = occupied.has(`${cell.x}:${cell.y - 1}`);
    const down = occupied.has(`${cell.x}:${cell.y + 1}`);
    const straight = (left && right) || (up && down);
    const turn = ((left || right) && (up || down)) && !straight;
    const amount = straight ? 1.2 : turn ? 0.8 : 1;
    return { ...cell, amount };
  });
  const total = weighted.reduce((sum, cell) => sum + cell.amount, 0);
  const normalization = total > 0 ? cells.length / total : 1;
  const deltas: TerrainHeightDelta[] = [];
  for (const cell of weighted) {
    appendHeightDelta(
      deltas,
      new Map(deltas.map((delta) => [`${delta.x}:${delta.y}`, delta.amount])),
      board,
      cell.x,
      cell.y,
      roundWater(cell.amount * normalization),
    );
  }
  return deltas;
}

export function expandPieceToSimulation(
  board: BoardState,
  kind: PieceKind,
  rotation: Rotation,
  anchor: Vec2,
  cellScale: number,
): Vec2[] {
  if ((kind === 'square' || kind === 'pit') && cellScale === 3) {
    const origin = controlToSimulationOrigin(anchor, cellScale);
    return ringFootprint(origin, cellScale * 2, board);
  }

  const controlCells = getPieceCells(kind, rotation).map((cell) => ({
    x: anchor.x + cell.x,
    y: anchor.y + cell.y,
  }));
  return expandControlCellsToSimulation(board, controlCells, cellScale);
}

export function expandTerrainPieceToSimulationProfile(
  board: BoardState,
  kind: PieceKind,
  rotation: Rotation,
  anchor: Vec2,
  cellScale: number,
): TerrainHeightDelta[] {
  if ((kind === 'square' || kind === 'pit') && cellScale === 3) {
    const origin = controlToSimulationOrigin(anchor, cellScale);
    return ringHeightProfile(board, ringFootprint(origin, cellScale * 2, board));
  }

  if (cellScale !== 3) {
    return expandPieceToSimulation(board, kind, rotation, anchor, cellScale).map((cell) => ({
      ...cell,
      amount: 1,
    }));
  }

  const controlCells = getPieceCells(kind, rotation).map((cell) => ({
    x: anchor.x + cell.x,
    y: anchor.y + cell.y,
  }));
  const deltas: TerrainHeightDelta[] = [];
  const amounts = new Map<string, number>();

  for (const controlCell of controlCells) {
    const origin = controlToSimulationOrigin(controlCell, cellScale);
    for (let dy = 0; dy < cellScale; dy += 1) {
      for (let dx = 0; dx < cellScale; dx += 1) {
        appendHeightDelta(
          deltas,
          amounts,
          board,
          origin.x + dx,
          origin.y + dy,
          MACRO_HILL_PROFILE[dy]![dx]!,
        );
      }
    }
  }

  return deltas;
}
