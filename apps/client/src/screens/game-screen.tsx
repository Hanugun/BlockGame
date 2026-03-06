import { useEffect, useRef } from 'react';
import type { MatchState } from '../lib/core.js';
import { BattleCanvas } from '../components/battle-canvas.js';
import { SoloHud } from '../components/hud/solo-hud.js';
import styles from './game-screen.module.css';

interface GameScreenProps {
  match: MatchState | null;
  reducedMotion: boolean;
  highContrast: boolean;
  onOpenOverlay: () => void;
  onExit: () => void;
}

export function GameScreen({
  match,
  reducedMotion,
  highContrast,
  onOpenOverlay,
  onExit,
}: GameScreenProps) {
  const viewportRef = useRef<HTMLElement | null>(null);

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
          <p>Solo board is booting and waiting for synchronized state.</p>
          <button type="button" className="btn btn--ghost" onClick={onExit}>
            Return To Menu
          </button>
        </div>
      </section>
    );
  }

  const primary = match.players[0];

  return (
    <section ref={viewportRef} className={styles.viewport} tabIndex={-1}>
      <div className={styles.stageFrame}>
        <BattleCanvas
          className={styles.stageCanvas}
          match={match}
          reducedMotion={reducedMotion}
          highContrast={highContrast}
        />

        <div className={styles.overlaySolo}>
          <SoloHud
            match={match}
            primary={primary}
            onOpenOverlay={onOpenOverlay}
          />
        </div>
      </div>
    </section>
  );
}
