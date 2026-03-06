import { getPieceDefinition, type MatchState, type PieceKind } from '../../lib/core.js';
import { formatTime, phaseLabel } from '../../screens/game-screen-helpers.js';
import styles from './core-strip.module.css';

interface CoreStripProps {
  match: MatchState;
  primary: MatchState['players'][number];
  rival: MatchState['players'][number];
  roomCode: string | null;
  connectionLabel: string;
}

function levelClass(value: number): string {
  if (value <= 25) {
    return styles.danger ?? '';
  }
  if (value <= 50) {
    return styles.warn ?? '';
  }
  return styles.ok ?? '';
}

function drainClass(value: number): string {
  if (value >= 75) {
    return styles.danger ?? '';
  }
  if (value >= 50) {
    return styles.warn ?? '';
  }
  return styles.ok ?? '';
}

function pieceLabel(kind: PieceKind | null): string {
  if (!kind) {
    return 'None';
  }
  const definition = getPieceDefinition(kind);
  if (definition.family === 'terrain') {
    return definition.terrainMode === 'lower' ? 'Downer' : 'Upper';
  }
  switch (kind) {
    case 'water':
      return 'Water';
    case 'fire':
      return 'Fireball';
    case 'bomb':
      return 'Bomb';
    case 'ice':
      return 'Ice';
    default:
      return definition.displayName;
  }
}

export function CoreStrip({
  match,
  primary,
  rival,
  roomCode,
  connectionLabel,
}: CoreStripProps) {
  const drainPercent = Math.max(0, Math.min(100, (primary.drainLevel / Math.max(1, primary.drainMax)) * 100));

  return (
    <header className={styles.strip}>
      <article className={styles.block}>
        <span>Your Stability</span>
        <strong className={levelClass(primary.stability)}>{primary.stability}</strong>
      </article>

      <article className={styles.block}>
        <span>Rival Stability</span>
        <strong className={levelClass(rival.stability)}>{rival.stability}</strong>
      </article>

      <article className={styles.block}>
        <span>Drain Tube</span>
        <strong className={drainClass(drainPercent)}>{Math.round(drainPercent)}%</strong>
        <div className={styles.meter} aria-hidden>
          <div className={`${styles.meterFill} ${drainClass(drainPercent)}`} style={{ width: `${drainPercent}%` }} />
        </div>
      </article>

      <article className={styles.block}>
        <span>Score</span>
        <strong>{primary.score}</strong>
      </article>

      <article className={styles.block}>
        <span>Phase</span>
        <strong>{phaseLabel(match.mode, match.phase)}</strong>
      </article>

      <article className={styles.block}>
        <span>Time</span>
        <strong>{formatTime(match.remainingTicks)}</strong>
      </article>

      <article className={styles.block}>
        <span>Status</span>
        <strong>{roomCode ?? connectionLabel}</strong>
      </article>

      <article className={styles.block}>
        <span>Current Piece</span>
        <strong>{pieceLabel(primary.activePiece?.kind ?? null)}</strong>
      </article>
    </header>
  );
}
