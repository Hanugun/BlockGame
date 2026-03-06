import { useEffect } from 'react';
import type { PlayerCommand } from '../lib/core.js';
import type { AppScreen } from '../ui-types.js';

interface UseGameInputOptions {
  screen: AppScreen;
  automationEnabled: boolean;
  showGameMenu: boolean;
  showSettings: boolean;
  resultOpen: boolean;
  toggleGameMenu: () => void;
  sendCommand: (command: PlayerCommand) => void;
}

function fireMappedCommand(
  code: string,
  repeat: boolean,
  automationEnabled: boolean,
  sendCommand: (command: PlayerCommand) => void,
): boolean {
  if (automationEnabled) {
    switch (code) {
      case 'ArrowUp':
        sendCommand({ type: 'move', slot: 0, dx: 0, dy: -1 });
        return true;
      case 'ArrowDown':
        sendCommand({ type: 'move', slot: 0, dx: 0, dy: 1 });
        return true;
      case 'ArrowLeft':
        sendCommand({ type: 'move', slot: 0, dx: -1, dy: 0 });
        return true;
      case 'ArrowRight':
        sendCommand({ type: 'move', slot: 0, dx: 1, dy: 0 });
        return true;
      case 'KeyA':
        if (repeat) {
          return true;
        }
        sendCommand({ type: 'rotate', slot: 0, delta: -1 });
        return true;
      case 'KeyB':
        if (repeat) {
          return true;
        }
        sendCommand({ type: 'rotate', slot: 0, delta: 1 });
        return true;
      case 'Enter':
        if (repeat) {
          return true;
        }
        sendCommand({ type: 'drop', slot: 0 });
        return true;
      default:
        break;
    }
  }

  switch (code) {
    case 'KeyW':
      sendCommand({ type: 'move', slot: 0, dx: 0, dy: -1 });
      return true;
    case 'KeyS':
      sendCommand({ type: 'move', slot: 0, dx: 0, dy: 1 });
      return true;
    case 'KeyA':
      sendCommand({ type: 'move', slot: 0, dx: -1, dy: 0 });
      return true;
    case 'KeyD':
      sendCommand({ type: 'move', slot: 0, dx: 1, dy: 0 });
      return true;
    case 'KeyQ':
      if (repeat) {
        return true;
      }
      sendCommand({ type: 'rotate', slot: 0, delta: -1 });
      return true;
    case 'KeyE':
      if (repeat) {
        return true;
      }
      sendCommand({ type: 'rotate', slot: 0, delta: 1 });
      return true;
    case 'Space':
      if (repeat) {
        return true;
      }
      sendCommand({ type: 'drop', slot: 0 });
      return true;
    default:
      return false;
  }
}

export function useGameInput({
  screen,
  automationEnabled,
  showGameMenu,
  showSettings,
  resultOpen,
  toggleGameMenu,
  sendCommand,
}: UseGameInputOptions): void {
  useEffect(() => {
    if (screen !== 'game') {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyF' && !event.repeat) {
        event.preventDefault();
        if (!document.fullscreenElement) {
          const root = document.documentElement;
          if (typeof root.requestFullscreen === 'function') {
            void root.requestFullscreen().catch(() => {});
          }
        } else if (typeof document.exitFullscreen === 'function') {
          void document.exitFullscreen().catch(() => {});
        }
        return;
      }

      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        void document.exitFullscreen().catch(() => {});
        return;
      }
      if (resultOpen) {
        return;
      }
      toggleGameMenu();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [resultOpen, screen, toggleGameMenu]);

  useEffect(() => {
    if (screen !== 'game' || showGameMenu || showSettings || resultOpen) {
      return undefined;
    }

    const pressedMoves = new Set<string>();
    const moveKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    let lastHandledSignature = '';

    const handleKeyDown = (event: KeyboardEvent) => {
      const code = event.code || event.key;
      const signature = `${event.type}:${code}:${event.timeStamp}`;
      if (signature === lastHandledSignature) {
        return;
      }
      lastHandledSignature = signature;

      if (moveKeys.has(code) && event.repeat) {
        event.preventDefault();
        return;
      }
      if (!fireMappedCommand(code, event.repeat, automationEnabled, sendCommand)) {
        return;
      }
      event.preventDefault();
      if (moveKeys.has(code)) {
        if (event.repeat) {
          return;
        }
        pressedMoves.add(code);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedMoves.delete(event.code || event.key);
      lastHandledSignature = '';
    };

    const handleBlur = () => {
      pressedMoves.clear();
      lastHandledSignature = '';
    };

    const repeatTimer = window.setInterval(() => {
      for (const code of pressedMoves) {
        fireMappedCommand(code, false, automationEnabled, sendCommand);
      }
    }, 95);

    const listenerOptions = { capture: true } as const;
    window.addEventListener('keydown', handleKeyDown, listenerOptions);
    window.addEventListener('keyup', handleKeyUp, listenerOptions);
    document.addEventListener('keydown', handleKeyDown, listenerOptions);
    document.addEventListener('keyup', handleKeyUp, listenerOptions);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.clearInterval(repeatTimer);
      window.removeEventListener('keydown', handleKeyDown, listenerOptions);
      window.removeEventListener('keyup', handleKeyUp, listenerOptions);
      document.removeEventListener('keydown', handleKeyDown, listenerOptions);
      document.removeEventListener('keyup', handleKeyUp, listenerOptions);
      window.removeEventListener('blur', handleBlur);
    };
  }, [automationEnabled, resultOpen, screen, sendCommand, showGameMenu, showSettings]);
}
