export type MatchStatus = 'waiting' | 'active' | 'complete';
export type MatchPhase = 'calm' | 'surge' | 'tempest';
export type MatchMode = 'solo' | 'versus';
export type SoloVariant = 'story' | 'endless';
export type ReferenceMode = 'strict' | 'relaxed';
export type PlayerSlot = 0 | 1;
export type Rotation = 0 | 1 | 2 | 3;
export type TerrainPieceKind = 'ridge' | 'corner' | 'square' | 'tee' | 'zig' | 'trench' | 'pit';
export type SpecialPieceKind = 'water' | 'bomb' | 'fire' | 'ice';
export type PieceKind = TerrainPieceKind | SpecialPieceKind;
export type PieceFamily = 'terrain' | 'special';
export type AttackKind = 'water_attack' | 'bomb_attack' | 'fireball_attack' | 'ice_attack' | 'upper_attack' | 'downer_attack';
export type AttackSource = 'versus_board';
export type LockReason = 'timer' | 'drop';
export type PlayerRole = 'pilot' | 'storm';
export type SoloBonusEffectKind =
  | 'double_rainbow'
  | 'aurora'
  | 'power_lake'
  | 'cloud'
  | 'bigger_drain'
  | 'bigger_earth'
  | 'time_stop'
  | 'slow';
export type ObjectiveFocus = 'water' | 'bomb' | 'fire' | 'ice';

export interface Vec2 {
  x: number;
  y: number;
}

export interface CellState {
  height: number;
  water: number;
  frozenTicks: number;
  mineTicks: number;
  holeDepth: number;
}

export interface BoardState {
  width: number;
  height: number;
  cells: CellState[];
}

export interface ControlGridState {
  width: number;
  height: number;
}

export interface PieceDefinition {
  kind: PieceKind;
  family: PieceFamily;
  displayName: string;
  cells: Vec2[];
  color: string;
  terrainMode?: 'raise' | 'lower';
  iconKey?: string;
}

export interface ActivePiece {
  id: string;
  kind: PieceKind;
  rotation: Rotation;
  anchor: Vec2;
  ticksRemaining: number;
}

export interface LakeTracker {
  primed: boolean;
  stableTicks: number;
  ageTicks: number;
  volumeBucket: number;
}

export interface PendingAttack {
  id: string;
  kind: AttackKind;
  source: AttackSource;
  power: number;
  etaTicks: number;
}

export interface VersusBoard {
  cells: Array<PlayerSlot | null>;
  linesScored: number;
  lastClaimedIndex: number | null;
}

export interface ActiveSoloBonus {
  kind: SoloBonusEffectKind;
  remainingTicks: number;
}

export interface SoloBonusBoard {
  cells: boolean[];
  linesScored: number;
  claimedLines: string[];
  lastClaimedIndex: number | null;
  lastTriggeredBonus: SoloBonusEffectKind | null;
  activeBonuses: ActiveSoloBonus[];
}

export interface PlayerStats {
  terrainPlaced: number;
  lakesPrimed: number;
  lakesCaptured: number;
  comboBursts: number;
  attacksSent: number;
  stableTicks: number;
  stormTicks: number;
  waterEvaporated: number;
  specialsUsed: Record<SpecialPieceKind, number>;
}

export interface MatchEvent {
  id: string;
  tick: number;
  slot: PlayerSlot;
  type:
    | 'piece_locked'
    | 'lake_stabilized'
    | 'lake_captured'
    | 'versus_claim'
    | 'bonus_claim'
    | 'combo_extended'
    | 'objective_completed'
    | 'bonus_triggered'
    | 'bingo_scored'
    | 'overflow'
    | 'attack_sent'
    | 'attack_received'
    | 'attack_impact'
    | 'earthquake'
    | 'storm_pulse'
    | 'phase_changed'
    | 'system_unlock'
    | 'boss_attack'
    | 'winner_declared';
  message: string;
  amount?: number;
  attackKind?: AttackKind;
  pieceKind?: PieceKind;
  phase?: MatchPhase;
  focus?: ObjectiveFocus;
  anchor?: Vec2;
}

export interface PlayerState {
  slot: PlayerSlot;
  role: PlayerRole;
  name: string;
  controlGrid: ControlGridState;
  cellScale: number;
  board: BoardState;
  activePiece: ActivePiece | null;
  queue: PieceKind[];
  score: number;
  stability: number;
  drainLevel: number;
  drainMax: number;
  attackMeter: number;
  combo: number;
  comboTicksRemaining: number;
  capturedLakes: number;
  largestLake: number;
  storedWater: number;
  primedWater: number;
  primedLakes: number;
  lakeMates: number;
  rainbowActive: boolean;
  scoreMultiplier: number;
  boardRisk: number;
  terrainStress: number;
  quakeMeter: number;
  piecesPlaced: number;
  spawnCooldownTicks: number;
  overflowLastTick: number;
  rng: number;
  pendingAttacks: PendingAttack[];
  lakeTrackers: Record<string, LakeTracker>;
  primedCells: Vec2[];
  recentPieces: PieceKind[];
  stats: PlayerStats;
}

export interface MatchState {
  seed: number;
  referenceProfile: 'aqua_aqua_ps2';
  rendererProfile: 'three_aqua';
  referenceMode: ReferenceMode;
  tick: number;
  remainingTicks: number;
  status: MatchStatus;
  mode: MatchMode;
  soloVariant: SoloVariant | null;
  phase: MatchPhase;
  stormLevel: number;
  stormTicksUntilPulse: number;
  soloBossAttackIndex: number;
  winner: PlayerSlot | null;
  players: [PlayerState, PlayerState];
  versusBoard: VersusBoard | null;
  soloBonusBoard: SoloBonusBoard | null;
  events: MatchEvent[];
}

export interface CreateMatchOptions {
  playerNames?: [string, string];
  mode?: MatchMode;
  soloVariant?: SoloVariant;
  referenceMode?: ReferenceMode;
  seed?: number;
  status?: MatchStatus;
}

export interface CommandContext {
  slot: PlayerSlot;
}

export interface MoveCommand extends CommandContext {
  type: 'move';
  dx: -1 | 0 | 1;
  dy: -1 | 0 | 1;
}

export interface RotateCommand extends CommandContext {
  type: 'rotate';
  delta: -1 | 1;
}

export interface DropCommand extends CommandContext {
  type: 'drop';
}

export type PlayerCommand = MoveCommand | RotateCommand | DropCommand;
