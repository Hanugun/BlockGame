import {
  DRAIN_FILL_PER_WATER,
  FLOW_SUBSTEPS,
  HOLE_DRAIN_BASE,
  HOLE_DRAIN_PER_DEPTH,
  MAX_TERRAIN_HEIGHT,
  MIN_WATER_THRESHOLD,
} from '../constants.js';
import { SOLO_V2_CONFIG } from '../config/solo-v2-config.js';
import type { AttackKind, BoardState, MatchState, PlayerSlot, PlayerState, Vec2 } from '../types.js';
import { getCell, getNeighbors, isInBounds, roundWater } from '../utils/board.js';
import { nextRandom, type RandomState } from '../utils/rng.js';
import { attackThreat, createEvent, isPilot } from './match-step-shared.js';

function tickFrozenCells(board: BoardState): void {
  for (const cell of board.cells) {
    if (cell.frozenTicks > 0) {
      cell.frozenTicks -= 1;
    }
    if (cell.mineTicks > 0) {
      cell.mineTicks -= 1;
    }
  }
}

function runFlowSubstep(board: BoardState): number {
  const deltas = new Array<number>(board.cells.length).fill(0);
  let overflow = 0;

  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const source = getCell(board, x, y);
      if (source.water <= MIN_WATER_THRESHOLD || source.frozenTicks > 0) {
        continue;
      }

      const sourceIndex = (y * board.width) + x;
      if (source.holeDepth > 0) {
        const leak = Math.min(source.water, HOLE_DRAIN_BASE + (source.holeDepth * HOLE_DRAIN_PER_DEPTH));
        if (leak > MIN_WATER_THRESHOLD) {
          deltas[sourceIndex] = (deltas[sourceIndex] ?? 0) - leak;
          overflow += leak;
        }
        continue;
      }

      let available = source.water;
      let sourceSurface = source.height + source.water;
      const targets = getNeighbors({ x, y }).map((neighbor) => {
        if (!isInBounds(board, neighbor.x, neighbor.y)) {
          return {
            kind: 'void' as const,
            x: neighbor.x,
            y: neighbor.y,
            surface: -10,
          };
        }
        const neighborCell = getCell(board, neighbor.x, neighbor.y);
        if (neighborCell.holeDepth > 0) {
          return {
            kind: 'void' as const,
            x: neighbor.x,
            y: neighbor.y,
            surface: -8 - (neighborCell.holeDepth * 0.9),
          };
        }
        const surface = neighborCell.frozenTicks > 0 ? Number.POSITIVE_INFINITY : neighborCell.height + neighborCell.water;
        return {
          kind: 'cell' as const,
          x: neighbor.x,
          y: neighbor.y,
          surface,
        };
      }).sort((left, right) => left.surface - right.surface);

      for (const target of targets) {
        if (available <= MIN_WATER_THRESHOLD) {
          break;
        }
        const difference = sourceSurface - target.surface;
        if (!Number.isFinite(difference) || difference <= 0.25) {
          continue;
        }
        const transfer = Math.min(available * 0.45, difference * 0.18);
        if (transfer <= MIN_WATER_THRESHOLD) {
          continue;
        }

        deltas[sourceIndex] = (deltas[sourceIndex] ?? 0) - transfer;
        if (target.kind === 'cell') {
          const targetIndex = (target.y * board.width) + target.x;
          deltas[targetIndex] = (deltas[targetIndex] ?? 0) + transfer;
        } else {
          overflow += transfer;
        }
        available -= transfer;
        sourceSurface -= transfer;
      }
    }
  }

  for (let index = 0; index < board.cells.length; index += 1) {
    board.cells[index]!.water = roundWater(Math.max(0, board.cells[index]!.water + deltas[index]!));
  }

  return overflow;
}

export function runWaterSimulation(player: PlayerState, overflowPenaltyScale = 1): void {
  let overflow = 0;
  for (let step = 0; step < FLOW_SUBSTEPS; step += 1) {
    overflow += runFlowSubstep(player.board);
  }
  player.overflowLastTick = roundWater(overflow);
  const drainGain = roundWater(overflow * DRAIN_FILL_PER_WATER * overflowPenaltyScale);
  player.drainLevel = roundWater(Math.min(player.drainMax, player.drainLevel + drainGain));
  player.stability = Math.max(0, Math.round(player.drainMax - player.drainLevel));
  tickFrozenCells(player.board);
}

