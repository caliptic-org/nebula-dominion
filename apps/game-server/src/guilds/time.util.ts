/**
 * Guild raid/research scheduler uses ISO week boundaries (Pazartesi 00:00 UTC).
 * All helpers below are in UTC; daylight-saving / locale offsets are out of
 * scope — the cron job runs against UTC.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * Return the most recent Monday 00:00:00 UTC at or before `now`.
 * `now.getUTCDay()` returns 0 for Sunday … 6 for Saturday.
 */
export function isoWeekStartUtc(now: Date): Date {
  const day = now.getUTCDay(); // 0..6
  const daysSinceMonday = (day + 6) % 7; // Mon→0, Tue→1, …, Sun→6
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start;
}

/** End of the ISO week relative to `weekStart` — Sunday 23:59:59.999 UTC. */
export function isoWeekEndUtc(weekStart: Date): Date {
  const end = new Date(weekStart.getTime() + MS_PER_WEEK - 1);
  return end;
}

export function startOfNextIsoWeek(now: Date): Date {
  return new Date(isoWeekStartUtc(now).getTime() + MS_PER_WEEK);
}

export { MS_PER_DAY, MS_PER_WEEK };
