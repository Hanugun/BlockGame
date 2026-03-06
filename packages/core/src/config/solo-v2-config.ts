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
    terrainReductionUnlockPiecesPlaced: number;
    bombUnlockPiecesPlaced: number;
    rainUnlockScore: number;
    mineUnlockScore: number;
    iceUnlockScore: number;
  };
  hazards: {
    randomTerrainDamageEnabled: boolean;
    bossAttacksEnabled: boolean;
  };
  bonus: {
    lakeMateMinDepth: number;
    lakeMateMinVolume: number;
    rainbowMinPrimedWater: number;
    rainbowScoreMultiplierBonus: number;
  };
  story: {
    bossAttackScoreThresholds: number[];
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
    waterUnlockPiecesPlaced: 5,
    fireUnlockPiecesPlaced: 8,
    terrainReductionUnlockPiecesPlaced: 12,
    bombUnlockPiecesPlaced: 18,
    rainUnlockScore: 180,
    mineUnlockScore: 320,
    iceUnlockScore: 520,
  },
  hazards: {
    randomTerrainDamageEnabled: false,
    bossAttacksEnabled: false,
  },
  bonus: {
    lakeMateMinDepth: 2,
    lakeMateMinVolume: 6,
    rainbowMinPrimedWater: 10,
    rainbowScoreMultiplierBonus: 0.6,
  },
  story: {
    bossAttackScoreThresholds: [420, 860, 1_360],
  },
};
