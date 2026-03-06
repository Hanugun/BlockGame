import Phaser from 'phaser';
import {
  TICK_RATE,
  type MatchState,
  type PlayerSlot,
} from '../../lib/core.js';
import { clamp01, eventColor, getRevisionKey } from './battle-scene-helpers.js';
import {
  drawActivePiece,
  drawAttackTelegraph,
  drawBurstEffect,
  drawLandingEffect,
  drawStormCore,
  drawTile,
} from './battle-scene-renderers.js';
import type { BurstEffect, LandingEffect, RenderPoint, SceneModel, SlotFeedback } from './battle-scene-types.js';

export class BattleScene extends Phaser.Scene {
  private graphics?: Phaser.GameObjects.Graphics;
  private model: SceneModel = {
    localSlot: null,
    match: null,
    mode: 'local',
    reducedMotion: false,
    highContrast: false,
    sendCommand: () => {},
  };
  private previousSnapshot: MatchState | null = null;
  private currentSnapshot: MatchState | null = null;
  private currentRevisionKey = '';
  private transitionStartedAt = 0;
  private landingEffects: LandingEffect[] = [];
  private bursts: BurstEffect[] = [];
  private feedback: Record<PlayerSlot, SlotFeedback> = {
    0: { shakeUntil: 0, captureUntil: 0, warningUntil: 0, objectiveUntil: 0 },
    1: { shakeUntil: 0, captureUntil: 0, warningUntil: 0, objectiveUntil: 0 },
  };
  private phaseFlashUntil = 0;

  constructor() {
    super('battle');
  }

  private getNow(): number {
    const clock = Reflect.get(this, 'time') as Phaser.Time.Clock | undefined;
    if (!clock) {
      return 0;
    }
    return clock.now;
  }

  setModel(model: SceneModel): void {
    this.model = model;
    if (!model.match) {
      this.previousSnapshot = null;
      this.currentSnapshot = null;
      this.currentRevisionKey = '';
      return;
    }

    const nextSnapshot = structuredClone(model.match);
    const nextRevisionKey = getRevisionKey(nextSnapshot);
    if (!this.currentSnapshot) {
      this.currentSnapshot = nextSnapshot;
      this.currentRevisionKey = nextRevisionKey;
      this.transitionStartedAt = this.getNow();
      return;
    }

    if (nextRevisionKey === this.currentRevisionKey) {
      this.currentSnapshot = nextSnapshot;
      return;
    }

    this.pushEffects(this.currentSnapshot, nextSnapshot);
    this.previousSnapshot = this.currentSnapshot;
    this.currentSnapshot = nextSnapshot;
    this.currentRevisionKey = nextRevisionKey;
    this.transitionStartedAt = this.getNow();
  }

  create(): void {
    this.graphics = this.add.graphics();
  }

  update(): void {
    if (this.graphics) {
      this.drawFrame(this.graphics);
    }
  }

