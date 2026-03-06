import { useMemo, useState } from 'react';
import type { MatchState, PlayerSlot } from '../../lib/core.js';
import { controlsLabel } from '../../screens/game-screen-helpers.js';
import type { MenuMode } from '../../ui-types.js';
import { PieceBadge } from '../piece-badge.js';
import { SoloBonusBoard } from '../solo-bonus-board.js';
import { VersusBoard } from '../versus-board.js';
import styles from './detail-drawer.module.css';

type PanelId = 'overview' | 'queue' | 'objectives' | 'feed' | 'tips' | 'controls';

interface DetailDrawerProps {
  mode: MenuMode;
  match: MatchState;
  primary: MatchState['players'][number];
  localSlot: PlayerSlot | null;
  showTips: boolean;
  tacticalTips: string[];
  onOpenOverlay: () => void;
}

interface PanelOption {
  id: PanelId;
  label: string;
}

const PANEL_OPTIONS: PanelOption[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'queue', label: 'Queue' },
  { id: 'objectives', label: 'Objectives' },
  { id: 'feed', label: 'Feed' },
  { id: 'tips', label: 'Tips' },
  { id: 'controls', label: 'Controls' },
];

export function DetailDrawer({
  mode,
  match,
  primary,
  localSlot,
  showTips,
  tacticalTips,
  onOpenOverlay,
}: DetailDrawerProps) {
  const [activePanel, setActivePanel] = useState<PanelId>('queue');
  const primaryQueue = (primary.activePiece ? [primary.activePiece.kind, ...primary.queue] : primary.queue).slice(0, 4);
  const recentEvents = [...match.events].slice(-6).reverse();
  const visiblePanels = PANEL_OPTIONS.filter((panel) => panel.id !== 'tips' || showTips);

  const panelBody = useMemo(() => {
    switch (activePanel) {
      case 'overview':
        return (
          <div className={styles.grid}>
            <div>
              <span>Reservoir</span>
              <strong>{primary.storedWater.toFixed(1)}</strong>
            </div>
            <div>
              <span>Primed</span>
              <strong>{primary.primedWater.toFixed(1)}</strong>
            </div>
            <div>
              <span>Captured</span>
              <strong>{primary.capturedLakes}</strong>
            </div>
            <div>
              <span>Largest Lake</span>
              <strong>{primary.largestLake.toFixed(1)}</strong>
            </div>
          </div>
        );
      case 'queue':
        return (
          <div className={styles.queue}>
            {primary.activePiece ? <PieceBadge piece={primary.activePiece.kind} /> : <p className={styles.muted}>No active piece.</p>}
            <div className={styles.queueRow}>
              {primaryQueue.slice(primary.activePiece ? 1 : 0).map((piece, index) => (
                <PieceBadge key={`${piece}-${index}`} piece={piece} compact />
              ))}
            </div>
          </div>
        );
      case 'objectives':
        return match.mode === 'solo'
          ? <SoloBonusBoard match={match} />
          : <VersusBoard match={match} localSlot={localSlot ?? primary.slot} />;
      case 'feed':
        return (
          <div className={styles.feed}>
            {recentEvents.length === 0 ? (
              <p className={styles.muted}>No recent events.</p>
            ) : (
              recentEvents.map((event) => (
                <div key={event.id} className={styles.feedItem}>
                  <span>{match.players[event.slot].name}</span>
                  <strong>{event.message}</strong>
                </div>
              ))
            )}
          </div>
        );
      case 'tips':
        return (
          <div className={styles.feed}>
            {tacticalTips.map((tip) => (
              <p key={tip} className={styles.tip}>{tip}</p>
            ))}
          </div>
        );
      case 'controls':
        return (
          <p className={styles.tip}>{controlsLabel(mode)}</p>
        );
      default:
        return null;
    }
  }, [activePanel, localSlot, match, mode, primary, primaryQueue, recentEvents, tacticalTips]);

  return (
    <section className={styles.drawer}>
      <div className={styles.tabs} role="tablist" aria-label="HUD details">
        {visiblePanels.map((panel) => (
          <button
            key={panel.id}
            type="button"
            role="tab"
            aria-selected={activePanel === panel.id}
            className={`btn btn--ghost ${activePanel === panel.id ? styles.activeTab : ''}`}
            onClick={() => setActivePanel(panel.id)}
          >
            {panel.label}
          </button>
        ))}
        <button type="button" className="btn btn--secondary" onClick={onOpenOverlay}>
          Menu
        </button>
      </div>
      <div className={styles.panel}>{panelBody}</div>
    </section>
  );
}
