import {
  LAKE_CAPTURE_VOLUME,
  MATCH_DURATION_TICKS,
  PIECE_LOCK_TICKS,
  SOLO_PIECE_LOCK_TICKS_CALM,
  SOLO_PIECE_LOCK_TICKS_SURGE,
  SOLO_PIECE_LOCK_TICKS_TEMPEST,
  PIECE_QUEUE_LENGTH,
  SPECIAL_CADENCE,
  STARTING_STABILITY,
  SOLO_STORM_STABILITY,
  VERSUS_BOARD_HEIGHT,
  VERSUS_BOARD_WIDTH,
} from '../constants.js';
import { SOLO_AQUA_PARITY_CONFIG } from '../config/solo-aqua-parity-config.js';
import { SOLO_V2_CONFIG } from '../config/solo-v2-config.js';
import { getSpecialBag, getTerrainBag } from '../rules/pieces.js';
import type {
  ActivePiece,
  CreateMatchOptions,
  MatchPhase,
  MatchState,
  MatchMode,
  PieceKind,
  PlayerRole,
  PlayerSlot,
  PlayerState,
  ReferenceMode,
  SoloVariant,
} from '../types.js';
import { createBoard } from '../utils/board.js';
import { deriveSeed, nextRandom, randomItem, type RandomState } from '../utils/rng.js';
import { getStormInterval } from './match-step-shared.js';

export function getPieceLockTicks(mode: MatchMode, phase: MatchPhase): number {
  if (mode !== 'solo') {
    return PIECE_LOCK_TICKS;
  }
  switch (phase) {
    case 'calm':
      return SOLO_PIECE_LOCK_TICKS_CALM;
    case 'surge':
      return SOLO_PIECE_LOCK_TICKS_SURGE;
    case 'tempest':
      return SOLO_PIECE_LOCK_TICKS_TEMPEST;
    default:
      phase satisfies never;
      return SOLO_PIECE_LOCK_TICKS_CALM;
  }
}

function createActivePiece(kind: PieceKind, lockTicks: number, boardWidth: number, boardHeight: number): ActivePiece {
  const centerAnchor = {
    x: Math.max(0, Math.floor((boardWidth - 2) / 2)),
    y: Math.max(0, Math.floor((boardHeight - 2) / 2)),
  };
  return {
    id: crypto.randomUUID(),
    kind,
    rotation: 0,
    anchor: centerAnchor,
    ticksRemaining: lockTicks,
  };
}

function isSpecialPiece(kind: PieceKind): boolean {
  return kind === 'water' || kind === 'bomb' || kind === 'fire';
}

function isDownerPiece(kind: PieceKind): boolean {
  return kind === 'trench' || kind === 'pit';
}

function storedBoardWater(player: PlayerState): number {
  return player.board.cells.reduce((sum, cell) => sum + cell.water, 0);
}

function buildSoloTerrainBag(player: PlayerState): PieceKind[] {
  if (player.piecesPlaced < SOLO_V2_CONFIG.progression.fireUnlockPiecesPlaced) {
    return ['ridge', 'corner', 'corner', 'square', 'square', 'tee', 'tee'];
  }
  if (player.primedLakes > 0 || player.primedWater >= LAKE_CAPTURE_VOLUME) {
    return ['ridge', 'corner', 'square', 'tee'];
  }
  return ['ridge', 'corner', 'corner', 'square', 'tee', 'tee'];
}

