/**
 * Validates CSS color values before they are injected into inline styles.
 * Prevents CSS injection when raceColor / raceGradient originate from an API.
 *
 * Accepts:
 *  - Exact values from the game's race color palette
 *  - Any strict 6-digit hex color (#rrggbb) for forward-compatibility
 *
 * Returns the fallback color for anything else.
 */

const RACE_COLOR_PALETTE = new Set([
  '#44ff44', // Zerg
  '#00cfff', // Otomat
  '#ff6600', // Canavar
  '#4a9eff', // İnsan
  '#cc00ff', // Şeytan
  '#888899', // Archive / neutral
  '#7b8cde', // Brand
  '#ffc832', // Energy
  '#44d9c8', // Accent
  '#ff4444', // Danger / tournament
  '#c0c0c0', // Silver
  '#cd7f32', // Bronze
]);

const HEX6_RE = /^#[0-9a-f]{6}$/i;

export function sanitizeColor(value: unknown, fallback = '#7b8cde'): string {
  if (typeof value !== 'string') return fallback;
  const lower = value.trim().toLowerCase();
  if (RACE_COLOR_PALETTE.has(lower)) return value.trim();
  if (HEX6_RE.test(lower)) return lower;
  return fallback;
}

/** Validates a CSS linear/radial gradient string.
 *  Only allows gradients that reference known hex colors and safe keywords. */
const SAFE_GRADIENT_RE =
  /^(linear|radial)-gradient\([\s\d%,#a-z.()]+\)$/i;

export function sanitizeGradient(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  // Must match gradient pattern AND contain no semicolons, quotes, or url()
  if (
    SAFE_GRADIENT_RE.test(trimmed) &&
    !trimmed.includes(';') &&
    !trimmed.includes('"') &&
    !trimmed.includes("'") &&
    !trimmed.toLowerCase().includes('url(')
  ) {
    return trimmed;
  }
  return fallback;
}

/** Validates event ID slugs: lowercase alphanumeric + hyphens, 1–80 chars. */
const SLUG_RE = /^[a-z0-9][a-z0-9\-]{0,79}$/;

export function isValidEventSlug(id: unknown): boolean {
  return typeof id === 'string' && SLUG_RE.test(id);
}
