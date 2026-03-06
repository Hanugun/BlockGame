import type { PieceDefinition, PieceKind, Rotation, Vec2 } from '../types.js';

const TERRAIN_PIECES: PieceDefinition[] = [
  {
    kind: 'ridge',
    family: 'terrain',
    displayName: 'Upper Line',
    cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
    color: '#dfad66',
    terrainMode: 'raise',
  },
  {
    kind: 'corner',
    family: 'terrain',
    displayName: 'Upper Corner',
    cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
    color: '#d09b57',
    terrainMode: 'raise',
  },
  {
    kind: 'square',
    family: 'terrain',
    displayName: 'Upper Block',
    cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    color: '#c8934d',
    terrainMode: 'raise',
  },
  {
    kind: 'tee',
    family: 'terrain',
    displayName: 'Upper Tee',
    cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }],
    color: '#c48745',
    terrainMode: 'raise',
  },
  {
    kind: 'zig',
    family: 'terrain',
    displayName: 'Upper Zig',
    cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    color: '#b87d3f',
    terrainMode: 'raise',
  },
  {
    kind: 'trench',
    family: 'terrain',
    displayName: 'Downer Line',
    cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
    color: '#4fcb62',
    terrainMode: 'lower',
  },
  {
    kind: 'pit',
    family: 'terrain',
    displayName: 'Downer Block',
    cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    color: '#35b74f',
    terrainMode: 'lower',
  },
];

const SPECIAL_PIECES: PieceDefinition[] = [
  {
    kind: 'water',
    family: 'special',
    displayName: 'Water',
    cells: [{ x: 0, y: 0 }],
    color: '#49c7ff',
    iconKey: 'water',
  },
  {
    kind: 'bomb',
    family: 'special',
    displayName: 'Bomb',
    cells: [{ x: 0, y: 0 }],
    color: '#ff9b61',
    iconKey: 'bomb',
  },
  {
    kind: 'fire',
    family: 'special',
    displayName: 'Fireball',
    cells: [{ x: 0, y: 0 }],
    color: '#ffc95a',
    iconKey: 'fire',
  },
  {
    kind: 'ice',
    family: 'special',
    displayName: 'Ice',
    cells: [{ x: 0, y: 0 }],
    color: '#9de7ff',
    iconKey: 'ice',
  },
];

export const PIECE_DEFINITIONS = [...TERRAIN_PIECES, ...SPECIAL_PIECES] as const;

const byKind = new Map(PIECE_DEFINITIONS.map((definition) => [definition.kind, definition]));

export function getPieceDefinition(kind: PieceKind): PieceDefinition {
  return byKind.get(kind)!;
}

export function getPieceCells(kind: PieceKind, rotation: Rotation): Vec2[] {
  const definition = getPieceDefinition(kind);
  if (definition.family === 'special') {
    return definition.cells;
  }

  let cells = definition.cells.map((cell) => ({ ...cell }));
  for (let step = 0; step < rotation; step += 1) {
    cells = cells.map((cell) => ({ x: -cell.y, y: cell.x }));
    const minX = Math.min(...cells.map((cell) => cell.x));
    const minY = Math.min(...cells.map((cell) => cell.y));
    cells = cells.map((cell) => ({ x: cell.x - minX, y: cell.y - minY }));
  }

  return cells;
}

export function getTerrainBag(): PieceKind[] {
  return ['ridge', 'ridge', 'corner', 'square', 'tee', 'zig', 'trench', 'pit'];
}

export function getSpecialBag(): PieceKind[] {
  return ['water', 'water', 'bomb', 'fire', 'ice'];
}
