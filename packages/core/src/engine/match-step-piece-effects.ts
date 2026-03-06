import { LAKE_CAPTURE_VOLUME, MAX_TERRAIN_HEIGHT, MIN_WATER_THRESHOLD } from '../constants.js';
import { getPieceDefinition } from '../rules/pieces.js';
import type { BoardState, PlayerState, TerrainPieceKind, Vec2 } from '../types.js';
import { getCell, getNeighbors, isInBounds, roundWater } from '../utils/board.js';
import type { TerrainHeightDelta } from '../utils/grid.js';
import { collectLakeComponents } from './match-step-lakes.js';

function forRadius(center: Vec2, radius: number, callback: (cell: Vec2) => void): void {
  for (let y = center.y - radius; y <= center.y + radius; y += 1) {
    for (let x = center.x - radius; x <= center.x + radius; x += 1) {
      callback({ x, y });
    }
  }
}

function repairHoleAt(board: BoardState, position: Vec2, strength = 1): boolean {
  if (!isInBounds(board, position.x, position.y)) {
    return false;
  }
  const cell = getCell(board, position.x, position.y);
  if (cell.holeDepth <= 0) {
    return false;
  }
  cell.holeDepth = Math.max(0, cell.holeDepth - strength);
  if (cell.holeDepth === 0) {
    cell.height = Math.max(cell.height, 1);
  }
  return true;
}

function touchedByCenter(cell: Vec2, center: Vec2): boolean {
  return Math.abs(cell.x - center.x) + Math.abs(cell.y - center.y) <= 1;
}

function dryScorch(player: PlayerState, center: Vec2): number {
  let terrainRemoved = 0;
  forRadius(center, 1, (position) => {
    if (!isInBounds(player.board, position.x, position.y)) {
      return;
    }
    const cell = getCell(player.board, position.x, position.y);
    if (cell.mineTicks > 0) {
      cell.mineTicks = 0;
      return;
    }
    cell.frozenTicks = 0;
    if (cell.height > 0) {
      cell.height -= 1;
      terrainRemoved += 1;
    }
  });
  return terrainRemoved;
}

export interface TerrainResolution {
  raised: number;
  lowered: number;
}

export function applyTerrainPiece(board: BoardState, kind: TerrainPieceKind, cells: TerrainHeightDelta[]): TerrainResolution {
  const definition = getPieceDefinition(kind);
  if (definition.terrainMode === 'lower') {
    let lowered = 0;
    for (const position of cells) {
      if (!isInBounds(board, position.x, position.y)) {
        continue;
      }
      const cell = getCell(board, position.x, position.y);
      if (cell.height <= 0) {
        continue;
      }
      const nextHeight = roundWater(Math.max(0, cell.height - position.amount));
      lowered = roundWater(lowered + Math.max(0, cell.height - nextHeight));
      cell.height = nextHeight;
    }
    return { raised: 0, lowered };
  }

  let raised = 0;
  for (const position of cells) {
    if (!isInBounds(board, position.x, position.y)) {
      continue;
    }

    repairHoleAt(board, position, 1);
    for (const neighbor of getNeighbors(position)) {
      repairHoleAt(board, neighbor, 1);
    }

    const cell = getCell(board, position.x, position.y);
    if (cell.holeDepth > 0) {
      continue;
    }
    const nextHeight = roundWater(Math.min(MAX_TERRAIN_HEIGHT, cell.height + position.amount));
    raised = roundWater(raised + Math.max(0, nextHeight - cell.height));
    cell.height = nextHeight;
  }
  return { raised, lowered: 0 };
}

export function applyWaterPiece(board: BoardState, center: Vec2): void {
  forRadius(center, 1, (position) => {
    if (!isInBounds(board, position.x, position.y)) {
      return;
    }
    const cell = getCell(board, position.x, position.y);
    const distance = Math.abs(position.x - center.x) + Math.abs(position.y - center.y);
    const amount = distance === 0 ? 2.1 : distance === 1 ? 0.85 : 0.45;
    cell.water = roundWater(cell.water + amount);
  });
}

function craterCells(board: BoardState, center: Vec2): Vec2[] {
  const originX = Math.max(0, Math.min(board.width - 2, center.x));
  const originY = Math.max(0, Math.min(board.height - 2, center.y));
  return [
    { x: originX, y: originY },
    { x: originX + 1, y: originY },
    { x: originX, y: originY + 1 },
    { x: originX + 1, y: originY + 1 },
  ];
}

export function applyBombPiece(board: BoardState, center: Vec2): number {
  let terrainRemoved = 0;
  const crater = craterCells(board, center);
  const craterKey = new Set(crater.map((cell) => `${cell.x}:${cell.y}`));

  for (const position of crater) {
    const cell = getCell(board, position.x, position.y);
    const nextHeight = Math.max(0, cell.height - 2);
    terrainRemoved += Math.max(0, cell.height - nextHeight);
    cell.height = nextHeight;
    if (nextHeight === 0) {
      cell.holeDepth = Math.max(cell.holeDepth, 2);
    }
    cell.water = roundWater(cell.water * 0.72);
    cell.frozenTicks = 0;
    cell.mineTicks = 0;
  }

  const ring = new Set<string>();
  for (const position of crater) {
    for (const neighbor of getNeighbors(position)) {
      if (!isInBounds(board, neighbor.x, neighbor.y)) {
        continue;
      }
      const key = `${neighbor.x}:${neighbor.y}`;
      if (craterKey.has(key) || ring.has(key)) {
        continue;
      }
      ring.add(key);
      const cell = getCell(board, neighbor.x, neighbor.y);
      const previousHeight = cell.height;
      const nextHeight = Math.max(0, previousHeight - 1);
      terrainRemoved += Math.max(0, previousHeight - nextHeight);
      cell.height = nextHeight;
      if (nextHeight === 0 && previousHeight > 0 && previousHeight <= 1) {
        cell.holeDepth = Math.max(cell.holeDepth, 1);
      }
      cell.water = roundWater(cell.water * 0.86);
      cell.frozenTicks = 0;
      cell.mineTicks = 0;
    }
  }

  return terrainRemoved;
}

