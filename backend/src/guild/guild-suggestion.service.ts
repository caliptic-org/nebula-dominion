import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Guild } from './entities/guild.entity';
import { GuildMember } from './entities/guild-member.entity';
import { GuildEvent } from './entities/guild-event.entity';
import { PlayerProgression } from '../progression/entities/player-progression.entity';
import { PlayerPower } from '../stats/entities/player-power.entity';

export const GUILD_MAX_MEMBERS = 50;
export const SUGGESTION_DEFAULT_LIMIT = 5;
export const SUGGESTION_MAX_LIMIT = 20;
export const ACTIVITY_WINDOW_DAYS = 7;

const SWEET_SPOT_MIN = 5;
const SWEET_SPOT_MAX = 30;

export interface GuildSuggestion {
  guildId: string;
  name: string;
  tag: string;
  memberCount: number;
  capacity: number;
  ageUnlockedAt: number;
  tierScore: number;
  activity7d: number;
  score: number;
  reasons: string[];
}

interface ActivityCountRow {
  guild_id: string;
  count: string;
}

interface RaceMajorityRow {
  guild_id: string;
  race: string;
  count: string;
}

@Injectable()
export class GuildSuggestionService {
  private readonly logger = new Logger(GuildSuggestionService.name);

  constructor(
    @InjectRepository(Guild)
    private readonly guildRepo: Repository<Guild>,
    @InjectRepository(GuildMember)
    private readonly memberRepo: Repository<GuildMember>,
    @InjectRepository(GuildEvent)
    private readonly eventRepo: Repository<GuildEvent>,
    @InjectRepository(PlayerProgression)
    private readonly progressionRepo: Repository<PlayerProgression>,
    @InjectRepository(PlayerPower)
    private readonly powerRepo: Repository<PlayerPower>,
  ) {}

  async suggest(userId: string, limit = SUGGESTION_DEFAULT_LIMIT): Promise<GuildSuggestion[]> {
    const cappedLimit = Math.max(1, Math.min(limit, SUGGESTION_MAX_LIMIT));

    const [progression, power] = await Promise.all([
      this.progressionRepo.findOne({ where: { playerId: userId } }),
      this.powerRepo.findOne({ where: { playerId: userId } }),
    ]);

    const playerAge = progression?.currentAge ?? 1;
    const playerRace = power?.race ?? null;

    const candidates = await this.guildRepo
      .createQueryBuilder('g')
      .where('g.member_count < :max', { max: GUILD_MAX_MEMBERS })
      .orderBy('g.tier_score', 'DESC')
      .take(200)
      .getMany();

    if (candidates.length === 0) return [];

    const guildIds = candidates.map((g) => g.id);
    const [activityMap, raceMap] = await Promise.all([
      this.fetchActivity(guildIds),
      this.fetchRaceMajority(guildIds),
    ]);

    const ranked = candidates
      .map((g) => this.score(g, playerAge, playerRace, activityMap.get(g.id) ?? 0, raceMap.get(g.id)))
      .sort((a, b) => b.score - a.score)
      .slice(0, cappedLimit);

    return ranked;
  }

  async pickBest(userId: string): Promise<GuildSuggestion | null> {
    const suggestions = await this.suggest(userId, 1);
    return suggestions[0] ?? null;
  }

