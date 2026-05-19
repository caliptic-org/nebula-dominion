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
import type { NDRace } from '@/components/handoff/nd-tokens';

const CATALOG_NAMES: Record<string, string> = {
  insan:   'İnşa Kataloğu',
  zerg:    'Mutasyon Çukuru',
  otomat:  'Montaj Mimarisi',
  canavar: 'Av Mevkii',
  seytan:  'Pakt Tapınağı',
};

const ACTION_VERB: Record<string, string> = {
  insan:   'İnşaa',
  zerg:    'Mutasyon',
  otomat:  'Derleme',
  canavar: 'Kurulum',
  seytan:  'Çağırım',
};

const TABS: Record<string, string[]> = {
  insan:   ['ALTYAPI', 'ASKERİ', 'BİLİM', 'GENETİK'],
  zerg:    ['KOVAN',   'EVRİM',  'GENOM', 'EMME'],
  otomat:  ['HUB',     'ÜRETİM', 'MANTIK','KADİM'],
  canavar: ['TAHT',    'AV',     'ATA',   'YIRTIK'],
  seytan:  ['TAHT',    'RUH',    'LANET', 'PAKT'],
};

const FILTER_LABELS = ['Tümü', 'Açık', 'Kilitli', 'İnşada'] as const;
type FilterKey = (typeof FILTER_LABELS)[number];

