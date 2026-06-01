/**
 * Canonical achievement catalog shared between /missions and /profile.
 *
 * Each achievement is claimable via /api/v1/daily-engagement/claim with
 * missionType='achievement' once the player meets its condition. The claim
 * fires +500 XP via the P2.1 wiring (DailyEngagementService.creditXp →
 * game-server award-xp with XpSource.ACHIEVEMENT).
 *
 * `unlocked` is currently a static flag — condition gating against live
 * counters (quest_progress.battles_won etc.) is deferred to a follow-up.
 * When that lands, derive `unlocked` from a `condition` predicate per row
 * instead of the hardcoded boolean.
 */

export interface Achievement {
  id: string;
  title: string;
  description: string;
  /** Hardcoded for the demo; future: derive from quest_progress counters. */
  unlocked: boolean;
  legendary?: boolean;
  /** Visible-while-locked progress percent (0-100). Cosmetic only. */
  progress?: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'ach-1', title: 'İlk Kan',         description: 'İlk savaş zaferini kazan',                  unlocked: true  },
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
