import { getSoloBonusReward, type MatchState } from '../lib/core.js';

export function buildTacticalTips(match: MatchState, localSlot: 0 | 1 | null): string[] {
  const player = localSlot === null ? match.players[0] : match.players[localSlot];
  const tips: string[] = [];
  const soloBonusBoard = match.soloBonusBoard;

  if (player.primedLakes > 0) {
    tips.push(`${player.primedLakes} sealed basin${player.primedLakes > 1 ? 's are' : ' is'} ready. Use Fireball to bank ${player.primedWater.toFixed(1)} water before the next leak.`);
  } else if (player.storedWater >= 4) {
    tips.push('You have water on the field but it is not fully sealed yet. Finish the walls before spending Fireball.');
  }

  if (match.mode === 'solo' && player.lakeMates > 0) {
    tips.push(`Lake Mate bonus active on ${player.lakeMates} basin${player.lakeMates > 1 ? 's' : ''}. Deep lakes are now worth more when you bank them.`);
  }
  if (match.mode === 'solo' && player.rainbowActive) {
    tips.push('Rainbow bonus is live. Keep the reservoirs sealed and bank them before the board destabilizes.');
  }
  if (match.mode === 'solo' && soloBonusBoard) {
    const markedCells = soloBonusBoard.cells.filter(Boolean).length;
    if (markedCells >= 12) {
      tips.push('The solo bingo card is almost full. One more accurate Fireball can turn this run into a bonus streak.');
    }
    if (soloBonusBoard.activeBonuses.length > 0) {
      const primaryBonus = getSoloBonusReward(soloBonusBoard.activeBonuses[0]!.kind).label;
      tips.push(`${primaryBonus} is live. Press the score window while that bonus timer is still active.`);
    }
  }
  if (player.quakeMeter >= 60) {
    tips.push('Earthquake pressure is building. Use a Downer, Bomb, or Fireball on dry land before the board starts collapsing.');
  }
  if (player.drainLevel >= player.drainMax * 0.55) {
    tips.push('Drain tube is rising fast. Seal leaks now; this meter is cumulative and does not naturally recover.');
  }
  if (player.boardRisk >= 65) {
    tips.push('Your basin is unstable. Seal an edge or freeze exposed water before investing in a larger lake.');
  }
  const holeCells = player.board.cells.filter((cell) => cell.holeDepth > 0).length;
  if (holeCells > 0) {
    tips.push(`Crater leak alert: ${holeCells} hole cell${holeCells > 1 ? 's are' : ' is'} open. Place Upper pieces near holes to repair them.`);
  }
  if (player.pendingAttacks.length > 0) {
    tips.push(`Inbound pressure arrives in ${Math.min(...player.pendingAttacks.map((attack) => attack.etaTicks)) / 10}s. Keep one wall piece flexible.`);
  }
  const liveMines = player.board.cells.filter((cell) => cell.mineTicks > 0).length;
  if (liveMines > 0) {
    tips.push(`Mine alert: ${liveMines} cell${liveMines > 1 ? 's are' : ' is'} mined. Fireballing mined water can detonate terrain.`);
  }
  if (match.mode !== 'solo' && match.versusBoard) {
    const openCells = match.versusBoard.cells.filter((cell) => cell === null).length;
    if (openCells <= 4) {
      tips.push('The VS board is getting tight. Cash out a lake in the row or column that denies the opponent a line.');
    } else {
      tips.push('In versus, banking a lake is about board position, not just points. Aim the fireball at a useful `3x3` region.');
    }
  }
  if (match.phase === 'tempest') {
    tips.push(match.mode === 'solo'
      ? 'Final Basin accelerates rain bursts. Low, wide basins are safer than exposed towers right now.'
      : 'Sudden Flood accelerates both rain and attack arrivals. Low, wide basins are safer than exposed towers right now.');
  }

  while (tips.length < 3) {
    tips.push('Treat Fireball as your cash-out tool, not your repair tool. If the basin is not sealed yet, spend the next terrain piece on the rim first.');
  }

  return tips.slice(0, 3);
}