export function relieveDrain(player: PlayerState, amount: number): void {
  if (amount <= 0) {
    return;
  }
  player.drainLevel = roundWater(Math.max(0, Math.min(player.drainMax, player.drainLevel - amount)));
  player.stability = Math.max(0, Math.round(player.drainMax - player.drainLevel));
}

function calculateStoredWater(board: BoardState): number {
  return roundWater(board.cells.reduce((sum, cell) => sum + cell.water, 0));
}

export function updateBoardMetrics(player: PlayerState): void {
  if (!isPilot(player)) {
    player.storedWater = 0;
    player.primedWater = 0;
    player.primedLakes = 0;
    player.lakeMates = 0;
    player.rainbowActive = false;
    player.scoreMultiplier = 1;
    player.primedCells = [];
    const drainPercent = player.drainMax > 0 ? (player.drainLevel / player.drainMax) * 100 : 0;
    player.boardRisk = Math.max(0, Math.round(drainPercent));
    return;
  }

  player.storedWater = calculateStoredWater(player.board);
  const inboundThreat = player.pendingAttacks.reduce((sum, attack) => sum + attackThreat(attack.kind, attack.power), 0);
  const stabilityPercent = player.drainMax > 0 ? (player.stability / player.drainMax) * 100 : 0;
  const stabilityPressure = Math.max(0, 100 - stabilityPercent) * 0.4;
  const overflowPressure = player.overflowLastTick * 22;
  const densityPressure = Math.max(0, player.storedWater - 11) * 1.35;
  const reservoirPressure = Math.max(0, player.primedWater - 6) * 1.1;
  const terrainPressure = player.terrainStress * 2.2;
  const quakePressure = player.quakeMeter * 0.9;
  player.boardRisk = Math.min(100, Math.round(inboundThreat + stabilityPressure + overflowPressure + densityPressure + reservoirPressure + terrainPressure + quakePressure));
}

export function addTerrainStress(player: PlayerState, amount: number): void {
  player.terrainStress = roundWater(Math.max(0, player.terrainStress + amount));
  player.quakeMeter = roundWater(Math.max(0, player.quakeMeter + (amount * 1.4)));
}

export function relieveTerrainStress(player: PlayerState, amount: number): void {
  player.terrainStress = roundWater(Math.max(0, player.terrainStress - amount));
  player.quakeMeter = roundWater(Math.max(0, player.quakeMeter - (amount * 1.8)));
}

