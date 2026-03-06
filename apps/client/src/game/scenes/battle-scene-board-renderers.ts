import Phaser from 'phaser';
import type { MatchState } from '../../lib/core.js';
import { clamp01, project, shade, tint } from './battle-scene-helpers.js';
import type { RenderPoint } from './battle-scene-types.js';

interface DrawStormCoreOptions {
  graphics: Phaser.GameObjects.Graphics;
  snapshot: MatchState;
  centerX: number;
  centerY: number;
  now: number;
  reducedMotion: boolean;
}

export function drawStormCore({
  graphics,
  snapshot,
  centerX,
  centerY,
  now,
  reducedMotion,
}: DrawStormCoreOptions): void {
  const player = snapshot.players[0];
  const soloBoard = snapshot.soloBonusBoard;
  const phaseColor = snapshot.phase === 'tempest' ? 0xbce8ff : snapshot.phase === 'surge' ? 0x74e9ff : 0x44cde0;
  const cardCharge = clamp01((soloBoard?.cells.filter(Boolean).length ?? 0) / 16);
  const bonusCharge = clamp01((soloBoard?.activeBonuses.length ?? 0) / 4);
  const pulse = reducedMotion ? 0 : Math.sin(now * 0.004) * 10;

  graphics.fillStyle(phaseColor, 0.08);
  graphics.fillCircle(centerX, centerY, 118 + pulse);
  graphics.lineStyle(3, phaseColor, 0.75);
  graphics.strokeCircle(centerX, centerY, 88 + (pulse * 0.6));
  graphics.lineStyle(2, 0xffffff, 0.18);
  graphics.strokeCircle(centerX, centerY, 56);
  graphics.fillStyle(0x0a1620, 0.92);
  graphics.fillCircle(centerX, centerY, 60);
  graphics.fillStyle(phaseColor, 0.42 + (cardCharge * 0.2));
  graphics.fillCircle(centerX, centerY, 28 + (cardCharge * 18) + (bonusCharge * 8));
  graphics.fillStyle(0xffffff, 0.18);
  graphics.fillCircle(centerX - 12, centerY - 14, 10);
  graphics.lineStyle(2, 0xffd36a, 0.32 + (bonusCharge * 0.3));
  graphics.strokeCircle(centerX, centerY, 44 + (bonusCharge * 18));
  if ((soloBoard?.activeBonuses.length ?? 0) > 0) {
    graphics.fillStyle(0xffd36a, 0.18);
    graphics.fillCircle(centerX + 20, centerY + 18, 8 + (player.scoreMultiplier * 2));
  }
}

interface DrawTileOptions {
  graphics: Phaser.GameObjects.Graphics;
  origin: RenderPoint;
  position: { x: number; y: number };
  terrainHeight: number;
  water: number;
  frozen: boolean;
  mined: boolean;
  holed: boolean;
  primed: boolean;
  tileWidth: number;
  tileHeight: number;
  lift: number;
  timeWave: number;
  highContrast: boolean;
  organicTerrain: boolean;
}

