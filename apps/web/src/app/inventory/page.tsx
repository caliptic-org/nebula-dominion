'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bar,
  BottomNav,
  Caption,
  Chip,
  Code,
  Eyebrow,
  H3,
  HUD,
  ND,
  NDButton,
  NebulaBg,
  Panel,
  ResIcon,
  Sigil,
} from '@/components/handoff';
import { useNDRace } from '@/components/handoff/useNDRace';
import type { NDRace } from '@/components/handoff/nd-tokens';
import { POP_MAX, POP_USED } from '@/lib/nd-mocks';

const ROSTER_NAMES: Record<string, string> = {
  insan:   'Birim Envanteri',
  zerg:    'Sürü Vücudu',
  otomat:  'Birim Kataloğu',
  canavar: 'Av Topluluğu',
  seytan:  'Bağlı Ruhlar',
};

const MERGE_VERB: Record<string, string> = {
  insan:   'Birleştir',
  zerg:    'Mutate',
  otomat:  'Derle',
  canavar: 'Yut',
  seytan:  'Bağla',
};

type UnitState = 'ready' | 'fleet' | 'wounded';
type SortKey = 'tier' | 'count' | 'level';

interface RosterUnit {
  id: string;
  name: string;
  tier: number;
  level: number;
  count: number;
  state: UnitState;
  atk: number;
  def: number;
  spd: number;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'tier',  label: 'Tier'  },
  { key: 'count', label: 'Adet'  },
  { key: 'level', label: 'Sevye' },
];

const STATE_LABEL: Record<UnitState, string> = {
  ready:   'HAZIR',
  wounded: 'YARALI',
  fleet:   'FİLODA',
};

const BOTTOM_NAV_ROUTES: Record<string, string> = {
  base: '/base',
  galaxy: '/map',
  cmd: '/commanders',
  story: '/story-gallery',
  more: '/settings',
};

