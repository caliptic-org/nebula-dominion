'use client';

import { useCallback, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  BottomNav,
  ND,
  RACES,
  Sigil,
  Eyebrow,
  H3,
  Caption,
  Panel,
  ResPill,
  NDButton,
  toast,
  useNDRace,
  type NDRace,
  type NDRaceKey,
} from '@/components/handoff';
import { formatResource, useGameResources } from '@/hooks/useGameResources';
import {
  GALAXY_EDGES,
  GALAXY_NODES,
  type GalaxyNode,
  type NodeOwner,
} from './galaxy-data';

/* ── Constants ────────────────────────────────────────────────────────── */

const NODE_KIND_LABEL: Record<GalaxyNode['kind'], string> = {
  capital: 'BAŞKENT',
  colony:  'KOLONİ',
  mine:    'KAYNAK',
  relay:   'RÖLE',
};

type FilterKey = 'all' | 'ally' | 'enemy' | 'neutral';

const ZOOM_MIN  = 0.75;
const ZOOM_MAX  = 2.50;
const ZOOM_STEP = 0.25;
const MAX_PAN   = 240; // px

/** Maps filter-tab index → FilterKey (order: all, enemy, neutral, ally) */
const FILTER_KEY_BY_INDEX: FilterKey[] = ['all', 'enemy', 'neutral', 'ally'];

const PLAYER_CAPITAL = GALAXY_NODES.find(n => n.id === 'cap') ?? GALAXY_NODES[0];

/* ── Race-specific text helpers ───────────────────────────────────────── */

/** Short section header shown in the sub-bar (from design file) */
function galaxyHeader(race: NDRace): string {
  const map: Record<string, string> = {
    insan:   'SEKTÖR · TACTICAL OVERLAY',
    zerg:    'SEKTÖR · KOVAN AĞI · SPORE %',
    otomat:  '::sector ORIGO-OUTER · graph view',
    canavar: 'AVLAK ATLASI · ORIGO-OUTER',
    seytan:  '· BURÇLAR · MAHKEME GÖRÜŞÜ ·',
  };
  return map[race.key] ?? 'GALAKTİK HARİTA';
}

/** Label for the player's faction chip in the sub-bar */
function ownChipLabel(race: NDRace): string {
  const map: Record<string, string> = {
    insan: 'SENİN', zerg: 'KOVAN', otomat: 'OWNED', canavar: 'AVIN', seytan: 'BAĞLI',
  };
  return map[race.key] ?? 'SENİN';
}

/** Race-specific compass title */
function compassLabel(race: NDRace): string {
  const map: Record<string, string> = {
    insan: 'KOORDİNAT', zerg: 'DAMAR YÖNÜ', otomat: '::position',
    canavar: 'RÜZGAR', seytan: 'BURÇ',
  };
  return map[race.key] ?? 'KOORDİNAT';
}

/** Race-specific filter tab labels */
function galaxyFilters(race: NDRace): string[] {
  const map: Record<string, string[]> = {
    insan:   ['Tümü', 'Düşman', 'Tarafsız', 'Rift'],
    zerg:    ['Tümü', 'Et', 'Kovan', 'Yarık'],
    otomat:  ['::all', '::hostile', '::free', '::rift'],
    canavar: ['Tümü', 'Av', 'Sürü', 'Bilinmez'],
    seytan:  ['Tümü', 'Pakt', 'Av', 'Yarık'],
  };
  return map[race.key] ?? ['Tümü', 'Düşman', 'Tarafsız', 'Nötr'];
}

/* ── Distance + travel time ───────────────────────────────────────────── */

/** Light-year distance from player capital to node (12 ly = full canvas width) */
function distanceLy(node: GalaxyNode): number {
  const dx = (node.x - PLAYER_CAPITAL.x) / 100;
  const dy = (node.y - PLAYER_CAPITAL.y) / 100;
  return +(Math.sqrt(dx * dx + dy * dy) * 12).toFixed(1);
}

/** Travel time in seconds. Speed scales with playerLevel (level 1→1.03×, level 50→2.5×) */
function travelTimeSecs(node: GalaxyNode, playerLevel = 1): number {
  const dx = (node.x - PLAYER_CAPITAL.x) / 100;
  const dy = (node.y - PLAYER_CAPITAL.y) / 100;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const speedFactor = 1 + Math.max(0, playerLevel - 1) * 0.03;
  return Math.round((dist * 300) / speedFactor);
}

