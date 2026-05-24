'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ND, type NDRace, type NDRaceKey } from './nd-tokens';
import { raceLex, type NDRaceLex } from './race-lex';
import { raceShape } from './race-shape';
import { RaceActionIcon } from './RaceActionIcon';
import {
  BUILDING_TILES,
  ISO_H,
  ISO_W,
  MAP_COLS,
  MAP_ROWS,
  ORIGIN_X,
  ORIGIN_Y,
  TILE_H,
  TILE_PALETTE,
  TILE_SPRITE,
  TILE_W,
  VIEW_H,
  VIEW_W,
  tileDiamondPoints,
  tileToScreen,
} from './base-iso';

/* ── RaceTabs — tab strip with race-specific corner language ──────────── */

interface RaceTabsProps {
  race: NDRace;
  items: readonly string[];
  active?: number;
  size?: 'sm' | 'md';
  onChange?: (index: number) => void;
}

export function RaceTabs({ race, items, active = 0, size = 'md', onChange }: RaceTabsProps) {
  const fs = size === 'sm' ? 9 : 10;
  const py = size === 'sm' ? '5px' : '6px';
  return (
    <div style={{ display: 'flex', gap: 4, flex: '1 1 0', overflowX: 'auto' }} role="tablist">
      {items.map((label, i) => {
        const on = i === active;
        const shape = raceShape(race.key, 'tab');
        return (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange?.(i)}
            style={{
              all: 'unset',
              padding: `${py} 10px`,
              fontFamily: ND.display,
              fontSize: fs,
              letterSpacing: '0.10em',
              color: on ? '#0A0E1A' : ND.textDim,
              background: on ? race.primary : 'rgba(255,255,255,0.04)',
              border: `1px solid ${on ? race.primary : ND.border}`,
              textTransform: 'uppercase',
              cursor: 'pointer',
              flex: '0 0 auto',
              ...shape,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ── RaceQuickActions — vertical side action buttons ──────────────────── */

interface RaceQuickActionsProps {
  race: NDRace;
  onAction?: (key: string) => void;
}

export function RaceQuickActions({ race, onAction }: RaceQuickActionsProps) {
  const lex = raceLex(race.key);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {lex.quickActions.map((a) => {
        const shape = raceShape(race.key, 'card');
        return (
          <button
            key={a.key}
            type="button"
            onClick={() => onAction?.(a.key)}
            aria-label={a.label}
            style={{
              all: 'unset',
              width: 56,
              height: 44,
              padding: '4px 0',
              background: 'rgba(8,12,26,0.78)',
              border: `1px solid ${race.primary}77`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              color: race.primary,
              cursor: 'pointer',
              ...shape,
            }}
          >
            <RaceActionIcon kind={a.icon} color={race.primary} size={16} />
            <span style={{ fontFamily: ND.display, fontSize: 9, letterSpacing: '0.10em' }}>
              {a.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── BaseVitalsWidget — race-specific vitals badge (top-right) ────────── */

interface VitalsCell { label: string; value: string }
interface VitalsData { title: string; a: VitalsCell; b: VitalsCell; c: VitalsCell }

const VITALS: Record<NDRaceKey, VitalsData> = {
  insan:   { title: 'OPERASYONEL', a: { label: 'SEKTÖR', value: '4/4 ONLINE' }, b: { label: 'ALARM', value: '2' }, c: { label: 'KIT.', value: '%87' } },
  zerg:    { title: 'KOVAN VİTAL.', a: { label: 'VİTAL', value: '%92' },         b: { label: 'LARVA', value: '1.2K' }, c: { label: 'MUT.', value: '4 HAZIR' } },
  otomat:  { title: '::system_load', a: { label: 'CPU', value: '64%' },         b: { label: 'PROC', value: '08/16' }, c: { label: 'WARN', value: '2' } },
  canavar: { title: 'SÜRÜ MORALİ',   a: { label: 'MORAL', value: '+18' },        b: { label: 'AV', value: '3 ✓' },     c: { label: 'AY', value: 'DOLUN.' } },
  seytan:  { title: 'PAKT DURUMU',   a: { label: 'AKTİF', value: 'VII' },        b: { label: 'RUH', value: '3 BAĞLI' },c: { label: 'MÜHÜR', value: '✦ HAZIR' } },
};

interface BaseVitalsWidgetProps {
  race: NDRace;
  style?: CSSProperties;
}

export function BaseVitalsWidget({ race, style }: BaseVitalsWidgetProps) {
  const data = VITALS[race.key];
  const c = race.primary;
  const shape = raceShape(race.key, 'card');
  return (
    <div
      role="status"
      aria-label={data.title}
      style={{
        background: 'rgba(6,8,15,0.85)',
        border: `1px solid ${c}66`,
        padding: '6px 8px',
        minWidth: 142,
        boxShadow: `0 0 12px ${race.glow}33`,
        ...shape,
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: ND.mono,
          fontSize: 8,
          color: c,
          letterSpacing: '0.18em',
        }}
      >
        {data.title}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {[data.a, data.b, data.c].map((cell, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: ND.mono,
                fontSize: 8,
                color: ND.textMute,
                letterSpacing: '0.10em',
              }}
            >
              {cell.label}
            </div>
            <div
              style={{
                fontFamily: ND.display,
                fontSize: 11,
                color: ND.text,
                letterSpacing: '0.04em',
                marginTop: 1,
              }}
            >
              {cell.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── BaseField — race-themed iso silhouette field ─────────────────────── */

interface BaseFieldProps {
  race: NDRace;
  focusedIdx?: number;
  dim?: number;
  /** Aspect-ratio policy.
   * - `slice` (default): fills the container, crops overflow. Best for the phone
   *   viewport the field was sized for (390×460 portrait).
   * - `meet`: scales to fit so no building gets cropped. Use when the container
   *   is wider than the source viewBox (desktop / draggable parent). */
  aspect?: 'slice' | 'meet';
  /** Callback fired with the tapped building's index. When provided, building
   * shapes receive pointer events; default is non-interactive (decorative). */
  onSelect?: (idx: number) => void;
}

/** Building footprint on the iso plane — width is the building image's
 *  horizontal extent in SVG units. A single building anchors to one tile
 *  centre and renders the PNG so its base sits on the tile's diamond.
 *  Multiplier 1.6 → 0.8 halves the on-map sprite, so the iso tilemap reads
 *  as "many small structures on a wide field" instead of giant icons
 *  crowding their neighbours. */
const BUILDING_IMG_W = TILE_W * 0.9;

export function BaseField({
  race,
  focusedIdx = 1,
  dim = 1,
  aspect = 'slice',
  onSelect,
}: BaseFieldProps) {
  const palette = TILE_PALETTE[race.key];
  const buildings = BUILDING_TILES[race.key];
  const interactive = typeof onSelect === 'function';

  // Probe the per-race ground tile sprite ONCE on race change. SVG <image>
  // hrefs that 404 print a red error to devtools console; even an Image()
  // probe does. fetch() with HEAD is silent — failures only show in the
  // Network tab. Until ComfyUI's `--all-tiles` sweep produces the PNGs,
  // every race renders flat TILE_PALETTE colours and the console stays
  // clean. Once the asset is in place, the next render brings the sprite in.
  const tileSpriteHref = TILE_SPRITE[race.key];
  const [hasTileSprite, setHasTileSprite] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setHasTileSprite(false);
    fetch(tileSpriteHref, { method: 'HEAD' })
      .then((r) => { if (!cancelled) setHasTileSprite(r.ok); })
      .catch(() => { if (!cancelled) setHasTileSprite(false); });
    return () => { cancelled = true; };
  }, [tileSpriteHref]);

  // Map (col,row) → building index for O(1) hit-test → which building is on
  // this tile. Tiles with no building are decorative ground.
  const buildingByTile = new Map<string, number>();
  buildings.forEach((t, i) => buildingByTile.set(`${t.col},${t.row}`, i));

  // Pre-compute all tile diamonds. SVG can render 96 polygons cheaply; if we
  // ever go to a multi-screen worldmap (1000+ tiles), this swaps to a canvas
  // pass or Phaser TilemapLayer without changing the (col,row) data model.
  const tiles: { col: number; row: number; key: string }[] = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      tiles.push({ col: c, row: r, key: `${c},${r}` });
    }
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio={`xMidYMid ${aspect}`}
      style={{
        position: 'absolute',
        inset: 0,
        opacity: dim,
        // When `onSelect` is wired the field becomes interactive so building
        // taps register; otherwise we keep it click-through so floating widgets
        // and the draggable wrapper get the pointer events.
        pointerEvents: interactive ? 'auto' : 'none',
      }}
      aria-hidden={!interactive}
    >
      <defs>
        <radialGradient id={`plane-glow-${race.key}`} cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor={palette.glow.replace(/[\d.]+\)$/, '0.32)')} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      {/* Plane glow — soft race-tinted halo under the centre tiles so the
       *  diamond reads as the focal "stage" the buildings stand on. Sits
       *  BEHIND the tiles so per-tile colours stay distinct. */}
      <ellipse
        cx={ORIGIN_X}
        cy={ORIGIN_Y + ISO_H / 2}
        rx={ISO_W / 2 + 40}
        ry={ISO_H / 2 + 30}
        fill={`url(#plane-glow-${race.key})`}
      />

      {/* Ground tiles — flat-colour polygon FIRST so each cell has a fill even
       *  if the sprite 404s. Then the diamond PNG sprite layered on top via
       *  <image>: when ComfyUI has produced /assets/tiles/<race>/ground.png
       *  the browser cache hits the same URL for all 96 tiles (the bitmap is
       *  decoded once) and the field reads as photoreal terrain. Until the
       *  asset exists, every tile keeps its TILE_PALETTE colour and the page
       *  works exactly as before.
       *
       *  Grid stroke + checker tint stay on the polygon so the tilemap shape
       *  is still legible even with sprites on (subtle edge highlight + a
       *  hint of the race tint shining through transparent sprite edges). */}
      {tiles.map(({ col, row, key }) => {
        const checker = (col + row) % 2 === 0;
        const { x, y } = tileToScreen(col, row);
        return (
          <g key={`g-${key}`}>
            <polygon
              points={tileDiamondPoints(col, row)}
              fill={checker ? palette.ground : palette.groundAlt}
              stroke={palette.edge}
              strokeWidth={0.6}
            />
            {hasTileSprite && (
              <image
                href={tileSpriteHref}
                x={x - TILE_W / 2}
                y={y}
                width={TILE_W}
                height={TILE_H}
                preserveAspectRatio="none"
                style={{ pointerEvents: 'none' }}
              />
            )}
          </g>
        );
      })}

      {/* Buildings — one per BUILDING_TILES entry, anchored by tile centre.
       *  Rendered AFTER all ground tiles so they overlap onto adjacent tiles
       *  without grid lines drawing on top of the sprite. */}
      {buildings.map((tile, i) => {
        const focus = i === focusedIdx;
        const { x, y } = tileToScreen(tile.col, tile.row);
        // Tile centre is at (x, y + TILE_H/2). Sprite anchors so its base
        // sits on the centre — i.e., image bottom-centre aligns with tile
        // centre, image extends UPWARD into the sky area.
        const imgW = BUILDING_IMG_W;
        const imgH = imgW; // square crop
        const tileCx = x;
        const tileCy = y + TILE_H / 2;
        const imgX = tileCx - imgW / 2;
        const imgY = tileCy - imgH * 0.78; // 78% up so the base "feet" sit ON the tile

        const slug = race.buildings[i]?.slug;
        const assetHref = slug ? `/assets/buildings/${race.key}/${slug}.png` : null;

        return (
          <g
            key={`b-${i}`}
            onClick={interactive ? () => onSelect!(i) : undefined}
            style={interactive ? { cursor: 'pointer' } : undefined}
          >
            {/* Tile highlight under the building — a brighter diamond so
             *  occupied tiles read as "owned plots" against bare ground. */}
            <polygon
              points={tileDiamondPoints(tile.col, tile.row)}
              fill={focus ? `${race.primary}33` : `${race.primary}1a`}
              stroke={focus ? race.glow : `${race.primary}88`}
              strokeWidth={focus ? 1.5 : 0.9}
            />

            {/* Ground shadow under the building base. */}
            <ellipse
              cx={tileCx}
              cy={tileCy + 2}
              rx={TILE_W * 0.42}
              ry={TILE_H * 0.32}
              fill="#000"
              opacity={0.5}
            />

            {/* Hit-target so taps in the sprite's upper half also select. */}
            {interactive && (
              <rect
                x={imgX}
                y={imgY}
                width={imgW}
                height={imgH}
                fill="rgba(0,0,0,0)"
              />
            )}

            {/* PNG building sprite (race-themed). If the asset 404s the
             *  SVG <image> renders nothing — the tile-highlight + shadow
             *  stay so the slot still reads as "something is here". */}
            {assetHref && (
              <image
                href={assetHref}
                x={imgX}
                y={imgY}
                width={imgW}
                height={imgH}
                preserveAspectRatio="xMidYMax meet"
                style={{
                  // Fade the bottom 8% so the baked-in platform melts into
                  // the tile diamond. Matches BuildingCard treatment.
                  WebkitMaskImage:
                    'linear-gradient(to bottom, black 0%, black 92%, transparent 100%)',
                  maskImage:
                    'linear-gradient(to bottom, black 0%, black 92%, transparent 100%)',
                }}
              />
            )}

            {/* Focused-building marker corners (TL + TR of the bounding box). */}
            {focus && (
              <g pointerEvents="none">
                <rect x={imgX - 3} y={imgY - 3} width="6" height="6" fill={race.glow} />
                <rect x={imgX + imgW - 3} y={imgY - 3} width="6" height="6" fill={race.glow} />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── DraggableBaseField — pan + zoom wrapper around BaseField ───────────
 *
 * The static `BaseField` is sized for the phone viewport (390×460 portrait,
 * preserveAspectRatio="xMidYMid slice"). On desktop the slice crops the top
 * row of buildings out of view. This wrapper:
 *   - renders the field on a virtual canvas larger than the visible container
 *   - pans via mouse + touch drag (Pointer Events with capture)
 *   - zooms via mouse-wheel/trackpad-pinch (Wheel events) AND 2-finger touch
 *     pinch (multi-pointer tracking). Wheel zoom anchors at the cursor so the
 *     spot under the pointer stays put — feels like Google Maps.
 *   - clamps pan to bounds (scaled by zoom) so the field never tears off-screen
 *   - exposes +/−/⟲ overlay buttons for accessibility and desktop discovery
 *   - forwards taps that didn't pan/pinch past a small dead-zone to `onSelect`
 */

interface DraggableBaseFieldProps {
  race: NDRace;
  focusedIdx?: number;
  /** Multiplier applied to the visible container to form the virtual canvas
   * size. 1.6 keeps the silhouette ~40% larger than the viewport, leaving room
   * to pan in every direction without revealing whitespace. */
  scale?: number;
  /** Callback fired when a building tap (not a drag) lands. */
  onSelect?: (idx: number) => void;
}

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 2.6;
const WHEEL_ZOOM_STEP = 1.12; // ~12% per wheel notch

/** Default user zoom — 0.7 instead of 1.0 so /base opens with a wider crop of
 *  the iso silhouette. Players can pinch / wheel back in to focus on a single
 *  building. Stays within ZOOM_MIN (0.6). */
const DEFAULT_ZOOM = 0.7;

export function DraggableBaseField({
  race,
  focusedIdx = 1,
  // Scale doubled from 1.6 → 3.2: the virtual canvas is now 320% of the
  // visible container, giving the player a much wider iso world to pan
  // across. Paired with the 50%-smaller building images above, the result
  // is "smaller pieces on a larger board" instead of "huge pieces packed
  // into a tight viewport".
  scale = 3.2,
  onSelect,
}: DraggableBaseFieldProps) {
  const [view, setView] = useState({ x: 0, y: 0, zoom: DEFAULT_ZOOM });
  const viewRef = useRef(view);
  viewRef.current = view;

  // Multi-pointer map — supports both single-finger pan and 2-finger pinch.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragRef = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    moved: boolean;
  } | null>(null);
  const pinchRef = useRef<{
    startDist: number;
    startZoom: number;
    centerX: number;
    centerY: number;
    baseX: number;
    baseY: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const sizePct = scale * 100;
  const offsetPct = (scale - 1) * 50;

  const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));

  /** Pan limits scale with zoom: the bigger the zoom, the further you can pan. */
  const limitsFor = (zoom: number) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return { xLimit: 0, yLimit: 0 };
    const effective = scale * zoom;
    const xLimit = Math.max(0, (box.width * (effective - 1)) / 2);
    const yLimit = Math.max(0, (box.height * (effective - 1)) / 2);
    return { xLimit, yLimit };
  };

  /** Zoom around an anchor point (in container-local coords) so the spot under
   *  the anchor stays fixed on screen. */
  const zoomAt = (nextZoom: number, anchorX: number, anchorY: number) => {
    const cur = viewRef.current;
    const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, nextZoom));
    if (z === cur.zoom) return;
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    // Anchor relative to the container center (the transform origin).
    const ax = anchorX - box.width / 2;
    const ay = anchorY - box.height / 2;
    const ratio = z / cur.zoom;
    // Keep the world point under the anchor unchanged: new = anchor - (anchor - old) * ratio.
    const nextX = ax - (ax - cur.x) * ratio;
    const nextY = ay - (ay - cur.y) * ratio;
    const { xLimit, yLimit } = limitsFor(z);
    setView({
      x: clamp(nextX, xLimit),
      y: clamp(nextY, yLimit),
      zoom: z,
    });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);

    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 2) {
      // Switch from pan → pinch mode.
      dragRef.current = null;
      const [p1, p2] = pts;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      pinchRef.current = {
        startDist: Math.hypot(dx, dy) || 1,
        startZoom: viewRef.current.zoom,
        centerX: (p1.x + p2.x) / 2,
        centerY: (p1.y + p2.y) / 2,
        baseX: viewRef.current.x,
        baseY: viewRef.current.y,
      };
      return;
    }

    // Single pointer → start drag.
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: viewRef.current.x,
      baseY: viewRef.current.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Pinch path takes precedence if we have 2 active pointers.
    if (pinchRef.current && pointersRef.current.size >= 2) {
      const pts = Array.from(pointersRef.current.values()).slice(0, 2);
      const [p1, p2] = pts;
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
      const ratio = dist / pinchRef.current.startDist;
      const nextZoom = Math.max(
        ZOOM_MIN,
        Math.min(ZOOM_MAX, pinchRef.current.startZoom * ratio),
      );
      const box = containerRef.current?.getBoundingClientRect();
      if (!box) return;
      // Anchor pinch at the gesture's starting midpoint so the field doesn't drift.
      const ax = pinchRef.current.centerX - box.left - box.width / 2;
      const ay = pinchRef.current.centerY - box.top - box.height / 2;
      const zRatio = nextZoom / pinchRef.current.startZoom;
      const nextX = ax - (ax - pinchRef.current.baseX) * zRatio;
      const nextY = ay - (ay - pinchRef.current.baseY) * zRatio;
      const { xLimit, yLimit } = limitsFor(nextZoom);
      setView({
        x: clamp(nextX, xLimit),
        y: clamp(nextY, yLimit),
        zoom: nextZoom,
      });
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      drag.moved = true;
    }
    const { xLimit, yLimit } = limitsFor(viewRef.current.zoom);
    setView((cur) => ({
      x: clamp(drag.baseX + dx, xLimit),
      y: clamp(drag.baseY + dy, yLimit),
      zoom: cur.zoom,
    }));
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    if (pointersRef.current.size === 0) {
      // Keep dragRef around for one frame so the select-suppression check
      // sees `moved`, then null it out on the next pointer-down.
    }
  };

  // Wheel must be non-passive (passive listeners can't `preventDefault`).
  // React's synthetic onWheel IS passive on modern browsers — attaching it
  // via `onWheel={...}` JSX prop AND then calling `e.preventDefault()` is a
  // no-op that triggers a "Unable to preventDefault inside passive event
  // listener" warning in the console. The useEffect below adds the only
  // wheel listener we want, with `{ passive: false }` so preventDefault
  // actually stops the page from scrolling while zooming the iso plane.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (ev: WheelEvent) => {
      ev.preventDefault();
      const box = el.getBoundingClientRect();
      const anchorX = ev.clientX - box.left;
      const anchorY = ev.clientY - box.top;
      const direction = ev.deltaY > 0 ? 1 / WHEEL_ZOOM_STEP : WHEEL_ZOOM_STEP;
      zoomAt(viewRef.current.zoom * direction, anchorX, anchorY);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Button helpers — zoom around the visible center. */
  const zoomByButton = (factor: number) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    zoomAt(viewRef.current.zoom * factor, box.width / 2, box.height / 2);
  };
  const resetView = () => setView({ x: 0, y: 0, zoom: DEFAULT_ZOOM });

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      role="region"
      aria-label="Üs alanı (sürükleyerek gez, parmaklarla yakınlaştır)"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        cursor: dragRef.current ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: `${sizePct}%`,
          height: `${sizePct}%`,
          left: `${-offsetPct}%`,
          top: `${-offsetPct}%`,
          transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.zoom})`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        <BaseField
          race={race}
          focusedIdx={focusedIdx}
          aspect="meet"
          onSelect={
            onSelect
              ? (idx) => {
                  // Only treat as a select if the gesture didn't pan or pinch.
                  if (dragRef.current?.moved) return;
                  if (pinchRef.current) return;
                  onSelect(idx);
                }
              : undefined
          }
        />
      </div>

      {/* Zoom controls — bottom-left, opposite the BottomNav, tucked under
        * the selected-building card. Small footprint, no labels, race-tinted
        * border. Hidden visually on very narrow viewports (no media query —
        * the rest of the HUD already crowds those pixels). */}
      <div
        style={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          zIndex: 4,
        }}
        aria-label="Yakınlaştırma kontrolleri"
      >
        <ZoomButton race={race} onClick={() => zoomByButton(WHEEL_ZOOM_STEP)} label="+" title="Yakınlaştır" />
        <ZoomButton race={race} onClick={() => zoomByButton(1 / WHEEL_ZOOM_STEP)} label="−" title="Uzaklaştır" />
        <ZoomButton race={race} onClick={resetView} label="⟲" title="Sıfırla" />
      </div>
    </div>
  );
}

function ZoomButton({
  race,
  onClick,
  label,
  title,
}: {
  race: NDRace;
  onClick: () => void;
  label: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      title={title}
      aria-label={title}
      style={{
        all: 'unset',
        cursor: 'pointer',
        width: 28,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: ND.display,
        fontSize: 16,
        color: race.primary,
        background: 'rgba(6,8,15,0.85)',
        border: `1px solid ${race.primary}66`,
        boxShadow: `0 0 12px ${race.glow}22`,
      }}
    >
      {label}
    </button>
  );
}

/* ── BaseFieldStatusChip — top-left blinking-dot status ───────────────── */

interface BaseFieldStatusChipProps {
  race: NDRace;
  label: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function BaseFieldStatusChip({ race, label, style }: BaseFieldStatusChipProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        background: 'rgba(6,8,15,0.85)',
        border: `1px solid ${race.primary}66`,
        fontFamily: ND.mono,
        fontSize: 10,
        color: race.primary,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        boxShadow: `0 0 12px ${race.glow}33`,
        ...style,
      }}
    >
      <span aria-hidden style={{ color: race.glow, animation: 'nd-blink 1.4s ease-in-out infinite' }}>
        ●
      </span>
      {label}
    </span>
  );
}
