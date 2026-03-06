import {
  DRAIN_MAX,
  EARTHQUAKE_THRESHOLD,
  SAFE_TERRAIN_HEIGHT,
  SOLO_BOARD_HEIGHT,
  SOLO_BOARD_WIDTH,
} from '../constants.js';

export interface SoloV2Config {
  board: {
    width: number;
    height: number;
  };
  terrain: {
    safeHeight: number;
    quakeThreshold: number;
  };
  drain: {
    maxValue: number;
    biggerDrainMaxMultiplier: number;
    autoDecay: boolean;
  };
  progression: {
    waterUnlockPiecesPlaced: number;
    fireUnlockPiecesPlaced: number;
    bombUnlockPiecesPlaced: number;
  };
  bonus: {
    lakeMateMinDepth: number;
    lakeMateMinVolume: number;
    rainbowMinPrimedWater: number;
    rainbowScoreMultiplierBonus: number;
  };
  story: {
    bossAttackCheckpoints: number[];
  };
}

export const SOLO_V2_CONFIG: SoloV2Config = {
  board: {
    width: SOLO_BOARD_WIDTH,
    height: SOLO_BOARD_HEIGHT,
  },
  terrain: {
    safeHeight: SAFE_TERRAIN_HEIGHT,
    quakeThreshold: EARTHQUAKE_THRESHOLD,
  },
  drain: {
    maxValue: DRAIN_MAX,
    biggerDrainMaxMultiplier: 1.25,
    autoDecay: false,
  },
  progression: {
    waterUnlockPiecesPlaced: 9,
    fireUnlockPiecesPlaced: 17,
    bombUnlockPiecesPlaced: 25,
  },
  bonus: {
    lakeMateMinDepth: 2,
    lakeMateMinVolume: 6,
    rainbowMinPrimedWater: 10,
    rainbowScoreMultiplierBonus: 0.6,
  },
  story: {
    bossAttackCheckpoints: [0.35, 0.62, 0.84],
  },
};
