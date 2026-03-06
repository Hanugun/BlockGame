import {
  COMBO_WINDOW_TICKS,
  MATCH_DURATION_TICKS,
  MIN_WATER_THRESHOLD,
  PIECE_SPAWN_DELAY_TICKS,
} from '../constants.js';
import { SOLO_V2_CONFIG } from '../config/solo-v2-config.js';
import { getPieceDefinition } from '../rules/pieces.js';
import type {
  BoardState,
  LockReason,
  MatchState,
  PendingAttack,
  PlayerSlot,
  Vec2,
} from '../types.js';
import { getCell, isInBounds, roundWater } from '../utils/board.js';
import {
  controlToSimulationCenter,
  expandControlCellsToSimulation,
} from '../utils/grid.js';
import { nextRandom, type RandomState } from '../utils/rng.js';
import { refillQueue, spawnNextPiece } from './create-match.js';
import {
  addTerrainStress,
  applyAttack,
  applyBombPiece,
  applyFirePiece,
  applyIcePiece,
  applyTerrainPiece,
  applyWaterPiece,
  evaluateLakes,
  growTerrainCells,
  relieveTerrainStress,
  runWaterSimulation,
  sampleCells,
  triggerEarthquake,
  updateBoardMetrics,
  type FireResolution,
} from './match-step-board.js';
import {
  claimSoloBonusCell,
  claimVersusCell,
  hasSoloBonus,
  tickSoloBonuses,
  updateSoloBonuses,
} from './match-step-bonus.js';
import {
  absoluteCells,
  activeSlots,
  attackLabel,
  createEvent,
  getPhaseForProgress,
  getProgressTicks,
  getStormInterval,
  getStormSpec,
  isPilot,
} from './match-step-shared.js';

function resolveAttacks(state: MatchState, slot: PlayerSlot): void {
  const player = state.players[slot];
  const remaining: PendingAttack[] = [];
  for (const attack of player.pendingAttacks) {
    attack.etaTicks -= 1;
    if (attack.etaTicks > 0) {
      remaining.push(attack);
      continue;
    }
    player.rng = applyAttack(player.board, attack.kind, attack.power, player.rng);
    createEvent(
      state,
      slot,
      'attack_impact',
      `${player.name} absorbed ${attackLabel(attack.kind)}.`,
      { attackKind: attack.kind, amount: attack.power },
    );
  }
  player.pendingAttacks = remaining;
}

function updateMatchPhase(state: MatchState): void {
  const progressTicks = getProgressTicks(state);
  const nextPhase = getPhaseForProgress(progressTicks);
  state.stormLevel = Math.min(100, Math.round((progressTicks / MATCH_DURATION_TICKS) * 100));
  if (state.phase === nextPhase) {
    return;
  }

  state.phase = nextPhase;
  state.stormTicksUntilPulse = Math.min(state.stormTicksUntilPulse, getStormInterval(nextPhase, state.mode));
  for (const slot of activeSlots(state)) {
    createEvent(
      state,
      slot,
      'phase_changed',
      state.mode === 'solo'
        ? nextPhase === 'surge'
          ? 'Solo pressure is rising. Rain bursts arrive faster now.'
          : 'Final stretch: rain intensifies and pieces lock faster.'
        : nextPhase === 'surge'
          ? 'VS pressure is rising. Attack timers are tightening.'
          : 'Final pressure: attack timers and rain both accelerate.',
      { phase: nextPhase },
    );
    if (state.mode === 'solo' && nextPhase === 'surge') {
      createEvent(
        state,
        slot,
        'system_unlock',
        'Warning: drifting mines can now appear in storm fronts.',
        { phase: nextPhase },
      );
    }
    if (state.mode === 'solo' && nextPhase === 'tempest') {
      createEvent(
        state,
        slot,
        'system_unlock',
        'Warning: ice strikes are now active in the storm.',
        { phase: nextPhase },
      );
    }
  }
}

