import type { MatchState } from '../lib/core.js';
import type { MenuMode } from '../ui-types.js';

export function formatTime(ticks: number): string {
  const totalSeconds = Math.ceil(ticks / 10);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function phaseLabel(mode: MatchState['mode'], phase: MatchState['phase']): string {
  if (mode === 'solo') {
    switch (phase) {
      case 'calm':
        return 'Opening Basin';
      case 'surge':
        return 'Deep Water';
      case 'tempest':
        return 'Final Basin';
      default:
        phase satisfies never;
        return 'Opening Basin';
    }
  }

  switch (phase) {
    case 'calm':
      return 'VS Opening';
    case 'surge':
      return 'Pressure Line';
    case 'tempest':
      return 'Sudden Flood';
    default:
      phase satisfies never;
      return 'VS Opening';
  }
}

export function controlsLabel(mode: MenuMode): string {
  switch (mode) {
    case 'solo':
      return 'Move `WASD`  Rotate `Q/E`  Drop `Space` for speed bonus points  Fireball banks connected lakes and marks the 4x4 card. Drain is cumulative leak pressure; rain fronts, ice, and mines are stage hazards.';
    case 'local':
      return 'P1 `WASD` `Q/E` `Space`  |  P2 arrows `,/.` `Enter`  |  Fireball claims the shared 3x3 VS board';
    case 'online_host':
    case 'online_join':
      return 'Move `WASD`  Rotate `Q/E`  Drop `Space`  Fireball claims the shared 3x3 VS board';
    default:
      mode satisfies never;
      return '';
  }
}

export function statusAccent(value: number, max: number): { width: string } {
  return {
    width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`,
  };
}
