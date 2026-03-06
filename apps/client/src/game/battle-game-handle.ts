import type { SceneModel } from './scenes/battle-scene-types.js';

export interface BattleSceneController {
  setModel: (model: SceneModel) => void;
}

export interface BattleGameRuntime {
  destroy: (removeCanvas?: boolean, noReturn?: boolean) => void;
}

export interface BattleGameHandle {
  game: BattleGameRuntime;
  scene: BattleSceneController;
}
