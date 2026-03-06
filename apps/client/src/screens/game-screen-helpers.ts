import type { MatchState } from '../lib/core.js';

export function phaseLabel(phase: MatchState['phase']): string {
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