export function sampleCells(board: BoardState, randomState: RandomState, count: number): Vec2[] {
  const cells: Vec2[] = [];
  const seen = new Set<string>();
  while (cells.length < count) {
    const x = Math.floor(nextRandom(randomState) * board.width);
    const y = Math.floor(nextRandom(randomState) * board.height);
    const key = `${x},${y}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    cells.push({ x, y });
  }
  return cells;
}

export function applyAttack(board: BoardState, kind: AttackKind, power: number, rngSeed: number): number {
  const randomState: RandomState = { seed: rngSeed };
  switch (kind) {
    case 'water_attack': {
      for (const position of sampleCells(board, randomState, 4 + power)) {
        const cell = getCell(board, position.x, position.y);
        cell.water = roundWater(cell.water + (0.65 * power));
      }
      return randomState.seed;
    }
    case 'bomb_attack': {
      for (const position of sampleCells(board, randomState, 3 + power)) {
        const cell = getCell(board, position.x, position.y);
        const previousHeight = cell.height;
        const nextHeight = Math.max(0, cell.height - (power >= 2 ? 2 : 1));
        cell.height = nextHeight;
        if (nextHeight === 0 && previousHeight > 0) {
          cell.holeDepth = Math.max(cell.holeDepth, power >= 2 ? 2 : 1);
        }
        cell.water = roundWater(cell.water * 0.7);
        cell.frozenTicks = 0;
        cell.mineTicks = 0;
      }
      return randomState.seed;
    }
    case 'fireball_attack': {
      for (const position of sampleCells(board, randomState, 5 + power)) {
        const cell = getCell(board, position.x, position.y);
        if (cell.frozenTicks > 0) {
          cell.frozenTicks = 0;
          continue;
        }
        cell.water = roundWater(Math.max(0, cell.water - (0.75 + (power * 0.15))));
        if (cell.water <= MIN_WATER_THRESHOLD) {
          cell.height = Math.max(0, cell.height - 1);
        }
        cell.mineTicks = 0;
      }
      return randomState.seed;
    }
    case 'upper_attack': {
      for (const position of sampleCells(board, randomState, 4 + power)) {
        const cell = getCell(board, position.x, position.y);
        if (cell.holeDepth > 0) {
          cell.holeDepth = Math.max(0, cell.holeDepth - 1);
          if (cell.holeDepth === 0) {
            cell.height = Math.max(1, cell.height);
          }
        }
        cell.height = Math.min(MAX_TERRAIN_HEIGHT, cell.height + 1);
      }
      return randomState.seed;
    }
    case 'downer_attack': {
      for (const position of sampleCells(board, randomState, 4 + power)) {
        const cell = getCell(board, position.x, position.y);
        const previousHeight = cell.height;
        const nextHeight = Math.max(0, cell.height - 1);
        cell.height = nextHeight;
        if (nextHeight === 0 && previousHeight > 0 && previousHeight <= 1) {
          cell.holeDepth = Math.max(cell.holeDepth, 1);
        }
        cell.frozenTicks = 0;
        cell.mineTicks = 0;
      }
      return randomState.seed;
    }
    case 'ice_attack': {
      for (const position of sampleCells(board, randomState, 4 + power)) {
        const cell = getCell(board, position.x, position.y);
        if (cell.water > MIN_WATER_THRESHOLD) {
          cell.frozenTicks = Math.max(cell.frozenTicks, 10 + (power * 2));
        }
      }
      return randomState.seed;
    }
    default:
      kind satisfies never;
      return rngSeed;
  }
}

export function triggerEarthquake(state: MatchState, slot: PlayerSlot): void {
  const player = state.players[slot];
  if (!isPilot(player)) {
    return;
  }
  const safeHeight = SOLO_V2_CONFIG.terrain.safeHeight;
  const threshold = SOLO_V2_CONFIG.terrain.quakeThreshold;
  let aboveSafe = 0;
  let maxHeight = 0;
  let totalHeight = 0;
  for (const cell of player.board.cells) {
    aboveSafe += Math.max(0, cell.height - safeHeight);
    maxHeight = Math.max(maxHeight, cell.height);
    totalHeight += cell.height;
  }
  const averageHeight = totalHeight / Math.max(1, player.board.cells.length);
  const imbalance = Math.max(0, maxHeight - averageHeight - 1);
  const quakeGain = roundWater((aboveSafe * 0.9) + (Math.max(0, maxHeight - safeHeight) * 1.5) + (imbalance * 0.6));
  player.quakeMeter = roundWater(Math.max(0, player.quakeMeter + quakeGain));

  if (player.quakeMeter < threshold) {
    return;
  }

  const randomState: RandomState = { seed: player.rng };
  for (const position of sampleCells(player.board, randomState, 6)) {
    const cell = getCell(player.board, position.x, position.y);
    const previousHeight = cell.height;
    const loss = nextRandom(randomState) > 0.58 ? 2 : 1;
    cell.height = Math.max(0, cell.height - loss);
    if (cell.height === 0 && previousHeight > 0 && previousHeight <= 1) {
      cell.holeDepth = Math.max(cell.holeDepth, 1);
    }
  }
  player.rng = randomState.seed;
  player.terrainStress = roundWater(Math.max(threshold * 0.12, player.terrainStress * 0.54));
  player.quakeMeter = roundWater(Math.max(threshold * 0.25, player.quakeMeter * 0.45));
  createEvent(
    state,
    slot,
    'earthquake',
    `${player.name}'s terrain cracked under earthquake pressure.`,
    { amount: player.quakeMeter },
  );
}
