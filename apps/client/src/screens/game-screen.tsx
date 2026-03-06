import { useEffect, useRef } from 'react';
import type { MatchState, PlayerCommand, PlayerSlot } from '../lib/core.js';
import { BattleCanvas } from '../components/battle-canvas.js';
import { CoreStrip } from '../components/hud/core-strip.js';
import { DetailDrawer } from '../components/hud/detail-drawer.js';
import { SoloHud } from '../components/hud/solo-hud.js';
import type { MenuMode } from '../ui-types.js';
import styles from './game-screen.module.css';

interface GameScreenProps {
  mode: MenuMode;
  match: MatchState | null;
  localSlot: PlayerSlot | null;
  connectionLabel: string;
  roomCode: string | null;
  reducedMotion: boolean;
  highContrast: boolean;
  showTips: boolean;
  tacticalTips: string[];
  sendCommand: (command: PlayerCommand) => void;
  onOpenOverlay: () => void;
  onExit: () => void;
}

export function GameScreen({
  mode,
  match,
  localSlot,
  connectionLabel,
  roomCode,
  reducedMotion,
  highContrast,
  showTips,
  tacticalTips,
  sendCommand,
  onOpenOverlay,
  onExit,
}: GameScreenProps) {
  const viewportRef = useRef<HTMLElement | null>(null);
  const canvasMode = mode === 'solo' ? 'solo' : mode === 'local' ? 'local' : 'online';

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.focus();
    if (document.activeElement instanceof HTMLElement && document.activeElement !== viewport) {
      document.activeElement.blur();
    }
  }, []);

  if (!match) {
    return (
      <section ref={viewportRef} className={styles.waiting} tabIndex={-1}>
        <div className={styles.waitingCard}>
          <p className={styles.kicker}>Stand By</p>
          <h1>Preparing Match</h1>
          <p>{roomCode ? `Room ${roomCode} is waiting for synchronized state.` : `${connectionLabel}. Waiting for room state...`}</p>
          <button type="button" className="btn btn--ghost" onClick={onExit}>
            Return To Menu
          </button>
        </div>
      </section>
    );
  }

  const primary = match.mode === 'solo'
    ? match.players[0]
    : localSlot === 1
      ? match.players[1]
      : match.players[0];
  const rival = match.mode === 'solo'
    ? match.players[1]
    : primary.slot === 0
      ? match.players[1]
      : match.players[0];

  return (
    <section ref={viewportRef} className={styles.viewport} tabIndex={-1}>
      <div className={styles.stageFrame}>
        <BattleCanvas
          className={styles.stageCanvas}
          localSlot={match.mode === 'solo' ? 0 : localSlot}
          match={match}
          mode={canvasMode}
          reducedMotion={reducedMotion}
          highContrast={highContrast}
          sendCommand={sendCommand}
        />

        <div className={match.mode === 'solo' ? styles.overlaySolo : styles.overlay}>
          {match.mode === 'solo' ? (
            <SoloHud
              match={match}
              primary={primary}
              onOpenOverlay={onOpenOverlay}
            />
          ) : (
            <>
              <CoreStrip
                match={match}
                primary={primary}
                rival={rival}
                roomCode={roomCode}
                connectionLabel={connectionLabel}
              />
              <DetailDrawer
                mode={mode}
                match={match}
                primary={primary}
                localSlot={localSlot}
                showTips={showTips}
                tacticalTips={tacticalTips}
                onOpenOverlay={onOpenOverlay}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
