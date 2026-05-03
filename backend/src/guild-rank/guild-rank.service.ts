import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { GuildWeeklyRank } from './entities/guild-weekly-rank.entity';
import { GuildChampionBadge } from './entities/guild-champion-badge.entity';
import { Guild } from '../guild/entities/guild.entity';
import { GuildMember } from '../guild/entities/guild-member.entity';
import { ContributionDaily } from '../guild/entities/contribution-daily.entity';
import { AnalyticsService } from '../analytics/analytics.service';

// ─── Constants ────────────────────────────────────────────────────────────────

export const CHAMPION_TOP_N = 10;
export const CHAMPION_GEM_BOOST_PCT = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoWeekKey(d: Date = new Date()): string {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function previousWeekRange(weekKey: string): { start: Date; end: Date } {
  // weekKey corresponds to ISO week. We compute the start (Monday 00:00 UTC) and
  // end (next Monday 00:00 UTC) of that ISO week.
  const [y, w] = weekKey.split('-W').map((s) => parseInt(s, 10));
  // Jan 4 always falls in week 1 of the ISO year
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const start = new Date(week1Mon);
  start.setUTCDate(week1Mon.getUTCDate() + (w - 1) * 7);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return { start, end };
}

function previousWeekKey(weekKey: string = isoWeekKey()): string {
  const { start } = previousWeekRange(weekKey);
  const prev = new Date(start);
  prev.setUTCDate(prev.getUTCDate() - 1);
  return isoWeekKey(prev);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PublishWeeklyRankResult {
  weekKey: string;
  publishedRows: number;
  championBadgesIssued: number;
  topGuilds: Array<{ guildId: string; rank: number; contributionTotal: number; guildName: string; guildTag: string }>;
}

export interface LeaderboardPage {
  entries: Array<{
    rank: number;
    guildId: string;
    guildName: string;
    guildTag: string;
    contributionTotal: number;
    memberCount: number;
    isChampion: boolean;
  }>;
  total: number;
  weekKey: string;
  publishedAt: string | null;
  page: number;
  limit: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class GuildRankService {
  private readonly logger = new Logger(GuildRankService.name);

  constructor(
    @InjectRepository(GuildWeeklyRank)
    private readonly rankRepo: Repository<GuildWeeklyRank>,
    @InjectRepository(GuildChampionBadge)
    private readonly badgeRepo: Repository<GuildChampionBadge>,
    @InjectRepository(Guild)
    private readonly guildRepo: Repository<Guild>,
    @InjectRepository(GuildMember)
    private readonly memberRepo: Repository<GuildMember>,
    @InjectRepository(ContributionDaily)
    private readonly contribRepo: Repository<ContributionDaily>,
    private readonly analytics: AnalyticsService,
  ) {}

  // ─── Publish job: aggregate previous week's contribution into rank rows ────

  async publishWeeklyRank(
    forWeekKey: string = previousWeekKey(),
  ): Promise<PublishWeeklyRankResult> {
    const { start, end } = previousWeekRange(forWeekKey);
    this.logger.log(`Publishing guild weekly rank for ${forWeekKey} (${start.toISOString()} → ${end.toISOString()})`);

    // Idempotency: clear any previous publish for this week
    await this.rankRepo.delete({ weekKey: forWeekKey });

    // Aggregate contribution_daily for the date range, group by guild
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);
    const rows: Array<{ guild_id: string; total: string }> = await this.contribRepo
      .createQueryBuilder('c')
      .select('c.guild_id', 'guild_id')
      .addSelect('SUM(c.points)', 'total')
      .where('c.day >= :startDate AND c.day < :endDate', { startDate, endDate })
      .groupBy('c.guild_id')
      .getRawMany();

    const guildIds = rows.map((r) => r.guild_id);
    const guilds = guildIds.length
      ? await this.guildRepo.find({ where: { id: In(guildIds) } })
      : [];
    const guildMap = new Map(guilds.map((g) => [g.id, g]));

    const sorted = rows
      .map((r) => ({
        guildId: r.guild_id,
        total: parseInt(r.total, 10) || 0,
        guild: guildMap.get(r.guild_id),
      }))
      .filter((r) => r.guild)
      .sort((a, b) => b.total - a.total);

    const rankRows: GuildWeeklyRank[] = sorted.map((entry, idx) =>
      this.rankRepo.create({
        weekKey: forWeekKey,
        guildId: entry.guildId,
        guildName: entry.guild!.name,
        guildTag: entry.guild!.tag,
        contributionTotal: String(entry.total),
        rank: idx + 1,
        memberCount: entry.guild!.memberCount,
      }),
    );

    if (rankRows.length > 0) {
      await this.rankRepo.save(rankRows, { chunk: 200 });
    }

    // Issue Champion Guild badges to top 10 (active for 7 days from publish)
    const top = sorted.slice(0, CHAMPION_TOP_N);
    const activeFrom = new Date();
    const activeTo = new Date(activeFrom.getTime() + 7 * 86400_000);

    if (top.length > 0) {
      // Clear any existing badge for this week (idempotency)
      await this.badgeRepo.delete({ weekKey: forWeekKey });
      const badges = top.map((entry, idx) =>
        this.badgeRepo.create({
          guildId: entry.guildId,
          weekKey: forWeekKey,
          rank: idx + 1,
          gemBoostPct: CHAMPION_GEM_BOOST_PCT,
          activeFrom,
          activeTo,
        }),
      );
      await this.badgeRepo.save(badges);
    }

    // Telemetry: mid_game_events.weekly_rank_published
    await this.analytics.trackServer({
      event_type: 'weekly_rank_published',
      user_id: '00000000-0000-0000-0000-000000000000',
      session_id: forWeekKey,
      properties: {
        week_key: forWeekKey,
        published_rows: rankRows.length,
        champion_badges: top.length,
        top_total: top[0]?.total ?? 0,
      },
    });

    return {
      weekKey: forWeekKey,
      publishedRows: rankRows.length,
      championBadgesIssued: top.length,
      topGuilds: top.map((entry, idx) => ({
        guildId: entry.guildId,
        rank: idx + 1,
        contributionTotal: entry.total,
        guildName: entry.guild!.name,
        guildTag: entry.guild!.tag,
      })),
    };
  }

  // ─── Public leaderboard endpoint ───────────────────────────────────────────

  async getLeaderboard(
    weekKey: string = previousWeekKey(),
    page = 1,
    limit = 50,
  ): Promise<LeaderboardPage> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(200, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const [entries, total] = await this.rankRepo.findAndCount({
      where: { weekKey },
      order: { rank: 'ASC' },
      skip: offset,
      take: safeLimit,
    });

    const guildIds = entries.map((e) => e.guildId);
    const champions = guildIds.length
      ? await this.badgeRepo.find({ where: { weekKey, guildId: In(guildIds) } })
      : [];
    const championSet = new Set(champions.map((c) => c.guildId));

    const publishedAt = entries[0]?.publishedAt ?? null;

    return {
      entries: entries.map((e) => ({
        rank: e.rank,
        guildId: e.guildId,
        guildName: e.guildName,
        guildTag: e.guildTag,
        contributionTotal: parseInt(e.contributionTotal as unknown as string, 10) || 0,
        memberCount: e.memberCount,
        isChampion: championSet.has(e.guildId),
      })),
      total,
      weekKey,
      publishedAt: publishedAt ? publishedAt.toISOString() : null,
      page: safePage,
      limit: safeLimit,
    };
  }

  // ─── Champion lookup (used by gem revenue boost calculation) ──────────────

  async getActiveChampionBoost(guildId: string): Promise<{ active: boolean; gemBoostPct: number; weekKey?: string; activeUntil?: string }> {
    const now = new Date();
    const badge = await this.badgeRepo.findOne({
      where: {
        guildId,
        activeFrom: LessThanOrEqual(now),
        activeTo: MoreThanOrEqual(now),
      },
    });
    if (!badge) return { active: false, gemBoostPct: 0 };
    return {
      active: true,
      gemBoostPct: badge.gemBoostPct,
      weekKey: badge.weekKey,
      activeUntil: badge.activeTo.toISOString(),
    };
  }

  /**
   * Apply Champion gem boost: multiply gemAmount by (1 + boost%/100) when the
   * member's guild has an active champion badge. Returns the boosted amount
   * and metadata. Safe when user has no guild — returns gemAmount unchanged.
   */
  async applyGemRevenueBoost(
    userId: string,
    gemAmount: number,
  ): Promise<{ boostedAmount: number; baseAmount: number; boostPct: number; applied: boolean }> {
    const member = await this.memberRepo.findOne({ where: { userId } });
    if (!member) {
      return { boostedAmount: gemAmount, baseAmount: gemAmount, boostPct: 0, applied: false };
    }
    const boost = await this.getActiveChampionBoost(member.guildId);
    if (!boost.active) {
      return { boostedAmount: gemAmount, baseAmount: gemAmount, boostPct: 0, applied: false };
    }
    const boosted = Math.floor(gemAmount * (1 + boost.gemBoostPct / 100));
    return {
      boostedAmount: boosted,
      baseAmount: gemAmount,
      boostPct: boost.gemBoostPct,
      applied: true,
    };
  }

  // ─── Helper: list current week's running totals (live preview) ────────────

  async previewCurrentWeek(): Promise<Array<{ guildId: string; runningTotal: number }>> {
    const wk = isoWeekKey();
    const { start } = previousWeekRange(wk);
    const startDate = start.toISOString().slice(0, 10);
    const rows: Array<{ guild_id: string; total: string }> = await this.contribRepo
      .createQueryBuilder('c')
      .select('c.guild_id', 'guild_id')
      .addSelect('SUM(c.points)', 'total')
      .where('c.day >= :startDate', { startDate })
      .groupBy('c.guild_id')
      .orderBy('total', 'DESC')
      .limit(50)
      .getRawMany();
    return rows.map((r) => ({ guildId: r.guild_id, runningTotal: parseInt(r.total, 10) || 0 }));
  }
}