  private async fetchActivity(guildIds: string[]): Promise<Map<string, number>> {
    if (guildIds.length === 0) return new Map();
    const since = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 3600 * 1000);
    const rows = await this.eventRepo
      .createQueryBuilder('e')
      .select('e.guild_id', 'guild_id')
      .addSelect('COUNT(*)', 'count')
      .where('e.guild_id IN (:...guildIds)', { guildIds })
      .andWhere('e.created_at >= :since', { since })
      .groupBy('e.guild_id')
      .getRawMany<ActivityCountRow>();
    return new Map(rows.map((r) => [r.guild_id, parseInt(r.count, 10)]));
  }

  private async fetchRaceMajority(guildIds: string[]): Promise<Map<string, string>> {
    if (guildIds.length === 0) return new Map();
    const rows = await this.memberRepo.manager
      .createQueryBuilder()
      .select('gm.guild_id', 'guild_id')
      .addSelect('pp.race', 'race')
      .addSelect('COUNT(*)', 'count')
      .from(GuildMember, 'gm')
      .innerJoin(PlayerPower, 'pp', 'pp.player_id = gm.user_id')
      .where('gm.guild_id IN (:...guildIds)', { guildIds })
      .groupBy('gm.guild_id')
      .addGroupBy('pp.race')
      .getRawMany<RaceMajorityRow>();

    const best = new Map<string, { race: string; count: number }>();
    for (const row of rows) {
      const count = parseInt(row.count, 10);
      const current = best.get(row.guild_id);
      if (!current || count > current.count) {
        best.set(row.guild_id, { race: row.race, count });
      }
    }
    return new Map([...best.entries()].map(([k, v]) => [k, v.race]));
  }

  private score(
    guild: Guild,
    playerAge: number,
    playerRace: string | null,
    activity7d: number,
    majorityRace: string | undefined,
  ): GuildSuggestion {
    const reasons: string[] = [];
    let score = 100;

    // Activity boost — capped to prevent dominance by spammy guilds
    const activityBoost = Math.min(activity7d, 200) * 0.6;
    score += activityBoost;
    if (activity7d >= 20) reasons.push('aktif_topluluk');
    else if (activity7d >= 5) reasons.push('canli_sohbet');

    // Age proximity — guilds whose unlock age is close to the player's
    const ageGap = Math.abs(guild.ageUnlockedAt - playerAge);
    if (ageGap === 0) {
      score += 40;
      reasons.push('cag_uyumu');
    } else if (ageGap === 1) {
      score += 20;
    } else {
      score -= ageGap * 8;
    }

    // Race compatibility (majority of members same race)
    if (playerRace && majorityRace && playerRace === majorityRace) {
      score += 30;
      reasons.push('irk_uyumu');
    }

    // Sweet-spot membership: enough members to feel alive, room to grow
    const mc = guild.memberCount;
    if (mc >= SWEET_SPOT_MIN && mc <= SWEET_SPOT_MAX) {
      score += 25;
      reasons.push('uygun_buyukluk');
    } else if (mc < SWEET_SPOT_MIN) {
      score -= (SWEET_SPOT_MIN - mc) * 4; // very small guilds feel dead
    } else if (mc >= GUILD_MAX_MEMBERS - 2) {
      score -= 30; // nearly full — risk of rejection / no slots soon
    }

    // Tier reputation — log-scaled so megascores don't dominate
    if (guild.tierScore > 0) {
      score += Math.log10(guild.tierScore + 1) * 8;
      if (guild.tierScore >= 1000) reasons.push('guclu_lonca');
    }

    // Newness boost — guilds <14d old get a small lift to seed growth
    const ageDays = (Date.now() - guild.createdAt.getTime()) / (24 * 3600 * 1000);
    if (ageDays < 14 && mc < SWEET_SPOT_MAX) {
      score += 10;
      reasons.push('yeni_lonca');
    }

    return {
      guildId: guild.id,
      name: guild.name,
      tag: guild.tag,
      memberCount: guild.memberCount,
      capacity: GUILD_MAX_MEMBERS,
      ageUnlockedAt: guild.ageUnlockedAt,
      tierScore: guild.tierScore,
      activity7d,
      score: Math.round(score * 100) / 100,
      reasons,
    };
  }

  // Exposed for tests / callers that need to inspect inactive purge candidates.
  async listInactiveGuilds(beforeDays = 30): Promise<Guild[]> {
    const cutoff = new Date(Date.now() - beforeDays * 24 * 3600 * 1000);
    return this.guildRepo.find({ where: { updatedAt: LessThan(cutoff) } });
  }
}