function fmtTime(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}dk ${s}s` : `${m}dk`;
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function matchesFilter(owner: NodeOwner, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  if (filter === 'ally') return owner === 'player';
  if (filter === 'enemy') return owner === 'enemy' || owner === 'contested';
  return owner === 'neutral';
}

function ownerColor(owner: NodeOwner, race: NDRace, enemy: NDRace): string {
  if (owner === 'player') return race.primary;
  if (owner === 'enemy') return enemy.primary;
  if (owner === 'contested') return ND.warn;
  return ND.textMute;
}

function ownerGlow(owner: NodeOwner, race: NDRace, enemy: NDRace): string {
  if (owner === 'player') return race.glow;
  if (owner === 'enemy') return enemy.glow;
  if (owner === 'contested') return 'oklch(0.85 0.18 80)';
  return 'oklch(0.65 0.02 240)';
}

function ownerLabel(o: NodeOwner): string {
  switch (o) {
    case 'player':    return 'BİZİM';
    case 'enemy':     return 'DÜŞMAN';
    case 'contested': return 'ÇATIŞMA';
    default:          return 'TARAFSIZ';
  }
}

/* ── Node SVG shapes ──────────────────────────────────────────────────── */

function nodeShape(kind: GalaxyNode['kind'], color: string) {
  if (kind === 'capital') {
    return (
      <g>
        <circle r={11} fill="rgba(8,10,16,0.85)" stroke={color} strokeWidth={1.8} />
        <polygon points="0,-6 5,3 -5,3" fill={color} opacity={0.85} />
        <circle r={2.4} fill={color} />
      </g>
    );
  }
  if (kind === 'colony') {
    return (
      <g>
        <circle r={8} fill="rgba(8,10,16,0.80)" stroke={color} strokeWidth={1.4} />
        <circle r={3} fill={color} />
      </g>
    );
  }
  if (kind === 'mine') {
    return (
      <g>
        <polygon points="0,-7 6,-2 4,6 -4,6 -6,-2" fill="rgba(8,10,16,0.80)" stroke={color} strokeWidth={1.3} />
        <polygon points="0,-3 3,-1 2,3 -2,3 -3,-1" fill={color} opacity={0.7} />
      </g>
    );
  }
  // relay
  return (
    <g>
      <polygon points="0,-7 7,0 0,7 -7,0" fill="rgba(8,10,16,0.80)" stroke={color} strokeWidth={1.3} />
      <circle r={2.2} fill={color} />
    </g>
  );
}

/* ── Tiny sub-components ──────────────────────────────────────────────── */

function SmallChip({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px',
      background: `${color}18`, border: `1px solid ${color}55`,
      borderRadius: 2,
      fontFamily: ND.mono, fontSize: 9, letterSpacing: '0.12em',
      textTransform: 'uppercase', color,
    }}>
      {children}
    </span>
  );
}

function RewardPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1,
      padding: '4px 7px', border: `1px solid ${color}55`, background: `${color}12`,
      borderRadius: 3, flex: 1,
    }}>
      <span style={{ fontFamily: ND.mono, fontSize: 7, letterSpacing: '0.14em', color: ND.textMute, textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontFamily: ND.display, fontSize: 12, fontWeight: 700, color, letterSpacing: '0.06em' }}>
        {value}
      </span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: ND.mono, fontSize: 8, color: ND.textMute }}>
      <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: color, boxShadow: `0 0 4px ${color}`, flexShrink: 0 }} />
      {label}
    </div>
  );
}

/* ── Selection state ──────────────────────────────────────────────────── */

interface SelectionInfo {
  node:       GalaxyNode;
  ownerColor: string;
  isEnemy:    boolean;
}

/* ── Props ────────────────────────────────────────────────────────────── */

interface Props {
  race?:     NDRaceKey;
  liveBase?: { name: string; level: number; power: number };
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN SCREEN
   ═══════════════════════════════════════════════════════════════════════ */

export function GalaxyMapScreen({ race: forcedRace, liveBase }: Props) {
  const detectedRace = useNDRace();
  const race  = forcedRace ? RACES[forcedRace] : detectedRace;
  const enemy = RACES[race.enemyRace];

  const router = useRouter();

  const [selectedId, setSelectedId] = useState<string>('co2');
  const [filter,     setFilter]     = useState<FilterKey>('all');
  const [zoom,       setZoom]       = useState<number>(1);
  const [panX,       setPanX]       = useState(0);
  const [panY,       setPanY]       = useState(0);

  // Ref tracks an active drag gesture
  const dragRef = useRef<{
    startX:    number;
    startY:    number;
    startPanX: number;
    startPanY: number;
    moved:     boolean;
  } | null>(null);

  const { data: liveResources } = useGameResources();

  const selected      = GALAXY_NODES.find(n => n.id === selectedId) ?? null;
  const selectionInfo: SelectionInfo | null = selected
    ? { node: selected, ownerColor: ownerColor(selected.owner, race, enemy), isEnemy: selected.owner === 'enemy' || selected.owner === 'contested' }
    : null;

  const visibleIds = useMemo(
    () => new Set(GALAXY_NODES.filter(n => matchesFilter(n.owner, filter)).map(n => n.id)),
    [filter],
  );

  const setZoomClamped = (v: number) =>
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(v.toFixed(2)))));

  const handleAttack = (node: GalaxyNode) =>
    router.push(`/target/${node.id}?race=${race.key}`);

  /* ── Pan gesture handlers ─────────────────────────────────────────── */

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Don't start a drag on node clicks (they stopPropagation)
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: panX, startPanY: panY, moved: false };
  }, [panX, panY]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
    setPanX(Math.max(-MAX_PAN, Math.min(MAX_PAN, dragRef.current.startPanX + dx)));
    setPanY(Math.max(-MAX_PAN, Math.min(MAX_PAN, dragRef.current.startPanY + dy)));
  }, []);

  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

  /* ── Wheel zoom ───────────────────────────────────────────────────── */
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoomClamped(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Card height estimate for compass offset ──────────────────────── */
  // icon(52) + title(~36) + caption(~20) + rewards?(~42) + buttons(~34) + padding+gaps(~30)
  const CARD_H = selectionInfo
    ? (selectionInfo.node.rewards.mineral > 0 ? 220 : 172)
    : 0;

  return (
    <div
      data-race={race.key}
      style={{
        height: '100dvh',
        background: ND.bgDeep,
        color: ND.text,
        fontFamily: ND.body,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <BackgroundNebula race={race} />
      <ScanBeamKeyframes />

      {/* ── Top HUD ─────────────────────────────────────────────────── */}
      <header style={{
        position: 'relative', zIndex: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        background: 'linear-gradient(180deg, rgba(6,8,15,0.96), rgba(6,8,15,0.55))',
        borderBottom: `1px solid ${ND.border}`,
        backdropFilter: 'blur(12px)',
      }}>
        <a
          href="/base"
          aria-label="Geri"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, border: `1px solid ${ND.border}`, color: ND.textDim,
            fontFamily: ND.display, textDecoration: 'none', flexShrink: 0,
            clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)',
          }}
        >‹</a>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sigil race={race} size={20} glow />
          <div>
            <Eyebrow style={{ fontSize: 8 }}>{race.allianceTag} · GALAKTİK HARİTA</Eyebrow>
            <div style={{ fontFamily: ND.display, fontSize: 10, color: race.primary, marginTop: 1, letterSpacing: '0.08em' }}>
              {galaxyHeader(race)}
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Resource pills — mineral / gas / energy (crystal) / science.
         *  Matches the /base HUD ordering so the player sees the same
         *  4-currency wallet on every screen. Previous version was missing
         *  the energy pill which broke parity with the base HUD. */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <ResPill
            kind={race.resourceA.icon}
            value={liveResources ? formatResource(liveResources.mineral) : '–'}
            accent={race.primary}
          />
          <ResPill
            kind={race.resourceB.icon}
            value={liveResources ? formatResource(liveResources.gas) : '–'}
            accent={race.primary}
          />
          <ResPill
            kind="crystal"
            value={liveResources ? formatResource(liveResources.energy) : '–'}
            accent="oklch(0.82 0.16 80)"
          />
          {/* Science pill — renders through ResPill kind='science' so the
           *  galaxy-map chip row uses the same <button> + ◈ ResIcon path
           *  as the rest of the HUD.  Previously an inline <div> here,
           *  which broke structural parity with the other three pills
           *  (they were <button>, science was <div>). */}
          <ResPill
            kind="science"
            value={liveResources ? formatResource(liveResources.science ?? 0) : '–'}
            accent="oklch(0.80 0.18 260)"
          />
        </div>
      </header>

      {/* ── Sub-header: section count + legend dots + faction chips ─── */}
      <div style={{
        position: 'relative', zIndex: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 12px',
        background: 'rgba(6,8,15,0.60)',
        borderBottom: `1px solid ${ND.border}44`,
      }}>
        <span style={{ fontFamily: ND.mono, fontSize: 9, letterSpacing: '0.12em', color: ND.textMute }}>
          {GALAXY_NODES.length} SİSTEM
        </span>
        <div style={{ flex: 1, display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
          <LegendDot color={race.primary} label="Biz" />
          <LegendDot color={enemy.primary} label={enemy.short} />
          <LegendDot color={ND.warn} label="Çatışma" />
          <LegendDot color={ND.textMute} label="Nötr" />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <SmallChip color={race.primary}>{ownChipLabel(race)}</SmallChip>
          <SmallChip color={ND.textMute}>NÖTR</SmallChip>
        </div>
      </div>

      {/* ── Map canvas ──────────────────────────────────────────────── */}
      <main
        style={{
          position: 'relative', zIndex: 5, flex: 1, overflow: 'hidden',
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onWheel={onWheel as any}
      >
        <GridBackdrop race={race} />
        <GalaxyScanBeam race={race} />

        {/* Drag-to-pan surface */}
        <div
          style={{ position: 'absolute', inset: 0, touchAction: 'none', cursor: 'grab', zIndex: 2 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Pannable + zoomable inner canvas */}
          <div
            style={{
              position: 'absolute', inset: 0,
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: '50% 50%',
              willChange: 'transform',
            }}
          >
            {/* ── SVG Edge layer ───────────────────────────────── */}
            <svg
              viewBox="0 0 100 75"
              preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              aria-hidden
            >
              {GALAXY_EDGES.map((e, i) => {
                const a = GALAXY_NODES.find(n => n.id === e.from);
                const b = GALAXY_NODES.find(n => n.id === e.to);
                if (!a || !b) return null;
                const isPlayerLink = a.owner === 'player' && b.owner === 'player';
                const isEnemyLink  = a.owner === 'enemy'  && b.owner === 'enemy';
                const color = isPlayerLink ? race.primary : isEnemyLink ? enemy.primary : ND.borderHi;
                const linked = visibleIds.has(a.id) && visibleIds.has(b.id);
                const baseOpacity = isPlayerLink || isEnemyLink ? 0.55 : 0.30;
                return (
                  <line
                    key={i}
                    x1={a.x} y1={a.y * 0.75}
                    x2={b.x} y2={b.y * 0.75}
                    stroke={color}
                    strokeWidth={0.18}
                    strokeDasharray={isPlayerLink || isEnemyLink ? undefined : '0.6 0.4'}
                    opacity={linked ? baseOpacity : baseOpacity * 0.15}
                  />
                );
              })}
            </svg>

            {/* ── Node icons ───────────────────────────────────── */}
            {GALAXY_NODES.map(n => {
              const c       = ownerColor(n.owner, race, enemy);
              const g       = ownerGlow(n.owner, race, enemy);
              const isSel   = n.id === selectedId;
              const visible = visibleIds.has(n.id);
              const sz      = n.kind === 'capital' ? 30 : n.kind === 'colony' ? 24 : 20;
              return (
                <div
                  key={n.id}
                  style={{
                    position: 'absolute',
                    left: `${n.x}%`,
                    top: `${n.y * 0.75}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: visible ? 'pointer' : 'default',
                    opacity: visible ? 1 : 0.12,
                    pointerEvents: visible ? 'auto' : 'none',
                    filter: `drop-shadow(0 0 ${isSel ? 6 : 3}px ${g})`,
                    transition: 'opacity 200ms ease-out, filter 150ms',
                    userSelect: 'none',
                    zIndex: isSel ? 4 : 3,
                  }}
                  onClick={ev => { ev.stopPropagation(); if (visible) setSelectedId(n.id); }}
                >
                  <svg
                    width={sz}
                    height={sz}
                    viewBox="-14 -14 28 28"
                    style={{ display: 'block', margin: '0 auto' }}
                  >
                    {isSel && <circle r={13} fill="none" stroke={c} strokeWidth={1.4} opacity={0.9} />}
                    {nodeShape(n.kind, c)}
                  </svg>
                  <div style={{
                    textAlign: 'center',
                    fontFamily: ND.mono,
                    fontSize: n.kind === 'capital' ? 8 : 7,
                    color: c,
                    marginTop: 2,
                    letterSpacing: '0.10em',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                    textShadow: `0 0 6px ${g}`,
                  }}>
                    {n.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Filter tabs (top-left, above drag layer) ──────────── */}
        <RaceFilterTabs race={race} active={filter} onChange={setFilter} />

        {/* ── Zoom controls (right) ─────────────────────────────── */}
        <ZoomControls
          race={race}
          zoom={zoom}
          onIn={() => setZoomClamped(zoom + ZOOM_STEP)}
          onOut={() => setZoomClamped(zoom - ZOOM_STEP)}
          onReset={() => { setZoomClamped(1); setPanX(0); setPanY(0); }}
        />

        {/* ── Compass (bottom-left, above node card) ────────────── */}
        <CompassWidget
          race={race}
          x={selected?.x ?? 50}
          y={selected?.y ?? 50}
          z={selected?.level ?? 0}
          bottomOffset={CARD_H + 12}
          label={compassLabel(race)}
        />

        {/* ── Selected node card ────────────────────────────────── */}
        {selectionInfo && (
          <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, zIndex: 15 }}>
            <Panel
              race={race}
              glow={selectionInfo.isEnemy}
              style={{
                padding: 10,
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                background: 'rgba(6,8,15,0.90)',
              }}
            >
              <NodeDetailPanel
                info={selectionInfo}
                race={race}
                enemy={enemy}
                onAttack={() => handleAttack(selectionInfo.node)}
              />
            </Panel>
          </div>
        )}
      </main>

      {/* ── Bottom navigation ────────────────────────────────────── */}
      <BottomNav
        race={race}
        active="map"
        onChange={(k) => {
          const dest =
            k === 'base'     ? '/base' :
            k === 'map'      ? '/map' :
            k === 'battle'   ? '/battle' :
            k === 'alliance' ? '/alliance' :
            '/shop';
          router.push(dest);
        }}
      />
    </div>
  );
}

