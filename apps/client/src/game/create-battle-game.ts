import type { BattleGameHandle } from './battle-game-handle.js';

export type { BattleGameHandle } from './battle-game-handle.js';

export async function createBattleGame(parent: HTMLElement): Promise<BattleGameHandle> {
  // Solo parity rebuild is currently Three-only.
  const { createBattleGameThree } = await import('./create-battle-game-three.js');
  return createBattleGameThree(parent);
}
