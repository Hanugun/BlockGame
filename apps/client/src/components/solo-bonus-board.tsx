import { getSoloBonusReward, SOLO_BONUS_LINES, type MatchState } from '../lib/core.js';
import styles from './solo-bonus-board.module.css';

interface SoloBonusBoardProps {
  match: MatchState;
}

export function SoloBonusBoard({ match }: SoloBonusBoardProps) {
  const board = match.soloBonusBoard;
  if (!board) {
    return null;
  }

  const markedCells = board.cells.filter(Boolean).length;
  const activeBonuses = board.activeBonuses.map((bonus) => ({
    ...bonus,
    label: getSoloBonusReward(bonus.kind).label,
  }));
  const lastBonus = board.lastTriggeredBonus ? getSoloBonusReward(board.lastTriggeredBonus).label : 'None';
  const rowRewards = SOLO_BONUS_LINES.filter((line) => line.id.startsWith('row-'))
    .map((line, index) => `Row ${index + 1}: ${getSoloBonusReward(line.rewardKind).label}`);
  const columnRewards = SOLO_BONUS_LINES.filter((line) => line.id.startsWith('col-'))
    .map((line, index) => `Column ${index + 1}: ${getSoloBonusReward(line.rewardKind).label}`);

  return (
    <section className={styles.shell}>
      <div className={styles.heading}>
        <div>
          <p>Solo Bingo</p>
          <h4>4x4 Bonus Card</h4>
        </div>
        <span>{markedCells}/16</span>
      </div>
      <div className={styles.grid}>
        {board.cells.map((claimed, index) => (
          <div
            key={index}
            className={`${styles.cell} ${claimed ? styles.claimed : ''} ${board.lastClaimedIndex === index ? styles.active : ''}`}
          >
            {claimed ? 'O' : ''}
          </div>
        ))}
      </div>
      <div className={styles.meta}>
        <span>{board.linesScored} bingo lines</span>
        <span>Last bonus: {lastBonus}</span>
      </div>
      <div className={styles.activeList}>
        {activeBonuses.length === 0 ? (
          <div className={styles.pill}>No active bonus</div>
        ) : (
          activeBonuses.map((bonus) => (
            <div key={bonus.kind} className={styles.pill}>
              <strong>{bonus.label}</strong>
              <span>{(bonus.remainingTicks / 10).toFixed(0)}s</span>
            </div>
          ))
        )}
      </div>
      <div className={styles.legend}>
        <strong>Bingo Mapping</strong>
        <ul>
          {rowRewards.map((reward) => (
            <li key={reward}>{reward}</li>
          ))}
          {columnRewards.map((reward) => (
            <li key={reward}>{reward}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