/* BOTTOM NAV — moved to the shared `BottomNav` atom so /map uses the same
 * 5-tab footer as every other primary screen (ÜS · HARİTA · SAVAŞ · LONCA ·
 * MAĞAZA).  The old per-screen `MapBottomNav` lived here and only differed
 * cosmetically; standardising on the atom eliminated the drift. */

/* ═══════════════════════════════════════════════════════════════════════
   NODE DETAIL PANEL
   ═══════════════════════════════════════════════════════════════════════ */

function NodeDetailPanel({
  info, race, enemy, onAttack,
}: {
  info: SelectionInfo;
  race: NDRace;
  enemy: NDRace;
  onAttack: () => void;
}) {
  const router  = useRouter();
  const { node, ownerColor: c, isEnemy } = info;
  const dist    = distanceLy(node);
  const tTime   = travelTimeSecs(node, 1); // level 1 baseline; TODO: wire live level
  const isHome  = node.owner === 'player';

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {/* Left: node icon box */}
      <div style={{
        width: 52, height: 52,
        border: `1px solid ${c}55`,
        background: `${c}11`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)',
      }}>
        <svg width={26} height={26} viewBox="-14 -14 28 28">
          {nodeShape(node.kind, c)}
        </svg>
      </div>

      {/* Right: info + actions */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ minWidth: 0 }}>
            <Eyebrow color={c} style={{ fontSize: 8 }}>
              {NODE_KIND_LABEL[node.kind]} · Lv.{node.level}
            </Eyebrow>
            <H3 style={{ color: c, fontSize: 14, textShadow: `0 0 10px ${c}55`, marginTop: 1 }}>
              {node.label}
            </H3>
          </div>
          <SmallChip color={c}>{ownerLabel(node.owner)}</SmallChip>
        </div>

        {/* Caption: distance + power */}
        <Caption style={{ fontSize: 10, color: ND.textDim }}>
          {isHome
            ? `Ana Üs · Güç ${node.power.toLocaleString()}`
            : `Mesafe ${dist} ly · ${fmtTime(tTime)} · Güç ${node.power.toLocaleString()}`}
        </Caption>

        {/* Resource rewards — only for capturable nodes */}
        {node.rewards.mineral > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            <RewardPill label="MİN"  value={`+${node.rewards.mineral.toLocaleString()}`} color={race.primary} />
            <RewardPill label="GAZ"  value={`+${node.rewards.gas.toLocaleString()}`}     color={race.primary} />
            <RewardPill label="BİLİM" value={`+${node.rewards.science}`}                 color="oklch(0.80 0.18 260)" />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 5 }}>
          {isEnemy ? (
            <>
              <NDButton race={enemy}  size="sm" onClick={onAttack} style={{ flex: 2 }}>SALDIR ⚔</NDButton>
              <NDButton race={race}   size="sm" variant="ghost"   onClick={() => toast.info(`${node.label} keşfediliyor`)} style={{ flex: 1 }}>KEŞFET</NDButton>
              <NDButton race={race}   size="sm" variant="outline" onClick={() => toast.info('Pakt teklifi gönderildi')} style={{ flex: 1 }}>PAKT</NDButton>
            </>
          ) : node.owner === 'neutral' || node.owner === 'contested' ? (
            <>
              <NDButton race={race}   size="sm" onClick={onAttack} style={{ flex: 2 }}>
                {node.owner === 'contested' ? 'SALDIR ⚔' : 'FETHET'}
              </NDButton>
              <NDButton race={race}   size="sm" variant="ghost"   onClick={() => toast.info(`${node.label} taranıyor`)} style={{ flex: 1 }}>KEŞFET</NDButton>
              <NDButton race={race}   size="sm" variant="outline" onClick={() => toast.info('Pakt teklifi gönderildi')} style={{ flex: 1 }}>PAKT</NDButton>
            </>
          ) : (
            <>
              <NDButton race={race}   size="sm" style={{ flex: 2 }} onClick={() => toast.success(`${node.label} savunma kuvvetleri pekiştirildi`)}>SAVUN</NDButton>
              <NDButton race={race}   size="sm" variant="ghost" onClick={() => router.push('/base/build')} style={{ flex: 1 }}>GELİŞTİR</NDButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FILTER TABS (race-specific labels, small style)
   ═══════════════════════════════════════════════════════════════════════ */

function RaceFilterTabs({
  race, active, onChange,
}: {
  race: NDRace;
  active: FilterKey;
  onChange: (k: FilterKey) => void;
}) {
  const labels = galaxyFilters(race);
  return (
    <div
      role="tablist"
      aria-label="Düğüm filtresi"
      style={{
        position: 'absolute', top: 10, left: 10, zIndex: 6,
        display: 'flex', gap: 3, padding: 3,
        background: 'rgba(6,8,15,0.82)',
        border: `1px solid ${race.primary}44`,
        borderRadius: 3,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: `0 0 12px -6px ${race.glow}`,
      }}
    >
      {labels.map((label, i) => {
        const key = FILTER_KEY_BY_INDEX[i] ?? 'all';
        const on  = key === active;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(key)}
            style={{
              all: 'unset',
              padding: '4px 9px',
              fontFamily: ND.display,
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: on ? '#0A0E1A' : ND.textDim,
              background: on ? race.primary : 'transparent',
              border: `1px solid ${on ? race.primary : 'transparent'}`,
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'all 140ms ease-out',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ZOOM CONTROLS (right side)
   ═══════════════════════════════════════════════════════════════════════ */

function ZoomControls({
  race, zoom, onIn, onOut, onReset,
}: {
  race: NDRace;
  zoom: number;
  onIn: () => void;
  onOut: () => void;
  onReset: () => void;
}) {
  const c = race.primary;
  const btn: CSSProperties = {
    all: 'unset',
    width: 32, height: 32,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(6,8,15,0.82)',
    border: `1px solid ${c}44`,
    color: c,
    fontFamily: ND.display,
    fontSize: 16,
    cursor: 'pointer',
    boxShadow: `0 0 8px -5px ${race.glow}`,
    transition: 'all 140ms ease-out',
  };
  return (
    <div style={{
      position: 'absolute', right: 10, top: 60,
      display: 'flex', flexDirection: 'column', gap: 3,
      zIndex: 6,
    }}>
      <button type="button" aria-label="Yakınlaştır" onClick={onIn}    disabled={zoom >= ZOOM_MAX} style={{ ...btn, opacity: zoom >= ZOOM_MAX ? 0.35 : 1 }}>＋</button>
      <button type="button" aria-label="Sıfırla"     onClick={onReset}                             style={{ ...btn, fontSize: 13 }}>◎</button>
      <button type="button" aria-label="Uzaklaştır"  onClick={onOut}   disabled={zoom <= ZOOM_MIN} style={{ ...btn, opacity: zoom <= ZOOM_MIN ? 0.35 : 1 }}>−</button>
      <div aria-live="polite" style={{
        fontFamily: ND.mono, fontSize: 8, color: c, letterSpacing: '0.10em',
        textAlign: 'center', padding: '2px 0',
        background: 'rgba(6,8,15,0.82)', border: `1px solid ${c}33`,
      }}>
        ×{zoom.toFixed(2)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   COMPASS WIDGET (bottom-left)
   ═══════════════════════════════════════════════════════════════════════ */

function CompassWidget({
  race, x, y, z, bottomOffset = 10, label,
}: {
  race: NDRace;
  x: number;
  y: number;
  z: number;
  bottomOffset?: number;
  label?: string;
}) {
  const c = race.primary;
  return (
    <div
      role="status"
      aria-label="Pusula ve koordinat"
      style={{
        position: 'absolute', left: 10, bottom: bottomOffset, zIndex: 6,
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 8px 5px 5px',
        background: 'rgba(6,8,15,0.85)',
        border: `1px solid ${c}44`,
        borderRadius: 3,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: `0 0 10px -5px ${race.glow}`,
      }}
    >
      {/* Compass SVG (design-faithful) */}
      <svg width={34} height={34} viewBox="0 0 34 34" aria-hidden>
        <circle cx={17} cy={17} r={14} fill="none" stroke={c} strokeWidth="0.6" />
        <circle cx={17} cy={17} r={9}  fill="none" stroke={`${c}88`} strokeWidth="0.4" />
        <line x1={17} y1={3}  x2={17} y2={7}  stroke={c} strokeWidth="1.2" />
        <line x1={17} y1={27} x2={17} y2={31} stroke={c} strokeWidth="0.6" />
        <line x1={3}  y1={17} x2={7}  y2={17} stroke={c} strokeWidth="0.6" />
        <line x1={27} y1={17} x2={31} y2={17} stroke={c} strokeWidth="0.6" />
        <text x={17} y={14} textAnchor="middle" fontFamily={ND.mono} fontSize={5} fill={c} fontWeight="700">N</text>
        <polygon points="17,8 14,18 20,18" fill={race.glow} opacity={0.9} />
      </svg>

      {/* Coords */}
      <div>
        {label && (
          <div style={{ fontFamily: ND.mono, fontSize: 7, letterSpacing: '0.18em', color: c, marginBottom: 2, textTransform: 'uppercase' }}>
            {label}
          </div>
        )}
        <div style={{ fontFamily: ND.mono, fontSize: 9, color: ND.textDim, lineHeight: 1.5 }}>
          X <span style={{ color: c }}>+{x.toFixed(0).padStart(3, '0')}</span>{'  '}
          Y <span style={{ color: c }}>{y >= 50 ? '+' : '−'}{Math.abs(y - 50).toFixed(0).padStart(3, '0')}</span>{'  '}
          Z <span style={{ color: c }}>{z.toFixed(0).padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SCAN BEAM + KEYFRAMES
   ═══════════════════════════════════════════════════════════════════════ */

function GalaxyScanBeam({ race }: { race: NDRace }) {
  const c = race.primary;
  const g = race.glow;
  const common: CSSProperties = {
    position: 'absolute', inset: 0,
    pointerEvents: 'none', mixBlendMode: 'screen', zIndex: 2,
  };

  if (race.key === 'insan') {
    return (
      <div aria-hidden style={{
        ...common,
        background: `linear-gradient(180deg, transparent 0%, ${c}1f 46%, ${c}66 50%, ${c}1f 54%, transparent 100%)`,
        backgroundSize: '100% 28%', backgroundRepeat: 'no-repeat',
        animation: 'nd-scan-insan 5.2s linear infinite',
      }} />
    );
  }
  if (race.key === 'zerg') {
    const spores = Array.from({ length: 20 }, (_, i) => i);
    return (
      <div aria-hidden style={common}>
        {spores.map(i => {
          const left  = (i * 41) % 100;
          const delay = (i * 0.31) % 6;
          const dur   = 5.5 + ((i * 13) % 35) / 10;
          const size  = 1.6 + ((i * 7) % 26) / 10;
          return (
            <span key={i} style={{
              position: 'absolute', left: `${left}%`, bottom: '-6%',
              width: size, height: size, borderRadius: '50%',
              background: c, boxShadow: `0 0 6px ${g}`, opacity: 0.55,
              animation: `nd-scan-zerg ${dur}s linear ${delay}s infinite`,
            }} />
          );
        })}
      </div>
    );
  }
  if (race.key === 'otomat') {
    return (
      <div aria-hidden style={common}>
        <div style={{
          position: 'absolute', inset: '-20%',
          background: `conic-gradient(from 0deg, ${c}55 0deg, ${c}11 30deg, transparent 90deg, transparent 360deg)`,
          transformOrigin: '50% 50%', animation: 'nd-scan-otomat 4.5s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 50% 50%, transparent 0, transparent 28%, ${c}22 28.5%, transparent 29%),
                       radial-gradient(circle at 50% 50%, transparent 0, transparent 56%, ${c}22 56.5%, transparent 57%)`,
          opacity: 0.6,
        }} />
      </div>
    );
  }
  if (race.key === 'canavar') {
    return (
      <div aria-hidden style={common}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 60, height: 60, marginLeft: -30, marginTop: -30,
            border: `1.5px solid ${c}`, borderRadius: '50%',
            boxShadow: `0 0 18px ${g}`, opacity: 0, transformOrigin: '50% 50%',
            animation: `nd-scan-canavar 3.6s ease-out ${i * 1.2}s infinite`,
          }} />
        ))}
      </div>
    );
  }
  // seytan
  return (
    <div aria-hidden style={common}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `repeating-linear-gradient(90deg, transparent 0, transparent 18px, ${c}26 19px, transparent 20px)`,
        maskImage: 'linear-gradient(90deg, transparent 0%, #000 30%, #000 70%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 30%, #000 70%, transparent 100%)',
        animation: 'nd-scan-seytan 6s ease-in-out infinite',
      }} />
    </div>
  );
}

const SCAN_KEYFRAMES = `
  @keyframes nd-scan-insan {
    0%   { background-position: 0 -30%; opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { background-position: 0 130%; opacity: 0; }
  }
  @keyframes nd-scan-zerg {
    0%   { transform: translateY(0) translateX(0); opacity: 0; }
    10%  { opacity: 0.7; }
    90%  { opacity: 0.7; }
    100% { transform: translateY(-130%) translateX(8px); opacity: 0; }
  }
  @keyframes nd-scan-otomat {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes nd-scan-canavar {
    0%   { transform: scale(0.4); opacity: 0.9; }
    80%  { opacity: 0.15; }
    100% { transform: scale(7); opacity: 0; }
  }
  @keyframes nd-scan-seytan {
    0%   { transform: translateX(-12%); opacity: 0.5; }
    50%  { transform: translateX(12%);  opacity: 0.9; }
    100% { transform: translateX(-12%); opacity: 0.5; }
  }
  @media (prefers-reduced-motion: reduce) {
    [data-race] > div[aria-hidden] *, [data-race] > div[aria-hidden] { animation: none !important; }
  }
`;
function ScanBeamKeyframes() {
  return <style dangerouslySetInnerHTML={{ __html: SCAN_KEYFRAMES }} />;
}

/* ═══════════════════════════════════════════════════════════════════════
   BACKGROUND HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

function GridBackdrop({ race }: { race: NDRace }) {
  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0,
      backgroundImage: `linear-gradient(${race.primary}22 1px, transparent 1px),
                        linear-gradient(90deg, ${race.primary}22 1px, transparent 1px)`,
      backgroundSize: '32px 32px',
      opacity: 0.18,
      maskImage: 'radial-gradient(ellipse at 50% 50%, #000 50%, transparent 100%)',
      WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, #000 50%, transparent 100%)',
    }} />
  );
}

function BackgroundNebula({ race }: { race: NDRace }) {
  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0,
      background: `radial-gradient(60% 40% at 18% 18%, ${race.primary}25 0%, transparent 65%),
                   radial-gradient(45% 35% at 82% 82%, ${RACES[race.enemyRace].primary}22 0%, transparent 65%),
                   radial-gradient(80% 70% at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%),
                   ${ND.bgDeep}`,
    }} />
  );
}
