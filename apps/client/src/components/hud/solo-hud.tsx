import { getPieceCells, type MatchState } from '../../lib/core.js';
import { phaseLabel } from '../../screens/game-screen-helpers.js';
import styles from './solo-hud.module.css';

interface SoloHudProps {
  match: MatchState;
  primary: MatchState['players'][number];
  onOpenOverlay: () => void;
}

function controlGridClassName(
  x: number,
  y: number,
  activeCells: Set<string>,
  primedCells: Set<string>,
): string {
  const base = styles.gridCell ?? '';
  const key = `${x}:${y}`;
  if (activeCells.has(key)) {
    return `${base} ${styles.gridCellActive ?? ''}`.trim();
  }
  if (primedCells.has(key)) {
    return `${base} ${styles.gridCellPrimed ?? ''}`.trim();
  }
  return base;
}

export function SoloHud({ match, primary, onOpenOverlay }: SoloHudProps) {
  const drainPercent = Math.max(0, Math.min(100, (primary.drainLevel / Math.max(1, primary.drainMax)) * 100));
  const activeMacroCells = new Set<string>();
  const primedMacroCells = new Set<string>();

  if (primary.activePiece) {
    for (const cell of getPieceCells(primary.activePiece.kind, primary.activePiece.rotation)) {
      activeMacroCells.add(`${primary.activePiece.anchor.x + cell.x}:${primary.activePiece.anchor.y + cell.y}`);
    }
  }

  for (const cell of primary.primedCells) {
    const macroX = Math.floor(cell.x / primary.cellScale);
    const macroY = Math.floor(cell.y / primary.cellScale);
    primedMacroCells.add(`${macroX}:${macroY}`);
  }

  return (
    <section className={styles.root} aria-label="Solo HUD">
      <div className={styles.leftCluster}>
        <div className={styles.scoreBlock}>
          <p className={styles.scoreValue}>{primary.score.toLocaleString()}</p>
          <div className={styles.statLine}>
            <span className={styles.label}>Terrain</span>
            <strong>{primary.piecesPlaced}</strong>
          </div>
          <div className={styles.statLine}>
            <span className={styles.label}>Water</span>
            <strong>{primary.capturedLakes}</strong>
          </div>
        </div>

        <div className={styles.miniGridWrap}>
          <div className={styles.miniGrid}>
            {Array.from({ length: primary.controlGrid.height }, (_, y) => (
              Array.from({ length: primary.controlGrid.width }, (_, x) => (
                <div
                  key={`${x}:${y}`}
                  className={controlGridClassName(x, y, activeMacroCells, primedMacroCells)}
                />
              ))
            ))}
          </div>
        </div>
      </div>

      <div className={styles.topRight}>
        <button type="button" className={styles.menuButton} onClick={onOpenOverlay}>
          Menu
        </button>
        <div className={styles.phasePill}>{phaseLabel(match.mode, match.phase)}</div>
      </div>

      <aside className={styles.reservoir}>
        <p className={styles.kicker}>RESERVOIR</p>
        <div className={styles.tube} aria-label={`Reservoir ${Math.round(drainPercent)} percent`}>
          <div className={styles.tubeFill} style={{ height: `${drainPercent}%` }} />
        </div>
        <strong className={styles.percent}>{Math.round(drainPercent)}%</strong>
        <p className={styles.leak}>Leak +{primary.overflowLastTick.toFixed(2)}/tick</p>
      </aside>
    </section>
  );
}
