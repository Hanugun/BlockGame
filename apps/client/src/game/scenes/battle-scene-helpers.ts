import Phaser from 'phaser';
import type { MatchEvent, MatchState } from '../../lib/core.js';
import type { RenderPoint } from './battle-scene-types.js';

export function project(
  origin: RenderPoint,
  gridX: number,
  gridY: number,
  elevation: number,
  tileWidth: number,
  tileHeight: number,
  lift: number,
): RenderPoint {
  return {
    x: origin.x + ((gridX - gridY) * tileWidth * 0.5),
    y: origin.y + ((gridX + gridY) * tileHeight * 0.5) - (elevation * lift),
  };
}

export function tint(color: string, amount: number): number {
  const base = Phaser.Display.Color.HexStringToColor(color);
  const result = Phaser.Display.Color.Interpolate.ColorWithColor(base, Phaser.Display.Color.ValueToColor(0xffffff), 100, amount);
  return Phaser.Display.Color.GetColor(result.r, result.g, result.b);
}

export function shade(color: string, amount: number): number {
  const base = Phaser.Display.Color.HexStringToColor(color);
  const result = Phaser.Display.Color.Interpolate.ColorWithColor(base, Phaser.Display.Color.ValueToColor(0x000000), 100, amount);
  return Phaser.Display.Color.GetColor(result.r, result.g, result.b);
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function clampBoardCoordinate(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

export function getRevisionKey(match: MatchState): string {
  return [
    match.tick,
    match.mode,
    match.phase,
    match.stormLevel,
    ...match.players.flatMap((player) => [
      player.score,
      player.stability,
      player.drainLevel.toFixed(1),
      player.attackMeter.toFixed(0),
      player.combo,
      player.boardRisk,
      player.terrainStress.toFixed(1),
      player.storedWater.toFixed(1),
      player.primedWater.toFixed(1),
      player.primedLakes,
      player.lakeMates,
      player.rainbowActive ? 1 : 0,
      player.activePiece?.id ?? 'none',
      player.activePiece ? `${player.activePiece.anchor.x}:${player.activePiece.anchor.y}:${player.activePiece.rotation}:${player.activePiece.ticksRemaining}` : 'null',
      player.pendingAttacks.map((attack) => `${attack.kind}:${attack.power}:${attack.etaTicks}`).join(','),
      player.primedCells.map((cell) => `${cell.x}:${cell.y}`).join(','),
    ]),
    match.versusBoard?.cells.join(',') ?? 'solo',
    match.soloBonusBoard?.cells.map((cell) => (cell ? 1 : 0)).join(',') ?? 'vs',
    match.soloBonusBoard?.activeBonuses.map((bonus) => `${bonus.kind}:${bonus.remainingTicks}`).join(',') ?? 'none',
  ].join('|');
}

export function eventColor(event: MatchEvent): number {
  if (event.focus === 'water' || event.pieceKind === 'water' || event.attackKind === 'water_attack') {
    return 0x55d6ff;
  }
  if (event.focus === 'bomb' || event.pieceKind === 'bomb' || event.attackKind === 'bomb_attack' || event.attackKind === 'downer_attack') {
    return 0xff9166;
  }
  if (event.type === 'earthquake') {
    return 0xffa06b;
  }
  if (event.focus === 'fire' || event.pieceKind === 'fire' || event.attackKind === 'fireball_attack' || event.attackKind === 'upper_attack') {
    return 0xffbf6a;
  }
  if (event.focus === 'ice' || event.pieceKind === 'ice' || event.attackKind === 'ice_attack') {
    return 0xbff3ff;
  }
  return 0x79e7ff;
}
