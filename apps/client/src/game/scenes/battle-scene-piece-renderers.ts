import Phaser from 'phaser';
import {
  PIECE_LOCK_TICKS,
  getPieceCells,
  getPieceDefinition,
  type MatchState,
  type PieceKind,
} from '../../lib/core.js';
import { clamp01, clampBoardCoordinate, project } from './battle-scene-helpers.js';
import type { BurstEffect, LandingEffect, RenderPoint } from './battle-scene-types.js';

interface DrawActivePieceOptions {
  graphics: Phaser.GameObjects.Graphics;
  origin: RenderPoint;
  previousPlayer: MatchState['players'][number];
  player: MatchState['players'][number];
  tileWidth: number;
  tileHeight: number;
  lift: number;
  eased: number;
  timeWave: number;
  reducedMotion: boolean;
  highContrast: boolean;
}

export function drawActivePiece({
  graphics,
  origin,
  previousPlayer,
  player,
  tileWidth,
  tileHeight,
  lift,
  eased,
  timeWave,
  reducedMotion,
  highContrast,
}: DrawActivePieceOptions): void {
  const currentPiece = player.activePiece;
  if (!currentPiece) {
    return;
  }
  const boardWidth = player.board.width;
  const boardHeight = player.board.height;

  const previousPiece = previousPlayer.activePiece?.id === currentPiece.id ? previousPlayer.activePiece : null;
  const anchor = {
    x: previousPiece ? Phaser.Math.Linear(previousPiece.anchor.x, currentPiece.anchor.x, eased) : currentPiece.anchor.x,
    y: previousPiece ? Phaser.Math.Linear(previousPiece.anchor.y, currentPiece.anchor.y, eased) : currentPiece.anchor.y,
  };
  const ticksRemaining = previousPiece
    ? Phaser.Math.Linear(previousPiece.ticksRemaining, currentPiece.ticksRemaining, eased)
    : currentPiece.ticksRemaining;
  const lockRatio = clamp01(ticksRemaining / Math.max(PIECE_LOCK_TICKS, 1));
  const hoverHeight = reducedMotion
    ? 1.8
    : 1.36 + (lockRatio * 4.2) + (previousPiece ? 0 : (1 - eased) * 5.1);

  const definition = getPieceDefinition(currentPiece.kind);
  const footprint = getPieceCells(currentPiece.kind, currentPiece.rotation);
  const glowColor = Phaser.Display.Color.HexStringToColor(definition.color).color;
  const projectionColor = definition.family === 'terrain'
    ? definition.terrainMode === 'lower'
      ? 0x5fd464
      : 0xffb365
    : currentPiece.kind === 'water'
      ? 0x67d1ff
      : currentPiece.kind === 'fire'
        ? 0xffcb6f
        : currentPiece.kind === 'bomb'
          ? 0xff8e63
          : 0xcff6ff;
  const pulse = reducedMotion ? 0 : (Math.sin(timeWave * 1.5) * 0.16);
  const centroid = footprint.reduce(
    (result, cellPosition) => ({
      x: result.x + cellPosition.x,
      y: result.y + cellPosition.y,
    }),
    { x: 0, y: 0 },
  );
  const focusX = anchor.x + (centroid.x / footprint.length);
  const focusY = anchor.y + (centroid.y / footprint.length);

  for (const cellPosition of footprint) {
    const x = anchor.x + cellPosition.x;
    const y = anchor.y + cellPosition.y;
    if (x < 0 || y < 0 || x >= boardWidth || y >= boardHeight) {
      continue;
    }
    const sampleX = clampBoardCoordinate(x, boardWidth - 1);
    const sampleY = clampBoardCoordinate(y, boardHeight - 1);
    const boardCell = player.board.cells[(sampleY * boardWidth) + sampleX]!;
    const surfaceElevation = boardCell.height + Math.min(0.35, boardCell.water * 0.18);
    const projected = project(origin, x, y, surfaceElevation + 0.08, tileWidth, tileHeight, lift);
    const projectedDiamond = [
      new Phaser.Math.Vector2(projected.x, projected.y - (tileHeight * 0.34)),
      new Phaser.Math.Vector2(projected.x + (tileWidth * 0.34), projected.y),
      new Phaser.Math.Vector2(projected.x, projected.y + (tileHeight * 0.34)),
      new Phaser.Math.Vector2(projected.x - (tileWidth * 0.34), projected.y),
    ];
    graphics.fillStyle(projectionColor, definition.family === 'special' ? 0.16 : 0.2);
    graphics.fillPoints(projectedDiamond, true);
    graphics.lineStyle(2, projectionColor, 0.85);
    graphics.strokePoints([...projectedDiamond, projectedDiamond[0]!], false);

    if (definition.family === 'terrain') {
      graphics.lineStyle(2, projectionColor, 0.88);
      if (definition.terrainMode === 'lower') {
        graphics.strokeLineShape(new Phaser.Geom.Line(projected.x, projected.y - 5, projected.x, projected.y + 4));
        graphics.strokeLineShape(new Phaser.Geom.Line(projected.x - 5, projected.y, projected.x, projected.y + 5));
        graphics.strokeLineShape(new Phaser.Geom.Line(projected.x + 5, projected.y, projected.x, projected.y + 5));
      } else {
        graphics.strokeLineShape(new Phaser.Geom.Line(projected.x, projected.y + 5, projected.x, projected.y - 4));
        graphics.strokeLineShape(new Phaser.Geom.Line(projected.x - 5, projected.y, projected.x, projected.y - 5));
        graphics.strokeLineShape(new Phaser.Geom.Line(projected.x + 5, projected.y, projected.x, projected.y - 5));
      }
    }
  }

  for (const cellPosition of footprint) {
    const x = anchor.x + cellPosition.x;
    const y = anchor.y + cellPosition.y;
    if (x < 0 || y < 0 || x >= boardWidth || y >= boardHeight) {
      continue;
    }

    const sampleX = clampBoardCoordinate(x, boardWidth - 1);
    const sampleY = clampBoardCoordinate(y, boardHeight - 1);
    const boardCell = player.board.cells[(sampleY * boardWidth) + sampleX]!;
    const surfaceElevation = boardCell.height + Math.min(0.45, boardCell.water * 0.2);
    const shadow = project(origin, x, y, surfaceElevation, tileWidth, tileHeight, lift);
    graphics.fillStyle(0x031018, 0.24);
    graphics.fillEllipse(shadow.x, shadow.y + (tileHeight * 0.18), tileWidth * 0.62, tileHeight * 0.46);

    for (let ghost = 2; ghost >= 1; ghost -= 1) {
      const ghostTop = project(origin, x, y, surfaceElevation + hoverHeight + pulse + (ghost * 1.2), tileWidth, tileHeight, lift);
      const ghostAlpha = 0.08 * ghost;
      const ghostDiamond = [
        new Phaser.Math.Vector2(ghostTop.x, ghostTop.y - (tileHeight * 0.36)),
        new Phaser.Math.Vector2(ghostTop.x + (tileWidth * 0.36), ghostTop.y),
        new Phaser.Math.Vector2(ghostTop.x, ghostTop.y + (tileHeight * 0.36)),
        new Phaser.Math.Vector2(ghostTop.x - (tileWidth * 0.36), ghostTop.y),
      ];
      graphics.fillStyle(glowColor, ghostAlpha);
      graphics.fillPoints(ghostDiamond, true);
    }

    const top = project(origin, x, y, surfaceElevation + hoverHeight + pulse, tileWidth, tileHeight, lift);
    const topDiamond = [
      new Phaser.Math.Vector2(top.x, top.y - (tileHeight * 0.44)),
      new Phaser.Math.Vector2(top.x + (tileWidth * 0.44), top.y),
      new Phaser.Math.Vector2(top.x, top.y + (tileHeight * 0.44)),
      new Phaser.Math.Vector2(top.x - (tileWidth * 0.44), top.y),
    ];
    const ghost = [
      new Phaser.Math.Vector2(shadow.x, shadow.y - (tileHeight * 0.34)),
      new Phaser.Math.Vector2(shadow.x + (tileWidth * 0.38), shadow.y),
      new Phaser.Math.Vector2(shadow.x, shadow.y + (tileHeight * 0.34)),
      new Phaser.Math.Vector2(shadow.x - (tileWidth * 0.38), shadow.y),
    ];

    graphics.lineStyle(1, glowColor, 0.22);
    graphics.strokeLineShape(new Phaser.Geom.Line(top.x, top.y, shadow.x, shadow.y));
    graphics.fillStyle(glowColor, definition.family === 'special' ? 0.84 : 0.6);
    graphics.fillPoints(topDiamond, true);
    graphics.lineStyle(2, highContrast ? 0xffffff : glowColor, 0.96);
    graphics.strokePoints([...topDiamond, topDiamond[0]!], false);
    graphics.fillStyle(glowColor, 0.14);
    graphics.fillPoints(ghost, true);
    graphics.lineStyle(1, glowColor, 0.42);
    graphics.strokePoints([...ghost, ghost[0]!], false);
  }

  const marker = project(origin, focusX, focusY, 1.4 + hoverHeight + pulse, tileWidth, tileHeight, lift);
  graphics.lineStyle(2, glowColor, 0.82);
  graphics.strokeEllipse(marker.x, marker.y, tileWidth * 0.72, tileHeight * 0.52);
  graphics.lineStyle(1, glowColor, 0.32);
  graphics.strokeLineShape(new Phaser.Geom.Line(marker.x, marker.y - 24, marker.x, marker.y - 52));
  graphics.fillStyle(glowColor, 0.78);
  graphics.fillTriangle(marker.x, marker.y - 54, marker.x - 7, marker.y - 40, marker.x + 7, marker.y - 40);
  drawPieceGlyph(graphics, currentPiece.kind, marker, glowColor);
}