function buildSoloActiveBag(player: PlayerState): PieceKind[] {
  const placedPieces = player.piecesPlaced;
  const waterUnlocked = placedPieces >= SOLO_V2_CONFIG.progression.waterUnlockPiecesPlaced;
  const fireUnlocked = placedPieces >= SOLO_V2_CONFIG.progression.fireUnlockPiecesPlaced;
  const terrainReductionUnlocked = placedPieces >= SOLO_V2_CONFIG.progression.terrainReductionUnlockPiecesPlaced;
  const bombUnlocked = placedPieces >= SOLO_V2_CONFIG.progression.bombUnlockPiecesPlaced;
  const boardWater = storedBoardWater(player);
  const fireWindow = player.primedLakes > 0 || player.primedWater >= LAKE_CAPTURE_VOLUME || boardWater >= 4;
  const activeBag: PieceKind[] = [...buildSoloTerrainBag(player)];

  if (waterUnlocked) {
    if (fireWindow) {
      activeBag.push('water');
    } else if (boardWater > 0.6) {
      activeBag.push('water', 'water');
    } else {
      activeBag.push('water', 'water', 'water');
    }
  }
  if (fireUnlocked) {
    if (fireWindow) {
      activeBag.push('fire', 'fire', 'fire');
    } else if (boardWater > 0.6) {
      activeBag.push('fire', 'fire');
    } else {
      activeBag.push('fire');
    }
  }
  if (terrainReductionUnlocked) {
    activeBag.push('trench', 'pit');
  }
  if (bombUnlocked) {
    activeBag.push('bomb');
  }

  return activeBag;
}

function drawSoloPiece(player: PlayerState): PieceKind {
  const openingBag: PieceKind[] = ['ridge', 'corner', 'square', 'tee'];
  const placedPieces = player.piecesPlaced;
  const randomState: RandomState = { seed: player.rng };

  let candidate: PieceKind = 'ridge';
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const bag = placedPieces < 4 ? openingBag : buildSoloActiveBag(player);
    candidate = bag[Math.floor(nextRandom(randomState) * bag.length)] ?? 'ridge';
    const recent = player.recentPieces.slice(-5);
    const projectedSpecials = recent.filter((piece) => isSpecialPiece(piece)).length + (isSpecialPiece(candidate) ? 1 : 0);
    const projectedDowners = recent.filter((piece) => isDownerPiece(piece)).length + (isDownerPiece(candidate) ? 1 : 0);
    const recentSame = recent[recent.length - 1] === candidate;

    if (projectedSpecials > 2) {
      continue;
    }
    if (projectedDowners > 2) {
      continue;
    }
    if ((candidate === 'bomb' || candidate === 'fire') && recentSame) {
      continue;
    }
    break;
  }

  player.rng = randomState.seed;
  return candidate;
}

function nextQueuePiece(player: PlayerState, mode: MatchMode): PieceKind {
  if (mode === 'solo') {
    const next = drawSoloPiece(player);
    player.recentPieces = [...player.recentPieces.slice(-9), next];
    return next;
  }

  const randomState: RandomState = { seed: player.rng };
  const cadenceIndex = player.piecesPlaced + player.queue.length + Number(player.activePiece !== null) + 1;
  const bag = cadenceIndex % SPECIAL_CADENCE === 0 ? getSpecialBag() : getTerrainBag();
  const next = randomItem(bag, randomState);
  player.rng = randomState.seed;
  player.recentPieces = [...player.recentPieces.slice(-9), next];
  return next;
}

export function refillQueue(player: PlayerState, mode: MatchMode): void {
  while (player.queue.length < PIECE_QUEUE_LENGTH) {
    player.queue.push(nextQueuePiece(player, mode));
  }
}

export function spawnNextPiece(player: PlayerState, mode: MatchMode, phase: MatchPhase): void {
  if (player.activePiece || player.role !== 'pilot') {
    return;
  }

  refillQueue(player, mode);
  const next = player.queue.shift();
  if (!next) {
    return;
  }
  player.activePiece = createActivePiece(next, getPieceLockTicks(mode, phase), player.controlGrid.width, player.controlGrid.height);
}

