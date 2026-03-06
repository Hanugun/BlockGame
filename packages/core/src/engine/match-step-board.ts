export {
  applyBombPiece,
  applyFirePiece,
  applyIcePiece,
  applyTerrainPiece,
  applyWaterPiece,
  growTerrainCells,
  type FireResolution,
  type TerrainResolution,
} from './match-step-piece-effects.js';
export {
  collectComponent,
  collectLakeComponents,
  componentKey,
  evaluateLakes,
  type LakeComponentInfo,
} from './match-step-lakes.js';
export {
  addTerrainStress,
  applyAttack,
  relieveDrain,
  relieveTerrainStress,
  runWaterSimulation,
  sampleCells,
  triggerEarthquake,
  updateBoardMetrics,
} from './match-step-water-systems.js';