export function drawPieceGlyph(
  graphics: Phaser.GameObjects.Graphics,
  kind: PieceKind,
  marker: RenderPoint,
  color: number,
): void {
  graphics.lineStyle(2, color, 0.9);
  const definition = getPieceDefinition(kind);
  switch (kind) {
    case 'water':
      graphics.strokeLineShape(new Phaser.Geom.Line(marker.x - 10, marker.y + 1, marker.x - 3, marker.y - 3));
      graphics.strokeLineShape(new Phaser.Geom.Line(marker.x - 2, marker.y + 2, marker.x + 4, marker.y - 2));
      graphics.strokeLineShape(new Phaser.Geom.Line(marker.x + 5, marker.y + 1, marker.x + 11, marker.y - 3));
      break;
    case 'bomb':
      graphics.strokeCircle(marker.x, marker.y, 7);
      graphics.strokeLineShape(new Phaser.Geom.Line(marker.x + 4, marker.y - 6, marker.x + 9, marker.y - 11));
      break;
    case 'fire':
      graphics.strokeCircle(marker.x, marker.y, 6);
      graphics.strokeLineShape(new Phaser.Geom.Line(marker.x, marker.y - 11, marker.x, marker.y + 11));
      graphics.strokeLineShape(new Phaser.Geom.Line(marker.x - 11, marker.y, marker.x + 11, marker.y));
      break;
    case 'ice':
      graphics.strokeLineShape(new Phaser.Geom.Line(marker.x - 8, marker.y - 8, marker.x + 8, marker.y + 8));
      graphics.strokeLineShape(new Phaser.Geom.Line(marker.x - 8, marker.y + 8, marker.x + 8, marker.y - 8));
      graphics.strokeLineShape(new Phaser.Geom.Line(marker.x, marker.y - 10, marker.x, marker.y + 10));
      break;
    default:
      if (definition.terrainMode === 'lower') {
        graphics.strokeCircle(marker.x, marker.y, 8);
        graphics.strokeLineShape(new Phaser.Geom.Line(marker.x, marker.y - 9, marker.x, marker.y + 7));
        graphics.strokeLineShape(new Phaser.Geom.Line(marker.x - 7, marker.y + 1, marker.x, marker.y + 8));
        graphics.strokeLineShape(new Phaser.Geom.Line(marker.x + 7, marker.y + 1, marker.x, marker.y + 8));
      } else {
        graphics.strokeCircle(marker.x, marker.y, 8);
        graphics.strokeLineShape(new Phaser.Geom.Line(marker.x, marker.y + 8, marker.x, marker.y - 8));
        graphics.strokeLineShape(new Phaser.Geom.Line(marker.x - 7, marker.y - 1, marker.x, marker.y - 8));
        graphics.strokeLineShape(new Phaser.Geom.Line(marker.x + 7, marker.y - 1, marker.x, marker.y - 8));
      }
      break;
  }
}

