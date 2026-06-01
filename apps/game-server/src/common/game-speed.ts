/**
 * Centralised game-speed multiplier.
 *
 * Read once from the GAME_SPEED_MULTIPLIER env var on every call (no
 * module-level cache — playtests routinely toggle it via `docker compose
 * exec game-server env GAME_SPEED_MULTIPLIER=1 node ...` style commands
 * and a frozen value would force a full container restart).
 *
 * Higher value = faster game:
 *   - construction / training durations are divided by it
 *   - XP awards are multiplied by it
 *
 *   GAME_SPEED_MULTIPLIER=1     → canonical pacing (default, ships in prod)
 *   GAME_SPEED_MULTIPLIER=10    → comfortable QA iteration speed
 *   GAME_SPEED_MULTIPLIER=1000  → full-flow playtest in minutes
 *
 * Invalid / missing env → fallback to 1 (safe production default).
 *
 * Usage pattern:
 *   import { scaledDurationSec, scaledXp } from '../common/game-speed';
 *   const ms = scaledDurationSec(config.buildTimeSeconds) * 1000;
 *   const xp = scaledXp(baseAmount);
 *
 * Do NOT bake the multiplier into the stored amounts (e.g. don't write
 * `record.totalXp += scaledXp(...)` AND ALSO let downstream UI scale it).
 * Apply once at the boundary; the stored value reflects what the player
 * actually received at the speed in effect when the action resolved.
 */

const DEFAULT_SPEED = 1;

export function gameSpeed(): number {
  const raw = process.env.GAME_SPEED_MULTIPLIER ?? String(DEFAULT_SPEED);
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SPEED;
  return n;
}

/** Divides a base duration (seconds) by the current speed, floored.
 *  Returns 0 when speed >= base (so instant completion still works). */
export function scaledDurationSec(baseSeconds: number): number {
  if (baseSeconds <= 0) return 0;
  const out = Math.floor(baseSeconds / gameSpeed());
  return out < 0 ? 0 : out;
}

/** Multiplies a base XP amount by the current speed, rounded. */
export function scaledXp(baseAmount: number): number {
  if (baseAmount <= 0) return 0;
  return Math.round(baseAmount * gameSpeed());
}