  private pushEffects(previous: MatchState, current: MatchState): void {
    const now = this.getNow();
    for (const slot of [0, 1] as const) {
      const previousPiece = previous.players[slot].activePiece;
      const currentPiece = current.players[slot].activePiece;
      const events = current.events.filter((candidate) => candidate.slot === slot);

      if (previousPiece && (!currentPiece || currentPiece.id !== previousPiece.id)) {
        const pieceLockEvent = events.find((event) => event.type === 'piece_locked' && event.pieceKind === previousPiece.kind);
        const hardDrop = pieceLockEvent?.message.includes('via drop') ?? false;
        this.landingEffects.push({
          slot,
          pieceKind: previousPiece.kind,
          anchor: { ...(pieceLockEvent?.anchor ?? previousPiece.anchor) },
          rotation: previousPiece.rotation,
          startedAt: now,
          hardDrop,
          special: previousPiece.kind === 'water' || previousPiece.kind === 'bomb' || previousPiece.kind === 'fire' || previousPiece.kind === 'ice',
        });
      }

      for (const event of events) {
        const center = {
          x: (current.players[slot].board.width - 1) * 0.5,
          y: (current.players[slot].board.height - 1) * 0.5,
        };
        if (event.type === 'attack_impact' || event.type === 'storm_pulse' || event.type === 'earthquake') {
          this.feedback[slot].shakeUntil = Math.max(this.feedback[slot].shakeUntil, now + (this.model.reducedMotion ? 90 : 260));
          this.feedback[slot].warningUntil = Math.max(this.feedback[slot].warningUntil, now + 450);
          this.bursts.push({
            slot,
            center,
            color: eventColor(event),
            startedAt: now,
            duration: 420,
            kind: 'impact',
          });
        }
        if (event.type === 'lake_stabilized' || event.type === 'lake_captured' || event.type === 'combo_extended' || event.type === 'bonus_claim') {
          this.feedback[slot].captureUntil = Math.max(this.feedback[slot].captureUntil, now + 480);
        }
        if (event.type === 'objective_completed' || event.type === 'bonus_triggered') {
          this.feedback[slot].objectiveUntil = Math.max(this.feedback[slot].objectiveUntil, now + 520);
        }
        if (event.type === 'bingo_scored') {
          this.feedback[slot].objectiveUntil = Math.max(this.feedback[slot].objectiveUntil, now + 760);
          this.bursts.push({
            slot,
            center,
            color: eventColor(event),
            startedAt: now,
            duration: 720,
            kind: 'objective',
          });
        }
        if (event.type === 'piece_locked' && event.anchor && event.pieceKind && ['water', 'bomb', 'fire', 'ice'].includes(event.pieceKind)) {
          this.bursts.push({
            slot,
            center: { x: event.anchor.x, y: event.anchor.y },
            color: eventColor(event),
            startedAt: now,
            duration: 420,
            kind: 'special',
          });
        }
        if (event.type === 'phase_changed') {
          this.phaseFlashUntil = Math.max(this.phaseFlashUntil, now + 640);
        }
      }
    }
  }

