import { LAKE_CAPTURE_VOLUME, LAKE_STABLE_TICKS, MIN_WATER_THRESHOLD } from '../constants.js';
import type { BoardState, MatchState, PlayerSlot, PlayerState, Vec2 } from '../types.js';
import { getCell, getNeighbors, isInBounds, roundWater } from '../utils/board.js';
import { createEvent } from './match-step-shared.js';

export interface LakeComponentInfo {
  key: string;
  cells: Vec2[];
  volume: number;
  sealed: boolean;
}

export function componentKey(cells: Vec2[]): string {
  return cells
    .map((cell) => `${cell.x},${cell.y}`)
    .sort()
    .join('|');
}

export function collectComponent(
  board: BoardState,
  start: Vec2,
  visited: Set<string>,
): { cells: Vec2[]; volume: number; sealed: boolean } {
  const queue = [start];
  const cells: Vec2[] = [];
  let volume = 0;
  let sealed = true;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;
    if (visited.has(key)) {
      continue;
    }
    visited.add(key);
    const cell = getCell(board, current.x, current.y);
    if (cell.water <= MIN_WATER_THRESHOLD) {
      continue;
    }
    if (cell.holeDepth > 0) {
      sealed = false;
    }

    cells.push(current);
    volume += cell.water;
    const sourceSurface = cell.height + cell.water;
    for (const neighbor of getNeighbors(current)) {
      if (!isInBounds(board, neighbor.x, neighbor.y)) {
        sealed = false;
        continue;
      }
      const neighborCell = getCell(board, neighbor.x, neighbor.y);
      if (neighborCell.holeDepth > 0) {
        sealed = false;
        continue;
      }
      if (neighborCell.water > MIN_WATER_THRESHOLD) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(neighborKey)) {
          queue.push(neighbor);
        }
        continue;
      }
      const barrierHeight = neighborCell.height + (neighborCell.frozenTicks > 0 ? 0.4 : 0);
      if (barrierHeight < sourceSurface - 0.2) {
        sealed = false;
      }
    }
  }

  return { cells, volume, sealed };
}

export function collectLakeComponents(board: BoardState): LakeComponentInfo[] {
  const visited = new Set<string>();
  const components: LakeComponentInfo[] = [];

  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const cell = getCell(board, x, y);
      if (cell.water <= MIN_WATER_THRESHOLD) {
        continue;
      }

      const key = `${x},${y}`;
      if (visited.has(key)) {
        continue;
      }

      const component = collectComponent(board, { x, y }, visited);
      components.push({
        key: componentKey(component.cells),
        cells: component.cells,
        volume: roundWater(component.volume),
        sealed: component.sealed,
      });
    }
  }

  return components;
}

export function evaluateLakes(
  state: MatchState,
  slot: PlayerSlot,
  onSoloUpdate: (state: MatchState, player: PlayerState) => void,
): void {
  const player = state.players[slot];
  const board = player.board;
  const visited = new Set<string>();
  const activeKeys = new Set<string>();
  const primedCells: Vec2[] = [];
  let primedWater = 0;
  let primedLakes = 0;

  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const cell = getCell(board, x, y);
      if (cell.water <= MIN_WATER_THRESHOLD) {
        continue;
      }
      const key = `${x},${y}`;
      if (visited.has(key)) {
        continue;
      }

      const component = collectComponent(board, { x, y }, visited);
      if (!component.sealed || component.volume < LAKE_CAPTURE_VOLUME) {
        continue;
      }

      const signature = componentKey(component.cells);
      activeKeys.add(signature);
      const existing = player.lakeTrackers[signature] ?? {
        primed: false,
        stableTicks: 0,
        ageTicks: 0,
        volumeBucket: Math.round(component.volume),
      };
      existing.stableTicks += 1;
      existing.volumeBucket = Math.round(component.volume);
      if (existing.primed) {
        existing.ageTicks += 1;
      }
      player.lakeTrackers[signature] = existing;

      if (!existing.primed && existing.stableTicks >= LAKE_STABLE_TICKS) {
        existing.primed = true;
        existing.ageTicks = 0;
        player.stats.lakesPrimed += 1;
        player.largestLake = Math.max(player.largestLake, roundWater(component.volume));
        createEvent(
          state,
          slot,
          'lake_stabilized',
          `${player.name} sealed a lake. Burn it with Fireball to bank the water.`,
          { amount: roundWater(component.volume) },
        );
      }

      if (existing.primed) {
        primedLakes += 1;
        primedWater = roundWater(primedWater + component.volume);
        primedCells.push(...component.cells);
      }
    }
  }

  for (const signature of Object.keys(player.lakeTrackers)) {
    if (!activeKeys.has(signature)) {
      delete player.lakeTrackers[signature];
    }
  }
  player.primedWater = primedWater;
  player.primedLakes = primedLakes;
  player.primedCells = primedCells;
  if (state.mode === 'solo') {
    onSoloUpdate(state, player);
  } else {
    player.lakeMates = 0;
    player.rainbowActive = false;
    player.scoreMultiplier = 1;
  }
}
