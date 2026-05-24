/**
 * Iso tilemap data + math for the /base screen.
 *
 * Treats the player's base as a real isometric tile grid. Coordinates are
 * (col, row) integers; render-time math projects them into SVG/canvas pixel
 * space via the classic iso transform:
 *
 *     screenX = originX + (col − row) × (TILE_W / 2)
 *     screenY = originY + (col + row) × (TILE_H / 2)
 *
 * The 2:1 width-to-height ratio (TILE_W = 64, TILE_H = 32) is the genre
 * standard (StarCraft, AoE, Forge of Empires). The current renderer is the
 * SVG BaseField in RaceWidgets.tsx; if we ever swap to a Phaser TilemapLayer
 * the data here (tile palette, building tile coords) carries over unchanged —
 * only the draw loop swaps.
 *
 * The "tilemap" concept lives here (not RaceWidgets) so build/edit/map
 * screens can consume the same coord space later when units start moving
 * between buildings.
 */

import type { NDRaceKey } from './nd-tokens';

/* ── Tile geometry ────────────────────────────────────────────────────── */

export const TILE_W = 64;
export const TILE_H = 32;

export const MAP_COLS = 12;
export const MAP_ROWS = 8;

/** Iso plane natural footprint in SVG units — width is the diagonal span,
 *  height is the sum of all rows projected. */
export const ISO_W = (MAP_COLS + MAP_ROWS) * (TILE_W / 2); // 640
export const ISO_H = (MAP_COLS + MAP_ROWS) * (TILE_H / 2); // 320

/** BaseField viewBox the iso plane is positioned inside. Chosen so the full
 *  diamond fits with a comfortable horizon strip above and ground apron below. */
export const VIEW_W = 800;
export const VIEW_H = 500;

/** Origin = where (col=0, row=0) lands inside the viewBox. Centered
 *  horizontally; vertically placed so the top corner of the diamond sits
 *  ~120px below the top edge (leaves room for the horizon/sky strip). */
export const ORIGIN_X = VIEW_W / 2;
export const ORIGIN_Y = 120;

