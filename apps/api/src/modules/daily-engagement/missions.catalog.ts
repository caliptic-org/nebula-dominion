/**
 * Server-side mission reward catalog.
 *
 * The previous claim handler accepted whatever `reward` shape the
 * client sent in the request body — a smoke-test showed lv1→14 in 31
 * calls by passing arbitrary `reward.xp: 50000` per request. This
 * catalog is the only source of truth for what each mission pays out
 * now; the controller's DTO no longer carries a reward field and
 * the service looks the answer up here.
 *
 * Mirror of the FE-visible mission lex (apps/web/src/app/missions/page.tsx
 * static STORY_MISSIONS + WEEKLY_MISSIONS + apps/web/src/lib/achievements.ts).
 * Daily missions (`daily-*` IDs) come through a separate /api/v1/daily/quests
 * path that already resolves rewards server-side from the daily catalog —
 * here we apply a small fallback so the daily-engagement endpoint can still
 * claim them idempotently without crediting unauthorized values.
 *
 * Updating: when the FE mission lex changes, mirror that entry here.
 * Long-term the FE catalog should fetch from THIS file (not vice versa)
 * via a `GET /api/v1/missions/catalog` endpoint — TODO for the SoT
 * refactor.
 */

import { MissionType } from './entities/mission-claim.entity';

export interface CanonicalReward {
  /** Mineral / gold reward credited to user_currency. */
  gold?: number;
  /** Premium gems credited to user_currency.premium_gems. */
  gems?: number;
  /** XP credited via game-server progression. */
  xp?: number;
}

export interface CatalogEntry {
  id: string;
  missionType: MissionType;
  reward: CanonicalReward;
}

/* ── Story missions (FE: apps/web/src/app/missions/page.tsx STORY) ───── */
const STORY: CatalogEntry[] = [
  { id: 'story-1', missionType: 'story', reward: { gold: 5_000,  xp: 1_200 } },
  { id: 'story-2', missionType: 'story', reward: { gold: 8_000,  xp: 2_500 } },
  { id: 'story-3', missionType: 'story', reward: { gold: 10_000, xp: 5_000 } },
  { id: 'story-4', missionType: 'story', reward: { gems: 1, xp: 50_000 } },
];

/* ── Weekly missions ────────────────────────────────────────────────── */
const WEEKLY: CatalogEntry[] = [
  { id: 'weekly-1', missionType: 'weekly', reward: { gold: 15_000, xp: 10_000 } },
  { id: 'weekly-2', missionType: 'weekly', reward: { gold: 10_000, xp: 6_000  } },
];

/* ── Achievements (FE: apps/web/src/lib/achievements.ts) ────────────── */
const ACHIEVEMENTS: CatalogEntry[] = [
  { id: 'ach-1', missionType: 'achievement', reward: { gold: 2_500, xp: 500   } },
  { id: 'ach-2', missionType: 'achievement', reward: { gold: 5_000, xp: 1_000 } },
  { id: 'ach-3', missionType: 'achievement', reward: { gems: 5, xp: 15_000 } }, // legendary
  { id: 'ach-4', missionType: 'achievement', reward: { gold: 7_500, xp: 2_500 } },
  { id: 'ach-5', missionType: 'achievement', reward: { gold: 6_000, xp: 2_000 } },
  { id: 'ach-6', missionType: 'achievement', reward: { gems: 5, xp: 20_000 } }, // legendary
];

const ALL: CatalogEntry[] = [...STORY, ...WEEKLY, ...ACHIEVEMENTS];

const BY_ID: Map<string, CatalogEntry> = new Map(ALL.map((e) => [e.id, e]));

/**
 * Per-mission XP ceiling per day. Catches a future exploit where the
 * same legitimate missionId is claimed many times via parallel requests
 * faster than the UNIQUE constraint can persist. Even at 50k legendary
 * payout, a single user can't farm more than ~150k XP/day from this
 * endpoint alone. Other XP sources (battle, research, training) have
 * their own daily caps in game-server progression config.
 */
export const PER_USER_DAILY_XP_CAP = 150_000;

/**
 * Resolve a mission id to its canonical reward shape, or null when the
 * id is not registered. Daily missions (`daily-*` prefix) are accepted
 * with a placeholder reward so the existing claim row still persists,
 * but no XP / gold / gems are credited from this path — daily reward
 * delivery flows through the dedicated /api/v1/daily/quests/:id/claim
 * handler instead.
 */
export function resolveMissionReward(
  missionId: string,
  missionType: MissionType,
): { reward: CanonicalReward; recognised: boolean } {
  const entry = BY_ID.get(missionId);
  if (entry) {
    // Soft validation: if the client claimed it under the wrong category
    // (e.g. story id with missionType=daily), we still honour the catalog
    // mapping. Don't reject — the FE has shown drift before.
    return { reward: { ...entry.reward }, recognised: true };
  }
  // Daily missions live in their own catalog (daily.service.ts). For
  // forward-compat — and to keep the engagement claim row idempotent —
  // accept them with a zero reward here. The dedicated daily endpoint
  // is what actually credits gems/gold/XP.
  if (missionId.startsWith('daily-') || missionType === 'daily') {
    return { reward: {}, recognised: true };
  }
  return { reward: {}, recognised: false };
}

export function knownMissionIds(): string[] {
  return Array.from(BY_ID.keys());
}
