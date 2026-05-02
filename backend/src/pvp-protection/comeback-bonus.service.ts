import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const lastRecord = await this.recordRepo.findOne({
      where: { playerId: dto.playerId },
      order: { createdAt: 'DESC' },
    });

    let consecutiveLosses = 0;
    if (dto.result === PvpMatchResult.LOSS) {
      consecutiveLosses = (lastRecord?.consecutiveLosses ?? 0) + 1;
    }
    // Win or draw resets the streak to 0

    let comebackBonus: ComebackBonus | null = null;
    let bonusGranted = false;

    // Grant on the exact threshold hit (not beyond, to avoid duplicate grants)
    if (consecutiveLosses === CONSECUTIVE_LOSS_THRESHOLD) {
      const existingPending = await this.bonusRepo.findOne({
        where: { playerId: dto.playerId, status: ComebackBonusStatus.PENDING },
      });

      if (!existingPending) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + BONUS_TTL_HOURS);

        comebackBonus = await this.bonusRepo.save(
          this.bonusRepo.create({
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

    await this.recordRepo.save(
      this.recordRepo.create({
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