export function drawTile({
  graphics,
  origin,
  position,
  terrainHeight,
  water,
  frozen,
  mined,
  holed,
  primed,
  tileWidth,
  tileHeight,
  lift,
  timeWave,
  highContrast,
  organicTerrain,
}: DrawTileOptions): void {
  const top = project(origin, position.x, position.y, terrainHeight, tileWidth, tileHeight, lift);
  const ground = project(origin, position.x, position.y, 0, tileWidth, tileHeight, lift);
  const baseColor = highContrast
    ? '#e2c997'
    : terrainHeight >= 6
      ? '#d88e4f'
      : terrainHeight >= 4
        ? '#c67943'
        : terrainHeight >= 2
          ? '#ac653d'
          : '#8f5438';
  const terrainTop = tint(baseColor, Math.min(60, 22 + (terrainHeight * 6)));
  const terrainLeft = shade(baseColor, 24);
  const terrainRight = shade(baseColor, 36);

  if (organicTerrain) {
    const moundWidth = tileWidth * (0.86 + Math.min(0.22, terrainHeight * 0.04));
    const moundHeight = tileHeight * (0.92 + Math.min(0.22, terrainHeight * 0.03));
    const ridgeBias = Math.sin((position.x * 0.7) + (position.y * 0.3) + timeWave) * 0.12;

    graphics.fillStyle(0x000000, 0.18);
    graphics.fillEllipse(ground.x, ground.y + (tileHeight * 0.32), moundWidth * 1.25, moundHeight * 0.82);
    graphics.fillStyle(terrainRight, 0.88);
    graphics.fillEllipse(top.x, top.y + (tileHeight * 0.22), moundWidth * 1.26, moundHeight * 1.06);
    graphics.fillStyle(terrainLeft, 0.9);
    graphics.fillEllipse(top.x - (tileWidth * 0.08), top.y + (tileHeight * 0.08), moundWidth * 1.02, moundHeight * 0.82);
    graphics.fillStyle(terrainTop, 0.98);
    graphics.fillEllipse(top.x + (tileWidth * 0.04), top.y - (tileHeight * (0.08 + (ridgeBias * 0.32))), moundWidth * 0.78, moundHeight * 0.5);
    graphics.lineStyle(1, highContrast ? 0x1c1b18 : 0x3f2a1e, 0.38);
    graphics.strokeEllipse(top.x, top.y + (tileHeight * 0.18), moundWidth * 0.96, moundHeight * 0.7);
    if (terrainHeight >= 3) {
      graphics.lineStyle(1, highContrast ? 0xf4dfb6 : 0xe2ba87, 0.16 + Math.min(0.24, terrainHeight * 0.03));
      graphics.strokeEllipse(top.x + (tileWidth * 0.06), top.y - (tileHeight * 0.03), moundWidth * 0.66, moundHeight * 0.34);
    }
  } else {
    const diamondTop = [
      new Phaser.Math.Vector2(top.x, top.y - (tileHeight * 0.5)),
      new Phaser.Math.Vector2(top.x + (tileWidth * 0.5), top.y),
      new Phaser.Math.Vector2(top.x, top.y + (tileHeight * 0.5)),
      new Phaser.Math.Vector2(top.x - (tileWidth * 0.5), top.y),
    ];
    const leftFace = [
      diamondTop[3]!,
      diamondTop[2]!,
      new Phaser.Math.Vector2(ground.x, ground.y + (tileHeight * 0.5)),
      new Phaser.Math.Vector2(ground.x - (tileWidth * 0.5), ground.y),
    ];
    const rightFace = [
      diamondTop[1]!,
      diamondTop[2]!,
      new Phaser.Math.Vector2(ground.x, ground.y + (tileHeight * 0.5)),
      new Phaser.Math.Vector2(ground.x + (tileWidth * 0.5), ground.y),
    ];

    graphics.fillStyle(terrainLeft, 0.95);
    graphics.fillPoints(leftFace, true);
    graphics.fillStyle(terrainRight, 0.98);
    graphics.fillPoints(rightFace, true);
    graphics.fillStyle(terrainTop, 1);
    graphics.fillPoints(diamondTop, true);
    graphics.lineStyle(1, highContrast ? 0x061018 : 0x102130, 0.86);
    graphics.strokePoints([...diamondTop, diamondTop[0]!], false);
  }

  if (holed) {
    if (organicTerrain) {
      const sinkWidth = tileWidth * 0.5;
      const sinkHeight = tileHeight * 0.38;
      graphics.fillStyle(0x04070a, 0.95);
      graphics.fillEllipse(top.x, top.y + (tileHeight * 0.12), sinkWidth, sinkHeight);
      graphics.lineStyle(2, 0x9c5531, 0.9);
      graphics.strokeEllipse(top.x, top.y + (tileHeight * 0.12), sinkWidth, sinkHeight);
    } else {
      const sink = [
        new Phaser.Math.Vector2(top.x, top.y - (tileHeight * 0.28)),
        new Phaser.Math.Vector2(top.x + (tileWidth * 0.28), top.y),
        new Phaser.Math.Vector2(top.x, top.y + (tileHeight * 0.28)),
        new Phaser.Math.Vector2(top.x - (tileWidth * 0.28), top.y),
      ];
      graphics.fillStyle(0x05070a, 0.92);
      graphics.fillPoints(sink, true);
      graphics.lineStyle(2, 0x4f6070, 0.85);
      graphics.strokePoints([...sink, sink[0]!], false);
    }
    if (water > 0.08) {
      graphics.fillStyle(0x4bb7ff, 0.25);
      graphics.fillEllipse(top.x, top.y + (tileHeight * 0.12), tileWidth * 0.28, tileHeight * 0.18);
    }
  }

  if (water > 0.06 && !holed) {
    const shimmer = Math.sin((timeWave * 1.8) + (position.x * 0.7) + (position.y * 0.45));
    if (organicTerrain) {
      const surface = project(origin, position.x, position.y, terrainHeight + Math.min(1.1, water * 0.4), tileWidth, tileHeight, lift);
      const poolWidth = tileWidth * (0.62 + Math.min(0.24, water * 0.06));
      const poolHeight = tileHeight * (0.54 + Math.min(0.18, water * 0.04));
      graphics.fillStyle(frozen ? 0xdaf8ff : 0x43bfff, frozen ? 0.88 : 0.7 + (shimmer * 0.1));
      graphics.fillEllipse(surface.x, surface.y + (tileHeight * 0.03), poolWidth, poolHeight);
      graphics.lineStyle(primed ? 3 : 2, primed ? 0xffe79b : frozen ? 0xffffff : 0xcdf9ff, primed ? 0.98 : 0.86);
      graphics.strokeEllipse(surface.x, surface.y + (tileHeight * 0.03), poolWidth, poolHeight);
      graphics.fillStyle(frozen ? 0xf6feff : 0xb5f6ff, 0.34);
      graphics.fillEllipse(surface.x + (tileWidth * 0.03), surface.y - (tileHeight * 0.02), poolWidth * 0.48, poolHeight * 0.3);
      graphics.lineStyle(1, frozen ? 0xffffff : 0xabeeff, 0.46);
      graphics.strokeEllipse(surface.x + (tileWidth * 0.03), surface.y + (tileHeight * 0.04), poolWidth * 0.7, poolHeight * 0.42);
      if (primed) {
        graphics.fillStyle(0xffd97b, 0.13);
        graphics.fillEllipse(surface.x, surface.y + (tileHeight * 0.03), poolWidth * 1.08, poolHeight * 1.08);
        graphics.lineStyle(2, 0xfff2c2, 0.72);
        graphics.strokeEllipse(surface.x, surface.y + (tileHeight * 0.03), poolWidth * 1.18, poolHeight * 1.18);
      }
    } else {
      const surface = project(origin, position.x, position.y, terrainHeight + Math.min(2.25, water * 0.88), tileWidth, tileHeight, lift);
      const waterScale = 0.73 + Math.min(0.18, water * 0.05);
      const waterDiamond = [
        new Phaser.Math.Vector2(surface.x, surface.y - (tileHeight * 0.5 * waterScale)),
        new Phaser.Math.Vector2(surface.x + (tileWidth * 0.5 * waterScale), surface.y),
        new Phaser.Math.Vector2(surface.x, surface.y + (tileHeight * 0.5 * waterScale)),
        new Phaser.Math.Vector2(surface.x - (tileWidth * 0.5 * waterScale), surface.y),
      ];
      graphics.fillStyle(frozen ? 0xd9f6ff : 0x4fd0ff, frozen ? 0.84 : 0.68 + (shimmer * 0.05));
      graphics.fillPoints(waterDiamond, true);
      graphics.lineStyle(primed ? 3 : 2, primed ? 0xffe79b : frozen ? 0xffffff : 0xcff9ff, primed ? 0.98 : 0.86);
      graphics.strokePoints([...waterDiamond, waterDiamond[0]!], false);
      if (primed) {
        graphics.fillStyle(0xffd97b, 0.14);
        graphics.fillPoints(waterDiamond, true);
      }
    }
  }

  if (primed && water <= 0.06 && !holed) {
    graphics.lineStyle(2, 0xffe79b, 0.86);
    graphics.strokeEllipse(top.x, top.y + (tileHeight * 0.06), tileWidth * 0.5, tileHeight * 0.36);
  }

  if (mined) {
    graphics.fillStyle(0xff8b73, 0.28);
    graphics.fillCircle(top.x, top.y + (tileHeight * 0.08), 6);
    graphics.fillStyle(0xff6f65, 0.92);
    graphics.fillCircle(top.x, top.y + (tileHeight * 0.08), 4.6);
    graphics.fillStyle(0x1c0a0b, 0.75);
    graphics.fillCircle(top.x, top.y + (tileHeight * 0.08), 1.9);
  }
}

