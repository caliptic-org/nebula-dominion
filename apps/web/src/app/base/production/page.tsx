'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  ResIcon,
  Sigil,
} from '@/components/handoff';
import { useNDRace } from '@/components/handoff/useNDRace';
import type { NDRace } from '@/components/handoff/nd-tokens';
import { useHudState } from '@/hooks/useHudState';
import '@/styles/production-queue.css';

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
const SWIPE_CANCEL_PX = 80;
const SWIPE_THRESHOLD_PX = 56;

const BOTTOM_NAV_ROUTES: Record<string, string> = {
  base: '/base',
  galaxy: '/map',
  cmd: '/commanders',
  story: '/story-gallery',
  more: '/settings',
};

interface QueueItem {
  id: string;
  unitName: string;
  count: number;
  tier: number;
  totalSec: number;
  remainingSec: number;
  speedUpCost: number;
}

interface UnitDef {
  name: string;
  tier: number;
  costA: string;
  costB: string;
  durationSec: number;
}

export default function ProductionPage() {
  const race = useNDRace();
  const router = useRouter();
  const hud = useHudState();
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(1);
  const [crystal, setCrystal] = useState(42);
  const [resA, setResA] = useState(12_480);
  const [resB, setResB] = useState(3_210);

  const units: UnitDef[] = useMemo(() => buildUnits(race), [race]);
  const [queue, setQueue] = useState<QueueItem[]>(() => buildInitialQueue(race));
  const [flashId, setFlashId] = useState<string | null>(null);

  // Re-seed queue when race changes (race-select navigation).
  useEffect(() => {
    setQueue(buildInitialQueue(race));
  }, [race]);

  // Live countdown tick.
  useEffect(() => {
    if (queue.length === 0) return;
    const t = window.setInterval(() => {
      setQueue(prev => {
        if (prev.length === 0) return prev;
        const next: QueueItem[] = [];
        let completed: string | null = null;
        // Only the head ticks; rest wait their turn.
        for (let i = 0; i < prev.length; i++) {
          const it = prev[i];
          if (i === 0) {
            const r = Math.max(0, it.remainingSec - 1);
            if (r === 0) {
              completed = it.id;
              continue;
            }
            next.push({ ...it, remainingSec: r });
          } else {
            next.push(it);
          }
        }
        if (completed) {
          setFlashId(completed);
          window.setTimeout(() => setFlashId(null), 600);
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [queue.length]);

  const slotsUsed = queue.length;
  const totalRemainingSec = queue.reduce((a, q) => a + q.remainingSec, 0);
  const totalCrystalToSpeedAll = queue.reduce((a, q) => a + q.speedUpCost, 0);

  const headProgress = useMemo(() => {
    const h = queue[0];
    if (!h) return 0;
    return Math.min(1, (h.totalSec - h.remainingSec) / h.totalSec);
  }, [queue]);

  const selectedUnit = units[selected];
  const canAfford =
    selectedUnit !== undefined &&
    resA >= toNum(selectedUnit.costA) * count &&
    resB >= toNum(selectedUnit.costB) * count;

  const handleAdd = useCallback(() => {
    if (!selectedUnit) return;
    if (slotsUsed >= SLOT_TOTAL) return;
    if (!canAfford) return;
    const a = toNum(selectedUnit.costA) * count;
    const b = toNum(selectedUnit.costB) * count;
    setResA(v => v - a);
    setResB(v => v - b);
    const total = selectedUnit.durationSec * count;
    setQueue(q => [
      ...q,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        unitName: selectedUnit.name,
        count,
        tier: selectedUnit.tier,
        totalSec: total,
        remainingSec: total,
        speedUpCost: crystalCostFor(total),
      },
    ]);
    setCount(1);
  }, [selectedUnit, slotsUsed, canAfford, count]);

  const handleSpeedUp = useCallback((id: string) => {
    setQueue(prev => {
      const item = prev.find(q => q.id === id);
      if (!item) return prev;
      if (crystal < item.speedUpCost) return prev;
      setCrystal(c => c - item.speedUpCost);
      setFlashId(id);
      window.setTimeout(() => setFlashId(null), 600);
      return prev.filter(q => q.id !== id);
    });
  }, [crystal]);

  const handleCancel = useCallback((id: string) => {
    setQueue(prev => prev.filter(q => q.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    if (queue.length === 0) return;
    setQueue([]);
  }, [queue.length]);

  const handleSpeedAll = useCallback(() => {
    if (queue.length === 0) return;
    if (crystal < totalCrystalToSpeedAll) return;
    setCrystal(c => c - totalCrystalToSpeedAll);
    setQueue([]);
  }, [queue.length, crystal, totalCrystalToSpeedAll]);

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

        <HUD
          race={race}
          level={hud.level}
          levelName={hud.levelName}
          resA={formatNumber(resA)}
          resB={formatNumber(resB)}
          crystal={String(crystal)}
        />

        {/* Production flow */}
        <div style={{ padding: '12px 14px 0' }}>
          <Panel race={race} style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Eyebrow color={race.primary}>ŞU AN ÜRETİLİYOR</Eyebrow>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Code style={{ color: ND.textDim }}>{slotsUsed > 0 ? `KALAN ${formatDuration(totalRemainingSec)}` : 'KUYRUK BOŞ'}</Code>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {queue.length === 0 ? (
                <Caption style={{ padding: '8px 0' }}>
                  Kuyruk boş. Aşağıdan birim seç ve üretime ekle.
                </Caption>
              ) : null}

              {queue.map((q, i) => (
                <QueueRow
                  key={q.id}
                  race={race}
                  item={q}
                  index={i}
                  isHead={i === 0}
                  headProgress={i === 0 ? headProgress : 0}
                  flash={flashId === q.id}
                  affordableSpeedUp={crystal >= q.speedUpCost}
                  onSpeedUp={() => handleSpeedUp(q.id)}
                  onCancel={() => handleCancel(q.id)}
                />
              ))}

              {/* Empty slots */}
              {Array.from({ length: Math.max(0, SLOT_TOTAL - queue.length) }).map((_, i) => (
                <EmptySlot key={`empty-${i}`} race={race} index={queue.length + i} />
              ))}
            </div>

            {/* Queue-level actions */}
            {queue.length > 0 && (
              <div style={{
                display: 'flex',
                gap: 8,
                marginTop: 10,
                paddingTop: 10,
                borderTop: `1px dashed ${ND.border}`,
              }}>
                <NDButton
                  race={race}
                  variant="outline"
                  size="sm"
                  onClick={handleSpeedAll}
                  disabled={crystal < totalCrystalToSpeedAll}
                  icon={<ResIcon kind="crystal" size={12} color={race.primary} />}
                >
                  TÜMÜNÜ HIZLANDIR · {totalCrystalToSpeedAll}
                </NDButton>
                <NDButton
                  race={race}
                  variant="danger"
                  size="sm"
                  onClick={handleClearAll}
                >
                  BOŞALT
                </NDButton>
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
                    color: on ? 'var(--color-bg-elevated)' : ND.textDim,
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
                        <Code>· {formatDuration(u.durationSec)}</Code>
                      </div>
                    </div>
                    {on && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <NDButton
                          race={race}
                          variant="outline"
                          size="sm"
                          onClick={() => setCount(Math.max(1, count - 1))}
                        >
                          −
                        </NDButton>
                        <div style={{ fontFamily: ND.mono, fontSize: 14, color: ND.text, width: 22, textAlign: 'center' }}>
                          {count}
                        </div>
                        <NDButton
                          race={race}
                          size="sm"
                          onClick={() => setCount(Math.min(99, count + 1))}
                        >
                          ＋
                        </NDButton>
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
          <NDButton
            race={race}
            size="lg"
            full
            disabled={slotsUsed >= SLOT_TOTAL || !canAfford}
            onClick={handleAdd}
          >
            {slotsUsed >= SLOT_TOTAL
              ? 'KUYRUK DOLU'
              : !canAfford
                ? 'YETERSİZ KAYNAK'
                : `KUYRUĞA EKLE · ${selectedUnit?.costA ?? '0'} ${race.resourceA.name.toUpperCase()}`}
          </NDButton>
          <Caption style={{ fontSize: 10, marginTop: 4, textAlign: 'center' }}>
            {PRODUCTION_VERB[race.key] ?? 'Eğit'} {count}× {selectedUnit?.name ?? '—'}
          </Caption>
        </div>

        <BottomNav
          race={race}
          active="base"
          onChange={(key) => router.push(BOTTOM_NAV_ROUTES[key] ?? '/base')}
        />
      </div>
    </div>
  );
}

/* ── Queue row ────────────────────────────────────────────────────────── */

interface QueueRowProps {
  race: NDRace;
  item: QueueItem;
  index: number;
  isHead: boolean;
  headProgress: number;
  flash: boolean;
  affordableSpeedUp: boolean;
  onSpeedUp: () => void;
  onCancel: () => void;
}

function QueueRow({
  race,
  item,
  index,
  isHead,
  headProgress,
  flash,
  affordableSpeedUp,
  onSpeedUp,
  onCancel,
}: QueueRowProps) {
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const pointerId = useRef<number | null>(null);

  const pct = isHead ? headProgress : 0;
  const soon = isHead && item.remainingSec > 0 && item.remainingSec <= 10;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startX.current = e.clientX;
    pointerId.current = e.pointerId;
    setDragging(true);
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    if (dx < 0) {
      setDrag(Math.max(dx, -SWIPE_CANCEL_PX));
    } else if (drag < 0) {
      setDrag(Math.min(0, drag + dx));
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    setDragging(false);
    startX.current = null;
    if (pointerId.current !== null) {
      (e.currentTarget as HTMLDivElement).releasePointerCapture?.(pointerId.current);
      pointerId.current = null;
    }
    if (dx <= -SWIPE_THRESHOLD_PX) {
      setDrag(-SWIPE_CANCEL_PX);
    } else {
      setDrag(0);
    }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
      {/* Cancel action revealed by swipe */}
      <button
        type="button"
        onClick={onCancel}
        aria-label={`Kuyruktan çıkar: ${item.unitName}`}
        style={{
          all: 'unset',
          position: 'absolute',
          inset: 0,
          left: 'auto',
          width: SWIPE_CANCEL_PX,
          background: `linear-gradient(90deg, transparent, ${ND.danger}cc)`,
          color: 'var(--color-bg-elevated)',
          fontFamily: ND.display,
          fontSize: 11,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontWeight: 700,
        }}
      >
        İPTAL
      </button>

      {/* Row */}
      <div
        className={`pq-row ${dragging ? 'pq-row-dragging' : ''}`}
        style={{
          transform: `translateX(${drag}px)`,
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${isHead ? `${race.primary}66` : ND.border}`,
          borderRadius: 12,
          padding: 10,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          position: 'relative',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Icon slot 48×48 */}
        <div
          aria-hidden
          style={{
            width: 48,
            height: 48,
            flexShrink: 0,
            background: `${race.primary}14`,
            border: `1px solid ${race.primary}55`,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Sigil race={race} size={26} />
          <span
            style={{
              position: 'absolute',
              top: -6,
              left: -6,
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: ND.display,
              fontSize: 9,
              color: 'var(--color-bg-elevated)',
              background: race.primary,
              borderRadius: 4,
              fontWeight: 700,
            }}
          >
            {index + 1}
          </span>
          {flash && (
            <div
              aria-hidden
              className="pq-complete-flash"
              style={{
                position: 'absolute',
                inset: 0,
                background: race.primary,
                opacity: 0,
                borderRadius: 8,
              }}
            />
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <H3 style={{ color: ND.text, fontSize: 12 }}>
              {item.unitName} <span style={{ color: race.primary }}>×{item.count}</span>
            </H3>
            <TierBadge race={race} tier={item.tier} />
            <div style={{ flex: 1 }} />
            <span
              className={soon ? 'pq-eta-soon' : ''}
              style={{
                fontFamily: ND.mono,
                fontSize: 11,
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: '0.04em',
              }}
            >
              {isHead ? formatDuration(item.remainingSec) : `+${formatDuration(item.remainingSec)}`}
            </span>
          </div>

          {/* GPU-safe progress bar */}
          <div
            style={{
              marginTop: 8,
              height: 6,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 999,
              position: 'relative',
              overflow: 'hidden',
            }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct * 100)}
          >
            <div
              className="pq-fill"
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(90deg, ${race.primary}, ${race.glow})`,
                boxShadow: `0 0 12px ${race.glow}`,
                borderRadius: 999,
                ['--pq-progress' as string]: isHead ? pct : 0,
              }}
            />
          </div>

          {/* Per-row actions */}
          <div style={{
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <button
              type="button"
              onClick={onSpeedUp}
              disabled={!affordableSpeedUp}
              style={{
                all: 'unset',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                fontFamily: ND.display,
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: affordableSpeedUp ? race.primary : ND.textMute,
                background: affordableSpeedUp ? `${race.primary}14` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${affordableSpeedUp ? `${race.primary}66` : ND.border}`,
                borderRadius: 4,
                cursor: affordableSpeedUp ? 'pointer' : 'not-allowed',
                fontWeight: 600,
              }}
              aria-label={`Hızlandır, ${item.speedUpCost} kristal`}
            >
              <span>HIZLANDIR</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '1px 4px',
                  background: 'rgba(0,0,0,0.35)',
                  borderRadius: 3,
                  fontFamily: ND.mono,
                  color: affordableSpeedUp ? race.primary : ND.textMute,
                }}
              >
                <ResIcon kind="crystal" size={10} color={affordableSpeedUp ? race.primary : ND.textMute} />
                {item.speedUpCost}
              </span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              style={{
                all: 'unset',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                fontFamily: ND.display,
                fontSize: 12,
                color: ND.textDim,
                border: `1px solid ${ND.border}`,
                borderRadius: 4,
                cursor: 'pointer',
              }}
              aria-label={`Kuyruktan çıkar: ${item.unitName}`}
              title="İptal"
            >
              ×
            </button>
            {!isHead && (
              <Code style={{ marginLeft: 'auto' }}>BEKLİYOR</Code>
            )}
            {isHead && (
              <Code style={{ marginLeft: 'auto', color: race.primary }}>
                %{Math.round(pct * 100)}
              </Code>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Empty slot ───────────────────────────────────────────────────────── */

function EmptySlot({ race, index }: { race: NDRace; index: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        border: `1px dashed ${ND.border}`,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.015)',
        opacity: 0.75,
      }}
      aria-label="Boş üretim slotu"
    >
      <div
        aria-hidden
        style={{
          width: 48,
          height: 48,
          flexShrink: 0,
          border: `1px dashed ${race.primary}44`,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: race.primary,
          fontFamily: ND.display,
          fontSize: 22,
          fontWeight: 300,
        }}
      >
        ＋
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <H3 style={{ color: ND.textMute, fontSize: 12 }}>BOŞ SLOT {index + 1}</H3>
        <Caption style={{ fontSize: 11, marginTop: 2 }}>
          Birim seç ve kuyruğa ekle.
        </Caption>
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function buildUnits(race: NDRace): UnitDef[] {
  return race.units.slice(0, 5).map((u, i) => {
    const rows: [string, string, number][] = [
      ['80',    '20',   24],
      ['180',   '60',   80],
      ['440',   '180',  240],
      ['1,200', '480',  720],
      ['2,800', '1,000', 1800],
    ];
    const row = rows[i] ?? rows[rows.length - 1];
    return {
      name: u.n,
      tier: u.t,
      costA: row[0],
      costB: row[1],
      durationSec: row[2],
    };
  });
}

function buildInitialQueue(race: NDRace): QueueItem[] {
  const u = race.units;
  if (u.length < 4) return [];
  return [
    {
      id: 'seed-1',
      unitName: u[0].n,
      count: 8,
      tier: u[0].t,
      totalSec: 60,
      remainingSec: 22,
      speedUpCost: 5,
    },
    {
      id: 'seed-2',
      unitName: u[1].n,
      count: 4,
      tier: u[1].t,
      totalSec: 240,
      remainingSec: 200,
      speedUpCost: 14,
    },
    {
      id: 'seed-3',
      unitName: u[3].n,
      count: 2,
      tier: u[3].t,
      totalSec: 720,
      remainingSec: 680,
      speedUpCost: 38,
    },
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

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('tr-TR');
}

function toNum(s: string): number {
  return Number(s.replace(/[^\d]/g, '')) || 0;
}

function crystalCostFor(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 12));
}
