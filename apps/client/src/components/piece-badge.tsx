import type { CSSProperties } from 'react';
import { getPieceCells, getPieceDefinition, type PieceKind } from '../lib/core.js';
import styles from './piece-badge.module.css';

function getPreviewCells(piece: PieceKind): Set<string> {
  const cells = getPieceCells(piece, 0);
  const minX = Math.min(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  const maxX = Math.max(...cells.map((cell) => cell.x));
  const maxY = Math.max(...cells.map((cell) => cell.y));
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const offsetX = Math.floor((4 - width) / 2) - minX;
  const offsetY = Math.floor((4 - height) / 2) - minY;

  return new Set(cells.map((cell) => `${cell.x + offsetX}:${cell.y + offsetY}`));
}

function getSpecialToken(piece: PieceKind): string {
  switch (piece) {
    case 'water':
      return 'W';
    case 'bomb':
      return 'B';
    case 'fire':
      return 'F';
    case 'ice':
      return 'I';
    default:
      return '';
  }
}

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
  const previewCells = getPreviewCells(piece);
  const previewStyle = { '--piece-color': definition.color } as CSSProperties;
  const specialToken = definition.family === 'special' ? getSpecialToken(piece) : '';

  return (
    <div className={rootClass} title={definition.displayName}>
      <div className={styles.preview} style={previewStyle}>
        <div className={styles.matrix} aria-hidden="true">
          {Array.from({ length: 16 }, (_, index) => {
            const x = index % 4;
            const y = Math.floor(index / 4);
            const key = `${x}:${y}`;
            const active = previewCells.has(key);
            const className = active
              ? `${styles.matrixCell} ${styles.matrixCellActive} ${definition.family === 'special' ? styles.matrixCellSpecial : ''}`
              : styles.matrixCell;

            return <span key={key} className={className} />;
          })}
        </div>
        {specialToken ? <span className={styles.specialToken}>{specialToken}</span> : null}
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