  private drawFrame(graphics: Phaser.GameObjects.Graphics): void {
    graphics.clear();

    const width = this.scale.width;
    const height = this.scale.height;
    const now = this.getNow();
    const snapshot = this.currentSnapshot ?? this.model.match;
    if (!snapshot) {
      graphics.fillGradientStyle(0x08141d, 0x0f2331, 0x102131, 0x061018, 1, 1, 1, 1);
      graphics.fillRect(0, 0, width, height);
      return;
    }

    const previous = this.previousSnapshot ?? snapshot;
    const duration = this.model.reducedMotion ? 1 : Math.floor(1_000 / TICK_RATE);
    const alpha = this.previousSnapshot ? clamp01((now - this.transitionStartedAt) / duration) : 1;
    const eased = this.model.reducedMotion ? 1 : Phaser.Math.Easing.Cubic.Out(alpha);
    const timeWave = now * 0.0025;

    graphics.fillGradientStyle(0x051018, 0x0d2030, 0x0e2638, 0x041018, 1, 1, 1, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.fillStyle(0x113148, 0.18);
    graphics.fillEllipse(width * 0.5, height * 0.18, width * 0.92, height * 0.42);
    if (this.phaseFlashUntil > now) {
      const phaseAlpha = clamp01((this.phaseFlashUntil - now) / 640);
      graphics.fillStyle(snapshot.phase === 'tempest' ? 0x9ad7ff : 0x4dd7d0, phaseAlpha * 0.08);
      graphics.fillRect(0, 0, width, height);
    }

    const shortest = Math.min(width, height);
    const tileWidth = snapshot.mode === 'solo'
      ? Phaser.Math.Clamp(shortest * 0.072, 40, 64)
      : Phaser.Math.Clamp(shortest * 0.058, 28, 44);
    const tileHeight = tileWidth * 0.52;
    const lift = snapshot.mode === 'solo' ? tileHeight * 1.08 : tileHeight * 0.78;

    if (snapshot.mode === 'solo') {
      const origin = {
        x: width * 0.51,
        y: Phaser.Math.Clamp(height * 0.64, 360, height - 150),
      };
      this.drawBoard(
        graphics,
        previous.players[0],
        snapshot.players[0],
        origin,
        tileWidth,
        tileHeight,
        lift,
        eased,
        timeWave,
        true,
        true,
        now,
      );
      drawStormCore({
        graphics,
        snapshot,
        centerX: width * 0.82,
        centerY: height * 0.28,
        now,
        reducedMotion: this.model.reducedMotion,
      });
    } else {
      const boardY = Phaser.Math.Clamp(height * 0.54, 300, height - 250);
      const origins: [RenderPoint, RenderPoint] = [
        { x: width * 0.31, y: boardY },
        { x: width * 0.69, y: boardY },
      ];

      for (const slot of [0, 1] as const) {
        const player = snapshot.players[slot];
        const previousPlayer = previous.players[slot];
        const shake = this.feedback[slot].shakeUntil > now && !this.model.reducedMotion
          ? {
              x: Math.sin(now * 0.08 + slot) * 6 * clamp01((this.feedback[slot].shakeUntil - now) / 260),
              y: Math.cos(now * 0.11 + slot) * 4 * clamp01((this.feedback[slot].shakeUntil - now) / 260),
            }
          : { x: 0, y: 0 };

        this.drawBoard(
          graphics,
          previousPlayer,
          player,
          { x: origins[slot].x + shake.x, y: origins[slot].y + shake.y },
          tileWidth,
          tileHeight,
          lift,
          eased,
          timeWave,
          slot === this.model.localSlot,
          false,
          now,
        );
      }
    }

    this.landingEffects = this.landingEffects.filter((effect) => now - effect.startedAt <= 380);
    this.bursts = this.bursts.filter((effect) => now - effect.startedAt <= effect.duration);
  }

  private drawBoard(
    graphics: Phaser.GameObjects.Graphics,
    previousPlayer: MatchState['players'][number],
    player: MatchState['players'][number],
    origin: RenderPoint,
    tileWidth: number,
    tileHeight: number,
    lift: number,
    eased: number,
    timeWave: number,
    isLocal: boolean,
    organicTerrain: boolean,
    now: number,
  ): void {
    const boardWidth = player.board.width;
    const boardHeight = player.board.height;
    const riskGlow = Phaser.Display.Color.GetColor(26 + (player.boardRisk * 2), 110, 160);
    const outline = isLocal ? 0x6ce6ff : this.model.highContrast ? 0xf6fbff : 0x35566f;
    const capturePulse = this.feedback[player.slot].captureUntil > now ? clamp01((this.feedback[player.slot].captureUntil - now) / 480) : 0;
    const warningPulse = this.feedback[player.slot].warningUntil > now ? clamp01((this.feedback[player.slot].warningUntil - now) / 450) : 0;
    const objectivePulse = this.feedback[player.slot].objectiveUntil > now ? clamp01((this.feedback[player.slot].objectiveUntil - now) / 760) : 0;

    if (!organicTerrain) {
      graphics.lineStyle(3, outline, isLocal ? 0.55 : 0.32);
      graphics.strokeRoundedRect(origin.x - 188, origin.y - 92, 376, 452, 32);
      graphics.fillStyle(riskGlow, 0.05 + (player.boardRisk / 1000));
      graphics.fillRoundedRect(origin.x - 188, origin.y - 92, 376, 452, 32);
    } else {
      graphics.fillStyle(0x000000, 0.24);
      graphics.fillEllipse(
        origin.x,
        origin.y + (tileHeight * (boardHeight + 2.4)),
        tileWidth * (boardWidth * 1.08),
        tileHeight * (boardHeight * 1.06),
      );
      graphics.fillStyle(riskGlow, 0.035 + (player.boardRisk / 1200));
      graphics.fillEllipse(
        origin.x,
        origin.y + (tileHeight * (boardHeight + 1.8)),
        tileWidth * (boardWidth * 1.02),
        tileHeight * (boardHeight * 0.88),
      );
    }

    if (!organicTerrain) {
      if (capturePulse > 0) {
        graphics.lineStyle(2, 0x8cf0ff, 0.42 * capturePulse);
        graphics.strokeRoundedRect(origin.x - 194, origin.y - 98, 388, 464, 36);
      }
      if (warningPulse > 0) {
        graphics.lineStyle(2, 0xff9d87, 0.36 * warningPulse);
        graphics.strokeRoundedRect(origin.x - 200, origin.y - 104, 400, 476, 40);
      }
      if (objectivePulse > 0) {
        graphics.lineStyle(2, 0xcdfbff, 0.38 * objectivePulse);
        graphics.strokeRoundedRect(origin.x - 206, origin.y - 110, 412, 488, 44);
      }
    } else {
      if (capturePulse > 0) {
        graphics.lineStyle(2, 0x8cf0ff, 0.42 * capturePulse);
        graphics.strokeEllipse(
          origin.x,
          origin.y + (tileHeight * (boardHeight + 2.1)),
          tileWidth * (boardWidth * 1.16),
          tileHeight * (boardHeight * 1.06),
        );
      }
      if (warningPulse > 0) {
        graphics.lineStyle(2, 0xff9d87, 0.36 * warningPulse);
        graphics.strokeEllipse(
          origin.x,
          origin.y + (tileHeight * (boardHeight + 2.05)),
          tileWidth * (boardWidth * 1.2),
          tileHeight * (boardHeight * 1.1),
        );
      }
      if (objectivePulse > 0) {
        graphics.lineStyle(2, 0xcdfbff, 0.38 * objectivePulse);
        graphics.strokeEllipse(
          origin.x,
          origin.y + (tileHeight * (boardHeight + 2)),
          tileWidth * (boardWidth * 1.24),
          tileHeight * (boardHeight * 1.14),
        );
      }
    }

    const order = Array.from({ length: boardWidth * boardHeight }, (_, index) => ({
      x: index % boardWidth,
      y: Math.floor(index / boardWidth),
    })).sort((left, right) => (left.x + left.y) - (right.x + right.y));
    const primedSet = new Set(player.primedCells.map((cell) => `${cell.x}:${cell.y}`));

    for (const cellPosition of order) {
      const index = (cellPosition.y * boardWidth) + cellPosition.x;
      const currentCell = player.board.cells[index]!;
      const previousCell = previousPlayer.board.cells[index] ?? currentCell;
      const height = Phaser.Math.Linear(previousCell.height, currentCell.height, eased);
      const water = Phaser.Math.Linear(previousCell.water, currentCell.water, eased);
      const frozen = currentCell.frozenTicks > 0;
      drawTile({
        graphics,
        origin,
        position: cellPosition,
        terrainHeight: height,
        water,
        frozen,
        mined: currentCell.mineTicks > 0,
        holed: currentCell.holeDepth > 0,
        primed: primedSet.has(`${cellPosition.x}:${cellPosition.y}`),
        tileWidth,
        tileHeight,
        lift,
        timeWave,
        highContrast: this.model.highContrast,
        organicTerrain,
      });
    }

    for (const effect of this.landingEffects.filter((candidate) => candidate.slot === player.slot)) {
      drawLandingEffect({
        graphics,
        origin,
        player,
        effect,
        tileWidth,
        tileHeight,
        lift,
        now,
      });
    }

    for (const burst of this.bursts.filter((candidate) => candidate.slot === player.slot)) {
      drawBurstEffect({
        graphics,
        origin,
        player,
        effect: burst,
        tileWidth,
        tileHeight,
        lift,
        now,
      });
    }

    drawAttackTelegraph({
      graphics,
      player,
      origin,
      now,
      reducedMotion: this.model.reducedMotion,
    });
    drawActivePiece({
      graphics,
      origin,
      previousPlayer,
      player,
      tileWidth,
      tileHeight,
      lift,
      eased,
      timeWave,
      reducedMotion: this.model.reducedMotion,
      highContrast: this.model.highContrast,
    });
  }
}
