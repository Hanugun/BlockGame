import type { MatchState, PlayerSlot } from '../lib/core.js';
import styles from './versus-board.module.css';

interface VersusBoardProps {
  match: MatchState;
  localSlot: PlayerSlot;
}

export function VersusBoard({ match, localSlot }: VersusBoardProps) {
  const board = match.versusBoard;
  if (!board) {
    return null;
  }

  return (
    <section className={styles.shell}>
      <div className={styles.heading}>
        <div>
          <p>VS Puzzle</p>
          <h4>Shared 3x3 Board</h4>
        </div>
        <span>{board.linesScored} lines</span>
      </div>
      <div className={styles.grid}>
        {board.cells.map((cell, index) => {
          const label = cell === null ? '' : cell === localSlot ? 'O' : 'X';
          return (
            <div
              key={index}
              className={`${styles.cell} ${board.lastClaimedIndex === index ? styles.active : ''} ${cell === localSlot ? styles.local : cell === null ? '' : styles.rival}`}
            >
              {label}
            </div>
          );
        })}
      </div>
    </section>
  );
}
