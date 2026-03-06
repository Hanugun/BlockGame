import { describe, expect, it } from 'vitest';
import { createMatch } from '../lib/core.js';
import { renderGameToText } from './render-game-to-text.js';

describe('renderGameToText', () => {
  it('returns a concise non-solo payload when no solo match is active', () => {
    const text = renderGameToText({
      screen: 'menu',
      selectedMode: 'solo',
      match: null,
    });
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(parsed.note).toBe('No active solo match.');
    expect(parsed.mode).toBeNull();
  });

  it('serializes solo match meta, player, board, and event state', () => {
    const match = createMatch({
      mode: 'solo',
      seed: 404,
      playerNames: ['Delta', 'Solo Puzzle'],
    });
    const player = match.players[0];
    player.activePiece = {
      id: 'render-ridge',
      kind: 'ridge',
      rotation: 0,
      anchor: { x: 1, y: 1 },
      ticksRemaining: 30,
    };
    player.board.cells[(2 * player.board.width) + 2]!.height = 1;
    player.board.cells[(3 * player.board.width) + 3]!.water = 2.25;
    player.board.cells[(3 * player.board.width) + 3]!.mineTicks = 80;
    player.board.cells[(4 * player.board.width) + 3]!.holeDepth = 1.3;
    player.primedCells.push({ x: 3, y: 3 });
    match.events.push({
      id: 'sample-event',
      tick: 7,
      slot: 0,
      type: 'storm_pulse',
      message: 'Rain front struck 4 nearby tiles.',
      amount: 2,
      anchor: { x: 4, y: 4 },
    });

    const text = renderGameToText({
      screen: 'game',
      selectedMode: 'solo',
      match,
    });

    const parsed = JSON.parse(text) as {
      coordinateSystem: { origin: string; xAxis: string; yAxis: string };
      match: { mode: string; tick: number; ticksUntilPulse: number; referenceMode: string };
      player: {
        queuePreview: string[];
        activeFootprint: Array<{ simulationPatch: { width: number; height: number } }>;
        activeMacroFootprint: Array<{ x: number; y: number }>;
        expandedSimulationFootprint: Array<{ x: number; y: number }>;
      };
      hud: { phaseText: string; reservoirPercent: number };
      board: {
        control: { width: number };
        simulation: { width: number };
        activeCells: Array<{ x: number; y: number; primed: boolean }>;
        visibleState: { terrainCellsAboveZero: number };
      };
      recentEvents: Array<{ type: string; message: string }>;
    };

    expect(parsed.coordinateSystem.origin).toBe('top-left');
    expect(parsed.coordinateSystem.xAxis).toBe('right-positive');
    expect(parsed.coordinateSystem.yAxis).toBe('down-positive');
    expect(parsed.match.mode).toBe('solo');
    expect(parsed.match.tick).toBe(0);
    expect(parsed.match.ticksUntilPulse).toBeGreaterThan(0);
    expect(parsed.match.referenceMode).toBe('strict');
    expect(parsed.player.queuePreview.length).toBeGreaterThan(0);
    expect(parsed.board.control.width).toBe(6);
    expect(parsed.board.simulation.width).toBe(18);
    expect(parsed.board.activeCells.some((cell) => cell.x === 3 && cell.y === 3 && cell.primed)).toBe(true);
    expect(parsed.player.activeMacroFootprint.length).toBeGreaterThan(0);
    expect(parsed.player.expandedSimulationFootprint.length).toBe(parsed.player.activeMacroFootprint.length * 9);
    expect(parsed.player.activeFootprint.every((cell) => cell.simulationPatch.width === 3 && cell.simulationPatch.height === 3)).toBe(true);
    expect(parsed.hud.phaseText).toBe('Opening Basin');
    expect(parsed.hud.reservoirPercent).toBeGreaterThanOrEqual(0);
    expect(parsed.board.visibleState.terrainCellsAboveZero).toBeGreaterThan(0);
    expect(parsed.recentEvents.at(-1)?.type).toBe('storm_pulse');
    expect(parsed.recentEvents.at(-1)?.message).toContain('Rain front struck');
  });
});
