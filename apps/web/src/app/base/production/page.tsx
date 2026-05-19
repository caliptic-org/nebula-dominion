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

const PRODUCTION_NAMES: Record<string, string> = {
  insan:   'Üretim Kuyruğu',
  zerg:    'Mutasyon Çukuru',
  otomat:  'Montaj Hattı',
  canavar: 'Av Çukuru',
  seytan:  'Çağırım Sembolü',
};

const PRODUCTION_VERB: Record<string, string> = {
  insan:   'Eğit',
  zerg:    'Mutate',
  otomat:  'Derle',
  canavar: 'Çağır',
  seytan:  'Çağır',
};

const TABS: Record<string, string[]> = {
  insan:   ['ASKERİ', 'KEŞİF', 'ARAŞTIRMA', 'KOMUTAN'],
  zerg:    ['LARVA',  'KOZA',  'MUTASYON',  'KRALIÇE'],
  otomat:  ['HUB',    'PROC',  'CORE',      'YARGIÇ'],
  canavar: ['SÜRÜ',   'AVCI',  'TOTEM',     'ALFA'],
  seytan:  ['IMP',    'PAKT',  'LANET',     'LORD'],
};

const SLOT_TOTAL = 5;

interface QueueItem {
  unitName: string;
  count: number;
  pct: number;
  eta: string;
}

interface UnitDef {
  name: string;
  tier: number;
  costA: string;
  costB: string;
  duration: string;
}