function getSoloRainFront(board: BoardState, randomState: RandomState, phase: MatchState['phase']): { center: Vec2; targets: Vec2[] } {
  const center = {
    x: 1 + Math.floor(nextRandom(randomState) * (board.width - 2)),
    y: 1 + Math.floor(nextRandom(randomState) * (board.height - 2)),
  };
  const offsets: Vec2[] = phase === 'tempest'
    ? [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
        { x: 1, y: -1 },
      ]
    : phase === 'surge'
      ? [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
          { x: 1, y: 1 },
        ]
      : [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
        ];

  const seen = new Set<string>();
  const targets: Vec2[] = [];
  for (const offset of offsets) {
    const x = center.x + offset.x;
    const y = center.y + offset.y;
    if (!isInBounds(board, x, y)) {
      continue;
    }
    const key = `${x},${y}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    targets.push({ x, y });
  }
  return { center, targets };
}

function applyStormPulse(state: MatchState): void {
  const spec = getStormSpec(state.phase, state.mode);
  for (const slot of activeSlots(state)) {
    const player = state.players[slot];
    const randomState: RandomState = { seed: player.rng };
    let pulseTargets = sampleCells(player.board, randomState, spec.cells);

    if (state.mode === 'solo') {
      const rainFront = getSoloRainFront(player.board, randomState, state.phase);
      pulseTargets = rainFront.targets;
      const totalPulse = spec.cells * spec.water;
      const pulsePerCell = pulseTargets.length > 0 ? totalPulse / pulseTargets.length : totalPulse;
      for (const position of pulseTargets) {
        const cell = getCell(player.board, position.x, position.y);
        cell.water = roundWater(cell.water + pulsePerCell);
      }
      createEvent(
        state,
        slot,
        'storm_pulse',
        `Rain front struck ${pulseTargets.length} nearby tiles.`,
        { amount: totalPulse, phase: state.phase },
      );
    } else {
      for (const position of pulseTargets) {
        const cell = getCell(player.board, position.x, position.y);
        cell.water = roundWater(cell.water + spec.water);
      }
    }

    if (state.mode === 'solo') {
      const mineChance = state.phase === 'tempest' ? 0.2 : state.phase === 'surge' ? 0.14 : 0;
      const iceChance = state.phase === 'tempest' ? 0.18 : 0;
      if (nextRandom(randomState) <= mineChance) {
        const candidates = pulseTargets.length > 0 ? pulseTargets : sampleCells(player.board, randomState, 4);
        const target = candidates.find((position) => {
          const cell = getCell(player.board, position.x, position.y);
          return cell.water > 0.4 && cell.mineTicks <= 0;
        });
        if (target) {
          getCell(player.board, target.x, target.y).mineTicks = 120;
          createEvent(
            state,
            slot,
            'storm_pulse',
            `A drifting mine settled in ${player.name}'s basin.`,
            { phase: state.phase },
          );
        }
      }
      if (nextRandom(randomState) <= iceChance) {
        const candidates = pulseTargets.length > 0 ? pulseTargets : sampleCells(player.board, randomState, 4);
        const target = candidates.find((position) => {
          const cell = getCell(player.board, position.x, position.y);
          return cell.water > 0.3;
        });
        if (target) {
          const cell = getCell(player.board, target.x, target.y);
          cell.frozenTicks = Math.max(cell.frozenTicks, 18);
          createEvent(
            state,
            slot,
            'storm_pulse',
            `A random ice cube froze part of ${player.name}'s water.`,
            { phase: state.phase },
          );
        }
      }
    }
    player.rng = randomState.seed;
    if (state.mode !== 'solo') {
      createEvent(
        state,
        slot,
        'storm_pulse',
        `A ${state.phase} squall dumped water across ${player.name}'s basin.`,
        { amount: spec.water, phase: state.phase },
      );
    }
  }
}

function syncSoloDrainCapacity(state: MatchState, slot: PlayerSlot): void {
  if (state.mode !== 'solo') {
    return;
  }
  const player = state.players[slot];
  if (!isPilot(player)) {
    return;
  }
  const multiplier = hasSoloBonus(state, 'bigger_drain') ? SOLO_V2_CONFIG.drain.biggerDrainMaxMultiplier : 1;
  player.drainMax = roundWater(SOLO_V2_CONFIG.drain.maxValue * multiplier);
  player.drainLevel = roundWater(Math.min(player.drainLevel, player.drainMax));
  player.stability = Math.max(0, Math.round(player.drainMax - player.drainLevel));
}

function maybeRunSoloBossAttack(state: MatchState): void {
  if (state.mode !== 'solo' || state.soloVariant !== 'story') {
    return;
  }
  const checkpoints = SOLO_V2_CONFIG.story.bossAttackCheckpoints;
  const nextIndex = state.soloBossAttackIndex;
  if (nextIndex >= checkpoints.length) {
    return;
  }
  const progress = getProgressTicks(state) / MATCH_DURATION_TICKS;
  if (progress < checkpoints[nextIndex]!) {
    return;
  }

  const player = state.players[0];
  const power = Math.min(3, 1 + nextIndex);
  const kind = nextIndex % 2 === 0 ? 'bomb_attack' : 'downer_attack';
  player.rng = applyAttack(player.board, kind, power, player.rng);
  state.soloBossAttackIndex += 1;
  createEvent(
    state,
    0,
    'boss_attack',
    `Boss attack wave ${state.soloBossAttackIndex} damaged your terrain.`,
    { amount: power },
  );
}