export default function RosterPage() {
  const race = useNDRace();
  const router = useRouter();
  const [tierFilter, setTierFilter] = useState<number | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('tier');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const units: RosterUnit[] = useMemo(() => buildRoster(race), [race]);

  const visible = useMemo(() => {
    const filtered = tierFilter === 'all' ? units : units.filter((u) => u.tier === tierFilter);
    return [...filtered].sort((a, b) => {
      if (sortKey === 'tier')  return a.tier - b.tier  || b.count - a.count;
      if (sortKey === 'count') return b.count - a.count;
      return b.level - a.level;
    });
  }, [units, tierFilter, sortKey]);

  const selectedUnit = useMemo(
    () => units.find((u) => u.id === selectedId) ?? null,
    [units, selectedId],
  );

  const popRatio = POP_USED / POP_MAX;

  return (
    <div
      data-race={race.key}
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: ND.bg,
        color: ND.text,
        fontFamily: ND.body,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <NebulaBg race={race} intensity={0.7} dim={0.65} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Back strip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          background: 'rgba(8,10,16,0.92)',
          borderBottom: `1px solid ${ND.border}`,
          backdropFilter: 'blur(12px)',
        }}>
          <Link
            href="/base"
            style={{
              fontFamily: ND.display,
              fontSize: 11,
              letterSpacing: '0.08em',
              color: ND.textDim,
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}
          >
            ← Ana Üs
          </Link>
          <div style={{ width: 1, height: 14, background: ND.border }} aria-hidden />
          <Sigil race={race} size={16} />
          <H3 style={{ color: ND.text }}>{ROSTER_NAMES[race.key] ?? 'Birim Envanteri'}</H3>
          <div style={{ flex: 1 }} />
          <Chip color={popRatio > 0.85 ? ND.warn : race.primary}>
            {POP_USED} / {POP_MAX} POP
          </Chip>
        </div>

        <HUD race={race} level={9} levelName="Metropol" />

        {/* Tier filter strip */}
        <div style={{ padding: '12px 14px 0' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['all', 1, 2, 3, 4, 5] as const).map((t) => {
              const on = t === tierFilter;
              const label = t === 'all' ? 'TÜM' : `T${t}`;
              return (
                <button
                  key={String(t)}
                  type="button"
                  onClick={() => setTierFilter(t)}
                  aria-pressed={on}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    flex: 1,
                    padding: '7px 0',
                    textAlign: 'center',
                    fontFamily: ND.display,
                    fontSize: 10,
                    letterSpacing: '0.10em',
                    color: on ? '#0A0E1A' : ND.textDim,
                    background: on ? race.primary : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${on ? race.primary : ND.border}`,
                    borderRadius: 3,
                    fontWeight: on ? 700 : 500,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sort row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px 0',
          }}
        >
          <Eyebrow color={ND.textMute}>SIRALA</Eyebrow>
          <div style={{ display: 'flex', gap: 4 }} role="radiogroup" aria-label="Sıralama">
            {SORT_OPTIONS.map((opt) => {
              const on = opt.key === sortKey;
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSortKey(opt.key)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    padding: '4px 10px',
                    fontFamily: ND.mono,
                    fontSize: 10,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    color: on ? race.primary : ND.textDim,
                    background: on ? `${race.primary}1A` : 'transparent',
                    border: `1px solid ${on ? race.primary + '55' : ND.border}`,
                    borderRadius: 3,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1 }} />
          <Code style={{ color: ND.textMute }}>{visible.length} birim</Code>
        </div>

        {/* Roster grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {visible.map((u) => (
              <RosterCard
                key={u.id}
                race={race}
                unit={u}
                selected={u.id === selectedId}
                onClick={() => setSelectedId((cur) => (cur === u.id ? null : u.id))}
              />
            ))}
          </div>

          {visible.length === 0 && (
            <div
              style={{
                position: 'relative',
                textAlign: 'center',
                padding: '56px 0',
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', opacity: 0.15 }} aria-hidden>
                <Sigil race={race} size={128} />
              </div>
              <Caption style={{ position: 'relative', zIndex: 1 }}>
                Bu tier ile uyumlu birim yok.
              </Caption>
            </div>
          )}

          <Eyebrow style={{ marginTop: 18, marginBottom: 6 }}>STATÜ</Eyebrow>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Chip color={race.primary}>HAZIR · {units.filter(u => u.state === 'ready').length}</Chip>
            <Chip color={ND.warn}>YARALI · {units.filter(u => u.state === 'wounded').length}</Chip>
            <Chip color={ND.textDim}>FİLODA · {units.filter(u => u.state === 'fleet').length}</Chip>
          </div>
        </div>

        {/* Detail drawer (visible when a unit is selected) */}
        {selectedUnit && (
          <UnitDetailDrawer
            race={race}
            unit={selectedUnit}
            onClose={() => setSelectedId(null)}
          />
        )}

        {/* Bottom action bar */}
        {!selectedUnit && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(8,10,16,0.92)',
            borderTop: `1px solid ${ND.border}`,
            backdropFilter: 'blur(12px)',
            display: 'flex',
            gap: 8,
          }}>
            <Link href="/merge" style={{ flex: 1, textDecoration: 'none' }}>
              <NDButton race={race} variant="ghost" size="md" full>
                {MERGE_VERB[race.key] ?? 'Birleştir'}
              </NDButton>
            </Link>
            <NDButton race={race} size="md" style={{ flex: 1 }}>FİLO YAP</NDButton>
          </div>
        )}

        <BottomNav
          race={race}
          active="base"
          onChange={(key) => router.push(BOTTOM_NAV_ROUTES[key] ?? '/base')}
        />
      </div>
    </div>
  );
}

/* ─── Roster building & stat derivation ────────────────────────────────── */

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function buildRoster(race: NDRace): RosterUnit[] {
  const states: UnitState[] = ['ready', 'fleet', 'wounded'];
  return race.units.map((u, i) => {
    const id = `${race.key}-${u.n}-${i}`;
    const seed = hash(id);
    const baseCount = [86, 42, 26, 14, 6, 2][i] ?? 1;
    return {
      id,
      name: u.n,
      tier: u.t,
      level: Math.max(1, 10 - i * 2),
      count: baseCount,
      state: states[i % states.length],
      atk: clamp(u.t * 14 + (seed % 9) + 8),
      def: clamp(u.t * 11 + ((seed >> 3) % 8) + 6),
      spd: clamp(94 - u.t * 12 + ((seed >> 6) % 10)),
    };
  });
}

function upgradeCost(unit: RosterUnit): number {
  return unit.level * unit.tier * 50;
}

/* ─── Roster card ──────────────────────────────────────────────────────── */

interface RosterCardProps {
  race: NDRace;
  unit: RosterUnit;
  selected: boolean;
  onClick: () => void;
}

function RosterCard({ race, unit, selected, onClick }: RosterCardProps) {
  const stateColor =
    unit.state === 'ready'   ? race.primary :
    unit.state === 'wounded' ? ND.warn      :
    ND.textDim;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${unit.name}, Tier ${unit.tier}, ${STATE_LABEL[unit.state]}, ${unit.count} adet`}
      style={{ all: 'unset', cursor: 'pointer', display: 'block' }}
    >
      <Panel
        race={race}
        glow={selected}
        style={{
          padding: 8,
          border: selected ? `1px solid ${race.primary}` : `1px solid ${ND.border}`,
        }}
      >
        <div
          aria-hidden
          style={{
            width: '100%',
            aspectRatio: '1',
            background: `linear-gradient(180deg, ${race.primary}1f, transparent)`,
            border: `1px dashed ${race.primary}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Sigil race={race} size={28} />
          <span
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              fontFamily: ND.mono,
              fontSize: 8,
              color: race.primary,
              background: 'rgba(8,12,26,0.7)',
              padding: '2px 4px',
              border: `1px solid ${race.primary}55`,
              letterSpacing: '0.08em',
            }}
          >
            T{unit.tier}
          </span>
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 6,
              height: 6,
              borderRadius: 999,
              background: stateColor,
              boxShadow: `0 0 4px ${stateColor}`,
            }}
            aria-label={unit.state}
          />
        </div>
        <div style={{ marginTop: 6 }}>
          <div
            style={{
              fontFamily: ND.display,
              fontSize: 10,
              letterSpacing: '0.06em',
              color: ND.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textTransform: 'uppercase',
            }}
          >
            {unit.name}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <Code style={{ color: race.primary, fontSize: 10 }}>×{unit.count}</Code>
            <Code style={{ fontSize: 10 }}>Lv {unit.level}</Code>
          </div>
        </div>
      </Panel>
    </button>
  );
}

/* ─── Unit detail drawer (stat viewer + actions) ───────────────────────── */

interface UnitDetailDrawerProps {
  race: NDRace;
  unit: RosterUnit;
  onClose: () => void;
}

function UnitDetailDrawer({ race, unit, onClose }: UnitDetailDrawerProps) {
  const cost = upgradeCost(unit);
  const stateColor =
    unit.state === 'ready'   ? race.primary :
    unit.state === 'wounded' ? ND.warn      :
    ND.textDim;

  return (
    <section
      aria-label={`${unit.name} detay`}
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 5,
        background: 'rgba(8,10,16,0.96)',
        borderTop: `1px solid ${race.primary}55`,
        boxShadow: `0 -8px 24px -8px ${race.glow}`,
        backdropFilter: 'blur(14px)',
        padding: '12px 14px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            background: `${race.primary}22`,
            border: `1px solid ${race.primary}66`,
            borderRadius: 3,
          }}
        >
          <Sigil race={race} size={16} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: ND.display,
              fontSize: 13,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: ND.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {unit.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Chip color={race.primary}>T{unit.tier}</Chip>
            <Chip color={stateColor}>{STATE_LABEL[unit.state]}</Chip>
            <Code>×{unit.count}</Code>
            <Code>Lv {unit.level}</Code>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Detayı kapat"
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: ND.textDim,
            border: `1px solid ${ND.border}`,
            borderRadius: 3,
            fontFamily: ND.mono,
            fontSize: 14,
          }}
        >
          ×
        </button>
      </div>

      {/* Stat bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Bar value={unit.atk} color={race.primary} label="ATK" trailing={String(unit.atk)} height={5} />
        <Bar value={unit.def} color={ND.ok}        label="DEF" trailing={String(unit.def)} height={5} />
        <Bar value={unit.spd} color={ND.warn}      label="SPD" trailing={String(unit.spd)} height={5} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <NDButton race={race} variant="outline" size="md" style={{ flex: 1 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Yükselt
            <span style={{ opacity: 0.8 }}>Lv {unit.level} → {unit.level + 1}</span>
            <span style={{ opacity: 0.6 }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <ResIcon kind={race.resourceA.icon} size={11} color={race.primary} />
              {cost}
            </span>
          </span>
        </NDButton>
        <NDButton race={race} size="md" style={{ flex: 1 }}>
          Savaşa Gönder
        </NDButton>
      </div>
    </section>
  );
}
