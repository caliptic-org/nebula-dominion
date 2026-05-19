'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
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
  Sigil,
} from '@/components/handoff';
import { useNDRace } from '@/components/handoff/useNDRace';
import type { NDRace } from '@/components/handoff/nd-tokens';

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

const POP_USED = 180;
const POP_MAX = 240;

interface RosterUnit {
  id: string;
  name: string;
  tier: number;
  level: number;
  count: number;
  state: 'ready' | 'fleet' | 'wounded';
}

export default function RosterPage() {
  const race = useNDRace();
  const [tierFilter, setTierFilter] = useState<number | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const units: RosterUnit[] = useMemo(() => buildRoster(race), [race]);
  const visible = useMemo(() => {
    if (tierFilter === 'all') return units;
    return units.filter((u) => u.tier === tierFilter);
  }, [units, tierFilter]);

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
            href="/inventory"
            style={{
              fontFamily: ND.display,
              fontSize: 11,
              letterSpacing: '0.08em',
              color: ND.textDim,
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}
          >
            ← Envanter
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

        {/* Roster grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {visible.map((u) => (
              <RosterCard
                key={u.id}
                race={race}
                unit={u}
                selected={u.id === selectedId}
                onClick={() => setSelectedId(u.id)}
              />
            ))}
          </div>

          {visible.length === 0 && (
            <Caption style={{ textAlign: 'center', padding: '40px 0' }}>
              Bu tier ile uyumlu birim yok.
            </Caption>
          )}

          <Eyebrow style={{ marginTop: 18, marginBottom: 6 }}>STATÜ</Eyebrow>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Chip color={race.primary}>HAZIR · {units.filter(u => u.state === 'ready').length}</Chip>
            <Chip color={ND.warn}>YARALI · {units.filter(u => u.state === 'wounded').length}</Chip>
            <Chip color={ND.textDim}>FİLODA · {units.filter(u => u.state === 'fleet').length}</Chip>
          </div>
        </div>

        {/* Bottom action bar */}
        <div style={{
          padding: '10px 14px',
          background: 'rgba(8,10,16,0.92)',
          borderTop: `1px solid ${ND.border}`,
          backdropFilter: 'blur(12px)',
          display: 'flex',
          gap: 8,
        }}>
          <Link href="/inventory/merge" style={{ flex: 1, textDecoration: 'none' }}>
            <NDButton race={race} variant="ghost" size="md" full>
              {MERGE_VERB[race.key] ?? 'Birleştir'}
            </NDButton>
          </Link>
          <NDButton race={race} size="md" style={{ flex: 1 }}>FİLO YAP</NDButton>
        </div>

        <BottomNav race={race} active="base" />
      </div>
    </div>
  );
}

function buildRoster(race: NDRace): RosterUnit[] {
  const units = race.units;
  const out: RosterUnit[] = [];
  units.forEach((u, i) => {
    const baseCount = [86, 42, 26, 14, 6, 2][i] ?? 1;
    const states: RosterUnit['state'][] = ['ready', 'fleet', 'wounded'];
    const stateIdx = i % states.length;
    out.push({
      id: `${race.key}-${u.n}-${i}`,
      name: u.n,
      tier: u.t,
      level: Math.max(1, 10 - i * 2),
      count: baseCount,
      state: states[stateIdx],
    });
  });
  return out;
}

interface RosterCardProps {
  race: NDRace;
  unit: RosterUnit;
  selected: boolean;
  onClick: () => void;
}

function RosterCard({ race, unit, selected, onClick }: RosterCardProps) {
  const stateColor = unit.state === 'ready'
    ? race.primary
    : unit.state === 'wounded'
    ? ND.warn
    : ND.textDim;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
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
