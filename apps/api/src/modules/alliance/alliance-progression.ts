/**
 * Cycle-18 BAL-01 — alliance level/XP progression.
 *
 * Before this, `alliance.xp` / `alliance.level` were NEVER written by ANY
 * code path: donating only bumped a member's PERSONAL `contribution` counter,
 * the public alliance leaderboard (ordered by `xp DESC`) was permanently tied
 * at 0 and ordered arbitrarily, and `maxMembers` stayed pinned at the default
 * 20 forever — so pouring resources into the vault produced NO collective
 * unlock. We now grant alliance XP 1:1 from donated resources in
 * donate()/deposit(), derive the level from cumulative XP, and raise the
 * member cap per level so the social progression loop's headline metric is
 * real and donating yields a guild-wide benefit.
 */

export const ALLIANCE_BASE_MAX_MEMBERS = 20;
export const ALLIANCE_MAX_LEVEL = 20;
/** XP step between consecutive levels (cumulative curve is quadratic). */
export const ALLIANCE_XP_STEP = 25_000;
export const ALLIANCE_MEMBERS_PER_LEVEL = 2;

/**
 * Cumulative XP required to REACH `level` (level 1 = 0).
 * L1=0, L2=25k, L3=75k, L4=150k, … LN = STEP·(N-1)·N/2.
 */
export function allianceXpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return (ALLIANCE_XP_STEP * (l - 1) * l) / 2;
}

/** Derive the alliance level from cumulative XP, capped at ALLIANCE_MAX_LEVEL. */
export function allianceLevelForXp(xp: number): number {
  let level = 1;
  while (level < ALLIANCE_MAX_LEVEL && xp >= allianceXpForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

/** Member cap for an alliance at `level` (L1=20, +2 per level, L20=58). */
export function allianceMaxMembersForLevel(level: number): number {
  return (
    ALLIANCE_BASE_MAX_MEMBERS +
    (Math.max(1, Math.floor(level)) - 1) * ALLIANCE_MEMBERS_PER_LEVEL
  );
}

/**
 * Apply an XP gain to a mutable alliance-like row, recomputing level +
 * maxMembers. Returns whether the alliance leveled up. Pure mutation on the
 * passed object so both the TypeORM-entity (donate) and raw-update (deposit)
 * call sites can share the curve. `maxMembers` only ever grows (Math.max),
 * preserving any manual raise.
 */
export function applyAllianceXp(
  alliance: { xp: number; level: number; maxMembers: number },
  gainedXp: number,
): boolean {
  const gain = Math.max(0, Math.floor(gainedXp));
  if (gain <= 0) return false;
  alliance.xp = Math.floor(Number(alliance.xp) || 0) + gain;
  const newLevel = allianceLevelForXp(alliance.xp);
  if (newLevel > alliance.level) {
    alliance.level = newLevel;
    alliance.maxMembers = Math.max(
      Number(alliance.maxMembers) || ALLIANCE_BASE_MAX_MEMBERS,
      allianceMaxMembersForLevel(newLevel),
    );
    return true;
  }
  return false;
}
