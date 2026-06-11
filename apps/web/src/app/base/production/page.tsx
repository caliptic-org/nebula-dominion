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
  GatedButton,
  H3,
  HUD,
  ND,
  NDButton,
  NebulaBg,
  Panel,
  ResIcon,
  Sigil,
} from '@/components/handoff';
import { refreshGates } from '@/lib/gates';
import { useNDRace } from '@/components/handoff/useNDRace';
import type { NDRace } from '@/components/handoff/nd-tokens';
import { unitPortrait } from '@/lib/assets';
import { useUnitConfigs, type UnitConfigDto } from '@/hooks/useUnitConfigs';
import { formatResource, useGameResources, refreshGameResources } from '@/hooks/useGameResources';
import { useGameBuildings } from '@/hooks/useGameBuildings';
import { useHudState } from '@/hooks/useHudState';
import { useTrainingQueue, type TrainingQueueDto } from '@/hooks/useTrainingQueue';
import { gameServerApi } from '@/lib/game-server-api';
import { FetchError } from '@/lib/api';
import { trBuildingType } from '@/lib/translate-backend-error';
import { toast } from '@/components/handoff/Toaster';
import { hasSession } from '@/lib/session';
import { scaledDurationSec } from '@/lib/game-speed';
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
  base:     '/base',
  map:      '/map',
  settings: '/settings',
  alliance: '/alliance',
  shop:     '/shop',
  // (Legacy keys kept below for any callers not yet migrated.)
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
  /** Snake-case backend type matched to this card. Drives the train POST.
   *  When undefined, the card represents a merge-only or unreleased unit
   *  and should NOT be rendered — buildUnits filters them out. Kept
   *  optional in the interface so consumers don't have to non-null-assert
   *  in fallback / mock paths. */
  backendType?: string;
}

