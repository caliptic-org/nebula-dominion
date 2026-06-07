/**
 * Çağ 3 unlock XP threshold. When a player's total_xp crosses this value,
 * the guild tutorial is required (guild_tutorial_required=true).
 * See CAL-230 (XP curve) and CAL-235 (this issue).
 */
export const GUILD_TUTORIAL_XP_THRESHOLD = 18_000;

/**
 * Tutorial completion reward.
 * +500 Energy + lonca arması (starter cosmetic).
 */
export const TUTORIAL_REWARD_ENERGY = 500;
export const TUTORIAL_REWARD_COSMETIC = 'guild_starter_emblem';

/**
 * Storage cap contribution rate from CAL-228 — guild aid pool draws 2% of
 * each member's storage cap.
 */
export const GUILD_AID_STORAGE_CONTRIB_RATE = 0.02;

/**
 * Cycle-18 BAL-06 — auto-promotion threshold. contributionPts (bumped 1:1 by
 * both resource donations and research science) previously only sorted the
 * roster and gated the FIRST_DONATION tutorial step — it never converted to a
 * rank or perk, so the "donation → contributionPts → rank" loop dead-ended.
 * A MEMBER who accumulates this many contributionPts is auto-promoted to
 * OFFICER (which unlocks the ability to start guild research), giving the
 * contribution grind a real mechanical payoff. LEADER/existing OFFICER are
 * never touched. Sized so it takes a sustained donor, not a single dump.
 */
export const GUILD_OFFICER_PROMOTION_THRESHOLD = 100_000;

/**
 * Telemetry event names emitted on the EventEmitter bus.
 */
export const TELEMETRY_GUILD_LIFECYCLE = 'guild_lifecycle';
export const TELEMETRY_GUILD_PROGRESSION = 'guild_progression';
/** CAL-240: raid + research activity stream. */
export const TELEMETRY_GUILD_ACTIVITY = 'guild_activity';

/**
 * Internal event: total_xp crossed GUILD_TUTORIAL_XP_THRESHOLD.
 * Emitted by ProgressionService, listened to by GuildsService.
 */
export const EVENT_GUILD_TUTORIAL_REQUIRED = 'guild.tutorial_required';
