import type { BoardState, CellState, Vec2 } from '../types.js';

export function createCell(): CellState {
  return {
    height: 0,
    water: 0,
    frozenTicks: 0,
    mineTicks: 0,
    holeDepth: 0,
  };
}

export function createBoard(width: number, height: number): BoardState {
  return {
    width,
    height,
    cells: Array.from({ length: width * height }, () => createCell()),
  };
}

export function toIndex(board: BoardState, x: number, y: number): number {
  return (y * board.width) + x;
}

export function isInBounds(board: BoardState, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < board.width && y < board.height;
}

export function getCell(board: BoardState, x: number, y: number): CellState {
  return board.cells[toIndex(board, x, y)]!;
}

export function getNeighbors(position: Vec2): Vec2[] {
  return [
    { x: position.x - 1, y: position.y },
    { x: position.x + 1, y: position.y },
    { x: position.x, y: position.y - 1 },
    { x: position.x, y: position.y + 1 },
  ];
}

export function roundWater(value: number): number {
  return Math.max(0, Math.round(value * 100) / 100);
}
