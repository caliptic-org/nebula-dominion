'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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
import type { NDRace, NDRaceKey } from '@/components/handoff/nd-tokens';

const MENU_NAMES: Record<NDRaceKey, string> = {
  insan:   'İnşa Kataloğu',
  zerg:    'Mutasyon Atölyesi',
  otomat:  'Modül Deposu',
  canavar: 'Av Karargâhı',
  seytan:  'Pakt Sembolleri',
};

const VERB: Record<NDRaceKey, string> = {
  insan:   'İnşa Et',
  zerg:    'Yetiştir',
  otomat:  'Derle',
  canavar: 'Avla',
  seytan:  'Çağır',
};

const FILTERS = ['TÜM', 'TEMEL', 'EKONOMİ', 'ÜRETİM', 'KİLİTLİ'] as const;
type Filter = typeof FILTERS[number];

interface BuildEntry {
  name: string;
  desc: string;
  locked: boolean;
  category: Filter;
  costA: number;
  costB: number;
  durationSec: number;
  level: number;
}

export default function BuildMenuPage() {
  const race = useNDRace();
  const [filter, setFilter] = useState<Filter>('TÜM');
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const catalog = useMemo<BuildEntry[]>(() => buildCatalog(race), [race]);
  const visible = useMemo(() => {
    if (filter === 'TÜM') return catalog;
    if (filter === 'KİLİTLİ') return catalog.filter((c) => c.locked);
    return catalog.filter((c) => c.category === filter);
  }, [catalog, filter]);

  const selected = visible.find((c) => c.name === selectedName) ?? visible[0] ?? null;

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
      <NebulaBg race={race} intensity={0.75} dim={0.65} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Back strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            background: 'rgba(8,10,16,0.92)',
            borderBottom: `1px solid ${ND.border}`,
            backdropFilter: 'blur(12px)',
          }}
        >
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
          <H3 style={{ color: ND.text }}>{MENU_NAMES[race.key]}</H3>
          <div style={{ flex: 1 }} />
          <Chip color={race.primary}>{catalog.filter((c) => !c.locked).length} aktif</Chip>
        </div>

        <HUD race={race} level={9} levelName="Metropol" resA="12,480" resB="3,210" crystal="42" />

        {/* Filter row */}
        <div style={{ padding: '12px 14px 0' }}>
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
            {FILTERS.map((f) => {
              const on = f === filter;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={on}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    flex: 1,
                    minWidth: 64,
                    padding: '7px 6px',
                    textAlign: 'center',
                    fontFamily: ND.display,
                    fontSize: 10,
                    letterSpacing: '0.10em',
                    color: on ? 'var(--color-bg-elevated)' : ND.textDim,
                    background: on ? race.primary : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${on ? race.primary : ND.border}`,
                    borderRadius: 3,
                    fontWeight: on ? 700 : 500,
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        {/* Catalog */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {visible.map((entry) => (
            <BuildingRow
              key={entry.name}
              race={race}
              entry={entry}
              selected={selected?.name === entry.name}
              onSelect={() => setSelectedName(entry.name)}
            />
          ))}

          {visible.length === 0 && (
            <Caption style={{ textAlign: 'center', padding: '32px 0' }}>
              Bu filtreye uyan yapı yok.
            </Caption>
          )}
        </div>

        {/* Detail action bar */}
        {selected && (
          <DetailBar race={race} entry={selected} verb={VERB[race.key]} />
        )}

        <BottomNav race={race} active="base" />
      </div>
    </div>
  );
}

interface BuildingRowProps {
  race: NDRace;
  entry: BuildEntry;
  selected: boolean;
  onSelect: () => void;
}

function BuildingRow({ race, entry, selected, onSelect }: BuildingRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      disabled={entry.locked}
      style={{
        all: 'unset',
        cursor: entry.locked ? 'not-allowed' : 'pointer',
        display: 'block',
      }}
    >
      <Panel
        race={race}
        glow={selected && !entry.locked}
        style={{
          padding: 10,
          border: selected && !entry.locked ? `1px solid ${race.primary}` : `1px solid ${ND.border}`,
          opacity: entry.locked ? 0.55 : 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            aria-hidden
            style={{
              width: 44,
              height: 44,
              flexShrink: 0,
              background: `${race.primary}12`,
              border: `1px dashed ${race.primary}55`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sigil race={race} size={24} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <H3 style={{ color: ND.text, fontSize: 12 }}>
                {entry.locked ? '🔒 ' : ''}{entry.name}
              </H3>
              <Chip color={entry.locked ? ND.textDim : race.primary}>{entry.category}</Chip>
            </div>
            <Caption style={{ marginTop: 2 }}>{entry.desc}</Caption>
            <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <ResIcon kind={race.resourceA.icon} size={11} color={race.primary} />
                <Code style={{ color: race.primary }}>{entry.costA}</Code>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <ResIcon kind={race.resourceB.icon} size={11} color={race.primary} />
                <Code style={{ color: race.primary }}>{entry.costB}</Code>
              </span>
              <Code style={{ color: ND.textDim }}>⏱ {formatDuration(entry.durationSec)}</Code>
              {entry.level > 0 && <Code style={{ color: ND.textDim }}>Lv {entry.level}</Code>}
            </div>
          </div>
        </div>
      </Panel>
    </button>
  );
}

interface DetailBarProps {
  race: NDRace;
  entry: BuildEntry;
  verb: string;
}

function DetailBar({ race, entry, verb }: DetailBarProps) {
  const progress = entry.level === 0 ? 0 : Math.min(100, entry.level * 18);
  return (
    <section
      aria-label={`${entry.name} detay`}
      style={{
        background: 'rgba(8,10,16,0.96)',
        borderTop: `1px solid ${entry.locked ? ND.border : `${race.primary}55`}`,
        boxShadow: entry.locked ? 'none' : `0 -8px 24px -8px ${race.glow}`,
        backdropFilter: 'blur(14px)',
        padding: '10px 14px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sigil race={race} size={16} />
        <H3 style={{ color: ND.text }}>{entry.locked ? '🔒 ' : ''}{entry.name}</H3>
        <div style={{ flex: 1 }} />
        <Code>{entry.level === 0 ? 'YOK' : `Lv ${entry.level}`}</Code>
      </div>

      {entry.level > 0 && (
        <Bar value={progress} color={race.primary} label="SEVİYE YOLU" trailing={`${progress}%`} height={4} />
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <NDButton race={race} variant="outline" size="md" style={{ flex: 1 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ResIcon kind={race.resourceA.icon} size={11} color={race.primary} />
            {entry.costA}
            <span style={{ opacity: 0.5 }}>·</span>
            <ResIcon kind={race.resourceB.icon} size={11} color={race.primary} />
            {entry.costB}
          </span>
        </NDButton>
        <NDButton race={race} size="md" style={{ flex: 1 }} disabled={entry.locked}>
          {entry.locked ? 'Kilitli' : entry.level === 0 ? verb : 'Yükselt'}
        </NDButton>
      </div>
    </section>
  );
}

/* ─── Catalog builder ─────────────────────────────────────────────────────── */

function buildCatalog(race: NDRace): BuildEntry[] {
  // Map race.buildings → catalog entries. The first 4 entries follow a stable
  // pattern (TEMEL → EKONOMİ → ÜRETİM → ÜRETİM) for all races, the last 2 are
  // KİLİTLİ. Costs scale with order and current "level".
  return race.buildings.map((b, i) => {
    const category: Filter =
      b.locked ? 'KİLİTLİ' :
      i === 0  ? 'TEMEL'   :
      i === 1  ? 'EKONOMİ' :
      'ÜRETİM';
    const base = (i + 1) * 220;
    return {
      name:        b.n,
      desc:        b.t,
      locked:      b.locked,
      category,
      costA:       base,
      costB:       Math.round(base * 0.35),
      durationSec: 90 + i * 60,
      level:       b.locked ? 0 : Math.max(1, 5 - i),
    };
  });
}

function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}sn`;
  return `${m}d ${s.toString().padStart(2, '0')}sn`;
}
