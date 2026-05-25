'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  ND,
  RACES,
  Sigil,
  Eyebrow,
  H2,
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

const NODE_KIND_LABEL: Record<GalaxyNode['kind'], string> = {
  capital: 'BAŞKENT',
  colony: 'KOLONİ',
  mine: 'KAYNAK',
  relay: 'RÖLE',
};

type FilterKey = 'all' | 'ally' | 'enemy' | 'neutral';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'TÜM' },
  { key: 'ally', label: 'DOST' },
  { key: 'enemy', label: 'DÜŞMAN' },
  { key: 'neutral', label: 'NÖTR' },
];

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

function nodeShape(kind: GalaxyNode['kind'], color: string) {
  if (kind === 'capital') {
    return (
      <g>
        <circle r={11} fill="rgba(8,10,16,0.85)" stroke={color} strokeWidth={1.8} />
        <polygon
          points="0,-6 5,3 -5,3"
          fill={color}
          opacity={0.85}
        />
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

interface SelectionInfo {
  node: GalaxyNode;
  ownerColor: string;
  isEnemy: boolean;
}

interface Props {
  race?: NDRaceKey;
  /** Optional live player base summary from `/api/v1/map/state`. When passed,
   * the top-right HUD shows real level/power numbers instead of decorative
   * placeholders. */
  liveBase?: {
    name: string;
    level: number;
    power: number;
  };
}

const ZOOM_MIN = 0.75;
const ZOOM_MAX = 2.25;
const ZOOM_STEP = 0.25;

export function GalaxyMapScreen({ race: forcedRace, liveBase }: Props) {
  const detectedRace = useNDRace();
  const race = forcedRace ? RACES[forcedRace] : detectedRace;
  const enemy = RACES[race.enemyRace];

  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>('co2');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [zoom, setZoom] = useState<number>(1);

  // Live wallet pipe — keeps the top resource pills accurate as the player
  // fights / builds in other tabs. Falls back to mock when unauthenticated.
  const { data: liveResources } = useGameResources();

  const selected = GALAXY_NODES.find((n) => n.id === selectedId) ?? null;
  const selectionInfo: SelectionInfo | null = selected
    ? {
        node: selected,
        ownerColor: ownerColor(selected.owner, race, enemy),
        isEnemy: selected.owner === 'enemy' || selected.owner === 'contested',
      }
    : null;

  const visibleIds = useMemo(
    () => new Set(GALAXY_NODES.filter((n) => matchesFilter(n.owner, filter)).map((n) => n.id)),
    [filter],
  );

  const handleAttack = (node: GalaxyNode) => {
    router.push(`/target/${node.id}?race=${race.key}`);
  };

  const setZoomClamped = (next: number) =>
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(next.toFixed(2)))));

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
      }}
    >
      <BackgroundNebula race={race} />
      <ScanBeamKeyframes />

      {/* Top HUD */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'linear-gradient(180deg, rgba(6,8,15,0.95), rgba(6,8,15,0.55))',
          borderBottom: `1px solid ${ND.border}`,
        }}
      >
        <a
          href="/base"
          aria-label="Geri"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            border: `1px solid ${ND.border}`,
            color: ND.textDim,
            fontFamily: ND.display,
            textDecoration: 'none',
            clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)',
          }}
        >
          ‹
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sigil race={race} size={26} glow />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Eyebrow>{race.allianceTag} · GALAKTİK HARİTA</Eyebrow>
            <H3 style={{ color: race.primary }}>SEKTÖR-9 / KIYI YOLU</H3>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {liveBase && (
          /* Live player-base pill — real level + power from /api/v1/map/state.
           * Sits to the left of the resource pills as a confirmation that the
           * backend reflection of the map is reachable. */
          <div
            style={{
              padding: '4px 10px',
              border: `1px solid ${race.primary}77`,
              background: 'rgba(6,8,15,0.8)',
              fontFamily: ND.mono,
              fontSize: 10,
              letterSpacing: '0.10em',
              color: race.primary,
              textTransform: 'uppercase',
              clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
            }}
            aria-label="Üs durumu (canlı)"
          >
            ◆ {liveBase.name} · Sv.{liveBase.level} · {liveBase.power.toLocaleString('tr-TR')} GÜÇ
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <ResPill
            kind={race.resourceA.icon}
            value={liveResources ? formatResource(liveResources.mineral) : '12,480'}
            accent={race.primary}
          />
          <ResPill
            kind={race.resourceB.icon}
            value={liveResources ? formatResource(liveResources.gas) : '3,210'}
            accent={race.primary}
          />
        </div>
      </header>

      {/* Map viewport */}
      <main
        style={{
          position: 'relative',
          zIndex: 5,
          padding: 12,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4 / 3',
            background: 'rgba(4,6,12,0.7)',
            border: `1px solid ${ND.border}`,
            overflow: 'hidden',
            borderRadius: 6,
          }}
        >
          <GridBackdrop race={race} />
          <GalaxyScanBeam race={race} />
          <svg
            viewBox="0 0 100 75"
            preserveAspectRatio="none"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              transform: `scale(${zoom})`,
              transformOrigin: '50% 50%',
              transition: 'transform 240ms ease-out',
            }}
            role="img"
            aria-label="Galaktik harita: yıldız sistemi düğüm grafı"
          >
            {/* Edges */}
            {GALAXY_EDGES.map((e, i) => {
              const a = GALAXY_NODES.find((n) => n.id === e.from);
              const b = GALAXY_NODES.find((n) => n.id === e.to);
              if (!a || !b) return null;
              const aOwner = a.owner;
              const bOwner = b.owner;
              const isPlayerLink = aOwner === 'player' && bOwner === 'player';
              const isEnemyLink = aOwner === 'enemy' && bOwner === 'enemy';
              const color = isPlayerLink
                ? race.primary
                : isEnemyLink
                  ? enemy.primary
                  : ND.borderHi;
              const linked = visibleIds.has(a.id) && visibleIds.has(b.id);
              const baseOpacity = isPlayerLink || isEnemyLink ? 0.55 : 0.32;
              const opacity = linked ? baseOpacity : baseOpacity * 0.18;
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y * 0.75}
                  x2={b.x}
                  y2={b.y * 0.75}
                  stroke={color}
                  strokeWidth={0.18}
                  strokeDasharray={isPlayerLink || isEnemyLink ? undefined : '0.6 0.4'}
                  opacity={opacity}
                />
              );
            })}
            {/* Nodes */}
            {GALAXY_NODES.map((n) => {
              const c = ownerColor(n.owner, race, enemy);
              const g = ownerGlow(n.owner, race, enemy);
              const isSelected = n.id === selectedId;
              const visible = visibleIds.has(n.id);
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y * 0.75}) scale(0.18)`}
                  style={{
                    cursor: visible ? 'pointer' : 'default',
                    filter: `drop-shadow(0 0 1.5px ${g})`,
                    opacity: visible ? 1 : 0.18,
                    pointerEvents: visible ? 'auto' : 'none',
                    transition: 'opacity 200ms ease-out',
                  }}
                  onClick={() => visible && setSelectedId(n.id)}
                >
                  {isSelected && (
                    <circle r={16} fill="none" stroke={c} strokeWidth={1.5} opacity={0.85} />
                  )}
                  {nodeShape(n.kind, c)}
                  <text
                    y={n.kind === 'capital' ? 22 : 18}
                    textAnchor="middle"
                    fontFamily={ND.mono}
                    fontSize={6}
                    fill={c}
                    style={{ letterSpacing: '0.12em' }}
                  >
                    {n.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Filter tabs — top-left overlay */}
          <FilterTabs race={race} active={filter} onChange={setFilter} />

          {/* Zoom controls — right overlay */}
          <ZoomControls
            race={race}
            zoom={zoom}
            onIn={() => setZoomClamped(zoom + ZOOM_STEP)}
            onOut={() => setZoomClamped(zoom - ZOOM_STEP)}
            onReset={() => setZoomClamped(1)}
          />

          {/* Compass widget — bottom-left overlay */}
          <CompassWidget
            race={race}
            x={selected?.x ?? 50}
            y={selected?.y ?? 50}
            z={selected ? selected.level : 0}
          />
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 2px 4px', flexWrap: 'wrap' }}>
          <LegendChip color={race.primary} label="Bizim" />
          <LegendChip color={enemy.primary} label={`Düşman (${enemy.short})`} />
          <LegendChip color={ND.warn} label="Çatışmalı" />
          <LegendChip color={ND.textMute} label="Tarafsız" />
        </div>

        {/* Selection panel */}
        {selectionInfo && (
          <Panel
            race={race}
            glow={selectionInfo.isEnemy}
            style={{ padding: 14, marginTop: 8 }}
          >
            <NodeDetailPanel
              info={selectionInfo}
              race={race}
              enemy={enemy}
              onAttack={() => handleAttack(selectionInfo.node)}
            />
          </Panel>
        )}
      </main>
    </div>
  );
}

/* ── Filter tabs (top-left) ──────────────────────────────────────────── */

function FilterTabs({
  race,
  active,
  onChange,
}: {
  race: NDRace;
  active: FilterKey;
  onChange: (k: FilterKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Düğüm filtresi"
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        display: 'flex',
        gap: 4,
        padding: 4,
        background: 'rgba(6,8,15,0.78)',
        border: `1px solid ${race.primary}55`,
        borderRadius: 4,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: `0 0 14px -6px ${race.glow}`,
        zIndex: 6,
      }}
    >
      {FILTERS.map((f) => {
        const on = f.key === active;
        return (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(f.key)}
            style={{
              all: 'unset',
              padding: '5px 10px',
              fontFamily: ND.display,
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: on ? '#0A0E1A' : ND.textDim,
              background: on
                ? race.primary
                : 'transparent',
              border: `1px solid ${on ? race.primary : 'transparent'}`,
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'all 150ms ease-out',
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Zoom controls (right) ───────────────────────────────────────────── */

function ZoomControls({
  race,
  zoom,
  onIn,
  onOut,
  onReset,
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
    width: 36,
    height: 36,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(6,8,15,0.78)',
    border: `1px solid ${c}55`,
    color: c,
    fontFamily: ND.display,
    fontSize: 18,
    cursor: 'pointer',
    boxShadow: `0 0 10px -6px ${race.glow}`,
    transition: 'all 150ms ease-out',
  };
  return (
    <div
      style={{
        position: 'absolute',
        right: 10,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        zIndex: 6,
      }}
    >
      <button type="button" aria-label="Yakınlaştır" onClick={onIn} disabled={zoom >= ZOOM_MAX} style={{ ...btn, opacity: zoom >= ZOOM_MAX ? 0.4 : 1 }}>+</button>
      <button type="button" aria-label="Sıfırla" onClick={onReset} style={{ ...btn, fontSize: 14 }}>◎</button>
      <button type="button" aria-label="Uzaklaştır" onClick={onOut} disabled={zoom <= ZOOM_MIN} style={{ ...btn, opacity: zoom <= ZOOM_MIN ? 0.4 : 1 }}>−</button>
      <div
        aria-live="polite"
        style={{
          fontFamily: ND.mono,
          fontSize: 9,
          color: c,
          letterSpacing: '0.10em',
          textAlign: 'center',
          padding: '2px 0',
          background: 'rgba(6,8,15,0.78)',
          border: `1px solid ${c}33`,
        }}
      >
        ×{zoom.toFixed(2)}
      </div>
    </div>
  );
}

/* ── Compass widget (bottom-left) ────────────────────────────────────── */

function CompassWidget({
  race,
  x,
  y,
  z,
}: {
  race: NDRace;
  x: number;
  y: number;
  z: number;
}) {
  const c = race.primary;
  return (
    <div
      style={{
        position: 'absolute',
        left: 10,
        bottom: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px 6px 6px',
        background: 'rgba(6,8,15,0.78)',
        border: `1px solid ${c}55`,
        borderRadius: 4,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: `0 0 14px -6px ${race.glow}`,
        zIndex: 6,
      }}
      role="status"
      aria-label="Pusula ve koordinat"
    >
      <svg width={36} height={36} viewBox="-20 -20 40 40" aria-hidden>
        <circle r={18} fill="none" stroke={`${c}55`} strokeWidth={1} />
        <circle r={14} fill="none" stroke={`${c}33`} strokeWidth={0.6} strokeDasharray="2 2" />
        <line x1={0} y1={-18} x2={0} y2={18} stroke={`${c}33`} strokeWidth={0.5} />
        <line x1={-18} y1={0} x2={18} y2={0} stroke={`${c}33`} strokeWidth={0.5} />
        <polygon points="0,-14 4,2 0,-2 -4,2" fill={c} />
        <polygon points="0,14 4,-2 0,2 -4,-2" fill={`${c}55`} />
        <text x={0} y={-7} textAnchor="middle" fontSize={6} fill={c} fontFamily={ND.mono} style={{ letterSpacing: '0.15em' }}>K</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, fontFamily: ND.mono, fontSize: 10, letterSpacing: '0.10em' }}>
        <CoordRow label="X" value={x.toFixed(0).padStart(3, '0')} color={c} />
        <CoordRow label="Y" value={y.toFixed(0).padStart(3, '0')} color={c} />
        <CoordRow label="Z" value={z.toFixed(0).padStart(3, '0')} color={c} />
      </div>
    </div>
  );
}

function CoordRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
      <span style={{ color: ND.textMute, width: 10 }}>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}

/* ── Race-specific scan beam ─────────────────────────────────────────── */

function GalaxyScanBeam({ race }: { race: NDRace }) {
  const c = race.primary;
  const g = race.glow;
  const common: CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    mixBlendMode: 'screen',
    zIndex: 2,
  };

  if (race.key === 'insan') {
    // horizontal scanline sweeps top → bottom
    return (
      <div
        aria-hidden
        style={{
          ...common,
          background: `linear-gradient(180deg,
            transparent 0%,
            ${c}1f 46%,
            ${c}66 50%,
            ${c}1f 54%,
            transparent 100%)`,
          backgroundSize: '100% 28%',
          backgroundRepeat: 'no-repeat',
          animation: 'nd-scan-insan 5.2s linear infinite',
        }}
      />
    );
  }

  if (race.key === 'zerg') {
    // drifting spore particles
    const spores = Array.from({ length: 24 }, (_, i) => i);
    return (
      <div aria-hidden style={common}>
        {spores.map((i) => {
          const left = (i * 41) % 100;
          const delay = (i * 0.31) % 6;
          const dur = 5.5 + ((i * 13) % 35) / 10;
          const size = 1.6 + ((i * 7) % 26) / 10;
          return (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: `${left}%`,
                bottom: '-6%',
                width: size,
                height: size,
                borderRadius: '50%',
                background: c,
                boxShadow: `0 0 6px ${g}`,
                opacity: 0.55,
                animation: `nd-scan-zerg ${dur}s linear ${delay}s infinite`,
              }}
            />
          );
        })}
      </div>
    );
  }

  if (race.key === 'otomat') {
    // rotating radar sweep
    return (
      <div aria-hidden style={common}>
        <div
          style={{
            position: 'absolute',
            inset: '-20%',
            background: `conic-gradient(from 0deg,
              ${c}55 0deg,
              ${c}11 30deg,
              transparent 90deg,
              transparent 360deg)`,
            transformOrigin: '50% 50%',
            animation: 'nd-scan-otomat 4.5s linear infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 50% 50%, transparent 0, transparent 28%, ${c}22 28.5%, transparent 29%),
                         radial-gradient(circle at 50% 50%, transparent 0, transparent 56%, ${c}22 56.5%, transparent 57%)`,
            opacity: 0.6,
          }}
        />
      </div>
    );
  }

  if (race.key === 'canavar') {
    // expanding pulse waves
    return (
      <div aria-hidden style={common}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 60,
              height: 60,
              marginLeft: -30,
              marginTop: -30,
              border: `1.5px solid ${c}`,
              borderRadius: '50%',
              boxShadow: `0 0 18px ${g}`,
              opacity: 0,
              transformOrigin: '50% 50%',
              animation: `nd-scan-canavar 3.6s ease-out ${i * 1.2}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  // seytan — vertical ripple/wave scan, dual direction
  return (
    <div aria-hidden style={common}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `repeating-linear-gradient(90deg,
            transparent 0,
            transparent 18px,
            ${c}26 19px,
            transparent 20px)`,
          maskImage:
            'linear-gradient(90deg, transparent 0%, #000 30%, #000 70%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(90deg, transparent 0%, #000 30%, #000 70%, transparent 100%)',
          animation: 'nd-scan-seytan 6s ease-in-out infinite',
        }}
      />
    </div>
  );
}

// Use dangerouslySetInnerHTML so React doesn't try to re-encode the `>`
// combinator in our prefers-reduced-motion selector — without this the
// server emits `&gt;` (HTML entity) while the client sees raw `>` after
// hydration, tripping React's "Text content did not match" warning and
// switching the Suspense boundary to client rendering.
const SCAN_BEAM_KEYFRAMES = `
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
        [data-race] > div[aria-hidden] *,
        [data-race] > div[aria-hidden] {
          animation: none !important;
        }
      }
    `;

function ScanBeamKeyframes() {
  return <style dangerouslySetInnerHTML={{ __html: SCAN_BEAM_KEYFRAMES }} />;
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        background: 'rgba(8,12,26,0.7)',
        border: `1px solid ${color}55`,
        borderRadius: 999,
        fontFamily: ND.mono,
        fontSize: 10,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: color,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
      {label}
    </div>
  );
}

function NodeDetailPanel({
  info,
  race,
  enemy,
  onAttack,
}: {
  info: SelectionInfo;
  race: NDRace;
  enemy: NDRace;
  onAttack: () => void;
}) {
  const router = useRouter();
  const { node, ownerColor: c, isEnemy } = info;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${c}66`,
            background: `${c}14`,
            clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)',
          }}
        >
          <svg width={20} height={20} viewBox="-12 -12 24 24">
            {nodeShape(node.kind, c)}
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <Eyebrow color={c}>{NODE_KIND_LABEL[node.kind]} · Lv.{node.level}</Eyebrow>
          <H2 style={{ color: c, textShadow: `0 0 12px ${c}55` }}>{node.label}</H2>
        </div>
        <span
          style={{
            fontFamily: ND.mono,
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: '4px 8px',
            color: c,
            border: `1px solid ${c}55`,
            background: `${c}14`,
            borderRadius: 4,
          }}
        >
          {ownerLabel(node.owner)}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
        }}
      >
        <Stat label="Güç" value={node.power.toLocaleString('tr-TR')} accent={c} />
        <Stat label="Seviye" value={node.level} accent={c} />
        <Stat label="Sektör" value="S-9" accent={ND.textDim} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
        {isEnemy ? (
          <>
            <NDButton race={enemy} onClick={onAttack} variant="primary" size="md" full>
              SALDIR ⚔
            </NDButton>
            <NDButton
              race={race}
              variant="ghost"
              size="md"
              onClick={() => toast.info(`${node.label} keşfediliyor — yakında detay paneli açılacak`)}
            >
              KEŞFET
            </NDButton>
          </>
        ) : node.owner === 'neutral' ? (
          <>
            <NDButton race={race} variant="primary" size="md" full onClick={onAttack}>
              FETHET
            </NDButton>
            <NDButton
              race={race}
              variant="ghost"
              size="md"
              onClick={() => toast.info(`${node.label} taranıyor — yakında detay paneli açılacak`)}
            >
              KEŞFET
            </NDButton>
          </>
        ) : (
          <>
            <NDButton
              race={race}
              variant="primary"
              size="md"
              full
              onClick={() => {
                toast.success(`${node.label} savunma kuvvetleri pekiştirildi`);
              }}
            >
              SAVUN
            </NDButton>
            <NDButton
              race={race}
              variant="ghost"
              size="md"
              onClick={() => router.push('/base/build')}
            >
              GELİŞTİR
            </NDButton>
          </>
        )}
      </div>

      <Caption>
        {isEnemy
          ? `${enemy.allianceName} kontrolünde. Saldırı için savaş hazırlığına yönlendirileceksiniz.`
          : node.owner === 'neutral'
            ? 'Bu nokta henüz fethedilmedi. Üzerine güç gönder.'
            : 'Bu nokta filomuzun garnizonu altında.'}
      </Caption>
    </div>
  );
}

