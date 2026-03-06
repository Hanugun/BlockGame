import type { MatchState } from '../lib/core.js';
import type { MenuMode } from '../ui-types.js';

export function connectionLabel(mode: MenuMode, match: MatchState | null, connectionState: string): string {
  if (mode === 'solo') {
    return 'Solo Match';
  }
  if (mode === 'online_host' || mode === 'online_join') {
    if (match?.status === 'active') {
      return 'Online Match';
    }
    switch (connectionState) {
      case 'connecting':
        return 'Connecting';
      case 'lobby':
        return 'In Lobby';
      case 'error':
        return 'Connection Error';
      default:
        return 'Waiting';
    }
  }
  return 'Local Match';
}
