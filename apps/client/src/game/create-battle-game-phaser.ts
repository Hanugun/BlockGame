import Phaser from 'phaser';
import type { BattleGameHandle, BattleGameRuntime } from './battle-game-handle.js';
import { BattleScene } from './scenes/battle-scene.js';

export function createBattleGamePhaser(parent: HTMLElement): BattleGameHandle {
  const scene = new BattleScene();
  const automationEnabled = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('automation') === '1';
  const width = Math.max(parent.clientWidth, window.innerWidth, 1280);
  const height = Math.max(parent.clientHeight, window.innerHeight, 720);
  parent.tabIndex = 0;
  parent.style.touchAction = 'none';
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#08151d',
    width,
    height,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    render: {
      antialias: true,
      pixelArt: false,
      preserveDrawingBuffer: automationEnabled,
    },
    scene,
  });

  const resize = () => {
    game.scale.resize(Math.max(parent.clientWidth, window.innerWidth), Math.max(parent.clientHeight, window.innerHeight));
  };
  const focusParent = () => {
    parent.focus();
  };

  window.addEventListener('resize', resize);
  parent.addEventListener('pointerdown', focusParent);

  const originalDestroy = game.destroy.bind(game);
  game.destroy = ((removeCanvas?: boolean, noReturn?: boolean) => {
    window.removeEventListener('resize', resize);
    parent.removeEventListener('pointerdown', focusParent);
    return originalDestroy(removeCanvas ?? false, noReturn ?? false);
  }) as typeof game.destroy;

  const runtime: BattleGameRuntime = {
    destroy(removeCanvas = false, noReturn = false) {
      game.destroy(removeCanvas, noReturn);
    },
  };

  return { game: runtime, scene };
}
