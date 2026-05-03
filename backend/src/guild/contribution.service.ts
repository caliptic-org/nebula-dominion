import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContributionDaily } from './entities/contribution-daily.entity';
import { GuildMember } from './entities/guild-member.entity';

export const CONTRIBUTION_WEIGHTS = {
  donateMade: 10,
  donateReceived: 2,
  chatMessage: 0.5,
};

export const DAILY_CHAT_MSG_CAP = 5;
export const DAILY_POINT_CAP = 200;

@Injectable()
export class ContributionService {
  private readonly logger = new Logger(ContributionService.name);

  constructor(
    @InjectRepository(ContributionDaily)
    private readonly dailyRepo: Repository<ContributionDaily>,
    @InjectRepository(GuildMember)
    private readonly memberRepo: Repository<GuildMember>,
  ) {}

  private todayKey(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  private async getOrCreate(guildId: string, userId: string): Promise<ContributionDaily> {
    const day = this.todayKey();
    const existing = await this.dailyRepo.findOne({ where: { userId, day } });
    if (existing) return existing;
    return this.dailyRepo.save(
      this.dailyRepo.create({ guildId, userId, day, donateMade: 0, donateReceived: 0, chatMessageCount: 0, points: 0 }),
    );
  }

  private computePoints(row: ContributionDaily): number {
    const cappedChat = Math.min(row.chatMessageCount, DAILY_CHAT_MSG_CAP);
    const raw =
      row.donateMade * CONTRIBUTION_WEIGHTS.donateMade +
      row.donateReceived * CONTRIBUTION_WEIGHTS.donateReceived +
      cappedChat * CONTRIBUTION_WEIGHTS.chatMessage;
    return Math.min(Math.floor(raw), DAILY_POINT_CAP);
  }

  async addDonateMade(guildId: string, userId: string): Promise<number> {
    const row = await this.getOrCreate(guildId, userId);
    row.donateMade += 1;
    row.points = this.computePoints(row);
    await this.dailyRepo.save(row);
    await this.bumpMemberTotal(userId, row.points);
    return row.points;
  }

  async addDonateReceived(guildId: string, userId: string): Promise<number> {
    const row = await this.getOrCreate(guildId, userId);
    row.donateReceived += 1;
    row.points = this.computePoints(row);
    await this.dailyRepo.save(row);
    await this.bumpMemberTotal(userId, row.points);
    return row.points;
  }

  async addChatMessage(guildId: string, userId: string): Promise<number> {
    const row = await this.getOrCreate(guildId, userId);
    if (row.chatMessageCount >= DAILY_CHAT_MSG_CAP) {
      // Already at chat cap — no point delta
      return row.points;
    }
    row.chatMessageCount += 1;
    row.points = this.computePoints(row);
    await this.dailyRepo.save(row);
    await this.bumpMemberTotal(userId, row.points);
    return row.points;
  }

  private async bumpMemberTotal(userId: string, todayPoints: number): Promise<void> {
    // Recompute member total = sum of historical days (cheap because index)
    const sumRow = await this.dailyRepo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.points), 0)', 'total')
      .where('c.user_id = :userId', { userId })
      .getRawOne<{ total: string }>();

    const total = sumRow ? parseInt(sumRow.total, 10) : todayPoints;
    await this.memberRepo.update({ userId }, { contributionPts: total, lastActiveAt: new Date() });
  }

  async getToday(userId: string): Promise<ContributionDaily | null> {
    return this.dailyRepo.findOne({ where: { userId, day: this.todayKey() } });
  }
}
