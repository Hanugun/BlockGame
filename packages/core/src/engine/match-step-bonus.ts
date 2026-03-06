import { LAKE_CAPTURE_VOLUME } from '../constants.js';
import { SOLO_V2_CONFIG } from '../config/solo-v2-config.js';
import { getSoloBonusReward, SOLO_BONUS_LINES } from '../rules/aqua-aqua-bonus.js';
import type {
  AttackKind,
  MatchState,
  PlayerSlot,
  PlayerState,
  SoloBonusBoard,
  SoloBonusEffectKind,
  Vec2,
  VersusBoard,
} from '../types.js';
import { getCell } from '../utils/board.js';
import { nextRandom, type RandomState } from '../utils/rng.js';
import { collectLakeComponents } from './match-step-board.js';
import { attackLabel, createEvent, queueAttack } from './match-step-shared.js';

export function hasSoloBonus(state: MatchState, kind: SoloBonusEffectKind): boolean {
  return state.soloBonusBoard?.activeBonuses.some((bonus) => bonus.kind === kind) ?? false;
}

export function getSoloScoreBonus(state: MatchState): number {
  if (!state.soloBonusBoard) {
    return 0;
  }

  return state.soloBonusBoard.activeBonuses.reduce((sum, bonus) => {
    switch (bonus.kind) {
      case 'double_rainbow':
      case 'aurora':
      case 'power_lake':
      case 'cloud':
        return sum + getSoloBonusReward(bonus.kind).magnitude;
      case 'bigger_drain':
      case 'bigger_earth':
      case 'time_stop':
      case 'slow':
        return sum;
      default:
        bonus.kind satisfies never;
        return sum;
    }
  }, 0);
}

function activateSoloBonus(board: SoloBonusBoard, kind: SoloBonusEffectKind): void {
  const reward = getSoloBonusReward(kind);
  const existing = board.activeBonuses.find((bonus) => bonus.kind === kind);
  if (existing) {
    existing.remainingTicks = reward.durationTicks;
  } else {
    board.activeBonuses.push({
      kind,
      remainingTicks: reward.durationTicks,
    });
  }
  board.lastTriggeredBonus = kind;
}

function clearSoloBonusBoard(board: SoloBonusBoard): void {
  board.cells.fill(false);
  board.claimedLines = [];
  board.lastClaimedIndex = null;
}

export function claimSoloBonusCell(state: MatchState, slot: PlayerSlot, focus: Vec2): void {
  const board = state.soloBonusBoard;
  if (!board) {
    return;
  }

  const basin = state.players[slot].board;
  const column = Math.min(3, Math.max(0, Math.floor((((focus.x + 0.5) / basin.width) * 4))));
  const row = Math.min(3, Math.max(0, Math.floor((((focus.y + 0.5) / basin.height) * 4))));
  const index = (row * 4) + column;
  if (!board.cells[index]) {
    board.cells[index] = true;
    board.lastClaimedIndex = index;
    createEvent(
      state,
      slot,
      'bonus_claim',
      `${state.players[slot].name} marked the solo bonus card.`,
      { amount: index + 1 },
    );
  }

  const freshLines = SOLO_BONUS_LINES.filter((line) => (
    !board.claimedLines.includes(line.id)
    && line.cells.every((cellIndex) => board.cells[cellIndex])
  ));
  if (freshLines.length === 0) {
    return;
  }

  for (const line of freshLines) {
    const rewardKind = line.rewardKind;
    const reward = getSoloBonusReward(rewardKind);
    activateSoloBonus(board, rewardKind);
    board.claimedLines.push(line.id);
    board.linesScored += 1;
    createEvent(
      state,
      slot,
      'bonus_triggered',
      `${state.players[slot].name} hit bingo and activated ${reward.label}.`,
      { amount: Math.round(reward.durationTicks / 10) },
    );
  }

  if (board.cells.every(Boolean)) {
    clearSoloBonusBoard(board);
  }
}

export function tickSoloBonuses(state: MatchState): void {
  const board = state.soloBonusBoard;
  if (!board) {
    return;
  }

  board.activeBonuses = board.activeBonuses.flatMap((bonus) => (
    bonus.remainingTicks > 1
      ? [{ ...bonus, remainingTicks: bonus.remainingTicks - 1 }]
      : []
  ));
}

export function updateSoloBonuses(state: MatchState, player: PlayerState): void {
  const primedComponents = collectLakeComponents(player.board).filter((component) => {
    const tracker = player.lakeTrackers[component.key];
    return component.sealed && component.volume >= LAKE_CAPTURE_VOLUME && tracker?.primed;
  });
  player.lakeMates = primedComponents.filter((component) => {
    const deepestCell = component.cells.reduce((deepest, cell) => (
      Math.max(deepest, getCell(player.board, cell.x, cell.y).water)
    ), 0);
    return deepestCell >= SOLO_V2_CONFIG.bonus.lakeMateMinDepth && component.volume >= SOLO_V2_CONFIG.bonus.lakeMateMinVolume;
  }).length;
  player.rainbowActive = primedComponents.length >= 2 && player.primedWater >= SOLO_V2_CONFIG.bonus.rainbowMinPrimedWater;
  player.scoreMultiplier = 1
    + (player.lakeMates * 0.35)
    + (player.rainbowActive ? SOLO_V2_CONFIG.bonus.rainbowScoreMultiplierBonus : 0)
    + getSoloScoreBonus(state);
}

const VERSUS_LINES: Array<[number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function clearVersusBoard(board: VersusBoard): void {
  board.cells.fill(null);
  board.lastClaimedIndex = null;
}

function randomVersusAttack(randomState: RandomState): AttackKind {
  const attacks: AttackKind[] = [
    'water_attack',
    'bomb_attack',
    'fireball_attack',
    'ice_attack',
    'upper_attack',
    'downer_attack',
  ];
  const index = Math.floor(nextRandom(randomState) * attacks.length);
  return attacks[Math.min(index, attacks.length - 1)]!;
}

export function claimVersusCell(state: MatchState, slot: PlayerSlot, focus: Vec2, harvestPower: number): void {
  const board = state.versusBoard;
  if (!board) {
    return;
  }

  const basin = state.players[slot].board;
  const column = Math.min(2, Math.max(0, Math.floor((((focus.x + 0.5) / basin.width) * 3))));
  const row = Math.min(2, Math.max(0, Math.floor((((focus.y + 0.5) / basin.height) * 3))));
  const index = (row * 3) + column;
  if (board.cells[index] === null) {
    board.cells[index] = slot;
    board.lastClaimedIndex = index;
    createEvent(
      state,
      slot,
      'versus_claim',
      `${state.players[slot].name} marked the VS board.`,
      { amount: index + 1 },
    );
  }

  const lines = VERSUS_LINES.filter(([a, b, c]) => (
    board.cells[a] === slot && board.cells[b] === slot && board.cells[c] === slot
  ));
  if (lines.length === 0) {
    return;
  }

  const randomState: RandomState = { seed: state.players[slot].rng };
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const attack = randomVersusAttack(randomState);
    const power = Math.max(1, Math.min(3, harvestPower + lineIndex));
    queueAttack(state, slot, attack, power, 'versus_board');
    createEvent(
      state,
      slot,
      'bingo_scored',
      `${state.players[slot].name} completed a VS line and launched ${attackLabel(attack)}.`,
      { attackKind: attack, amount: power },
    );
    board.linesScored += 1;
  }
  state.players[slot].rng = randomState.seed;
  clearVersusBoard(board);
}
