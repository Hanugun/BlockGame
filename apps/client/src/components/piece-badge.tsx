import { getPieceDefinition, type PieceKind } from '../lib/core.js';
import styles from './piece-badge.module.css';

export function PieceBadge({ piece, compact = false }: { piece: PieceKind; compact?: boolean }) {
  const definition = getPieceDefinition(piece);
  const flavorClass = definition.family === 'terrain'
    ? definition.terrainMode === 'lower'
      ? styles.downer
      : styles.upper
    : styles.special;
  const rootClass = compact
    ? `${styles.badge} ${styles.compact} ${flavorClass}`
    : `${styles.badge} ${flavorClass}`;
  const spritePath = `/assets/pieces/${piece}.svg`;

  return (
    <div className={rootClass} title={definition.displayName}>
      <div className={styles.preview}>
        <img src={spritePath} alt="" />
      </div>
      <div>
        <strong>{definition.displayName}</strong>
        <small>
          {definition.family === 'terrain'
            ? definition.terrainMode === 'lower' ? 'Downer' : 'Upper'
            : 'Special'}
        </small>
      </div>
    </div>
  );
}
