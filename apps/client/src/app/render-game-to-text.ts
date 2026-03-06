import { getPieceCells, type MatchState } from '../lib/core.js';
import type { AppScreen, MenuMode } from '../ui-types.js';

interface RenderGameToTextInput {
  screen: AppScreen;
  selectedMode: MenuMode;
  match: MatchState | null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildActiveCells(player: MatchState['players'][number]): Array<{
  x: number;
  y: number;
  water: number;
  holeDepth: number;
  mineTicks: number;
  frozenTicks: number;
  primed: boolean;
}> {
  const primed = new Set(player.primedCells.map((cell) => `${cell.x}:${cell.y}`));
  const activeCells: Array<{
    x: number;
    y: number;
    water: number;
    holeDepth: number;
    mineTicks: number;
    frozenTicks: number;
    primed: boolean;
  }> = [];

  for (let y = 0; y < player.board.height; y += 1) {
    for (let x = 0; x < player.board.width; x += 1) {
      const cell = player.board.cells[(y * player.board.width) + x]!;
      const primedCell = primed.has(`${x}:${y}`);
      if (cell.water <= 0.05 && cell.holeDepth <= 0.05 && cell.mineTicks <= 0 && cell.frozenTicks <= 0 && !primedCell) {
        continue;
      }
      activeCells.push({
        x,
        y,
        water: round(cell.water),
        holeDepth: round(cell.holeDepth),
        mineTicks: cell.mineTicks,
        frozenTicks: cell.frozenTicks,
        primed: primedCell,
      });
    }
  }

  return activeCells;
}

export function renderGameToText({ screen, selectedMode, match }: RenderGameToTextInput): string {
  if (!match || match.mode !== 'solo') {
    return JSON.stringify({
      screen,
      selectedMode,
      mode: match?.mode ?? null,
      status: match?.status ?? null,
      note: 'No active solo match.',
    });
  }

  const player = match.players[0];
  const queuePreview = (player.activePiece ? [player.activePiece.kind, ...player.queue] : player.queue).slice(0, 4);
  const activeFootprint = player.activePiece
    ? getPieceCells(player.activePiece.kind, player.activePiece.rotation).map((cell) => ({
        control: {
          x: player.activePiece!.anchor.x + cell.x,
          y: player.activePiece!.anchor.y + cell.y,
        },
        simulationPatch: {
          x: (player.activePiece!.anchor.x + cell.x) * player.cellScale,
          y: (player.activePiece!.anchor.y + cell.y) * player.cellScale,
          width: player.cellScale,
          height: player.cellScale,
        },
      }))
    : [];
  const payload = {
    screen,
    selectedMode,
    coordinateSystem: {
      origin: 'top-left',
      xAxis: 'right-positive',
      yAxis: 'down-positive',
    },
    match: {
      mode: match.mode,
      soloVariant: match.soloVariant,
      referenceProfile: match.referenceProfile,
      rendererProfile: match.rendererProfile,
      status: match.status,
      phase: match.phase,
      tick: match.tick,
      remainingTicks: match.remainingTicks,
      stormLevel: match.stormLevel,
      ticksUntilPulse: match.stormTicksUntilPulse,
    },
    player: {
      score: player.score,
      stability: player.stability,
      drainLevel: round(player.drainLevel),
      drainMax: round(player.drainMax),
      quakeMeter: round(player.quakeMeter),
      combo: player.combo,
      activePiece: player.activePiece
        ? {
            kind: player.activePiece.kind,
            rotation: player.activePiece.rotation,
            anchor: player.activePiece.anchor,
            ticksRemaining: round(player.activePiece.ticksRemaining),
          }
        : null,
      queuePreview,
      cellScale: player.cellScale,
      activeFootprint,
    },
    board: {
      control: {
        width: player.controlGrid.width,
        height: player.controlGrid.height,
      },
      simulation: {
        width: player.board.width,
        height: player.board.height,
      },
      activeCells: buildActiveCells(player),
    },
    recentEvents: match.events.slice(-6).map((event) => ({
      tick: event.tick,
      type: event.type,
      slot: event.slot,
      message: event.message,
      amount: event.amount ?? null,
      pieceKind: event.pieceKind ?? null,
      attackKind: event.attackKind ?? null,
      anchor: event.anchor ?? null,
    })),
  };

  return JSON.stringify(payload);
}