interface DrawAttackTelegraphOptions {
  graphics: Phaser.GameObjects.Graphics;
  player: MatchState['players'][number];
  origin: RenderPoint;
  now: number;
  reducedMotion: boolean;
}

export function drawAttackTelegraph({
  graphics,
  player,
  origin,
  now,
  reducedMotion,
}: DrawAttackTelegraphOptions): void {
  if (player.pendingAttacks.length === 0) {
    return;
  }

  const stripWidth = 18;
  const baseX = origin.x + 176;
  const baseY = origin.y - 86;
  player.pendingAttacks.slice(0, 4).forEach((attack, index) => {
    const urgency = 1 - clamp01(attack.etaTicks / 12);
    const color = attack.kind === 'bomb_attack' || attack.kind === 'downer_attack'
      ? 0xff9b72
      : attack.kind === 'ice_attack'
        ? 0xcff9ff
        : attack.kind === 'fireball_attack' || attack.kind === 'upper_attack'
          ? 0xffcd71
          : 0x76dfff;
    const pulse = reducedMotion ? 0 : Math.sin((now * 0.01) + index) * 0.12;
    graphics.fillStyle(color, 0.12 + urgency * 0.22 + pulse);
    graphics.fillRoundedRect(baseX, baseY + (index * 34), stripWidth, 24, 10);
    graphics.fillStyle(color, 0.9);
    graphics.fillRoundedRect(baseX, baseY + (index * 34), stripWidth, 24 * Math.max(0.18, urgency), 10);
  });
}
