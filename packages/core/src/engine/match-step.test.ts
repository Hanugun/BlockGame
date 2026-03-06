import { describe, expect, it } from 'vitest';
import { LAKE_STABLE_TICKS, MATCH_DURATION_TICKS, SOLO_PIECE_LOCK_TICKS_CALM } from '../constants.js';
import { SOLO_V2_CONFIG } from '../config/solo-v2-config.js';
import { getPieceCells } from '../rules/pieces.js';
import { createMatch, refillQueue } from './create-match.js';
import { applyPlayerCommand } from './match-commands.js';
import { lockActivePiece, stepMatch } from './match-step.js';

function macroCenterCellIndex(player: { board: { width: number }; cellScale: number }, macroX: number, macroY: number): number {
  const simulationX = (macroX * player.cellScale) + Math.floor(player.cellScale / 2);
  const simulationY = (macroY * player.cellScale) + Math.floor(player.cellScale / 2);
  return (simulationY * player.board.width) + simulationX;
}

function forMacroPatch(
  player: { board: { width: number; cells: Array<{ height: number; water: number }> }; cellScale: number },
  macroX: number,
  macroY: number,
  callback: (index: number) => void,
): void {
  const originX = macroX * player.cellScale;
  const originY = macroY * player.cellScale;
  for (let dy = 0; dy < player.cellScale; dy += 1) {
    for (let dx = 0; dx < player.cellScale; dx += 1) {
      const x = originX + dx;
      const y = originY + dy;
      callback((y * player.board.width) + x);
    }
  }
}

