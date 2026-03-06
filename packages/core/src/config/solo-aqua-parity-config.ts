export interface SoloAquaParityConfig {
  controlGrid: {
    width: number;
    height: number;
  };
  simulationGrid: {
    width: number;
    height: number;
  };
  cellScale: number;
  referenceProfile: 'aqua_aqua_ps2';
  rendererProfile: 'three_aqua';
}

export const SOLO_AQUA_PARITY_CONFIG: SoloAquaParityConfig = {
  controlGrid: {
    width: 6,
    height: 6,
  },
  simulationGrid: {
    width: 18,
    height: 18,
  },
  cellScale: 3,
  referenceProfile: 'aqua_aqua_ps2',
  rendererProfile: 'three_aqua',
};