function createPlayerState(
  slot: PlayerSlot,
  name: string,
  seed: number,
  role: PlayerRole,
  mode: MatchMode,
  controlBoardWidth: number,
  controlBoardHeight: number,
  boardWidth: number,
  boardHeight: number,
): PlayerState {
  const drainMax = SOLO_V2_CONFIG.drain.maxValue;
  const player: PlayerState = {
    slot,
    role,
    name,
    controlGrid: {
      width: controlBoardWidth,
      height: controlBoardHeight,
    },
    cellScale: mode === 'solo' ? SOLO_AQUA_PARITY_CONFIG.cellScale : 1,
    board: createBoard(boardWidth, boardHeight),
    activePiece: null,
    queue: [],
    score: 0,
    stability: role === 'storm' ? SOLO_STORM_STABILITY : STARTING_STABILITY,
    drainLevel: role === 'storm' ? Math.max(0, drainMax - SOLO_STORM_STABILITY) : 0,
    drainMax,
    attackMeter: 0,
    combo: 0,
    comboTicksRemaining: 0,
    capturedLakes: 0,
    largestLake: 0,
    storedWater: 0,
    primedWater: 0,
    primedLakes: 0,
    lakeMates: 0,
    rainbowActive: false,
    scoreMultiplier: 1,
    boardRisk: 0,
    terrainStress: 0,
    quakeMeter: 0,
    piecesPlaced: 0,
    spawnCooldownTicks: 0,
    overflowLastTick: 0,
    rng: deriveSeed(seed, slot + 1),
    pendingAttacks: [],
    lakeTrackers: {},
    primedCells: [],
    recentPieces: [],
    stats: {
      terrainPlaced: 0,
      lakesPrimed: 0,
      lakesCaptured: 0,
      comboBursts: 0,
      attacksSent: 0,
      stableTicks: 0,
      stormTicks: 0,
      waterEvaporated: 0,
      specialsUsed: {
        water: 0,
        bomb: 0,
        fire: 0,
        ice: 0,
      },
    },
  };

  if (role === 'pilot') {
    refillQueue(player, mode);
    spawnNextPiece(player, mode, 'calm');
  }
  return player;
}

export function createMatch(options: CreateMatchOptions = {}): MatchState {
  const seed = options.seed ?? Date.now();
  const mode: MatchMode = options.mode ?? 'versus';
  const soloVariant: SoloVariant | null = mode === 'solo' ? (options.soloVariant ?? 'story') : null;
  const referenceMode: ReferenceMode = options.referenceMode ?? 'strict';
  const playerNames = options.playerNames ?? (mode === 'solo' ? ['Pilot', 'Solo Puzzle'] : ['Player 1', 'Player 2']);
  const status = options.status ?? 'active';
  const roles: [PlayerRole, PlayerRole] = mode === 'solo' ? ['pilot', 'storm'] : ['pilot', 'pilot'];
  const controlBoardWidth = mode === 'solo' ? SOLO_AQUA_PARITY_CONFIG.controlGrid.width : VERSUS_BOARD_WIDTH;
  const controlBoardHeight = mode === 'solo' ? SOLO_AQUA_PARITY_CONFIG.controlGrid.height : VERSUS_BOARD_HEIGHT;
  const boardWidth = mode === 'solo' ? SOLO_AQUA_PARITY_CONFIG.simulationGrid.width : VERSUS_BOARD_WIDTH;
  const boardHeight = mode === 'solo' ? SOLO_AQUA_PARITY_CONFIG.simulationGrid.height : VERSUS_BOARD_HEIGHT;

  return {
    seed,
    referenceProfile: SOLO_AQUA_PARITY_CONFIG.referenceProfile,
    rendererProfile: SOLO_AQUA_PARITY_CONFIG.rendererProfile,
    referenceMode,
    tick: 0,
    remainingTicks: MATCH_DURATION_TICKS,
    status,
    mode,
    soloVariant,
    phase: 'calm',
    stormLevel: 0,
    stormTicksUntilPulse: getStormInterval('calm', mode),
    soloBossAttackIndex: 0,
    winner: null,
    players: [
      createPlayerState(0, playerNames[0], seed, roles[0], mode, controlBoardWidth, controlBoardHeight, boardWidth, boardHeight),
      createPlayerState(1, playerNames[1], seed, roles[1], mode, controlBoardWidth, controlBoardHeight, boardWidth, boardHeight),
    ],
    versusBoard: mode === 'versus'
      ? {
          cells: Array.from({ length: 9 }, () => null),
          linesScored: 0,
          lastClaimedIndex: null,
        }
      : null,
    soloBonusBoard: mode === 'solo'
      ? {
          cells: Array.from({ length: 16 }, () => false),
          linesScored: 0,
          claimedLines: [],
          lastClaimedIndex: null,
          lastTriggeredBonus: null,
          activeBonuses: [],
        }
      : null,
    events: [],
  };
}
