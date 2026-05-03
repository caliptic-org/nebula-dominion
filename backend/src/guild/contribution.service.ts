import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContributionDaily } from './entities/contribution-daily.entity';
import { GuildMember } from './entities/guild-member.entity';

// ─── Daily contribution formula (CAL-242) ────────────────────────────────────
//   donate_made × 10
// + donate_received × 2
// + raid_damage_pct × 50
// + research_xp_contributed / 1000
// + chat_message_count × 0.5  (cap 5/day)
// + arena_match_played × 3    (cap 15/day)
// Cap: 200 points/day
// ─────────────────────────────────────────────────────────────────────────────

export const CONTRIBUTION_WEIGHTS = {
  donateMade: 10,
  donateReceived: 2,
  chatMessage: 0.5,
  raidDamagePct: 50,
  researchXpDivisor: 1000,
  arenaMatch: 3,
};

export const DAILY_CHAT_MSG_CAP = 5;
export const DAILY_ARENA_MATCH_CAP = 15;
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
      this.dailyRepo.create({
        guildId,
        userId,
        day,
        donateMade: 0,
        donateReceived: 0,
        chatMessageCount: 0,
        raidDamagePct: 0,
        researchXpContributed: 0,
        arenaMatchPlayed: 0,
        points: 0,
      }),
    );
  }

  private computePoints(row: ContributionDaily): number {
    const cappedChat = Math.min(row.chatMessageCount, DAILY_CHAT_MSG_CAP);
    const cappedArena = Math.min(row.arenaMatchPlayed, DAILY_ARENA_MATCH_CAP);
    const raidPct = Number(row.raidDamagePct ?? 0);

    const raw =
      row.donateMade * CONTRIBUTION_WEIGHTS.donateMade +
      row.donateReceived * CONTRIBUTION_WEIGHTS.donateReceived +
      raidPct * CONTRIBUTION_WEIGHTS.raidDamagePct +
      row.researchXpContributed / CONTRIBUTION_WEIGHTS.researchXpDivisor +
      cappedChat * CONTRIBUTION_WEIGHTS.chatMessage +
      cappedArena * CONTRIBUTION_WEIGHTS.arenaMatch;

    return Math.min(Math.floor(raw), DAILY_POINT_CAP);
  }

  // ─── Mutators ──────────────────────────────────────────────────────────────

  async addDonateMade(guildId: string, userId: string): Promise<number> {
    const row = await this.getOrCreate(guildId, userId);
    row.donateMade += 1;
    row.points = this.computePoints(row);
    await this.dailyRepo.save(row);
    await this.bumpMemberTotal(userId);
    return row.points;
  }

  async addDonateReceived(guildId: string, userId: string): Promise<number> {
    const row = await this.getOrCreate(guildId, userId);
    row.donateReceived += 1;
    row.points = this.computePoints(row);
    await this.dailyRepo.save(row);
    await this.bumpMemberTotal(userId);
    return row.points;
  }

  async addChatMessage(guildId: string, userId: string): Promise<number> {
    const row = await this.getOrCreate(guildId, userId);
    if (row.chatMessageCount >= DAILY_CHAT_MSG_CAP) {
      // Already at chat cap — touch lastActiveAt only
      await this.memberRepo.update({ userId }, { lastActiveAt: new Date() });
      return row.points;
    }
    row.chatMessageCount += 1;
    row.points = this.computePoints(row);
    await this.dailyRepo.save(row);
    await this.bumpMemberTotal(userId);
    return row.points;
  }

  /**
   * Record a raid damage percentage (0..1+) the player contributed in a raid run.
   * Cumulative across multiple runs in the same day.
   */
  async addRaidDamagePct(guildId: string, userId: string, pct: number): Promise<number> {
    const row = await this.getOrCreate(guildId, userId);
    row.raidDamagePct = Number(row.raidDamagePct ?? 0) + Math.max(0, pct);
    row.points = this.computePoints(row);
    await this.dailyRepo.save(row);
    await this.bumpMemberTotal(userId);
    return row.points;
  }

  async addResearchXp(guildId: string, userId: string, xp: number): Promise<number> {
    if (xp <= 0) {
      const row = await this.getOrCreate(guildId, userId);
      return row.points;
    }
    const row = await this.getOrCreate(guildId, userId);
    row.researchXpContributed += xp;
    row.points = this.computePoints(row);
    await this.dailyRepo.save(row);
    await this.bumpMemberTotal(userId);
    return row.points;
  }

  /**
   * Record an arena match for contribution scoring. Resolves the user's
   * current guild — no-op if user has no guild.
   */
  async addArenaMatch(userId: string): Promise<number | null> {
    const member = await this.memberRepo.findOne({ where: { userId } });
    if (!member) return null;
    const row = await this.getOrCreate(member.guildId, userId);
    if (row.arenaMatchPlayed >= DAILY_ARENA_MATCH_CAP) {
      await this.memberRepo.update({ userId }, { lastActiveAt: new Date() });
      return row.points;
    }
    row.arenaMatchPlayed += 1;
    row.points = this.computePoints(row);
    await this.dailyRepo.save(row);
    await this.bumpMemberTotal(userId);
    return row.points;
  }

  // ─── Aggregation helpers ───────────────────────────────────────────────────

  private async bumpMemberTotal(userId: string): Promise<void> {
    const sumRow = await this.dailyRepo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.points), 0)', 'total')
      .where('c.user_id = :userId', { userId })
      .getRawOne<{ total: string }>();
    const total = sumRow ? parseInt(sumRow.total, 10) : 0;
    await this.memberRepo.update({ userId }, { contributionPts: total, lastActiveAt: new Date() });
  }

  async getToday(userId: string): Promise<ContributionDaily | null> {
    return this.dailyRepo.findOne({ where: { userId, day: this.todayKey() } });
  }
}
