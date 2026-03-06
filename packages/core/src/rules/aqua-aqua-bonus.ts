import { SOLO_BONUS_DURATION_TICKS } from '../constants.js';
import type { SoloBonusEffectKind } from '../types.js';

export interface SoloBonusReward {
  kind: SoloBonusEffectKind;
  label: string;
  description: string;
  magnitude: number;
  durationTicks: number;
}

export interface SoloBonusLine {
  id: string;
  cells: [number, number, number, number];
  rewardKind: SoloBonusEffectKind;
}

export const SOLO_BONUS_LINES: SoloBonusLine[] = [
  { id: 'row-0', cells: [0, 1, 2, 3], rewardKind: 'double_rainbow' },
  { id: 'row-1', cells: [4, 5, 6, 7], rewardKind: 'aurora' },
  { id: 'row-2', cells: [8, 9, 10, 11], rewardKind: 'power_lake' },
  { id: 'row-3', cells: [12, 13, 14, 15], rewardKind: 'cloud' },
  { id: 'col-0', cells: [0, 4, 8, 12], rewardKind: 'bigger_drain' },
  { id: 'col-1', cells: [1, 5, 9, 13], rewardKind: 'bigger_earth' },
  { id: 'col-2', cells: [2, 6, 10, 14], rewardKind: 'time_stop' },
  { id: 'col-3', cells: [3, 7, 11, 15], rewardKind: 'slow' },
];

export const SOLO_BONUS_REWARDS: SoloBonusReward[] = [
  {
    kind: 'double_rainbow',
    label: 'Double Rainbow',
    description: 'Adds a strong score boost to every banked lake.',
    magnitude: 0.2,
    durationTicks: SOLO_BONUS_DURATION_TICKS,
  },
  {
    kind: 'aurora',
    label: 'Aurora',
    description: 'Raises the value of each cash-out while the effect is live.',
    magnitude: 0.25,
    durationTicks: SOLO_BONUS_DURATION_TICKS,
  },
  {
    kind: 'power_lake',
    label: 'Power Lake',
    description: 'Makes sealed lakes bank for larger totals.',
    magnitude: 0.3,
    durationTicks: SOLO_BONUS_DURATION_TICKS,
  },
  {
    kind: 'cloud',
    label: 'Cloud',
    description: 'Pushes solo scoring harder during stable sequences.',
    magnitude: 0.35,
    durationTicks: SOLO_BONUS_DURATION_TICKS,
  },
  {
    kind: 'bigger_drain',
    label: 'Bigger Drain',
    description: 'Increases leak-meter capacity for a limited time.',
    magnitude: 0.25,
    durationTicks: SOLO_BONUS_DURATION_TICKS,
  },
  {
    kind: 'bigger_earth',
    label: 'Bigger Earth',
    description: 'Terrain pieces grow by one extra cell while active.',
    magnitude: 1,
    durationTicks: SOLO_BONUS_DURATION_TICKS,
  },
  {
    kind: 'time_stop',
    label: 'Time Stop',
    description: 'Pauses the solo clock for a short burst.',
    magnitude: 1,
    durationTicks: SOLO_BONUS_DURATION_TICKS,
  },
  {
    kind: 'slow',
    label: 'Slow',
    description: 'Pieces hover longer before they lock.',
    magnitude: 1,
    durationTicks: SOLO_BONUS_DURATION_TICKS,
  },
];

const rewardByKind = new Map(SOLO_BONUS_REWARDS.map((reward) => [reward.kind, reward]));

export function getSoloBonusReward(kind: SoloBonusEffectKind): SoloBonusReward {
  return rewardByKind.get(kind)!;
}