interface PrimedLakeInfo {
  key: string;
  volume: number;
  ageTicks: number;
}

export interface FireResolution {
  evaporated: number;
  primedEvaporated: number;
  harvestedLakes: number;
  scoreGain: number;
  largestHarvest: number;
  terrainRemoved: number;
  focusCell: Vec2 | null;
}

function getPrimedLakeMap(player: PlayerState): Map<string, PrimedLakeInfo> {
  const byKey = new Map<string, PrimedLakeInfo>();
  for (const component of collectLakeComponents(player.board)) {
    if (!component.sealed || component.volume < LAKE_CAPTURE_VOLUME) {
      continue;
    }
    const tracker = player.lakeTrackers[component.key];
    if (!tracker?.primed) {
      continue;
    }
    byKey.set(component.key, {
      key: component.key,
      volume: component.volume,
      ageTicks: tracker.ageTicks,
    });
  }
  return byKey;
}

export function applyFirePiece(player: PlayerState, center: Vec2): FireResolution {
  const components = collectLakeComponents(player.board);
  const primedLakeMap = getPrimedLakeMap(player);
  const targetLakes = components.filter((component) => component.cells.some((cell) => touchedByCenter(cell, center)));

  let evaporated = 0;
  let primedEvaporated = 0;
  let harvestedLakes = 0;
  let scoreGain = 0;
  let largestHarvest = 0;
  let terrainRemoved = 0;
  let focusWeight = 0;
  let focusX = 0;
  let focusY = 0;

  for (const component of targetLakes) {
    const primedInfo = primedLakeMap.get(component.key);
    let lakeEvaporated = 0;
    let thawedOnly = true;

    for (const position of component.cells) {
      const cell = getCell(player.board, position.x, position.y);
      if (cell.frozenTicks > 0) {
        cell.frozenTicks = 0;
        continue;
      }
      if (cell.water <= MIN_WATER_THRESHOLD) {
        continue;
      }

      const removed = cell.water;
      cell.water = 0;
      thawedOnly = false;
      lakeEvaporated = roundWater(lakeEvaporated + removed);
      focusWeight += removed;
      focusX += position.x * removed;
      focusY += position.y * removed;

      if (cell.mineTicks > 0) {
        cell.mineTicks = 0;
        terrainRemoved += applyBombPiece(player.board, position);
      }
    }

    if (lakeEvaporated <= MIN_WATER_THRESHOLD) {
      if (thawedOnly) {
        continue;
      }
      continue;
    }

    evaporated = roundWater(evaporated + lakeEvaporated);
    let lakeScore = Math.round(lakeEvaporated * 110);

    if (primedInfo) {
      harvestedLakes += 1;
      primedEvaporated = roundWater(primedEvaporated + lakeEvaporated);
      largestHarvest = Math.max(largestHarvest, primedInfo.volume);
      const holdBonus = Math.min(1.15, primedInfo.ageTicks * 0.06);
      const sizeBonus = Math.min(0.95, primedInfo.volume * 0.06);
      const multiplier = 1.35 + holdBonus + sizeBonus;
      lakeScore = Math.round(lakeScore * multiplier);
    }

    scoreGain += lakeScore;
  }

  if (targetLakes.length === 0) {
    terrainRemoved += dryScorch(player, center);
  }

  player.stats.waterEvaporated = roundWater(player.stats.waterEvaporated + evaporated);
  return {
    evaporated,
    primedEvaporated,
    harvestedLakes,
    scoreGain,
    largestHarvest,
    terrainRemoved,
    focusCell: focusWeight > MIN_WATER_THRESHOLD
      ? { x: focusX / focusWeight, y: focusY / focusWeight }
      : null,
  };
}

export function applyIcePiece(board: BoardState, center: Vec2): void {
  forRadius(center, 1, (position) => {
    if (!isInBounds(board, position.x, position.y)) {
      return;
    }
    const cell = getCell(board, position.x, position.y);
    if (cell.water > MIN_WATER_THRESHOLD) {
      cell.frozenTicks = Math.max(cell.frozenTicks, 16);
    }
  });
}

export function growTerrainCells(board: BoardState, cells: Vec2[]): Vec2[] {
  const occupied = new Set(cells.map((cell) => `${cell.x},${cell.y}`));
  const centroid = cells.reduce(
    (result, cell) => ({
      x: result.x + cell.x,
      y: result.y + cell.y,
    }),
    { x: 0, y: 0 },
  );
  centroid.x /= cells.length;
  centroid.y /= cells.length;

  const candidates = cells
    .flatMap((cell) => getNeighbors(cell))
    .filter((cell) => isInBounds(board, cell.x, cell.y) && !occupied.has(`${cell.x},${cell.y}`))
    .sort((left, right) => (
      (Math.abs(left.x - centroid.x) + Math.abs(left.y - centroid.y))
      - (Math.abs(right.x - centroid.x) + Math.abs(right.y - centroid.y))
    ));

  const extraCell = candidates[0];
  return extraCell ? [...cells, extraCell] : cells;
}
