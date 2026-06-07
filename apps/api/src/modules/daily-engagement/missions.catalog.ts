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
 *
 * ## cycle 17 BAL-01 — XP shown == XP credited
 *
 * The `reward.xp` values below USED to advertise phantom payouts
 * (story-4: 50_000, ach-3: 15_000, ach-6: 20_000, weekly-1: 10_000 …)
 * that NEVER landed. `creditXp()` POSTs only {userId, source,
 * referenceId} to game-server `/progression/award-xp`, which credits
 * the per-source base from game-server's XP_BASE_AMOUNTS
 * (apps/game-server/src/progression/config/level-config.ts) — NOT the
 * catalog number. So a "50 000 XP" mission actually paid 300 XP.
 *
 * Fix = honesty, not inflation. Each `reward.xp` is now the REAL base
 * that will actually credit, keyed by MISSION_TYPE_TO_XP_SOURCE in
 * daily-engagement.service.ts:
 *   - story-*   (source=event)         → 300
 *   - weekly-*  (source=daily_mission) → 200
 *   - ach-*     (source=achievement)   → 500
 * gold / gems are UNCHANGED — those DO credit verbatim via creditWallet.
 *
 * DO NOT re-inflate these numbers without ALSO threading an explicit
 * `amount` field through AwardXpDto + game-server award-xp so the credit
 * matches. Otherwise the missions page lies again, and bumping the base
 * directly would let a fresh account one-shot many ages via the legendary
 * tier. The displayed XP MUST equal the credited XP.
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

/* ── Story missions (FE: apps/web/src/app/missions/page.tsx STORY) ─────
 * xp = 300 for ALL story-* (source=event base). The varying numbers that
 * used to live here (1_200 / 2_500 / 5_000 / 50_000) were phantom — never
 * credited. gold / gems are real. See cycle 17 BAL-01 header. */
const STORY: CatalogEntry[] = [
  { id: 'story-1', missionType: 'story', reward: { gold: 5_000,  xp: 300 } },
  { id: 'story-2', missionType: 'story', reward: { gold: 8_000,  xp: 300 } },
  { id: 'story-3', missionType: 'story', reward: { gold: 10_000, xp: 300 } },
  { id: 'story-4', missionType: 'story', reward: { gems: 1, xp: 300 } },
];

/* ── Weekly missions ──────────────────────────────────────────────────
 * xp = 200 (source=daily_mission base). Was 10_000 / 6_000 phantom. */
const WEEKLY: CatalogEntry[] = [
  { id: 'weekly-1', missionType: 'weekly', reward: { gold: 15_000, xp: 200 } },
  { id: 'weekly-2', missionType: 'weekly', reward: { gold: 10_000, xp: 200 } },
];

/* ── Achievements (FE: apps/web/src/lib/achievements.ts) ──────────────
 * xp = 500 for ALL ach-* (source=achievement base). Was 500 / 1_000 /
 * 15_000 / 2_500 / 2_000 / 20_000 — only ach-1 happened to be honest. */
const ACHIEVEMENTS: CatalogEntry[] = [
  { id: 'ach-1', missionType: 'achievement', reward: { gold: 2_500, xp: 500 } },
  { id: 'ach-2', missionType: 'achievement', reward: { gold: 5_000, xp: 500 } },
  { id: 'ach-3', missionType: 'achievement', reward: { gems: 5, xp: 500 } }, // legendary
  { id: 'ach-4', missionType: 'achievement', reward: { gold: 7_500, xp: 500 } },
  { id: 'ach-5', missionType: 'achievement', reward: { gold: 6_000, xp: 500 } },
  { id: 'ach-6', missionType: 'achievement', reward: { gems: 5, xp: 500 } }, // legendary
];

/* ── Daily quests (FE: /api/v1/daily/quests stub) ───────────────────────
 *
 * cycle 17 BAL-03 — daily quests now credit persistently.
 *
 * Before this entry the daily-quest economy lived ONLY in
 * apps/api/src/meta/missions-stub.controller.ts, whose claim handler
 * returned `{claimed:true, rewards}` WITHOUT any wallet credit, XP grant,
 * or DB write — the advertised daily economy was fiction and the in-memory
 * CLAIMED Map reset on every restart. The stub claim handler now routes
 * through DailyEngagementService.claim() with a date-keyed missionId
 * (`daily-q1:YYYY-MM-DD`), which persists a mission_claims row (DB-backed
 * idempotency that survives restart and resets per UTC day) and fans the
 * reward out to game-server's battle-reward (wallet) + award-xp.
 *
 * The ids here MUST stay in lock-step with the QUESTS catalog in
 * missions-stub.controller.ts (one entry per quest id).
 *
 * gems map to `science` via creditWallet (same as achievements above); keep
 * gem payouts ≤ the battle-reward per-call science cap (100) or they 400.
 * `xp` is the game-server DAILY_MISSION base (200) — the BAL-01 honesty
 * rule: the number shown == the number credited. */
