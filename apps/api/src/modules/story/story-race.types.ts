/* Race key — mirrors apps/web/src/lib/nd-tokens.ts RACE_KEYS.
 * Kept as a backend-local type so the story module does not depend on the web
 * package. Update both together when adding a race. */
export type RaceKey = 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan';

export const RACE_KEYS: readonly RaceKey[] = ['insan', 'zerg', 'otomat', 'canavar', 'seytan'];

export function isRaceKey(value: unknown): value is RaceKey {
  return typeof value === 'string' && (RACE_KEYS as readonly string[]).includes(value);
}