function resolveMatchWinner(state: MatchState): void {
  if (state.winner !== null) {
    return;
  }

  if (state.mode === 'solo') {
    const pilot = state.players[0];
    if (pilot.stability <= 0) {
      state.winner = 1;
      state.status = 'complete';
      createEvent(state, 0, 'winner_declared', `${pilot.name}'s basin collapsed.`);
      return;
    }
    if (state.remainingTicks <= 0 && state.soloVariant !== 'endless') {
      state.winner = 0;
      state.status = 'complete';
      createEvent(
        state,
        0,
        'winner_declared',
        `${pilot.name} cleared the Aqua Aqua solo run.`,
      );
    }
    return;
  }

  const [left, right] = state.players;
  if (left.stability <= 0 && right.stability <= 0) {
    state.winner = left.score >= right.score ? 0 : 1;
  } else if (left.stability <= 0) {
    state.winner = 1;
  } else if (right.stability <= 0) {
    state.winner = 0;
  } else if (state.remainingTicks <= 0) {
    if (left.score === right.score) {
      state.winner = left.stability >= right.stability ? 0 : 1;
    } else {
      state.winner = left.score >= right.score ? 0 : 1;
    }
  } else {
    return;
  }

  state.status = 'complete';
  const winner = state.winner;
  createEvent(state, winner, 'winner_declared', `${state.players[winner].name} wins the match.`);
}

export function lockActivePiece(state: MatchState, slot: PlayerSlot, reason: LockReason): void {
  const player = state.players[slot];
  const activePiece = player.activePiece;
  if (!activePiece || !isPilot(player)) {
    return;
  }
  const speedDropBonus = reason === 'drop'
    ? Math.max(0, Math.round(Math.max(0, activePiece.ticksRemaining - 1) * 8))
    : 0;

  const controlCells = absoluteCells(activePiece.kind, activePiece.rotation, activePiece.anchor);
  const simulationCells = expandControlCellsToSimulation(player.board, controlCells, player.cellScale);
  if (activePiece.kind === 'water' || activePiece.kind === 'bomb' || activePiece.kind === 'fire' || activePiece.kind === 'ice') {
    const anchorControlCell = controlCells[0] ?? activePiece.anchor;
    const simulationCenter = controlToSimulationCenter(anchorControlCell, player.cellScale);
    let fireResolution: FireResolution | null = null;
    switch (activePiece.kind) {
      case 'water':
        applyWaterPiece(player.board, simulationCenter);
        break;
      case 'bomb':
        relieveTerrainStress(player, applyBombPiece(player.board, simulationCenter) * 1.8);
        break;
      case 'fire':
        fireResolution = applyFirePiece(player, simulationCenter);
        relieveTerrainStress(player, fireResolution.terrainRemoved * 1.25);
        break;
      case 'ice':
        applyIcePiece(player.board, simulationCenter);
        break;
      default:
        activePiece.kind satisfies never;
        break;
    }
    player.stats.specialsUsed[activePiece.kind] += 1;
    if (fireResolution && fireResolution.evaporated > MIN_WATER_THRESHOLD) {
      const scoreGain = Math.round(fireResolution.scoreGain * (state.mode === 'solo' ? player.scoreMultiplier : 1));
      player.score += scoreGain;
      if (fireResolution.harvestedLakes > 0) {
        player.combo = player.comboTicksRemaining > 0 ? player.combo + 1 : 1;
        player.comboTicksRemaining = COMBO_WINDOW_TICKS;
        player.capturedLakes += fireResolution.harvestedLakes;
        player.stats.lakesCaptured += fireResolution.harvestedLakes;
        player.largestLake = Math.max(player.largestLake, roundWater(fireResolution.largestHarvest));
        createEvent(
          state,
          slot,
          'lake_captured',
          `${player.name} banked ${fireResolution.primedEvaporated.toFixed(1)} water for ${scoreGain} points.`,
          { amount: scoreGain, focus: 'fire' },
        );
        if (player.combo > 1) {
          player.stats.comboBursts += 1;
          createEvent(
            state,
            slot,
            'combo_extended',
            `${player.name} chained to x${player.combo} harvest pressure.`,
            { amount: player.combo },
            );
          }
        if (state.mode === 'versus') {
          claimVersusCell(
            state,
            slot,
            fireResolution.focusCell ?? simulationCenter,
            Math.max(1, Math.min(3, Math.round(fireResolution.primedEvaporated / 2.5))),
          );
        } else {
          claimSoloBonusCell(
            state,
            slot,
            fireResolution.focusCell ?? simulationCenter,
          );
        }
      }
      if (fireResolution.harvestedLakes === 0) {
        createEvent(
          state,
          slot,
          'lake_captured',
          `${player.name} evaporated ${fireResolution.evaporated.toFixed(1)} water.`,
          { amount: fireResolution.evaporated, focus: 'fire' },
        );
      }
    }
  } else {
    const terrainDefinition = getPieceDefinition(activePiece.kind);
    const terrainCells = state.mode === 'solo' && terrainDefinition.terrainMode === 'raise' && hasSoloBonus(state, 'bigger_earth')
      ? growTerrainCells(player.board, simulationCells)
      : simulationCells;
    const terrainResolution = applyTerrainPiece(player.board, activePiece.kind, terrainCells);
    if (terrainResolution.raised > 0) {
      addTerrainStress(player, terrainResolution.raised * 0.9);
    }
    if (terrainResolution.lowered > 0) {
      relieveTerrainStress(player, terrainResolution.lowered * 1.7);
    }
    player.stats.terrainPlaced += 1;
  }
  if (speedDropBonus > 0) {
    player.score += speedDropBonus;
  }

  player.activePiece = null;
  player.piecesPlaced += 1;
  if (state.mode === 'solo') {
    if (player.piecesPlaced === SOLO_V2_CONFIG.progression.waterUnlockPiecesPlaced) {
      createEvent(state, slot, 'system_unlock', 'System unlock: Water pieces entered the queue.');
    }
    if (player.piecesPlaced === SOLO_V2_CONFIG.progression.fireUnlockPiecesPlaced) {
      createEvent(state, slot, 'system_unlock', 'System unlock: Fireball pieces entered the queue.');
    }
    if (player.piecesPlaced === SOLO_V2_CONFIG.progression.bombUnlockPiecesPlaced) {
      createEvent(state, slot, 'system_unlock', 'System unlock: Bomb pieces entered the queue.');
    }
  }
  player.spawnCooldownTicks = PIECE_SPAWN_DELAY_TICKS;
  refillQueue(player, state.mode);
  createEvent(
    state,
    slot,
    'piece_locked',
    `${player.name} placed ${activePiece.kind} via ${reason}${speedDropBonus > 0 ? ` (+${speedDropBonus} speed bonus)` : ''}.`,
    { pieceKind: activePiece.kind, anchor: activePiece.anchor },
  );
}