const DAILY: CatalogEntry[] = [
  { id: 'daily-q1', missionType: 'daily', reward: { gold: 200, xp: 200 } },
  { id: 'daily-q2', missionType: 'daily', reward: { gold: 300 } },
  { id: 'daily-q3', missionType: 'daily', reward: { gold: 250 } },
  { id: 'daily-q4', missionType: 'daily', reward: { gems: 20, xp: 200 } },
  { id: 'daily-q5', missionType: 'daily', reward: { gems: 25, xp: 200 } },
];

const ALL: CatalogEntry[] = [...STORY, ...WEEKLY, ...ACHIEVEMENTS, ...DAILY];

const BY_ID: Map<string, CatalogEntry> = new Map(ALL.map((e) => [e.id, e]));

/**
 * Daily-quest claims are date-keyed for idempotency: the stub claim handler
 * passes `daily-q1:2026-06-07` so the mission_claims row resets each UTC day
 * (the player can earn the quest again tomorrow) while a same-day re-POST or
 * a service restart can never re-open the claim.
 *
 * Strip a trailing `:YYYY-MM-DD` so the resolver maps the date-keyed id back
 * to its base reward. Returns the id unchanged when no date suffix is
 * present. The plain `daily-q*` id (used by the canonical /daily-engagement
 * path) is intentionally absent from the date-keyed credit flow — only the
 * date-keyed id resolves to a real reward, so the canonical and the
 * dedicated daily callers can never double-credit the same day. */
const DAILY_DATE_SUFFIX = /:\d{4}-\d{2}-\d{2}$/;
function stripDailyDateKey(missionId: string): string {
  return missionId.replace(DAILY_DATE_SUFFIX, '');
}

/**
 * NOTE (cycle 17 BAL-4 / BAL-02): the former `PER_USER_DAILY_XP_CAP =
 * 150_000` constant lived here and was consumed by daily-engagement.service
 * to clamp `reward.xp` before persisting the claim row. That clamp was DEAD
 * CODE — `reward.xp` in this catalog is decorative (it feeds the FE display
 * and creditWallet's resource `xp` field) and is NEVER the progression XP
 * that advances Lv/Çağ. Progression XP is minted by game-server from its own
 * XP_BASE_AMOUNTS, ignoring this number entirely, so clamping it here bounded
 * nothing real. The authoritative per-source daily ceiling now lives in
 *   apps/game-server/src/progression/config/level-config.ts → XP_DAILY_CAPS
 * (DAILY_MISSION 3000, ACHIEVEMENT 5000, PVE_WIN/PVP_WIN 8000, CONSTRUCTION
 * 5000), enforced in ProgressionService.awardXp where the XP is actually
 * minted. The constant and its dead client-side clamp have been removed.
 */

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
  // cycle 17 BAL-03: date-keyed daily ids (`daily-q1:YYYY-MM-DD`) resolve to
  // their REAL reward so the dedicated /daily/quests/:id/claim path credits.
  // Strip the date suffix before the catalog lookup; the base reward is the
  // same every day, only the idempotency key (the persisted missionId)
  // rotates.
  const baseId = stripDailyDateKey(missionId);
  const entry = BY_ID.get(baseId);
  if (entry) {
    // Soft validation: if the client claimed it under the wrong category
    // (e.g. story id with missionType=daily), we still honour the catalog
    // mapping. Don't reject — the FE has shown drift before.
    return { reward: { ...entry.reward }, recognised: true };
  }
  // Plain `daily-*` ids WITHOUT a date key (the canonical /daily-engagement
  // path) accept the claim idempotently but credit nothing — daily reward
  // delivery flows through the date-keyed dedicated daily endpoint above so
  // the two callers can't double-credit. Unknown daily ids land here too.
  if (missionId.startsWith('daily-') || missionType === 'daily') {
    return { reward: {}, recognised: true };
  }
  return { reward: {}, recognised: false };
}

export function knownMissionIds(): string[] {
  return Array.from(BY_ID.keys());
}