interface DrawLandingEffectOptions {
  graphics: Phaser.GameObjects.Graphics;
  origin: RenderPoint;
  player: MatchState['players'][number];
  effect: LandingEffect;
  tileWidth: number;
  tileHeight: number;
  lift: number;
  now: number;
}

export function drawLandingEffect({
  graphics,
  origin,
  player,
  effect,
  tileWidth,
  tileHeight,
  lift,
  now,
}: DrawLandingEffectOptions): void {
  const duration = effect.special ? 360 : effect.hardDrop ? 220 : 320;
  const progress = clamp01((now - effect.startedAt) / duration);
  const definition = getPieceDefinition(effect.pieceKind);
  const glowColor = Phaser.Display.Color.HexStringToColor(definition.color).color;
  const cells = getPieceCells(effect.pieceKind, effect.rotation);
  const altitude = (1 - progress) * (effect.special ? 0.8 : effect.hardDrop ? 1.6 : 2.8);
  const boardWidth = player.board.width;
  const boardHeight = player.board.height;

  for (const cellPosition of cells) {
    const x = effect.anchor.x + cellPosition.x;
    const y = effect.anchor.y + cellPosition.y;
    if (x < 0 || y < 0 || x >= boardWidth || y >= boardHeight) {
      continue;
    }
    const boardCell = player.board.cells[(y * boardWidth) + x]!;
    const top = project(origin, x, y, boardCell.height + altitude, tileWidth, tileHeight, lift);
    const splashScale = effect.special ? 0.56 : 0.42;
    const splash = [
      new Phaser.Math.Vector2(top.x, top.y - (tileHeight * splashScale)),
      new Phaser.Math.Vector2(top.x + (tileWidth * splashScale), top.y),
      new Phaser.Math.Vector2(top.x, top.y + (tileHeight * splashScale)),
      new Phaser.Math.Vector2(top.x - (tileWidth * splashScale), top.y),
    ];
    graphics.fillStyle(glowColor, (1 - progress) * (effect.special ? 0.5 : 0.38));
    graphics.fillPoints(splash, true);
    graphics.lineStyle(2, glowColor, (1 - progress) * 0.76);
    graphics.strokePoints([...splash, splash[0]!], false);
  }

  const epicenter = project(origin, effect.anchor.x + 0.5, effect.anchor.y + 0.5, 0, tileWidth, tileHeight, lift);
  graphics.lineStyle(2, glowColor, (1 - progress) * 0.42);
  graphics.strokeEllipse(
    epicenter.x,
    epicenter.y + (tileHeight * 0.7),
    tileWidth * (0.7 + (progress * (effect.special ? 3 : 2.2))),
    tileHeight * (0.55 + (progress * (effect.special ? 2.4 : 1.8))),
  );
}