export default function ProductionPage() {
  const race = useNDRace();
  const router = useRouter();
  const hud = useHudState();
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(1);
  // Live wallet pipe — used for HUD pill display when authed. Local resA/B/
  // crystal still track optimistic deductions for the train flow below.
  /* MERGE: useBaseState dropped — useHudState above now drives level/tier. */
  const { data: resources } = useGameResources();

  // Local resource state mirrors the live wallet — initially 0 so the UI
  // never renders the legacy 12,480/3,210/42 mock values. handleAdd
  // applies optimistic deductions, then the real /units/train POST
  // reconciles the backend wallet (next useGameResources poll lands the
  // canonical value within 5s).
  const [crystal, setCrystal] = useState(0);
  const [resA, setResA] = useState(0);
  const [resB, setResB] = useState(0);
  // Mirror live values whenever they advance (poll tick or refresh).
  useEffect(() => {
    if (!resources) return;
    setResA(resources.mineral);
    setResB(resources.gas);
    setCrystal(resources.energy);
  }, [resources]);

  // Live backend unit configs (race-specific). Overlay onto the first 5
  // race-flavoured slots when available; mock numbers fill in if the fetch
  // fails or the player isn't logged in (endpoint is public anyway).
  const { configs: backendUnits } = useUnitConfigs(race.key);
  const units: UnitDef[] = useMemo(
    () => buildUnits(race, backendUnits),
    [race, backendUnits],
  );

  // Live training queue from game-server. Empty list = "nothing currently
  // training" — that's the legitimate fresh-account state, not a loading
  // shimmer. Local state below mirrors this so optimistic adds + speed-ups
  // can render before the next 30s poll arrives.
  const { data: liveQueue, refresh: refreshQueue } = useTrainingQueue();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);

  // Collapsible queue panel — mirrors BuildingCard hover+tap pattern from /base
  const [queueHovered, setQueueHovered] = useState(false);
  const [queueTapToggled, setQueueTapToggled] = useState(false);
  const queueExpanded = queueHovered || queueTapToggled;

  // Hydrate the local queue every time the server-side queue advances.
  // Maps backend rows → QueueItem by computing remainingSec from
  // (completesAt − now). Unit names + tiers fall back to race lex when
  // the backend type doesn't match a known race unit.
  useEffect(() => {
    if (!liveQueue) return;
    const now = Date.now();
    const mapped: QueueItem[] = liveQueue
      .filter((row) => !row.isComplete)
      .map((row) => {
        const remainingSec = Math.max(
          0,
          Math.round((new Date(row.completesAt).getTime() - now) / 1000),
        );
        const totalSec = Math.max(
          remainingSec,
          Math.round(
            (new Date(row.completesAt).getTime() - new Date(row.createdAt).getTime()) /
              1000,
          ),
        );
        // Best-effort race-flavoured name: match backend unit type
        // against the race's units list, else show the raw type code.
        const def = race.units.find((u) =>
          u.n.toLowerCase().replace(/\s+/g, '_') === row.unitType.toLowerCase() ||
          row.unitType.toLowerCase().includes(u.n.toLowerCase().slice(0, 5)),
        );
        return {
          id: row.id,
          unitName: def?.n ?? row.unitType,
          // Batch size from the backend row — see migration 1779810000000
          // which added `count` to training_queue so a multi-add order
          // ("Marine ×5") lives as ONE row instead of five.  Pre-migration
          // rows have undefined → fall back to 1.
          count: row.count ?? 1,
          tier: def?.t ?? 1,
          totalSec,
          remainingSec,
          speedUpCost: crystalCostFor(totalSec),
        };
      });
    setQueue(mapped);
  }, [liveQueue, race]);

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

  // Filter units by active tab: T1→tab0, T2→tab1, T3→tab2, T4+→tab3
  // Carry origIdx so handleAdd can still look up backendUnits[origIdx].
  const visibleUnits = useMemo(() => {
    const tabCount = (TABS[race.key] ?? TABS.insan).length;
    return units
      .map((u, i) => ({ ...u, origIdx: i }))
      .filter(u => Math.min(tabCount - 1, Math.max(0, u.tier - 1)) === tab);
  }, [units, tab, race.key]);

  const selectedUnit = visibleUnits[selected];
  const canAfford =
    selectedUnit !== undefined &&
    resA >= toNum(selectedUnit.costA) * count &&
    resB >= toNum(selectedUnit.costB) * count;

  // Live owned-buildings so we can pick a training building (barracks /
  // hangar / spawning_pool) when POSTing /units/train. Without an owned
  // training building the backend returns 400; we surface that as a
  // toast so the user knows they need to construct one first.
  const { data: liveBuildings } = useGameBuildings();
  const [submittingTrain, setSubmittingTrain] = useState(false);

  const handleAdd = useCallback(async () => {
    if (!selectedUnit) return;
    if (slotsUsed >= SLOT_TOTAL) return;
    if (!canAfford) return;
    if (submittingTrain) return;
    // Belt-and-suspenders: if a card somehow slipped through buildUnits
    // without a backendType (e.g. data lag during initial mount, or
    // public-endpoint failure), reject the add with a clear toast instead
    // of falling into the optimistic-only path that LOOKS like training
    // started but never POSTs anywhere.
    if (hasSession() && !selectedUnit.backendType) {
      toast.error(`${selectedUnit.name} eğitime hazır değil — birleştirme ile elde edilir`);
      return;
    }

    // Try the real backend flow first (POST /units/train). Falls back to
    // the optimistic local queue if the player isn't authed or the
    // backend can't accept the train order — that keeps the demo
    // playable without a fully-wired training pipeline.
    //
    // ── Lookup-by-NAME instead of INDEX ─────────────────────────────
    // selectedUnit.backendType is resolved at buildUnits() time via
    // backendByName map, so we don't have to re-index `backendUnits[i]`
    // here. This is the fix for the silent-skip bug where clicking
    // "Genetic Warrior" did nothing (origIdx=4, backendUnits[4]=undefined
    // after the trainable filter shrank backend) — and worse, clicking
    // "Mecha Walker" trained a Ghost (origIdx=3 → backendUnits[3]=Ghost
    // after filter). buildUnits now also hides cards with no backend
    // match, so `backendType` should always be defined when we land here.
    const unitType = selectedUnit.backendType;
    const backendCfg = backendUnits.find((c) => c.type === unitType);
    const reqBuilding = (backendCfg as { requiredBuilding?: string } | undefined)?.requiredBuilding;
    const trainingBuilding =
      liveBuildings && reqBuilding
        ? liveBuildings.find(
            (b) => b.type === reqBuilding && b.status === 'active',
          ) ?? null
        : null;

    // ── Honest production gate ──────────────────────────────────────
    // An authed train REQUIRES an active production building — the POST
    // below sends its buildingId. Without one we must NOT pop an optimistic
    // queue card that never reaches the backend: that was the bug where
    // Marine (needs Kışla) / Medic (needs Akademi) *looked* like they trained
    // — countdown ticked, soft "info" toast — but nothing persisted, so
    // /inventory stayed 0. Block with a clear, actionable error instead and
    // bail BEFORE any resource deduction or queue insert. Unauthed/demo still
    // falls through to the local-only queue below.
    if (hasSession() && !trainingBuilding) {
      if (liveBuildings == null) {
        toast.error('Binalar henüz yüklenmedi — bir saniye sonra tekrar dene.');
      } else {
        const label = reqBuilding ? trBuildingType(reqBuilding) : 'üretim binası';
        toast.error(`${selectedUnit.name} için önce aktif bir ${label} inşa et.`);
      }
      return;
    }

    const a = toNum(selectedUnit.costA) * count;
    const b = toNum(selectedUnit.costB) * count;
    const total = selectedUnit.durationSec * count;
    const queueId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Optimistic local update — pop the unit into the queue immediately
    // so the player gets visual feedback, then reconcile with backend.
    setResA(v => v - a);
    setResB(v => v - b);
    setQueue(q => [
      ...q,
      {
        id: queueId,
        unitName: selectedUnit.name,
        count,
        tier: selectedUnit.tier,
        totalSec: total,
        remainingSec: total,
        speedUpCost: crystalCostFor(total),
      },
    ]);
    setCount(1);

    if (hasSession() && unitType && trainingBuilding) {
      setSubmittingTrain(true);
      try {
        // POST count alongside unitType so the backend deducts cost×count,
        // schedules completesAt = now + (duration × count), and spawns N
        // units when the single queue row flips complete.  Single-unit
        // orders (count=1) still go through this branch unchanged.
        await gameServerApi.post('/units/train', {
          buildingId: trainingBuilding.id,
          unitType,
          count,
        });
        toast.success(`${selectedUnit.name} ×${count} eğitimi başlatıldı (${total}s)`);
        // Pull the canonical queue row that the backend just inserted —
        // replaces our optimistic stub with the real id + completesAt
        // so subsequent ticks stay in sync with server time.
        refreshQueue();
        // Server debited the wallet — broadcast so HUD repolls immediately
        // rather than waiting for the 5s poll tick.
        refreshGameResources();
      } catch (err) {
        const msg = err instanceof FetchError ? err.message : 'Eğitim reddedildi';
        toast.error(msg);
        // Roll back the optimistic update on backend rejection.
        setResA(v => v + a);
        setResB(v => v + b);
        setQueue(q => q.filter((it) => it.id !== queueId));
      } finally {
        setSubmittingTrain(false);
      }
    }
    // NOTE: the old `else if (!trainingBuilding)` branch that fabricated an
    // optimistic queue for an authed player without the required building is
    // gone — that case now hard-blocks above (honest production gate) before
    // any optimistic state is touched. Unauthed/demo still reaches the
    // optimistic queue (no POST) via the falls-through path above.
  }, [selectedUnit, slotsUsed, canAfford, count, backendUnits, selected, liveBuildings, submittingTrain]);

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
        // Was `minHeight: 100dvh` which let the outer grow taller than the
        // viewport when the unit-list flex: 1 expanded — and the bottom
        // CTA + BottomNav ended up below the fold. `height: 100dvh` plus
        // `overflow: hidden` locks the column to the viewport so the
        // unit-list scrolls internally and the CTA/BottomNav stay visible.
        height: '100dvh',
        overflow: 'hidden',
        background: ND.bg,
        color: ND.text,
        fontFamily: ND.body,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <NebulaBg race={race} intensity={0.7} dim={0.6} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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
          /* MERGE: kept HEAD's local-state resource fields — they reflect
           * optimistic deductions from queueing units before the train POST
           * reconciles. hud.resA/resB/crystal would show stale wallet values. */
          resA={resources ? formatResource(resources.mineral) : formatNumber(resA)}
          resB={resources ? formatResource(resources.gas) : formatNumber(resB)}
          crystal={resources ? formatResource(resources.energy) : String(crystal)}
          science={resources ? formatResource(resources.science) : undefined}
        />

        {/* Queue module — fixed bottom-left, collapses to chip like base building cards */}
        <div
          style={{
            position: 'fixed',
            // 60px BottomNav + 90px CTA + 12px gap ≈ 162px
            bottom: 162,
            left: 12,
            right: queueExpanded ? 12 : 'auto',
            zIndex: 40,
            transition: 'right 220ms ease',
          }}
          onMouseEnter={() => setQueueHovered(true)}
          onMouseLeave={() => setQueueHovered(false)}
        >
          {queueExpanded ? (
            /* ── Expanded panel ── */
            <Panel race={race} glow style={{ padding: 12, maxHeight: '42dvh', overflowY: 'auto', backdropFilter: 'blur(14px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Eyebrow color={race.primary}>ŞU AN ÜRETİLİYOR</Eyebrow>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Code style={{ color: ND.textDim }}>{slotsUsed > 0 ? `KALAN ${formatDuration(totalRemainingSec)}` : 'KUYRUK BOŞ'}</Code>
                  {/* Minimize button */}
                  <button
                    type="button"
                    aria-label="Küçült"
                    onClick={() => { setQueueTapToggled(false); setQueueHovered(false); }}
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      fontFamily: ND.display,
                      fontSize: 16,
                      color: ND.textDim,
                      lineHeight: 1,
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}
                  >
                    ×
                  </button>
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
          ) : (
            /* ── Collapsed chip ── */
            <button
              type="button"
              aria-label="Üretim kuyruğunu aç"
              onClick={() => setQueueTapToggled(true)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                background: 'rgba(8,10,16,0.92)',
                border: `1px solid ${queue.length > 0 ? `${race.primary}88` : ND.border}`,
                borderRadius: 8,
                backdropFilter: 'blur(12px)',
                fontFamily: ND.display,
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: ND.textDim,
                boxShadow: queue.length > 0 ? `0 0 12px ${race.glow}44` : 'none',
              }}
            >
              <Sigil race={race} size={14} />
              <span style={{ color: ND.text }}>
                {queue.length > 0 ? queue[0].unitName : 'KUYRUK BOŞ'}
              </span>
              {queue.length > 1 && (
                <span style={{ color: race.primary, fontSize: 9, letterSpacing: 0 }}>
                  +{queue.length - 1}
                </span>
              )}
              <span
                aria-hidden
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: queue.length > 0 ? race.primary : ND.border,
                  boxShadow: queue.length > 0 ? `0 0 6px ${race.glow}` : 'none',
                  flexShrink: 0,
                }}
              />
            </button>
          )}
        </div>

        {/* Library section — takes all remaining flex space so unit list can scroll */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Library label + tabs */}
        <div style={{ padding: '14px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <Eyebrow color={race.primary}>BİRİM KÜTÜPHANESİ</Eyebrow>
          <Code>{visibleUnits.length} BİRİM</Code>
        </div>
        <div style={{ padding: '8px 14px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
            {(TABS[race.key] ?? TABS.insan).map((t, i) => {
              const on = i === tab;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(i); setSelected(0); }}
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
          {visibleUnits.length === 0 && (
            <Caption style={{ padding: '16px 0', textAlign: 'center' }}>
              Bu kategoride birim yok.
            </Caption>
          )}
          {visibleUnits.map((u, i) => {
            const on = i === selected;
            return (
              <div
                key={u.name}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected(i);
                  }
                }}
                aria-pressed={on}
                // Was a real <button>, but the inner Panel contains NDButton
                // (+ / − count steppers) when selected. <button> inside
                // <button> is invalid HTML and trips a hydration warning in
                // Next 14 dev. Promoting this to a div with role="button"
                // keeps a11y semantics without nesting buttons.
                style={{ cursor: 'pointer', display: 'block' }}
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
                    {(() => {
                      const portrait = unitPortrait(
                        race.key,
                        u.backendType ?? u.name,
                      );
                      return (
                        <div
                          aria-hidden
                          style={{
                            width: 44,
                            height: 44,
                            flexShrink: 0,
                            overflow: 'hidden',
                            background: portrait
                              ? `${race.primary}10`
                              : `${race.primary}12`,
                            border: `1px ${portrait ? 'solid' : 'dashed'} ${race.primary}55`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {portrait ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={portrait}
                              alt=""
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: 'top',
                              }}
                            />
                          ) : (
                            <Sigil race={race} size={24} />
                          )}
                        </div>
                      );
                    })()}
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
              </div>
            );
          })}
        </div>

        {/* /Library section */}
        </div>

        {/* Bottom CTA — flexShrink: 0 keeps it visible even when the
          *  parent column gets squeezed on short viewports. */}
        <div style={{
          padding: '10px 14px',
          background: 'rgba(8,10,16,0.92)',
          borderTop: `1px solid ${ND.border}`,
          backdropFilter: 'blur(12px)',
          flexShrink: 0,
        }}>
          {/* GatedButton check: each unit requires a training building (marine
             →barracks, tank→factory, fighter→hangar, zergling→spawning_pool).
             The gate registry maps `production.train_<unitType>` → the
             required building, so a tap on EĞIT without owning the building
             pops a "Kışla gerekli" modal instead of silently failing the
             optimistic queue add. forceDisabled still drives the slot/cost
             checks so the existing UX (KUYRUK DOLU / YETERSİZ KAYNAK) keeps
             working alongside the gate hint. */}
          <GatedButton
            race={race}
            size="lg"
            full
            gateId={`production.train_${(selectedUnit as { type?: string } | undefined)?.type ?? 'unknown'}`}
            forceDisabled={slotsUsed >= SLOT_TOTAL || !canAfford}
            onClick={async () => {
              await handleAdd();
              // Building/unit inventory may unlock new gates (e.g. having
              // produced a unit could unlock a research path). Re-poll the
              // gate map so consumers downstream see the update.
              refreshGates();
            }}
          >
            {slotsUsed >= SLOT_TOTAL
              ? 'KUYRUK DOLU'
              : !canAfford
                ? 'YETERSİZ KAYNAK'
                : `KUYRUĞA EKLE · ${selectedUnit?.costA ?? '0'} ${race.resourceA.name.toUpperCase()}`}
          </GatedButton>
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

function buildUnits(race: NDRace, backend: UnitConfigDto[]): UnitDef[] {
  const fmt = (n: number) => n.toLocaleString();
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '_');

  // Index backend by normalized type ('mecha_walker' → cfg). Lets us match
  // a lex entry like "Mecha Walker" to its live config without depending on
  // ARRAY ORDER. Previously buildUnits did `race.units.slice(0, 5)` paired
  // with `backend[i]` — after the trainable-filter shrank backend to only
  // canonical trainable units (Marine/Medic/Siege Tank/Ghost for İnsan),
  // lex[1] "Sniper" ended up paired with backend[1] "Medic", lex[3]
  // "Mecha Walker" paired with backend[3] "Ghost", lex[4] "Genetic Warrior"
  // paired with backend[4] = undefined. User saw "Genetic Warrior" card,
  // clicked train, optimistic queue popped, but handleAdd's POST silently
  // skipped because unitType was undefined → no unit ever spawned in DB.
  // ALSO: clicking "Mecha Walker" actually trained a Ghost.
  const backendByName = new Map<string, UnitConfigDto>();
  for (const cfg of backend) {
    backendByName.set(norm(String(cfg.type ?? '')), cfg);
  }

  // First pass: walk the lex (gives canonical race-flavoured ordering) and
  // emit a card ONLY when the lex name matches a live backend config.
  // Merge-only chain units (Sniper, Engineer, Mecha Walker, Genetic
  // Warrior, Captain) have no backend entry after the trainable filter —
  // skip them entirely. The merge-flow gates them through /merge instead.
  const cards: UnitDef[] = [];
  const usedTypes = new Set<string>();
  for (const u of race.units) {
    const live = backendByName.get(norm(u.n));
    if (!live) continue; // merge-only or not-yet-released — hide the card
    usedTypes.add(norm(String(live.type)));
    cards.push({
      name: u.n,
      tier: live.tier ?? u.t,
      costA: live.cost ? fmt(live.cost.mineral) : '—',
      costB: live.cost ? fmt(live.cost.gas) : '—',
      durationSec: scaledDurationSec(live.trainTimeSeconds ?? 0),
      backendType: String(live.type),
    });
  }

  // Second pass: surface backend units that DON'T appear in the race lex
  // (e.g. İnsan has Medic, Ghost, Siege Tank — flavour-canonical names not
  // in the promotion ladder). Without this pass, the player would never
  // see them on /base/production. Mirrors the second-pass fix shipped on
  // /inventory in commit eb41c70 — same lex/backend asymmetry, same fix.
  for (const cfg of backend) {
    const typeKey = norm(String(cfg.type ?? ''));
    if (usedTypes.has(typeKey)) continue;
    const prettyName = typeKey
      .split('_')
      .map((w) => (w[0]?.toUpperCase() ?? '') + w.slice(1))
      .join(' ');
    cards.push({
      name: prettyName,
      tier: cfg.tier ?? 1,
      costA: cfg.cost ? fmt(cfg.cost.mineral) : '—',
      costB: cfg.cost ? fmt(cfg.cost.gas) : '—',
      durationSec: scaledDurationSec(cfg.trainTimeSeconds ?? 0),
      backendType: String(cfg.type),
    });
  }

  return cards;
}

// buildInitialQueue removed — the queue now hydrates from the live
// useTrainingQueue hook (game-server /api/units/training-queue). Empty
// queue = "nothing currently training", which is the correct fresh-
// account state instead of the legacy 3-seed mock that made every new
// player think they already had units in production.

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
  return n.toLocaleString();
}

function toNum(s: string): number {
  return Number(s.replace(/[^\d]/g, '')) || 0;
}

function crystalCostFor(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 12));
}
