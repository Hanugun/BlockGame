import { useEffect } from 'react';
import type { PlayerCommand } from '../lib/core.js';
import type { AppScreen, MenuMode } from '../ui-types.js';

interface UseGameInputOptions {
  screen: AppScreen;
  selectedMode: MenuMode;
  automationEnabled: boolean;
  showGameMenu: boolean;
  showSettings: boolean;
  resultOpen: boolean;
  toggleGameMenu: () => void;
  sendLocalCommand: (command: PlayerCommand) => void;
  sendOnlineCommand: (command: { type: 'move'; dx: -1 | 0 | 1; dy: -1 | 0 | 1 } | { type: 'rotate'; delta: -1 | 1 } | { type: 'drop' }) => void;
}

function isOnlineMode(mode: MenuMode): boolean {
  return mode === 'online_host' || mode === 'online_join';
}

function toOnlineCommand(command: PlayerCommand): { type: 'move'; dx: -1 | 0 | 1; dy: -1 | 0 | 1 } | { type: 'rotate'; delta: -1 | 1 } | { type: 'drop' } {
  switch (command.type) {
    case 'move':
      return { type: 'move', dx: command.dx, dy: command.dy };
    case 'rotate':
      return { type: 'rotate', delta: command.delta };
    case 'drop':
      return { type: 'drop' };
    default:
      command satisfies never;
      return { type: 'drop' };
  }
}

function dispatchCommand(
  mode: MenuMode,
  command: PlayerCommand,
  sendLocalCommand: (command: PlayerCommand) => void,
  sendOnlineCommand: (command: { type: 'move'; dx: -1 | 0 | 1; dy: -1 | 0 | 1 } | { type: 'rotate'; delta: -1 | 1 } | { type: 'drop' }) => void,
): void {
  if (isOnlineMode(mode)) {
    sendOnlineCommand(toOnlineCommand(command));
    return;
  }
  sendLocalCommand(command);
}

function fireMappedCommand(
  mode: MenuMode,
  code: string,
  repeat: boolean,
  automationEnabled: boolean,
  sendLocalCommand: (command: PlayerCommand) => void,
  sendOnlineCommand: (command: { type: 'move'; dx: -1 | 0 | 1; dy: -1 | 0 | 1 } | { type: 'rotate'; delta: -1 | 1 } | { type: 'drop' }) => void,
): boolean {
  if (mode === 'local') {
    switch (code) {
      case 'KeyW':
        dispatchCommand(mode, { type: 'move', slot: 0, dx: 0, dy: -1 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'KeyS':
        dispatchCommand(mode, { type: 'move', slot: 0, dx: 0, dy: 1 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'KeyA':
        dispatchCommand(mode, { type: 'move', slot: 0, dx: -1, dy: 0 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'KeyD':
        dispatchCommand(mode, { type: 'move', slot: 0, dx: 1, dy: 0 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'KeyQ':
        if (repeat) {
          return true;
        }
        dispatchCommand(mode, { type: 'rotate', slot: 0, delta: -1 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'KeyE':
        if (repeat) {
          return true;
        }
        dispatchCommand(mode, { type: 'rotate', slot: 0, delta: 1 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'Space':
        if (repeat) {
          return true;
        }
        dispatchCommand(mode, { type: 'drop', slot: 0 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'ArrowUp':
        dispatchCommand(mode, { type: 'move', slot: 1, dx: 0, dy: -1 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'ArrowDown':
        dispatchCommand(mode, { type: 'move', slot: 1, dx: 0, dy: 1 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'ArrowLeft':
        dispatchCommand(mode, { type: 'move', slot: 1, dx: -1, dy: 0 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'ArrowRight':
        dispatchCommand(mode, { type: 'move', slot: 1, dx: 1, dy: 0 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'Comma':
        if (repeat) {
          return true;
        }
        dispatchCommand(mode, { type: 'rotate', slot: 1, delta: -1 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'Period':
        if (repeat) {
          return true;
        }
        dispatchCommand(mode, { type: 'rotate', slot: 1, delta: 1 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'Enter':
        if (repeat) {
          return true;
        }
        dispatchCommand(mode, { type: 'drop', slot: 1 }, sendLocalCommand, sendOnlineCommand);
        return true;
      default:
        return false;
    }
  }

  if (automationEnabled) {
    switch (code) {
      case 'ArrowUp':
        dispatchCommand(mode, { type: 'move', slot: 0, dx: 0, dy: -1 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'ArrowDown':
        dispatchCommand(mode, { type: 'move', slot: 0, dx: 0, dy: 1 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'ArrowLeft':
        dispatchCommand(mode, { type: 'move', slot: 0, dx: -1, dy: 0 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'ArrowRight':
        dispatchCommand(mode, { type: 'move', slot: 0, dx: 1, dy: 0 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'KeyA':
        if (repeat) {
          return true;
        }
        dispatchCommand(mode, { type: 'rotate', slot: 0, delta: -1 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'KeyB':
        if (repeat) {
          return true;
        }
        dispatchCommand(mode, { type: 'rotate', slot: 0, delta: 1 }, sendLocalCommand, sendOnlineCommand);
        return true;
      case 'Enter':
        if (repeat) {
          return true;
        }
        dispatchCommand(mode, { type: 'drop', slot: 0 }, sendLocalCommand, sendOnlineCommand);
        return true;
      default:
        break;
    }
  }

  switch (code) {
    case 'KeyW':
      dispatchCommand(mode, { type: 'move', slot: 0, dx: 0, dy: -1 }, sendLocalCommand, sendOnlineCommand);
      return true;
    case 'KeyS':
      dispatchCommand(mode, { type: 'move', slot: 0, dx: 0, dy: 1 }, sendLocalCommand, sendOnlineCommand);
      return true;
    case 'KeyA':
      dispatchCommand(mode, { type: 'move', slot: 0, dx: -1, dy: 0 }, sendLocalCommand, sendOnlineCommand);
      return true;
    case 'KeyD':
      dispatchCommand(mode, { type: 'move', slot: 0, dx: 1, dy: 0 }, sendLocalCommand, sendOnlineCommand);
      return true;
    case 'KeyQ':
      if (repeat) {
        return true;
      }
      dispatchCommand(mode, { type: 'rotate', slot: 0, delta: -1 }, sendLocalCommand, sendOnlineCommand);
      return true;
    case 'KeyE':
      if (repeat) {
        return true;
      }
      dispatchCommand(mode, { type: 'rotate', slot: 0, delta: 1 }, sendLocalCommand, sendOnlineCommand);
      return true;
    case 'Space':
      if (repeat) {
        return true;
      }
      dispatchCommand(mode, { type: 'drop', slot: 0 }, sendLocalCommand, sendOnlineCommand);
      return true;
    default:
      return false;
  }
}

export function useGameInput({
  screen,
  selectedMode,
  automationEnabled,
  showGameMenu,
  showSettings,
  resultOpen,
  toggleGameMenu,
  sendLocalCommand,
  sendOnlineCommand,
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
      if (!fireMappedCommand(selectedMode, code, event.repeat, automationEnabled, sendLocalCommand, sendOnlineCommand)) {
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
        fireMappedCommand(selectedMode, code, false, automationEnabled, sendLocalCommand, sendOnlineCommand);
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
  }, [automationEnabled, resultOpen, screen, selectedMode, sendLocalCommand, sendOnlineCommand, showGameMenu, showSettings]);
}
