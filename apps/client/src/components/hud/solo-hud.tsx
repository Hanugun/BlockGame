import type { CSSProperties } from 'react';
import { expandPieceToSimulation, type MatchState } from '../../lib/core.js';
import { phaseLabel } from '../../screens/game-screen-helpers.js';
import styles from './solo-hud.module.css';

interface SoloHudProps {
  match: MatchState;
  primary: MatchState['players'][number];
  onOpenOverlay: () => void;
}

function simulationGridClassName(
  key: string,
  activeCells: Set<string>,
  terrainCells: Set<string>,
  primedCells: Set<string>,
): string {
  const base = styles.gridCell ?? '';
  if (activeCells.has(key)) {
    return `${base} ${styles.gridCellActive ?? ''}`.trim();
  }
  if (primedCells.has(key)) {
    return `${base} ${styles.gridCellPrimed ?? ''}`.trim();
  }
  if (terrainCells.has(key)) {
    return `${base} ${styles.gridCellTerrain ?? ''}`.trim();
  }
  return base;
}

function simulationGridStyle(
  x: number,
  y: number,
  width: number,
  height: number,
  cellScale: number,
): CSSProperties {
  return {
    borderLeftWidth: x % cellScale === 0 ? '2px' : '1px',
    borderTopWidth: y % cellScale === 0 ? '2px' : '1px',
    borderRightWidth: x === width - 1 ? '2px' : '1px',
    borderBottomWidth: y === height - 1 ? '2px' : '1px',
  };
}

export function SoloHud({ match, primary, onOpenOverlay }: SoloHudProps) {
  const drainPercent = Math.max(0, Math.min(100, (primary.drainLevel / Math.max(1, primary.drainMax)) * 100));
  const activeSimulationCells = new Set<string>();
  const terrainSimulationCells = new Set<string>();
  const primedSimulationCells = new Set<string>();

  if (primary.activePiece) {
    for (const cell of expandPieceToSimulation(
      primary.board,
      primary.activePiece.kind,
      primary.activePiece.rotation,
      primary.activePiece.anchor,
      primary.cellScale,
    )) {
      activeSimulationCells.add(`${cell.x}:${cell.y}`);
    }
  }

  for (let index = 0; index < primary.board.cells.length; index += 1) {
    const cell = primary.board.cells[index]!;
    if (cell.height <= 0) {
      continue;
    }
    const x = index % primary.board.width;
    const y = Math.floor(index / primary.board.width);
    terrainSimulationCells.add(`${x}:${y}`);
  }

  for (const cell of primary.primedCells) {
    primedSimulationCells.add(`${cell.x}:${cell.y}`);
  }

  return (
    <section className={styles.root} aria-label="Solo HUD">
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

      <div className={styles.miniGridDock}>
        <div className={styles.miniGridWrap}>
          <div
            className={styles.miniGrid}
            style={{ gridTemplateColumns: `repeat(${primary.board.width}, 1fr)` }}
          >
            {Array.from({ length: primary.board.height }, (_, y) => (
              Array.from({ length: primary.board.width }, (_, x) => (
                <div
                  key={`${x}:${y}`}
                  className={simulationGridClassName(
                    `${x}:${y}`,
                    activeSimulationCells,
                    terrainSimulationCells,
                    primedSimulationCells,
                  )}
                  style={simulationGridStyle(x, y, primary.board.width, primary.board.height, primary.cellScale)}
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
        <div className={styles.phasePill}>{phaseLabel(match.phase)}</div>
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
