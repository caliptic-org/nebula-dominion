import { GuildRaidTier } from './entities/guild-raid.entity';

/**
 * Weekly guild raid configuration. CAL-240.
 *
 * - Schedule: Pazartesi 00:00 UTC → Pazar 23:59 UTC
 * - Boss HP scale: `base × tier_multiplier × √(active_member_count)` with a
 *   floor of `min(member_count, 3)` so 1- and 2-member guilds still face the
 *   minimum-3 baseline (raid is meant for active groups).
 * - Drop tablosu (CAL-233 mutasyon özü %30 raid drop):
 *     Normal: 1 öz garantili
 *     Hard:   2 öz
 *     Elite:  3-4 öz (random in [3, 4])
 *   Top-5 katkıcıya bonus: +1 öz.
 *   Haftalık tavan oyuncu başına 4 öz/hafta (anti-inflation).
 */
export const RAID_BASE_HP = 50_000;

export const RAID_TIER_HP_MULTIPLIER: Record<GuildRaidTier, number> = {
  [GuildRaidTier.NORMAL]: 1.0,
  [GuildRaidTier.HARD]: 2.5,
  [GuildRaidTier.ELITE]: 6.0,
};

/** Minimum member-count floor for HP scale: 3-üyeli lonca cap'i. */
export const RAID_MIN_MEMBER_FLOOR = 3;

export const RAID_BASE_DROP_TABLE: Record<GuildRaidTier, { min: number; max: number }> = {
  [GuildRaidTier.NORMAL]: { min: 1, max: 1 },
  [GuildRaidTier.HARD]: { min: 2, max: 2 },
  [GuildRaidTier.ELITE]: { min: 3, max: 4 },
};

export const RAID_TOP_CONTRIBUTOR_BONUS = 1;
export const RAID_TOP_CONTRIBUTOR_COUNT = 5;

/**
 * Anti-inflation cap from CAL-233: a player can earn at most 4 mutation essence
 * per ISO week, summed across all sources (raid + PvE + events).
 */
export const ESSENCE_WEEKLY_CAP_PER_PLAYER = 4;

/** Cron expression: Monday 00:00 UTC. */
export const RAID_SCHEDULE_CRON = '0 0 * * 1';

/** Raid expiration cron — Sunday 23:59 UTC (resolves drops if not yet defeated). */
export const RAID_EXPIRE_CRON = '59 23 * * 0';

/** Drop-resolve sweep cron — every 5 min, picks up newly-completed raids. */
export const RAID_DROP_RESOLVE_CRON = '*/5 * * * *';

/**
 * tier_score (guild rank) reward for completing a raid before the deadline.
 */
export const RAID_TIER_SCORE_REWARD: Record<GuildRaidTier, number> = {
  [GuildRaidTier.NORMAL]: 50,
  [GuildRaidTier.HARD]: 150,
  [GuildRaidTier.ELITE]: 400,
};