interface DrawBurstEffectOptions {
  graphics: Phaser.GameObjects.Graphics;
  origin: RenderPoint;
  player: MatchState['players'][number];
  effect: BurstEffect;
  tileWidth: number;
  tileHeight: number;
  lift: number;
  now: number;
}

export function drawBurstEffect({
  graphics,
  origin,
  player,
  effect,
  tileWidth,
  tileHeight,
  lift,
  now,
}: DrawBurstEffectOptions): void {
  const progress = clamp01((now - effect.startedAt) / effect.duration);
  const boardWidth = player.board.width;
  const boardHeight = player.board.height;
  const boardX = Math.min(boardWidth - 1, Math.max(0, effect.center.x));
  const boardY = Math.min(boardHeight - 1, Math.max(0, effect.center.y));
  const cell = player.board.cells[(Math.floor(boardY) * boardWidth) + Math.floor(boardX)]!;
  const center = project(origin, boardX, boardY, cell.height + 0.5, tileWidth, tileHeight, lift);
  const radiusScale = effect.kind === 'objective' ? 3.8 : effect.kind === 'impact' ? 3.2 : 2.2;
  graphics.lineStyle(2, effect.color, (1 - progress) * (effect.kind === 'objective' ? 0.54 : 0.42));
  graphics.strokeEllipse(
    center.x,
    center.y,
    tileWidth * (0.8 + (progress * radiusScale)),
    tileHeight * (0.6 + (progress * radiusScale * 0.72)),
  );
  graphics.fillStyle(effect.color, (1 - progress) * (effect.kind === 'objective' ? 0.14 : 0.1));
  graphics.fillEllipse(
    center.x,
    center.y,
    tileWidth * (0.5 + (progress * radiusScale * 0.55)),
    tileHeight * (0.4 + (progress * radiusScale * 0.48)),
  );
}