export default function ProductionPage() {
  const race = useNDRace();
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(1);

  const units: UnitDef[] = useMemo(() => buildUnits(race), [race]);
  const queue: QueueItem[] = useMemo(() => buildQueue(race), [race]);
  const slotsUsed = queue.length;
  const totalProgress = queue.length > 0 ? queue.reduce((a, q) => a + q.pct, 0) / queue.length : 0;

  const selectedUnit = units[selected];

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
      <NebulaBg race={race} intensity={0.7} dim={0.6} />

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
          <H3 style={{ color: ND.text }}>{PRODUCTION_NAMES[race.key] ?? 'Üretim Kuyruğu'}</H3>
          <div style={{ flex: 1 }} />
          <Chip color={race.primary}>{slotsUsed}/{SLOT_TOTAL} SLOT</Chip>
        </div>

        <HUD race={race} level={9} levelName="Metropol" />

        {/* Production flow */}
        <div style={{ padding: '12px 14px 0' }}>
          <Panel race={race} style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Eyebrow color={race.primary}>ŞU AN ÜRETİLİYOR</Eyebrow>
              <Code style={{ color: race.primary }}>%{Math.round(totalProgress)} TOPLAM</Code>
            </div>
            {queue.length === 0 ? (
              <Caption>Kuyruk boş. Aşağıdan birim seç.</Caption>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {queue.map((q, i) => (
                  <div key={q.unitName + i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 22,
                      height: 22,
                      flexShrink: 0,
                      background: `${race.primary}1f`,
                      border: `1px solid ${race.primary}66`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: ND.display,
                      fontSize: 10,
                      color: race.primary,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontFamily: ND.display, fontSize: 11, color: ND.text }}>
                          {q.unitName} ×{q.count}
                        </span>
                        <Code style={{ color: race.primary }}>{q.eta}</Code>
                      </div>
                      <Bar value={q.pct} color={race.primary} height={3} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Library label + tabs */}
        <div style={{ padding: '14px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow color={race.primary}>BİRİM KÜTÜPHANESİ</Eyebrow>
          <Code>{units.length} BİRİM</Code>
        </div>
        <div style={{ padding: '8px 14px 0' }}>
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
            {(TABS[race.key] ?? TABS.insan).map((t, i) => {
              const on = i === tab;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(i)}
                  aria-pressed={on}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    flex: 1,
                    minWidth: 70,
                    padding: '6px 6px',
                    textAlign: 'center',
                    fontFamily: ND.display,
                    fontSize: 10,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    color: on ? '#0A0E1A' : ND.textDim,
                    background: on ? race.primary : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${on ? race.primary : ND.border}`,
                    borderRadius: 3,
                    fontWeight: on ? 700 : 500,
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Unit list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {units.map((u, i) => {
            const on = i === selected;
            return (
              <button
                key={u.name}
                type="button"
                onClick={() => setSelected(i)}
                aria-pressed={on}
                style={{ all: 'unset', cursor: 'pointer', display: 'block' }}
              >
                <Panel
                  race={race}
                  glow={on}
                  style={{
                    padding: 10,
                    border: on ? `1px solid ${race.primary}` : `1px solid ${ND.border}`,
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
                        <H3 style={{ color: ND.text, fontSize: 12 }}>{u.name}</H3>
                        <TierBadge race={race} tier={u.tier} />
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <ResIcon kind={race.resourceA.icon} size={11} color={race.primary} />
                          <Code style={{ color: race.primary }}>{u.costA}</Code>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <ResIcon kind={race.resourceB.icon} size={11} color={race.primary} />
                          <Code style={{ color: race.primary }}>{u.costB}</Code>
                        </div>
                        <Code>· {u.duration}</Code>
                      </div>
                    </div>
                    {on && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <NDButton race={race} variant="outline" size="sm" onClick={() => setCount(Math.max(1, count - 1))}>−</NDButton>
                        <div style={{ fontFamily: ND.mono, fontSize: 14, color: ND.text, width: 22, textAlign: 'center' }}>
                          {count}
                        </div>
                        <NDButton race={race} size="sm" onClick={() => setCount(Math.min(99, count + 1))}>＋</NDButton>
                      </div>
                    )}
                  </div>
                </Panel>
              </button>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div style={{
          padding: '10px 14px',
          background: 'rgba(8,10,16,0.92)',
          borderTop: `1px solid ${ND.border}`,
          backdropFilter: 'blur(12px)',
        }}>
          <NDButton race={race} size="lg" full disabled={slotsUsed >= SLOT_TOTAL}>
            {slotsUsed >= SLOT_TOTAL
              ? 'KUYRUK DOLU'
              : `KUYRUĞA EKLE · ${selectedUnit?.costA ?? '0'} ${race.resourceA.name.toUpperCase()}`}
          </NDButton>
          <Caption style={{ fontSize: 10, marginTop: 4, textAlign: 'center' }}>
            {PRODUCTION_VERB[race.key] ?? 'Eğit'} {count}× {selectedUnit?.name ?? '—'}
          </Caption>
        </div>

        <BottomNav race={race} active="base" />
      </div>
    </div>
  );
}

function buildUnits(race: NDRace): UnitDef[] {
  return race.units.slice(0, 5).map((u, i) => {
    const t: [string, string, string][] = [
      ['80',    '20',   '00:24'],
      ['180',   '60',   '01:20'],
      ['440',   '180',  '04:00'],
      ['1,200', '480',  '12:00'],
      ['2,800', '1,000','30:00'],
    ];
    const row = t[i] ?? t[t.length - 1];
    return {
      name: u.n,
      tier: u.t,
      costA: row[0],
      costB: row[1],
      duration: row[2],
    };
  });
}

function buildQueue(race: NDRace): QueueItem[] {
  const u = race.units;
  if (u.length < 4) return [];
  return [
    { unitName: u[0].n, count: 8, pct: 64, eta: '00:12' },
    { unitName: u[1].n, count: 4, pct: 30, eta: '01:20' },
    { unitName: u[3].n, count: 2, pct:  6, eta: '08:00' },
  ];
}

function TierBadge({ race, tier }: { race: NDRace; tier: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 18,
        height: 18,
        fontFamily: ND.mono,
        fontSize: 9,
        color: race.primary,
        background: `${race.primary}1f`,
        border: `1px solid ${race.primary}66`,
        borderRadius: 2,
      }}
      aria-label={`Tier ${tier}`}
    >
      T{tier}
    </span>
  );
}
