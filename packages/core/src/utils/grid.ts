import type { BoardState, Vec2 } from '../types.js';
import { isInBounds } from './board.js';

export function controlToSimulationOrigin(control: Vec2, cellScale: number): Vec2 {
  return {
    x: control.x * cellScale,
    y: control.y * cellScale,
  };
}

export function controlToSimulationCenter(control: Vec2, cellScale: number): Vec2 {
  return {
    x: (control.x * cellScale) + Math.floor(cellScale / 2),
    y: (control.y * cellScale) + Math.floor(cellScale / 2),
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
