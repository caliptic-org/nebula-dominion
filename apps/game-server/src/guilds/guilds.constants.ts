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
 * Telemetry event names emitted on the EventEmitter bus.
 */
export const TELEMETRY_GUILD_LIFECYCLE = 'guild_lifecycle';
export const TELEMETRY_GUILD_PROGRESSION = 'guild_progression';

/**
 * Internal event: total_xp crossed GUILD_TUTORIAL_XP_THRESHOLD.
 * Emitted by ProgressionService, listened to by GuildsService.
 */
export const EVENT_GUILD_TUTORIAL_REQUIRED = 'guild.tutorial_required';