export default function BaseBuildPage() {
  const race = useNDRace();
  const [activeTab, setActiveTab] = useState(0);
  const [filter, setFilter] = useState<FilterKey>('Tümü');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(0);

  const items = useMemo(() => buildItems(race), [race]);
  const visible = useMemo(() => {
    if (filter === 'Tümü')    return items;
    if (filter === 'Açık')    return items.filter((b) => !b.locked && b.state !== 'building');
    if (filter === 'Kilitli') return items.filter((b) => b.locked);
    return items.filter((b) => b.state === 'building');
  }, [items, filter]);

  const selected = selectedIdx !== null ? items[selectedIdx] : null;
  const lockedCount = items.filter((b) => b.locked).length;

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
      <NebulaBg race={race} intensity={0.65} dim={0.55} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Header strip with back link */}
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
          <H3 style={{ color: ND.text }}>{CATALOG_NAMES[race.key] ?? 'İnşa Kataloğu'}</H3>
          <div style={{ flex: 1 }} />
          <Code>{lockedCount} KİLİT</Code>
        </div>

        <HUD race={race} level={9} levelName="Metropol" />

        {/* Tabs */}
        <div style={{ padding: '12px 14px 0' }}>
          <RaceTabs race={race} items={TABS[race.key] ?? TABS.insan} active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Filter pills */}
        <div style={{ padding: '10px 14px 6px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {FILTER_LABELS.map((f) => {
            const on = f === filter;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  padding: '5px 10px',
                  fontFamily: ND.mono,
                  fontSize: 10,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  color: on ? '#0A0E1A' : ND.textDim,
                  background: on ? race.primary : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${on ? race.primary : ND.border}`,
                  borderRadius: 3,
                }}
                aria-pressed={on}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* Catalog grid */}
        <div style={{ flex: 1, padding: '6px 14px 14px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {visible.map((b) => {
              const idx = items.indexOf(b);
              const on = idx === selectedIdx;
              return (
                <BuildCard
                  key={b.name}
                  race={race}
                  item={b}
                  selected={on}
                  onClick={() => setSelectedIdx(idx)}
                />
              );
            })}
            {visible.length === 0 && (
              <Caption style={{ gridColumn: 'span 2', textAlign: 'center', padding: '24px 0' }}>
                Bu filtreyle uyumlu yapı yok.
              </Caption>
            )}
          </div>
        </div>

        {/* Bottom action bar */}
        <div style={{
          padding: '10px 14px',
          background: 'rgba(8,10,16,0.92)',
          borderTop: `1px solid ${ND.border}`,
          backdropFilter: 'blur(12px)',
        }}>
          {selected ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <H3 style={{ color: ND.text, fontSize: 12 }}>{selected.name}</H3>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                  <ResIcon kind={race.resourceA.icon} size={12} color={race.primary} />
                  <Code style={{ color: race.primary }}>{selected.costA}</Code>
                  <ResIcon kind={race.resourceB.icon} size={12} color={race.primary} />
                  <Code style={{ color: race.primary }}>{selected.costB}</Code>
                  <Code>· {selected.duration}</Code>
                </div>
              </div>
              <NDButton race={race} variant="ghost" size="md">DETAY</NDButton>
              <NDButton race={race} size="md" disabled={selected.locked || selected.state === 'building'}>
                {selected.state === 'building' ? 'İNŞAADA' : `${ACTION_VERB[race.key] ?? 'İnşaa'} BAŞLAT`}
              </NDButton>
            </div>
          ) : (
            <Caption>Bir yapı seç...</Caption>
          )}
        </div>

        <BottomNav race={race} active="base" />
      </div>
    </div>
  );
}

interface BuildItem {
  name: string;
  description: string;
  costA: string;
  costB: string;
  duration: string;
  locked: boolean;
  state: 'idle' | 'building' | 'ready';
  progress?: number;
}

function buildItems(race: NDRace): BuildItem[] {
  const tones = TONES_BY_RACE[race.key as keyof typeof TONES_BY_RACE] ?? TONES_BY_RACE.insan;
  return race.buildings.map((b, i) => {
    const tone = tones[i] ?? tones[tones.length - 1];
    return {
      name: b.n,
      description: b.t,
      costA: tone.costA,
      costB: tone.costB,
      duration: tone.duration,
      locked: b.locked,
      state: tone.state,
      progress: tone.progress,
    };
  });
}

const TONES_BY_RACE: Record<string, Array<{
  costA: string;
  costB: string;
  duration: string;
  state: 'idle' | 'building' | 'ready';
  progress?: number;
}>> = {
  insan: [
    { costA: '1,200', costB: '240', duration: '12:00', state: 'idle' },
    { costA: '480',   costB: '120', duration: '06:00', state: 'idle' },
    { costA: '320',   costB: '80',  duration: '04:00', state: 'building', progress: 48 },
    { costA: '900',   costB: '360', duration: '10:00', state: 'idle' },
    { costA: '2,400', costB: '720', duration: '24:00', state: 'idle' },
    { costA: '3,600', costB: '1,200', duration: '36:00', state: 'idle' },
  ],
  zerg: [
    { costA: '900',   costB: '180', duration: '08:00', state: 'idle' },
    { costA: '420',   costB: '90',  duration: '04:30', state: 'idle' },
    { costA: '260',   costB: '60',  duration: '03:00', state: 'building', progress: 62 },
    { costA: '720',   costB: '240', duration: '08:00', state: 'idle' },
    { costA: '1,800', costB: '600', duration: '22:00', state: 'idle' },
    { costA: '2,800', costB: '900', duration: '30:00', state: 'idle' },
  ],
  otomat: [
    { costA: '1,400', costB: '320', duration: '14:00', state: 'idle' },
    { costA: '520',   costB: '140', duration: '06:30', state: 'idle' },
    { costA: '340',   costB: '90',  duration: '04:20', state: 'building', progress: 30 },
    { costA: '980',   costB: '400', duration: '10:30', state: 'idle' },
    { costA: '2,600', costB: '780', duration: '26:00', state: 'idle' },
    { costA: '3,800', costB: '1,300', duration: '38:00', state: 'idle' },
  ],
  canavar: [
    { costA: '1,100', costB: '220', duration: '10:00', state: 'idle' },
    { costA: '460',   costB: '110', duration: '05:30', state: 'idle' },
    { costA: '300',   costB: '70',  duration: '03:45', state: 'building', progress: 75 },
    { costA: '860',   costB: '320', duration: '09:00', state: 'idle' },
    { costA: '2,200', costB: '660', duration: '22:00', state: 'idle' },
    { costA: '3,200', costB: '1,050', duration: '32:00', state: 'idle' },
  ],
  seytan: [
    { costA: '1,300', costB: '280', duration: '13:00', state: 'idle' },
    { costA: '500',   costB: '130', duration: '06:30', state: 'idle' },
    { costA: '320',   costB: '85',  duration: '04:10', state: 'building', progress: 18 },
    { costA: '940',   costB: '380', duration: '10:00', state: 'idle' },
    { costA: '2,500', costB: '760', duration: '25:00', state: 'idle' },
    { costA: '3,700', costB: '1,250', duration: '36:00', state: 'idle' },
  ],
};

interface RaceTabsProps {
  race: NDRace;
  items: string[];
  active: number;
  onChange: (i: number) => void;
}

function RaceTabs({ race, items, active, onChange }: RaceTabsProps) {
  return (
    <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
      {items.map((it, i) => {
        const on = i === active;
        return (
          <button
            key={it}
            type="button"
            onClick={() => onChange(i)}
            aria-pressed={on}
            style={{
              all: 'unset',
              cursor: 'pointer',
              flex: 1,
              minWidth: 70,
              padding: '8px 6px',
              textAlign: 'center',
              fontFamily: ND.display,
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: on ? '#0A0E1A' : ND.textDim,
              background: on ? race.primary : 'rgba(255,255,255,0.03)',
              border: `1px solid ${on ? race.primary : ND.border}`,
              borderRadius: 3,
              fontWeight: on ? 700 : 500,
            }}
          >
            {it}
          </button>
        );
      })}
    </div>
  );
}

interface BuildCardProps {
  race: NDRace;
  item: BuildItem;
  selected: boolean;
  onClick: () => void;
}

function BuildCard({ race, item, selected, onClick }: BuildCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      disabled={item.locked}
      style={{
        all: 'unset',
        cursor: item.locked ? 'not-allowed' : 'pointer',
        display: 'block',
      }}
    >
      <Panel
        race={race}
        glow={selected}
        style={{
          padding: 10,
          opacity: item.locked ? 0.55 : 1,
          border: selected ? `1px solid ${race.primary}` : `1px solid ${ND.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div
            aria-hidden
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              background: `linear-gradient(135deg, ${race.primary}22, transparent)`,
              border: `1px dashed ${race.primary}66`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sigil race={race} size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <H3 style={{ color: ND.text, fontSize: 11, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </H3>
              {item.locked && <Chip color={ND.textMute}>KİLİT</Chip>}
              {item.state === 'building' && <Chip color={race.primary}>İNŞAADA</Chip>}
            </div>
            <Caption style={{ fontSize: 10, marginTop: 2 }}>{item.description}</Caption>
          </div>
        </div>

        {item.state === 'building' && typeof item.progress === 'number' ? (
          <div style={{ marginTop: 8 }}>
            <Bar value={item.progress} color={race.primary} height={3} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
              <Eyebrow style={{ fontSize: 8 }}>%{item.progress} İLERLEME</Eyebrow>
              <Code>{item.duration}</Code>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <ResIcon kind={race.resourceA.icon} size={11} color={race.primary} />
              <Code style={{ color: race.primary }}>{item.costA}</Code>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <ResIcon kind={race.resourceB.icon} size={11} color={race.primary} />
              <Code style={{ color: race.primary }}>{item.costB}</Code>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <Code>{item.duration}</Code>
            </div>
          </div>
        )}
      </Panel>
    </button>
  );
}
