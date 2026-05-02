import { Injectable } from '@nestjs/common';

export interface EloResult {
  newElo: number;
  delta: number;
}

@Injectable()
export class EloService {
  private static readonly K_NEW = 40;       // < 30 games
  private static readonly K_NORMAL = 20;    // default
  private static readonly K_ESTABLISHED = 10; // >= 2400 ELO

  expectedScore(playerElo: number, opponentElo: number): number {
    return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  }

  calculate(
    currentElo: number,
    opponentElo: number,
    won: boolean,
    gamesPlayed: number,
  ): EloResult {
    const k = this.kFactor(currentElo, gamesPlayed);
    const expected = this.expectedScore(currentElo, opponentElo);
    const actual = won ? 1 : 0;
    const delta = Math.round(k * (actual - expected));
    const newElo = Math.max(100, currentElo + delta);
    return { newElo, delta };
  }

  isWithinRange(eloA: number, eloB: number, range: number): boolean {
    return Math.abs(eloA - eloB) <= range;
  }

  private kFactor(elo: number, gamesPlayed: number): number {
    if (gamesPlayed < 30) return EloService.K_NEW;
    if (elo >= 2400) return EloService.K_ESTABLISHED;
    return EloService.K_NORMAL;
  }
}
