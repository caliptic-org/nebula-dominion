/**
 * Centralised asset path resolver.
 *
 * The ComfyUI sweep (scripts/comfy-sweep.mjs) renders 5 races × 6 ages
 * for tiles, buildings, and the /base scene backdrop.  This module is
 * the only place that knows the on-disk naming convention so individual
 * screens stay decoupled from filesystem decisions.
 *
 * Paths:
 *   buildings  /assets/buildings/<race>/<slug>-age<N>.png       (1..6)
 *   tiles      /assets/tiles/<race>/age<N>-<variant>.png        (1..6)
 *   map bg     /assets/map/<race>/bg-age<N>.png                 (1..6)
 *   chars      /assets/characters/<race>/<slug>.png             (age-less)
 *
 * Each helper accepts an optional `age` (defaults to 1 — the early-game
 * starting visual).  Pass the live player tier when available; new
 * accounts and pre-login screens fall back gracefully to age 1.
 */

export type RaceKey = 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan';
export type Age = 1 | 2 | 3 | 4 | 5 | 6;
export type TileVariant = 'ground' | 'blocked' | 'resource';

/**
 * Story-bible tier system (Hikaye Kitabı §2.1) — 54 levels across 6
 * ages, 9 levels per age.  `level` here is the linear 1..54 player
 * tier.  Anything below 1 clamps to age 1; above 54 clamps to age 6.
 */
export function levelToAge(level: number | null | undefined): Age {
  if (level == null || !Number.isFinite(level) || level < 1) return 1;
  if (level >= 46) return 6;
  if (level >= 37) return 5;
  if (level >= 28) return 4;
  if (level >= 19) return 3;
  if (level >= 10) return 2;
  return 1;
}

export function buildingAsset(race: RaceKey, slug: string, age: Age = 1): string {
  return `/assets/buildings/${race}/${slug}-age${age}.png`;
}

/**
 * Original ComfyUI render with the cosmic backdrop intact (before
 * rembg cuts it).  Lives under `_orig/` alongside the bg-removed twin.
 * Use this for catalog / browse / detail screens where the building
 * sits inside its own card and the kozmik backdrop reads as "intended
 * art" rather than a halo around the silhouette.
 *
 * Keep `buildingAsset()` for screens that composite the building onto
 * the iso /base scene — those need clean alpha.
 */
export function buildingOriginalAsset(race: RaceKey, slug: string, age: Age = 1): string {
  return `/assets/buildings/${race}/_orig/${slug}-age${age}.png`;
}

export function tileAsset(race: RaceKey, variant: TileVariant, age: Age = 1): string {
  return `/assets/tiles/${race}/age${age}-${variant}.png`;
}

export function mapBgAsset(race: RaceKey, age: Age = 1): string {
  return `/assets/map/${race}/bg-age${age}.png`;
}

export function commanderAsset(race: RaceKey, slug: string): string {
  return `/assets/characters/${race}/${slug}.png`;
}
