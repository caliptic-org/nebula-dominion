import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateBattleLogDto {
  matchId: string;
  roomId: string;
  mode: string;
  winnerId: string;
  loserId: string;
  winnerRace: string;
  loserRace: string;
  winnerEloGain: number;
  loserEloLoss: number;
  totalTurns: number;
  durationMs: number;
  endReason: string;
  rewards: Record<string, BattleRewards>;
}

export interface BattleRewards {
  minerals: number;
  gas: number;
  xp: number;
  eloDelta: number;
  bonuses: string[];
}

@Injectable()
export class BattleLogService {
  private readonly logger = new Logger(BattleLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(data: CreateBattleLogDto): Promise<void> {
    try {
      await this.prisma.battleLog.create({ data });
      this.logger.log(`Battle logged: match=${data.matchId} winner=${data.winnerId}`);
    } catch (err) {
      // Log failure must not crash the game
      this.logger.error(`Failed to persist battle log for match ${data.matchId}`, err);
    }
  }

  async getPlayerHistory(userId: string, limit = 20) {
    return this.prisma.battleLog.findMany({
      where: { OR: [{ winnerId: userId }, { loserId: userId }] },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
