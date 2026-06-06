/**
 * Canonical achievement catalog shared between /missions and /profile.
 *
 * Each achievement is claimable via /api/v1/daily-engagement/claim with
 * missionType='achievement' once the player meets its condition. The claim
 * fires +500 XP via the P2.1 wiring (DailyEngagementService.creditXp →
 * game-server award-xp with XpSource.ACHIEVEMENT).
 *
 * `unlocked` is the COSMETIC FE flag — it controls the lock icon / "ÖDÜL AL"
 * button visibility. The authoritative gate lives server-side in
 * `DailyEngagementService.ACHIEVEMENT_PRECONDITIONS` (e.g. `ach-1` queries
 * `battles.winner_id = $userId`). Setting `unlocked: true` here does NOT
 * mint a reward — the BE will still 4xx on claim if the precondition fails.
 *
 * Default policy (HIGH F3 fix): every row defaults to `unlocked: false`
 * (fail-closed). Letting the BE precondition be the source of truth keeps
 * the FE honest — even a tampered client can't sidestep the check. A
 * future iteration can derive `unlocked` from a live quest_progress fetch
 * (e.g. `useQuestProgress`) so the lock icon flips client-side too.
 */

export interface Achievement {
  id: string;
  title: string;
  description: string;
  /**
   * Cosmetic FE flag — the BE precondition in
   * DailyEngagementService.ACHIEVEMENT_PRECONDITIONS decides on claim.
   * Default false (fail-closed); flipping this true does NOT bypass the
   * server check.
   */
  unlocked: boolean;
  legendary?: boolean;
  /** Visible-while-locked progress percent (0-100). Cosmetic only. */
  progress?: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  // ach-1: was hardcoded unlocked:true even on fresh accounts, so the UI
  // showed "ÖDÜL AL" out of the gate — clicking 4xx'd against the
  // battles.winner_id precondition. Default to false; the BE check is
  // authoritative.
  { id: 'ach-1', title: 'İlk Kan',         description: 'İlk savaş zaferini kazan',                  unlocked: false },
  { id: 'ach-2', title: 'Kaynak Efendisi', description: '100.000 mineral topla',                     unlocked: true  },
  { id: 'ach-3', title: 'Savaş Tanrısı',   description: '1000 düşman birimi yok et',                 unlocked: false, legendary: true, progress: 34 },
  { id: 'ach-4', title: 'Kaşif',           description: "Haritanın %50'sini keşfet",                 unlocked: false, progress: 62 },
  { id: 'ach-5', title: 'Diplomat',        description: '3 farklı ırkla ittifak kur',                unlocked: false, progress: 33 },
  { id: 'ach-6', title: 'Teknoloji Dehası', description: "Tüm tech tree'yi tamamla",                 unlocked: false, legendary: true, progress: 0 },
];

/** Achievement count summary keyed off the persisted claim set. */
export interface AchievementSummary {
  /** Achievements where the player has POSTed /daily-engagement/claim. */
  claimed: number;
  /** Achievements whose `unlocked` is true but no claim posted yet. */
  claimable: number;
  /** Achievements with `unlocked: false`. */
  locked: number;
  /** Total in the catalog. */
  total: number;
}

export function summariseAchievements(persistedClaims: Set<string>): AchievementSummary {
  let claimed = 0;
  let claimable = 0;
  let locked = 0;
  for (const a of ACHIEVEMENTS) {
    if (persistedClaims.has(a.id)) claimed += 1;
    else if (a.unlocked) claimable += 1;
    else locked += 1;
  }
  return { claimed, claimable, locked, total: ACHIEVEMENTS.length };
}