describe('match simulation', () => {
  it('raises terrain when a land piece locks', () => {
    const match = createMatch({ seed: 42 });
    const player = match.players[0];

    player.activePiece = {
      id: 'ridge-test',
      kind: 'ridge',
      rotation: 0,
      anchor: { x: 1, y: 1 },
      ticksRemaining: 1,
    };

    lockActivePiece(match, 0, 'drop');

    expect(player.board.cells[(1 * player.board.width) + 1]?.height).toBe(1);
    expect(player.board.cells[(1 * player.board.width) + 2]?.height).toBe(1);
    expect(player.board.cells[(1 * player.board.width) + 3]?.height).toBe(1);
  });

  it('lets a downer flatten terrain instead of always raising it', () => {
    const match = createMatch({ seed: 57 });
    const player = match.players[0];
    player.board.cells[(4 * player.board.width) + 4]!.height = 3;
    player.board.cells[(4 * player.board.width) + 5]!.height = 2;
    player.board.cells[(5 * player.board.width) + 4]!.height = 2;
    player.board.cells[(5 * player.board.width) + 5]!.height = 3;

    player.activePiece = {
      id: 'pit-test',
      kind: 'pit',
      rotation: 0,
      anchor: { x: 4, y: 4 },
      ticksRemaining: 1,
    };

    lockActivePiece(match, 0, 'drop');

    expect(player.board.cells[(4 * player.board.width) + 4]?.height).toBe(2);
    expect(player.board.cells[(5 * player.board.width) + 5]?.height).toBe(2);
  });

  it('builds the square piece as a hollow box instead of a filled slab', () => {
    const match = createMatch({ seed: 58, mode: 'solo' });
    const player = match.players[0];
    player.activePiece = {
      id: 'square-ring',
      kind: 'square',
      rotation: 0,
      anchor: { x: 1, y: 1 },
      ticksRemaining: 1,
    };

    lockActivePiece(match, 0, 'drop');

    const originX = 1 * player.cellScale;
    const originY = 1 * player.cellScale;
    const centerIndex = ((originY + 2) * player.board.width) + (originX + 2);
    const edgeIndex = (originY * player.board.width) + originX;
    expect(player.board.cells[edgeIndex]!.height).toBeGreaterThan(0);
    expect(player.board.cells[centerIndex]!.height).toBe(0);
  });

  it('builds solo ridge terrain as a hill profile instead of a flat wall', () => {
    const match = createMatch({ seed: 59, mode: 'solo' });
    const player = match.players[0];
    player.activePiece = {
      id: 'ridge-hill-profile',
      kind: 'ridge',
      rotation: 0,
      anchor: { x: 1, y: 1 },
      ticksRemaining: 1,
    };

    lockActivePiece(match, 0, 'drop');

    const originX = 1 * player.cellScale;
    const originY = 1 * player.cellScale;
    const cornerIndex = (originY * player.board.width) + originX;
    const edgeIndex = (originY * player.board.width) + originX + 1;
    const centerIndex = ((originY + 1) * player.board.width) + originX + 1;
    const totalHeight = player.board.cells.reduce((sum, cell) => sum + cell.height, 0);

    expect(totalHeight).toBeCloseTo(36, 5);
    expect(player.board.cells[edgeIndex]!.height).toBeGreaterThan(player.board.cells[cornerIndex]!.height);
    expect(player.board.cells[centerIndex]!.height).toBeGreaterThan(player.board.cells[edgeIndex]!.height);
  });

  it('damages stability when water spills off the edge', () => {
    const match = createMatch({ seed: 77 });
    const player = match.players[0];
    player.board.cells[0]!.water = 4.5;

    stepMatch(match);

    expect(player.overflowLastTick).toBeGreaterThan(0);
    expect(player.drainLevel).toBeGreaterThan(0);
    expect(player.stability).toBeLessThan(100);
  });

  it('evaporates the entire connected lake when fire touches it', () => {
    const match = createMatch({ seed: 501, mode: 'solo' });
    const player = match.players[0];

    for (let y = 0; y <= player.board.height - 1; y += 1) {
      for (let x = 0; x <= player.board.width - 1; x += 1) {
        const cell = player.board.cells[(y * player.board.width) + x]!;
        const boundary = x === 0 || x === 5 || y === 0 || y === 5;
        cell.height = boundary ? 3 : 0;
      }
    }
    const lakeCells = [
      [2, 2],
      [3, 2],
      [2, 3],
      [3, 3],
    ] as const;
    for (const [x, y] of lakeCells) {
      forMacroPatch(player, x, y, (cellIndex) => {
        player.board.cells[cellIndex]!.water = 1.4;
      });
    }

    player.activePiece = {
      id: 'full-lake-fire',
      kind: 'fire',
      rotation: 0,
      anchor: { x: 2, y: 2 },
      ticksRemaining: 1,
    };

    lockActivePiece(match, 0, 'drop');

    const remainingWater = player.board.cells.reduce((sum, cell) => sum + cell.water, 0);
    expect(remainingWater).toBe(0);
    expect(player.score).toBeGreaterThan(0);
  });

  it('bomb creates hole leaks and upper terrain repairs them', () => {
    const match = createMatch({ seed: 777, mode: 'solo' });
    const player = match.players[0];

    player.activePiece = {
      id: 'bomb-hole',
      kind: 'bomb',
      rotation: 0,
      anchor: { x: 4, y: 4 },
      ticksRemaining: 1,
    };
    lockActivePiece(match, 0, 'drop');

    const holeCellIndex = macroCenterCellIndex(player, 4, 4);
    expect(player.board.cells[holeCellIndex]!.holeDepth).toBeGreaterThan(0);

    player.board.cells[holeCellIndex]!.water = 3.6;
    stepMatch(match);
    expect(player.overflowLastTick).toBeGreaterThan(0);
    expect(player.drainLevel).toBeGreaterThan(0);

    const holeDepthBeforeRepair = player.board.cells[holeCellIndex]!.holeDepth;
    player.activePiece = {
      id: 'ridge-repair',
      kind: 'ridge',
      rotation: 0,
      anchor: { x: 4, y: 4 },
      ticksRemaining: 1,
    };
    lockActivePiece(match, 0, 'drop');
    expect(player.board.cells[holeCellIndex]!.holeDepth).toBeLessThan(holeDepthBeforeRepair);
  });

  it('primes a sealed lake and banks it with fire', () => {
    const match = createMatch({ seed: 99 });
    const player = match.players[0];

    for (let y = 3; y <= 7; y += 1) {
      for (let x = 3; x <= 7; x += 1) {
        const cell = player.board.cells[(y * player.board.width) + x]!;
        const onBoundary = x === 3 || x === 7 || y === 3 || y === 7;
        cell.height = onBoundary ? 3 : 0;
      }
    }

    const lakeCells = [
      [4, 4],
      [5, 4],
      [6, 4],
      [4, 5],
      [5, 5],
      [6, 5],
    ] as const;

    for (const [x, y] of lakeCells) {
      player.board.cells[(y * player.board.width) + x]!.water = 1;
    }

    for (let tick = 0; tick < LAKE_STABLE_TICKS + 1; tick += 1) {
      stepMatch(match);
    }

    expect(player.primedLakes).toBeGreaterThanOrEqual(1);
    expect(player.primedWater).toBeGreaterThan(0);
    expect(player.score).toBe(0);

    player.activePiece = {
      id: 'sun-bank',
      kind: 'fire',
      rotation: 0,
      anchor: { x: 5, y: 5 },
      ticksRemaining: 1,
    };

    lockActivePiece(match, 0, 'drop');
    stepMatch(match);

    expect(player.score).toBeGreaterThan(0);
    expect(match.versusBoard!.cells.some((cell) => cell === 0)).toBe(true);
    expect(player.combo).toBeGreaterThanOrEqual(1);
    expect(player.capturedLakes).toBeGreaterThanOrEqual(1);
  });

  it('advances into surge phase as the timer progresses', () => {
    const match = createMatch({ seed: 15 });
    match.tick = Math.floor(MATCH_DURATION_TICKS * 0.38) - 1;
    match.remainingTicks = MATCH_DURATION_TICKS - match.tick;

    stepMatch(match);

    expect(match.phase).toBe('surge');
    expect(match.stormLevel).toBeGreaterThan(30);
  });

  it('applies a storm pulse when the countdown expires', () => {
    const match = createMatch({ seed: 22 });
    match.stormTicksUntilPulse = 1;

    stepMatch(match);

    const totalWater = match.players.reduce(
      (sum, player) => sum + player.board.cells.reduce((cellSum, cell) => cellSum + cell.water, 0),
      0,
    );
    expect(totalWater).toBeGreaterThan(0);
  });

  it('does not start solo rain fronts before the score unlock', () => {
    const match = createMatch({ seed: 223, mode: 'solo' });
    match.stormTicksUntilPulse = 1;

    stepMatch(match);

    const totalWater = match.players[0].board.cells.reduce((sum, cell) => sum + cell.water, 0);
    expect(totalWater).toBe(0);
    expect(match.events.some((event) => event.type === 'storm_pulse')).toBe(false);
  });

  it('keeps solo storm rain clustered instead of scattering across the whole map', () => {
    const match = createMatch({ seed: 222, mode: 'solo' });
    match.players[0].score = SOLO_V2_CONFIG.progression.rainUnlockScore;
    match.players[0].capturedLakes = 1;
    match.stormTicksUntilPulse = 1;

    stepMatch(match);

    const wetCells: Array<{ x: number; y: number }> = [];
    const board = match.players[0].board;
    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) {
        if (board.cells[(y * board.width) + x]!.water > 0.01) {
          wetCells.push({ x, y });
        }
      }
    }
    expect(wetCells.length).toBeGreaterThan(0);
    expect(wetCells.length).toBeLessThanOrEqual(8);
    const xSpan = Math.max(...wetCells.map((cell) => cell.x)) - Math.min(...wetCells.map((cell) => cell.x));
    const ySpan = Math.max(...wetCells.map((cell) => cell.y)) - Math.min(...wetCells.map((cell) => cell.y));
    expect(xSpan).toBeLessThanOrEqual(3);
    expect(ySpan).toBeLessThanOrEqual(3);
    expect(match.events.some((event) => event.type === 'storm_pulse' && event.message.includes('Rain front struck'))).toBe(true);
  });

  it('does not trigger earthquake damage while random terrain damage is disabled for solo', () => {
    const match = createMatch({ seed: 14, mode: 'solo' });
    const player = match.players[0];
    for (let y = 3; y <= 5; y += 1) {
      for (let x = 3; x <= 5; x += 1) {
        player.board.cells[(y * player.board.width) + x]!.height = 4;
      }
    }
    player.quakeMeter = 140;

    stepMatch(match);

    expect(match.events.some((event) => event.type === 'earthquake')).toBe(false);
    expect(player.quakeMeter).toBe(140);
  });

  it('does not build earthquake pressure on low flat terrain', () => {
    const match = createMatch({ seed: 145, mode: 'solo' });
    const player = match.players[0];
    for (let y = 0; y < player.board.height; y += 1) {
      for (let x = 0; x < player.board.width; x += 1) {
        player.board.cells[(y * player.board.width) + x]!.height = y < 6 ? 2 : 1;
      }
    }

    for (let tick = 0; tick < 20; tick += 1) {
      stepMatch(match);
    }

    expect(player.quakeMeter).toBe(0);
    expect(match.events.some((event) => event.type === 'earthquake')).toBe(false);
  });

  it('scores a versus-board line and clears the board', () => {
    const match = createMatch({ seed: 31 });
    match.versusBoard!.cells[0] = 0;
    match.versusBoard!.cells[1] = 0;
    const player = match.players[0];
    for (let y = 0; y <= 2; y += 1) {
      for (let x = 7; x <= 9; x += 1) {
        player.board.cells[(y * player.board.width) + x]!.height = x === 7 || x === 9 || y === 0 || y === 2 ? 3 : 0;
      }
    }
    player.board.cells[(1 * player.board.width) + 8]!.water = 3;

    for (let tick = 0; tick < LAKE_STABLE_TICKS + 1; tick += 1) {
      stepMatch(match);
    }

    player.activePiece = {
      id: 'line-claim',
      kind: 'fire',
      rotation: 0,
      anchor: { x: 8, y: 1 },
      ticksRemaining: 1,
    };

    lockActivePiece(match, 0, 'drop');

    expect(match.players[1].pendingAttacks.length).toBeGreaterThan(0);
    expect(match.events.some((event) => event.type === 'bingo_scored')).toBe(true);
    expect(match.versusBoard!.cells.every((cell) => cell === null)).toBe(true);

    stepMatch(match);
    expect(match.players[1].pendingAttacks.length).toBeGreaterThan(0);
  });

  it('builds solo lake mate and rainbow bonuses from primed basins', () => {
    const match = createMatch({ seed: 73, mode: 'solo' });
    const player = match.players[0];
    for (let y = 0; y < player.board.height; y += 1) {
      for (let x = 0; x < player.board.width; x += 1) {
        player.board.cells[(y * player.board.width) + x]!.height = 3;
      }
    }
    const basinA = [[1, 1], [2, 1], [1, 2], [2, 2]] as const;
    const basinB = [[3, 3], [4, 3], [3, 4], [4, 4]] as const;
    for (const [x, y] of [...basinA, ...basinB]) {
      player.board.cells[(y * player.board.width) + x]!.height = 0;
    }
    for (const [x, y] of basinA) {
      player.board.cells[(y * player.board.width) + x]!.water = 2.1;
    }
    for (const [x, y] of basinB) {
      player.board.cells[(y * player.board.width) + x]!.water = 2.1;
    }

    for (let tick = 0; tick < LAKE_STABLE_TICKS + 1; tick += 1) {
      stepMatch(match);
    }

    expect(player.lakeMates).toBeGreaterThanOrEqual(1);
    expect(player.rainbowActive).toBe(true);
    expect(player.scoreMultiplier).toBeGreaterThan(1);
  });

  it('claims a solo bingo line and activates an Aqua Aqua bonus', () => {
    const match = createMatch({ seed: 64, mode: 'solo' });
    const player = match.players[0];
    match.soloBonusBoard!.cells[8] = true;
    match.soloBonusBoard!.cells[9] = true;
    match.soloBonusBoard!.cells[11] = true;

    for (let y = 0; y < player.board.height; y += 1) {
      for (let x = 0; x < player.board.width; x += 1) {
        player.board.cells[(y * player.board.width) + x]!.height = 3;
      }
    }
    const basin = [[2, 2], [3, 2], [2, 3], [3, 3]] as const;
    for (const [x, y] of basin) {
      forMacroPatch(player, x, y, (cellIndex) => {
        player.board.cells[cellIndex]!.height = 0;
        player.board.cells[cellIndex]!.water = 1;
      });
    }

    for (let tick = 0; tick < LAKE_STABLE_TICKS + 1; tick += 1) {
      stepMatch(match);
    }

    player.activePiece = {
      id: 'solo-bingo',
      kind: 'fire',
      rotation: 0,
      anchor: { x: 2, y: 2 },
      ticksRemaining: 1,
    };

    lockActivePiece(match, 0, 'drop');

    expect(match.soloBonusBoard!.linesScored).toBeGreaterThan(0);
    expect(match.soloBonusBoard!.activeBonuses.length).toBeGreaterThan(0);
    expect(match.soloBonusBoard!.activeBonuses.some((bonus) => bonus.kind === 'power_lake')).toBe(true);
    expect(match.events.some((event) => event.type === 'bonus_triggered')).toBe(true);

    stepMatch(match);
  });

  it('does not score solo diagonals as bingo lines', () => {
    const match = createMatch({ seed: 120, mode: 'solo' });
    match.soloBonusBoard!.cells[0] = true;
    match.soloBonusBoard!.cells[5] = true;
    match.soloBonusBoard!.cells[10] = true;
    const player = match.players[0];

    for (let y = 3; y <= 5; y += 1) {
      for (let x = 3; x <= 5; x += 1) {
        player.board.cells[(y * player.board.width) + x]!.height = x === 3 || x === 5 || y === 3 || y === 5 ? 3 : 0;
      }
    }
    player.board.cells[(4 * player.board.width) + 4]!.water = 2.8;
    for (let tick = 0; tick < LAKE_STABLE_TICKS + 1; tick += 1) {
      stepMatch(match);
    }
    player.activePiece = {
      id: 'solo-diagonal',
      kind: 'fire',
      rotation: 0,
      anchor: { x: 4, y: 4 },
      ticksRemaining: 1,
    };

    lockActivePiece(match, 0, 'drop');

    expect(match.soloBonusBoard!.linesScored).toBe(0);
    expect(match.soloBonusBoard!.activeBonuses.length).toBe(0);
  });

  it('never serves controllable ice pieces in solo queue', () => {
    const match = createMatch({ seed: 211, mode: 'solo' });
    const player = match.players[0];

    for (let index = 0; index < 28; index += 1) {
      if (player.activePiece) {
        expect(player.activePiece.kind).not.toBe('ice');
        lockActivePiece(match, 0, 'drop');
      }
      stepMatch(match);
    }

    expect(player.queue.some((piece) => piece === 'ice')).toBe(false);
  });

  it('uses solo and versus board dimensions from mode defaults', () => {
    const solo = createMatch({ seed: 901, mode: 'solo' });
    const versus = createMatch({ seed: 902, mode: 'versus' });

    expect(solo.players[0].controlGrid.width).toBe(6);
    expect(solo.players[0].controlGrid.height).toBe(6);
    expect(solo.players[0].board.width).toBe(18);
    expect(solo.players[0].board.height).toBe(18);
    expect(versus.players[0].board.width).toBe(10);
    expect(versus.players[0].board.height).toBe(10);
  });

  it('stages solo special piece unlocks by placed-piece thresholds', () => {
    const match = createMatch({ seed: 903, mode: 'solo' });
    const player = match.players[0];

    player.piecesPlaced = 0;
    player.queue = [];
    refillQueue(player, 'solo');
    expect(player.queue.every((piece) => piece !== 'water' && piece !== 'fire' && piece !== 'bomb' && piece !== 'trench' && piece !== 'pit')).toBe(true);

    player.piecesPlaced = 5;
    let sawWater = false;
    for (let index = 0; index < 12; index += 1) {
      player.queue = [];
      refillQueue(player, 'solo');
      if (player.queue.includes('water')) {
        sawWater = true;
        break;
      }
    }
    expect(sawWater).toBe(true);

    player.piecesPlaced = 8;
    let sawFire = false;
    for (let index = 0; index < 20; index += 1) {
      player.queue = [];
      refillQueue(player, 'solo');
      if (player.queue.includes('fire')) {
        sawFire = true;
        break;
      }
    }
    expect(sawFire).toBe(true);

    player.piecesPlaced = 12;
    let sawDowner = false;
    for (let index = 0; index < 20; index += 1) {
      player.queue = [];
      refillQueue(player, 'solo');
      if (player.queue.includes('trench') || player.queue.includes('pit')) {
        sawDowner = true;
        break;
      }
    }
    expect(sawDowner).toBe(true);

    player.piecesPlaced = 18;
    let sawBomb = false;
    for (let index = 0; index < 28; index += 1) {
      player.queue = [];
      refillQueue(player, 'solo');
      if (player.queue.includes('bomb')) {
        sawBomb = true;
        break;
      }
    }
    expect(sawBomb).toBe(true);
  });

  it('biases the solo queue toward fire once a lake is primed', () => {
    const shapingMatch = createMatch({ seed: 906, mode: 'solo' });
    const shapingPlayer = shapingMatch.players[0];
    shapingPlayer.piecesPlaced = SOLO_V2_CONFIG.progression.fireUnlockPiecesPlaced;
    shapingPlayer.queue = [];
    shapingPlayer.activePiece = null;
    shapingPlayer.recentPieces = [];

    let shapingWater = 0;
    let shapingFire = 0;
    for (let index = 0; index < 30; index += 1) {
      shapingPlayer.queue = [];
      refillQueue(shapingPlayer, 'solo');
      shapingWater += shapingPlayer.queue.filter((piece) => piece === 'water').length;
      shapingFire += shapingPlayer.queue.filter((piece) => piece === 'fire').length;
    }

    const primedMatch = createMatch({ seed: 906, mode: 'solo' });
    const primedPlayer = primedMatch.players[0];
    primedPlayer.piecesPlaced = SOLO_V2_CONFIG.progression.bombUnlockPiecesPlaced;
    primedPlayer.queue = [];
    primedPlayer.activePiece = null;
    primedPlayer.recentPieces = [];
    primedPlayer.primedLakes = 1;
    primedPlayer.primedWater = 4;
    primedPlayer.capturedLakes = 1;

    let primedWater = 0;
    let primedFire = 0;
    for (let index = 0; index < 30; index += 1) {
      primedPlayer.queue = [];
      refillQueue(primedPlayer, 'solo');
      primedWater += primedPlayer.queue.filter((piece) => piece === 'water').length;
      primedFire += primedPlayer.queue.filter((piece) => piece === 'fire').length;
    }

    expect(shapingWater).toBeGreaterThan(shapingFire);
    expect(primedFire).toBeGreaterThan(primedWater);
  });

  it('does not reduce drain level from ordinary fire evaporation', () => {
    const match = createMatch({ seed: 904, mode: 'solo' });
    const player = match.players[0];
    for (let y = 1; y <= 3; y += 1) {
      for (let x = 1; x <= 3; x += 1) {
        player.board.cells[(y * player.board.width) + x]!.height = x === 1 || x === 3 || y === 1 || y === 3 ? 3 : 0;
      }
    }
    player.board.cells[(2 * player.board.width) + 2]!.water = 3;
    player.drainLevel = 42;
    player.stability = player.drainMax - 42;
    for (let tick = 0; tick < LAKE_STABLE_TICKS + 1; tick += 1) {
      stepMatch(match);
    }
    player.activePiece = {
      id: 'drain-fire-check',
      kind: 'fire',
      rotation: 0,
      anchor: { x: 2, y: 2 },
      ticksRemaining: 1,
    };

    lockActivePiece(match, 0, 'drop');
    expect(player.drainLevel).toBe(42);
  });

  it('bigger drain bonus increases capacity without changing current fill', () => {
    const match = createMatch({ seed: 905, mode: 'solo' });
    const player = match.players[0];
    player.drainLevel = 80;
    player.stability = player.drainMax - 80;
    match.soloBonusBoard!.activeBonuses.push({
      kind: 'bigger_drain',
      remainingTicks: 30,
    });

    stepMatch(match);

    expect(player.drainMax).toBe(125);
    expect(player.drainLevel).toBe(80);
  });

  it('rotates terrain pieces around their center to avoid jumpy anchor shifts', () => {
    const match = createMatch({ seed: 601, mode: 'solo' });
    const player = match.players[0];
    player.activePiece = {
      id: 'rotate-center',
      kind: 'corner',
      rotation: 0,
      anchor: { x: 2, y: 2 },
      ticksRemaining: 20,
    };

    const beforeCells = getPieceCells(player.activePiece.kind, player.activePiece.rotation);
    const beforeCenter = {
      x: player.activePiece.anchor.x + ((Math.min(...beforeCells.map((cell) => cell.x)) + Math.max(...beforeCells.map((cell) => cell.x))) / 2),
      y: player.activePiece.anchor.y + ((Math.min(...beforeCells.map((cell) => cell.y)) + Math.max(...beforeCells.map((cell) => cell.y))) / 2),
    };

    applyPlayerCommand(match, { type: 'rotate', slot: 0, delta: 1 });
    const rotatedPiece = player.activePiece!;
    const afterCells = getPieceCells(rotatedPiece.kind, rotatedPiece.rotation);
    const afterCenter = {
      x: rotatedPiece.anchor.x + ((Math.min(...afterCells.map((cell) => cell.x)) + Math.max(...afterCells.map((cell) => cell.x))) / 2),
      y: rotatedPiece.anchor.y + ((Math.min(...afterCells.map((cell) => cell.y)) + Math.max(...afterCells.map((cell) => cell.y))) / 2),
    };

    expect(Math.abs(beforeCenter.x - afterCenter.x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(beforeCenter.y - afterCenter.y)).toBeLessThanOrEqual(0.5);
  });

  it('keeps the full solo lock window after moving a piece', () => {
    const match = createMatch({ seed: 602, mode: 'solo' });
    const player = match.players[0];
    player.activePiece = {
      id: 'solo-lock-window',
      kind: 'ridge',
      rotation: 0,
      anchor: { x: 1, y: 1 },
      ticksRemaining: SOLO_PIECE_LOCK_TICKS_CALM,
    };

    applyPlayerCommand(match, { type: 'move', slot: 0, dx: 1, dy: 0 });

    expect(player.activePiece?.anchor.x).toBeCloseTo(1 + (1 / 3));
    expect(player.activePiece?.ticksRemaining).toBe(SOLO_PIECE_LOCK_TICKS_CALM);
  });

  it('moves solo terrain pieces by one simulation cell per input instead of a full 3x3 patch', () => {
    const match = createMatch({ seed: 606, mode: 'solo' });
    const player = match.players[0];
    player.activePiece = {
      id: 'solo-step-size',
      kind: 'square',
      rotation: 0,
      anchor: { x: 1, y: 1 },
      ticksRemaining: SOLO_PIECE_LOCK_TICKS_CALM,
    };

    applyPlayerCommand(match, { type: 'move', slot: 0, dx: 1, dy: 0 });
    applyPlayerCommand(match, { type: 'move', slot: 0, dx: 0, dy: 1 });

    expect(player.activePiece?.anchor.x).toBeCloseTo(1 + (1 / 3));
    expect(player.activePiece?.anchor.y).toBeCloseTo(1 + (1 / 3));
  });

  it('does not award versus-style speed drop score in solo', () => {
    const match = createMatch({ seed: 603, mode: 'solo' });
    const player = match.players[0];
    player.activePiece = {
      id: 'solo-drop-score',
      kind: 'ridge',
      rotation: 0,
      anchor: { x: 1, y: 1 },
      ticksRemaining: SOLO_PIECE_LOCK_TICKS_CALM,
    };

    lockActivePiece(match, 0, 'drop');

    expect(player.score).toBe(0);
  });
});
