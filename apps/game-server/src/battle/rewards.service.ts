import { Injectable } from '@nestjs/common';
import { BattleRewards } from './battle-log.service';

const BASE_MINERALS_WIN = 150;
const BASE_MINERALS_LOSE = 40;
const BASE_GAS_WIN = 75;
const BASE_GAS_LOSE = 20;
const BASE_XP_WIN = 200;
const BASE_XP_LOSE = 80;
const QUICK_WIN_TURNS = 10;
const LONG_FIGHT_TURNS = 25;

@Injectable()
export class RewardsService {
  calculate(
    isWinner: boolean,
    totalTurns: number,
    eloDelta: number,
    isPvE: boolean,
  ): BattleRewards {
    const bonuses: string[] = [];
    let mineralMult = 1;
    let gasMult = 1;
    let xpMult = 1;

    if (isWinner) {
      if (totalTurns <= QUICK_WIN_TURNS) {
        mineralMult = 1.5;
        gasMult = 1.5;
        bonuses.push('quick_victory');
      } else if (totalTurns >= LONG_FIGHT_TURNS) {
        xpMult = 1.5;
        bonuses.push('epic_battle');
      }

      if (eloDelta > 30) {
        mineralMult *= 1.2;
        bonuses.push('upset_victory');
      }
    }

    if (isPvE) {
      xpMult *= 0.6;
    }

    const base = isWinner
      ? { minerals: BASE_MINERALS_WIN, gas: BASE_GAS_WIN, xp: BASE_XP_WIN }
      : { minerals: BASE_MINERALS_LOSE, gas: BASE_GAS_LOSE, xp: BASE_XP_LOSE };

    return {
      minerals: Math.round(base.minerals * mineralMult),
      gas: Math.round(base.gas * gasMult),
      xp: Math.round(base.xp * xpMult),
      eloDelta,
      bonuses,
    };
  }
}
