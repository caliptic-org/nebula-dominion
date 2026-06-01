/**
 * Frontend mirror of apps/game-server/src/common/game-speed.ts.
 *
 * Reads NEXT_PUBLIC_GAME_SPEED_MULTIPLIER at build time (Next.js bakes
 * NEXT_PUBLIC_* into the client bundle). Default 1 = canonical pacing
 * → matches backend default → no behaviour change for production.
 *
 * Higher value = faster game:
 *   - any duration the UI shows from a static config (BUILDING_CONFIGS.
 *     buildTimeSeconds, UNIT_CONFIGS.trainTimeSeconds) divides by it,
 *     mirroring what the server already applied to constructionCompleteAt.
 *   - the live deadline path (button countdown from owned.constructionCompleteAt)
 *     does NOT need this helper — server already wrote the scaled
 *     deadline. Only the "30s' static buildSec label" path on the
 *     catalog / detail card needs it, because that string comes from
 *     buildings.constants.ts which the FE imports unmodified.
 *
 * To run a playtest at 1000× the WEB also has to be rebuilt with
 *   NEXT_PUBLIC_GAME_SPEED_MULTIPLIER=1000
 * baked in via docker-compose. Game-server can flip the runtime env
 * without a rebuild, but the FE constant ships in the JS bundle.
 */

const DEFAULT_SPEED = 1;

export function gameSpeed(): number {
  const raw = process.env.NEXT_PUBLIC_GAME_SPEED_MULTIPLIER ?? String(DEFAULT_SPEED);
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SPEED;
  return n;
}

/** Divides a base duration (seconds) by the current speed.
 *  Returns 0 when the result rounds below 1s (the UI then renders an
 *  "instant" label rather than a stale countdown). */
export function scaledDurationSec(baseSeconds: number): number {
  if (!Number.isFinite(baseSeconds) || baseSeconds <= 0) return 0;
  const out = Math.floor(baseSeconds / gameSpeed());
  return out < 0 ? 0 : out;
}

/** Human-readable label for a base duration after applying the speed
 *  multiplier. Shows "anında" when sub-second to make 1000× testing
 *  obvious rather than rendering "0s". */
export function fmtScaledDuration(baseSeconds: number): string {
  const sec = scaledDurationSec(baseSeconds);
  if (sec <= 0) return 'anında';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (s === 0) return `${m}dk`;
  return `${m}dk ${s}s`;
}