export function stepMatch(state: MatchState): void {
  if (state.status !== 'active') {
    return;
  }

  state.tick += 1;
  state.events = [];
  const timeStopActive = state.mode === 'solo' && hasSoloBonus(state, 'time_stop');
  const slowActive = state.mode === 'solo' && hasSoloBonus(state, 'slow');

  if (!timeStopActive) {
    state.remainingTicks = Math.max(0, state.remainingTicks - 1);
    updateMatchPhase(state);
  } else {
    state.stormLevel = Math.min(100, Math.round((getProgressTicks(state) / MATCH_DURATION_TICKS) * 100));
  }

  if (!timeStopActive) {
    state.stormTicksUntilPulse -= 1;
    if (state.stormTicksUntilPulse <= 0) {
      applyStormPulse(state);
      state.stormTicksUntilPulse = getStormInterval(state.phase, state.mode);
    }
    maybeRunSoloBossAttack(state);
  }

  for (const slot of [0, 1] as const) {
    const player = state.players[slot];
    if (!isPilot(player)) {
      updateBoardMetrics(player);
      continue;
    }

    if (player.comboTicksRemaining > 0) {
      player.comboTicksRemaining -= 1;
      if (player.comboTicksRemaining === 0) {
        player.combo = 0;
      }
    }
    player.attackMeter = 0;

    if (state.phase !== 'calm' && !timeStopActive) {
      player.stats.stormTicks += 1;
    }

    resolveAttacks(state, slot);

    if (player.activePiece) {
      player.activePiece.ticksRemaining -= slowActive ? (state.tick % 2 === 0 ? 0 : 1) : 1;
      if (player.activePiece.ticksRemaining <= 0) {
        lockActivePiece(state, slot, 'timer');
      }
    } else if (player.spawnCooldownTicks > 0) {
      player.spawnCooldownTicks -= 1;
    } else {
      spawnNextPiece(player, state.mode, state.phase);
    }

    syncSoloDrainCapacity(state, slot);
    runWaterSimulation(player, 1);
    triggerEarthquake(state, slot);
    if (player.overflowLastTick > MIN_WATER_THRESHOLD) {
      createEvent(
        state,
        slot,
        'overflow',
        `${player.name} leaked ${player.overflowLastTick.toFixed(2)} water.`,
        { amount: player.overflowLastTick },
      );
      if (player.overflowLastTick >= 1.2) {
        player.combo = 0;
        player.comboTicksRemaining = 0;
      }
    } else if (player.stability >= 72) {
      player.stats.stableTicks += 1;
    }

    evaluateLakes(state, slot, updateSoloBonuses);
    updateBoardMetrics(player);
  }

  tickSoloBonuses(state);
  resolveMatchWinner(state);
}