export interface Tile {
  col: number;
  row: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

/** (col, row) → SVG (x, y) for the tile's TOP corner. To get the tile's
 *  CENTER, add (0, TILE_H / 2). */
export function tileToScreen(col: number, row: number): ScreenPoint {
  return {
    x: ORIGIN_X + (col - row) * (TILE_W / 2),
    y: ORIGIN_Y + (col + row) * (TILE_H / 2),
  };
}

/** SVG (x, y) → (col, row). Inverse of tileToScreen. Floor produces the
 *  tile the point lies inside; out-of-range coords return negative/oversized
 *  values — caller must clamp. */
export function screenToTile(x: number, y: number): Tile {
  const rx = x - ORIGIN_X;
  const ry = y - ORIGIN_Y;
  const col = Math.floor((rx / (TILE_W / 2) + ry / (TILE_H / 2)) / 2);
  const row = Math.floor((ry / (TILE_H / 2) - rx / (TILE_W / 2)) / 2);
  return { col, row };
}

/** True when (col, row) is inside the map bounds. */
export function isInMap(col: number, row: number): boolean {
  return col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS;
}

/** SVG polygon points string for the diamond top-face of a tile. */
export function tileDiamondPoints(col: number, row: number): string {
  const { x, y } = tileToScreen(col, row);
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  // top → right → bottom → left
  return `${x},${y} ${x + hw},${y + hh} ${x},${y + TILE_H} ${x - hw},${y + hh}`;
}

/* ── Per-race ground palette ──────────────────────────────────────────── */

export interface TilePalette {
  /** Top-face fill (main tile colour). */
  ground: string;
  /** Alternating-tile fill for a subtle checker (every (col+row) % 2). */
  groundAlt: string;
  /** Tile border / grid line colour (with alpha). */
  edge: string;
  /** Radial highlight at the plane's centre (with alpha). */
  glow: string;
}

/** Race-themed terrain palettes. Each race's base feels like a different
 *  surface — Insan's a clean metal plating, Zerg's organic biomass, Otomat's
 *  circuit board, Canavar's volcanic rock, Seytan's obsidian. */
export const TILE_PALETTE: Record<NDRaceKey, TilePalette> = {
  insan: {
    ground:    '#1a2638',
    groundAlt: '#1d2a3e',
    edge:      'rgba(122,180,255,0.16)',
    glow:      'rgba(122,180,255,0.10)',
  },
  zerg: {
    ground:    '#1c1330',
    groundAlt: '#221636',
    edge:      'rgba(216,120,255,0.14)',
    glow:      'rgba(216,120,255,0.10)',
  },
  otomat: {
    ground:    '#0e1a26',
    groundAlt: '#101f2c',
    edge:      'rgba(80,210,255,0.18)',
    glow:      'rgba(80,210,255,0.10)',
  },
  canavar: {
    ground:    '#221413',
    groundAlt: '#281816',
    edge:      'rgba(255,120,80,0.18)',
    glow:      'rgba(255,120,80,0.12)',
  },
  seytan: {
    ground:    '#1c0e22',
    groundAlt: '#221028',
    edge:      'rgba(200,120,255,0.18)',
    glow:      'rgba(200,120,255,0.12)',
  },
};

/* ── Per-race tile sprite paths ───────────────────────────────────────── */

/** Three sprite variants per race generated via ComfyUI:
 *  - `ground`   — default terrain on every tile
 *  - `resource` — bonus yield (mineral/gas/energy deposit)
 *  - `blocked`  — impassable hazard tile
 *
 *  See `getTileVariant(col, row, race)` for the deterministic placement
 *  heuristic; the grid model itself stays simple (no per-tile state) but
 *  the visuals get varied. Once a real "tile type" data layer lands, the
 *  variant becomes a server-driven attribute and this hash function is
 *  retired. */
export type TileVariant = 'ground' | 'resource' | 'blocked';

export const TILE_SPRITES: Record<NDRaceKey, Record<TileVariant, string>> = {
  insan: {
    ground:   '/assets/tiles/insan/ground.png',
    resource: '/assets/tiles/insan/resource.png',
    blocked:  '/assets/tiles/insan/blocked.png',
  },
  zerg: {
    ground:   '/assets/tiles/zerg/ground.png',
    resource: '/assets/tiles/zerg/resource.png',
    blocked:  '/assets/tiles/zerg/blocked.png',
  },
  otomat: {
    ground:   '/assets/tiles/otomat/ground.png',
    resource: '/assets/tiles/otomat/resource.png',
    blocked:  '/assets/tiles/otomat/blocked.png',
  },
  canavar: {
    ground:   '/assets/tiles/canavar/ground.png',
    resource: '/assets/tiles/canavar/resource.png',
    blocked:  '/assets/tiles/canavar/blocked.png',
  },
  seytan: {
    ground:   '/assets/tiles/seytan/ground.png',
    resource: '/assets/tiles/seytan/resource.png',
    blocked:  '/assets/tiles/seytan/blocked.png',
  },
};

/** Back-compat alias for callers that only want the default ground. */
export const TILE_SPRITE: Record<NDRaceKey, string> = {
  insan:   TILE_SPRITES.insan.ground,
  zerg:    TILE_SPRITES.zerg.ground,
  otomat:  TILE_SPRITES.otomat.ground,
  canavar: TILE_SPRITES.canavar.ground,
  seytan:  TILE_SPRITES.seytan.ground,
};

/** Deterministic variant picker — hashes (col, row, race) so the same
 *  tile always renders the same variant across page loads, but the
 *  pattern still feels organic. Hits ~15% resource and ~10% blocked,
 *  leaving 75% as ordinary ground. Excludes tiles that are occupied by
 *  buildings (caller is responsible for not calling this for those). */
export function getTileVariant(col: number, row: number, race: NDRaceKey): TileVariant {
  // Cheap xorshift over the inputs — race adds salt so two races see
  // different patterns. Bit-twiddly but no per-render alloc.
  const raceCode = race.charCodeAt(0);
  let h = (col * 73856093) ^ (row * 19349663) ^ (raceCode * 83492791);
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  const bucket = (h >>> 0) % 100;
  if (bucket < 10) return 'blocked';
  if (bucket < 25) return 'resource';
  return 'ground';
}

/* ── Per-race building tile placements ────────────────────────────────── */

/** Tile coords for each race's 5 buildings (same order as race.buildings).
 *  Placements aim for visual balance — capital near the centre with the
 *  supporting buildings fanned outwards. Tiles are 1×1 footprints for now;
 *  multi-tile footprints (e.g., 2×2 capitals) can be added later by extending
 *  this to `{ col, row, w, h }`. */
export const BUILDING_TILES: Record<NDRaceKey, ReadonlyArray<Tile>> = {
  insan: [
    { col: 4, row: 2 },
    { col: 6, row: 3 },
    { col: 2, row: 4 },
    { col: 8, row: 5 },
    { col: 5, row: 6 },
  ],
  zerg: [
    { col: 3, row: 2 },
    { col: 6, row: 3 },
    { col: 9, row: 4 },
    { col: 4, row: 5 },
    { col: 7, row: 6 },
  ],
  otomat: [
    { col: 3, row: 2 },
    { col: 7, row: 2 },
    { col: 3, row: 5 },
    { col: 7, row: 5 },
    { col: 5, row: 6 },
  ],
  canavar: [
    { col: 3, row: 3 },
    { col: 7, row: 2 },
    { col: 9, row: 4 },
    { col: 4, row: 6 },
    { col: 8, row: 6 },
  ],
  seytan: [
    { col: 4, row: 2 },
    { col: 7, row: 2 },
    { col: 9, row: 4 },
    { col: 4, row: 6 },
    { col: 7, row: 6 },
  ],
};