function ownerLabel(o: NodeOwner): string {
  switch (o) {
    case 'player':
      return 'BİZİM';
    case 'enemy':
      return 'DÜŞMAN';
    case 'contested':
      return 'ÇATIŞMA';
    default:
      return 'TARAFSIZ';
  }
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  const style: CSSProperties = {
    padding: '8px 10px',
    border: `1px solid ${ND.border}`,
    background: 'rgba(6,8,15,0.55)',
    borderRadius: 4,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  };
  return (
    <div style={style}>
      <span
        style={{
          fontFamily: ND.mono,
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: ND.textMute,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: ND.display,
          fontSize: 16,
          fontWeight: 600,
          color: accent,
          letterSpacing: '0.04em',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function GridBackdrop({ race }: { race: NDRace }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `linear-gradient(${race.primary}22 1px, transparent 1px),
                          linear-gradient(90deg, ${race.primary}22 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        opacity: 0.22,
        maskImage: 'radial-gradient(ellipse at 50% 50%, #000 50%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, #000 50%, transparent 100%)',
      }}
    />
  );
}

function BackgroundNebula({ race }: { race: NDRace }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(60% 40% at 18% 18%, ${race.primary}25 0%, transparent 65%),
                     radial-gradient(45% 35% at 82% 82%, ${RACES[race.enemyRace].primary}22 0%, transparent 65%),
                     radial-gradient(80% 70% at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%),
                     ${ND.bgDeep}`,
      }}
    />
  );
}
