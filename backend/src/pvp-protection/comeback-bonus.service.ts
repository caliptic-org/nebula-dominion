import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ComebackBonus, ComebackBonusStatus } from './entities/comeback-bonus.entity';
import { PvpMatchRecord, PvpMatchResult } from './entities/pvp-match-record.entity';

const CONSECUTIVE_LOSS_THRESHOLD = 3;
const BONUS_TTL_HOURS = 24;
const BONUS_MINERAL = 1000;
const BONUS_GAS = 500;

export interface RecordMatchResultDto {
  playerId: string;
  battleId: string;
  result: PvpMatchResult;
  isBotMatch: boolean;
  opponentId: string | null;
  playerPowerScore: number;
}

@Injectable()
export class ComebackBonusService {
  private readonly logger = new Logger(ComebackBonusService.name);

  constructor(
    @InjectRepository(PvpMatchRecord)
    private readonly recordRepo: Repository<PvpMatchRecord>,
    @InjectRepository(ComebackBonus)
    private readonly bonusRepo: Repository<ComebackBonus>,
  ) {}

  async recordMatchResult(dto: RecordMatchResultDto): Promise<{
    comebackBonusGranted: boolean;
    comebackBonus: ComebackBonus | null;
  }> {
    // Use a transaction with a per-player advisory lock to eliminate the
    // read-then-increment race condition. Two concurrent match results for
    // the same player will queue behind the lock instead of both reading
    // consecutiveLosses=0 and both writing 1.
    return this.recordRepo.manager.transaction(async (em: EntityManager) => {
      // pg_advisory_xact_lock releases automatically when the transaction ends
      await em.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [dto.playerId]);

      // Compute consecutive losses by counting from actual records rather than
      // trusting a stored counter (avoids stale-read race conditions)
      const consecutiveLosses = await this.countConsecutiveLosses(em, dto.playerId, dto.result);

      let comebackBonus: ComebackBonus | null = null;
      let bonusGranted = false;

      if (consecutiveLosses === CONSECUTIVE_LOSS_THRESHOLD) {
        const existingPending = await em.findOne(ComebackBonus, {
          where: { playerId: dto.playerId, status: ComebackBonusStatus.PENDING },
        });

        if (!existingPending) {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + BONUS_TTL_HOURS);

          comebackBonus = await em.save(
            em.create(ComebackBonus, {
              playerId: dto.playerId,
              triggerBattleId: dto.battleId,
              status: ComebackBonusStatus.PENDING,
              mineralReward: BONUS_MINERAL,
              gasReward: BONUS_GAS,
              freeHeal: true,
              expiresAt,
            }),
          );
          bonusGranted = true;
          this.logger.log(
            `Comeback bonus granted to player ${dto.playerId} after ${consecutiveLosses} consecutive losses`,
          );
        }
      }

      await em.save(
        em.create(PvpMatchRecord, {
          playerId: dto.playerId,
          battleId: dto.battleId,
          opponentId: dto.opponentId,
          isBotMatch: dto.isBotMatch,
          result: dto.result,
          consecutiveLosses,
          playerPowerScore: dto.playerPowerScore,
          comebackBonusGranted: bonusGranted,
        }),
      );

      return { comebackBonusGranted: bonusGranted, comebackBonus };
    });
  }

  /** Count consecutive losses from actual DB records rather than a stored counter.
   *  Must be called inside the advisory-locked transaction for accuracy. */
  private async countConsecutiveLosses(
    em: EntityManager,
    playerId: string,
    currentResult: PvpMatchResult,
  ): Promise<number> {
    if (currentResult !== PvpMatchResult.LOSS) return 0;

    const recentRecords = await em.find(PvpMatchRecord, {
      where: { playerId },
      order: { createdAt: 'DESC' },
      take: CONSECUTIVE_LOSS_THRESHOLD,
    });

    // Count the current loss plus any preceding consecutive losses
    let count = 1;
    for (const record of recentRecords) {
      if (record.result === PvpMatchResult.LOSS) {
        count++;
      } else {
        break;
      }
      if (count >= CONSECUTIVE_LOSS_THRESHOLD) break;
    }
    return count;
  }

  async getPendingBonus(playerId: string): Promise<ComebackBonus | null> {
    const bonus = await this.bonusRepo.findOne({
      where: { playerId, status: ComebackBonusStatus.PENDING },
      order: { grantedAt: 'DESC' },
    });
    if (!bonus) return null;

    if (new Date() > bonus.expiresAt) {
      bonus.status = ComebackBonusStatus.EXPIRED;
      await this.bonusRepo.save(bonus);
      return null;
    }
    return bonus;
  }

  async claimBonus(playerId: string, bonusId: string): Promise<ComebackBonus> {
    const bonus = await this.bonusRepo.findOne({ where: { id: bonusId, playerId } });
    if (!bonus) throw new NotFoundException(`Comeback bonus ${bonusId} not found`);
    if (bonus.status !== ComebackBonusStatus.PENDING) {
      throw new ConflictException(`Bonus is already ${bonus.status}`);
    }
    if (new Date() > bonus.expiresAt) {
      bonus.status = ComebackBonusStatus.EXPIRED;
      await this.bonusRepo.save(bonus);
      throw new ConflictException('Bonus has expired');
    }

    bonus.status = ComebackBonusStatus.CLAIMED;
    bonus.claimedAt = new Date();
    const claimed = await this.bonusRepo.save(bonus);
    this.logger.log(`Player ${playerId} claimed comeback bonus ${bonusId}`);
    return claimed;
  }

  async getPlayerStats(playerId: string): Promise<{
    totalMatches: number;
    wins: number;
    losses: number;
    draws: number;
    currentConsecutiveLosses: number;
    winRate: number;
  }> {
    const records = await this.recordRepo.find({
      where: { playerId },
      order: { createdAt: 'DESC' },
    });

    const wins = records.filter((r) => r.result === PvpMatchResult.WIN).length;
    const losses = records.filter((r) => r.result === PvpMatchResult.LOSS).length;
    const draws = records.filter((r) => r.result === PvpMatchResult.DRAW).length;
    const currentConsecutiveLosses = records[0]?.consecutiveLosses ?? 0;
    const winRate = records.length > 0 ? Math.round((wins / records.length) * 100) : 0;

    return { totalMatches: records.length, wins, losses, draws, currentConsecutiveLosses, winRate };
  }
}
