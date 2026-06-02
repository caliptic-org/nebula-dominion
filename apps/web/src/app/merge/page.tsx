'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  toast,
} from '@/components/handoff';
import { useNDRace } from '@/components/handoff/useNDRace';
import type { NDRace, NDRaceKey } from '@/components/handoff/nd-tokens';
import { useMergePreview } from '@/hooks/useMergePreview';
import { useMergePreviewBackend } from '@/hooks/useMergePreviewBackend';
import { useHudState } from '@/hooks/useHudState';
import { useGameUnits } from '@/hooks/useGameUnits';
import { refreshGameResources } from '@/hooks/useGameResources';
import { refreshGameUnits } from '@/hooks/useGameUnits';
import { gameServerApi } from '@/lib/game-server-api';
import { FetchError } from '@/lib/api';
import { hasSession } from '@/lib/session';

const MERGE_NAMES: Record<NDRaceKey, string> = {
  insan:   'Promosyon Töreni',
  zerg:    'Evrim Çukuru',
  otomat:  'Derleme Zinciri',
  canavar: 'Yamyamlık Ritüeli',
  seytan:  'Pakt Bağlama',
};

const MERGE_VERB: Record<NDRaceKey, string> = {
  insan:   'Birleştir',
  zerg:    'Mutate',
  otomat:  'Derle',
  canavar: 'Yut',
  seytan:  'Bağla',
};

const POOL_LABEL: Record<NDRaceKey, string> = {
  insan:   'BİRLEŞİME UYGUN',
  zerg:    'KOZA TUTAN LARVALAR',
  otomat:  'MOD-A KOMPATİBL',
  canavar: 'AVA UYGUN BEDEN',
  seytan:  'BAĞLI RUHLAR',
};

/* Hint is now built dynamically per (race, sourceTier) instead of being a
 * hardcoded "tier-3 → tier-4" sentence regardless of what the player is
 * actually merging.  Previously the insan hint always said "Üç tier-3
 * askeri…" even when the player was on the T1→T2 tab — confusing first
 * impression for new players who only have Marines. */
function mergeHint(race: NDRaceKey, sourceTier: number): string {
  const tgt = sourceTier + 1;
  switch (race) {
    case 'zerg':
      return `Üç tier-${sourceTier} larva evrim çukurunda eriyip bir tier-${tgt} mutasyon formu doğurur.`;
    case 'otomat':
      return `Üç tier-${sourceTier} modülü tek bir tier-${tgt} yüksek-versiyon yapıya derler.`;
    case 'canavar':
      return `Alfa, üç tier-${sourceTier} küçük canavarı yiyerek bir tier-${tgt} beden formuna yükselir.`;
    case 'seytan':
      return `Üç tier-${sourceTier} ruhu pakt mührüyle bağlayıp bir tier-${tgt} büyük varlığı çağırırsın.`;
    case 'insan':
    default:
      return `Üç tier-${sourceTier} birim promosyon töreniyle bir tier-${tgt} üst unvana yükselir.`;
  }
}

const SLOT_COUNT = 3;
const COST_B = 200;

const BOTTOM_NAV_ROUTES: Record<string, string> = {
  base:     '/base',
  map:      '/map',
  settings: '/settings',
  alliance: '/alliance',
  shop:     '/shop',
};

function riskColor(label: 'GÜVENLİ' | 'RİSKLİ' | 'KRİTİK') {
  if (label === 'GÜVENLİ') return ND.ok;
  if (label === 'RİSKLİ') return ND.warn;
  return ND.danger;
}

export default function MergePage() {
  const race = useNDRace();
  const router = useRouter();
  const tMerge = useTranslations('merge');
  const hud = useHudState();
  const [selected, setSelected] = useState<number[]>([]);
  // Default sourceTier=1 because the most common shape is "fresh roster of
  // tier-1 units the player just trained".  An effect below bumps the
  // default to the LOWEST tier where the player owns ≥3 mergeable units
  // the first time liveUnits arrives — so a player who's already cleared
  // T1 will land on T2 instead of an empty T1 view.
  const [sourceTier, setSourceTier] = useState(1);
  // True once the auto-default effect has fired so it can't override the
  // user's manual TIER selection on subsequent liveUnits polls.
  const [tierAutoSet, setTierAutoSet] = useState(false);

  // Live unit roster — when the player has trained units of the chosen
  // source tier, render them as real merge candidates so a successful
  // merge actually consumes the right server-side ids. Falls back to
  // the demo pool (8 placeholder slots) when the player has no units
  // yet so the screen still demos the merge mechanic.
  const { data: liveUnits } = useGameUnits();

  // Auto-select default sourceTier on first live-roster arrival: lowest
  // tier (1..4) where the player owns ≥ SLOT_COUNT units.  Without this
  // the page defaulted to tier 3 and showed an empty pool / demo cards
  // even when the player had 24 mergeable T1 marines — the source of
  // every "birleştir butonu gelmedi" report.
  useEffect(() => {
    if (tierAutoSet) return;
    if (!liveUnits || liveUnits.length === 0) return;
    // Tier 5 (Captain) is the top of the Insan ladder — included here so
    // a player who's chain-merged all the way up still has their roster
    // surface on /merge. Previously [1..4] hid Captain entirely; the
    // /merge tier selector also gets T1 + T5 below.
    for (const t of [1, 2, 3, 4, 5]) {
      const have = liveUnits.filter((u) => resolveUnitTier(u.type, race) === t).length;
      if (have >= SLOT_COUNT) {
        setSourceTier(t);
        setTierAutoSet(true);
        return;
      }
    }
    // No tier has ≥ SLOT_COUNT units — but pick the highest tier the
    // player owns ≥1 of so a player sitting on a lone Captain still
    // sees it in the pool (read-only — needs 3 for the merge to fire).
    for (const t of [5, 4, 3, 2, 1]) {
      const have = liveUnits.filter((u) => resolveUnitTier(u.type, race) === t).length;
      if (have >= 1) {
        setSourceTier(t);
        setTierAutoSet(true);
        return;
      }
    }
    // No tier has ≥ SLOT_COUNT units — leave default (tier 1) so the
    // empty-state messaging still makes sense ("Tier 1 birimin yok").
    setTierAutoSet(true);
  }, [liveUnits, race, tierAutoSet]);

  const livePool = useMemo(
    () => liveUnitsToPool(liveUnits, race, sourceTier),
    [liveUnits, race, sourceTier],
  );
  const pool = useMemo(
    () => (livePool.length > 0 ? livePool : buildPool(race, sourceTier)),
    [livePool, race, sourceTier],
  );
  const preview = useMergePreview({
    race,
    sourceTier,
    selectedCount: selected.length,
    slotCount: SLOT_COUNT,
  });
  // Backend validation layer: once 3 slots are filled, POST the recipe to
  // /api/v1/units/merge-preview. The server returns canMerge / resultUnitId /
  // costs / consumed / reasons. We fall back to the deterministic client-side
  // `preview` when the backend hasn't responded yet so the UI never stalls.
  const slotUnitIds = useMemo<(string | null)[]>(
    () => Array.from({ length: SLOT_COUNT }, (_, i) => pool[selected[i]]?.id ?? null),
    [pool, selected],
  );
  const { preview: liveMerge } = useMergePreviewBackend(race.key, slotUnitIds);
  const promotedTier = liveMerge?.resultTier ?? preview.promotedTier;
  const promotedName =
    (liveMerge?.resultUnitId &&
      race.units.find((u) => u.n.toLowerCase().includes(liveMerge.resultUnitId!.toLowerCase()))?.n) ||
    preview.promotedName;
  const { successRate, projectedRate, riskLabel } = preview;
  // Demo mode = no live units (guest, or authed-but-no-tier-N-yet). In demo
  // we still RENDER the pool grid so the player learns the mechanic, but we
  // hard-gate canMerge so a click can't POST fake demo-* ids and get rejected
  // with a confusing toast.
  const isDemoMode = livePool.length === 0;
  // Read auth status only after mount to avoid a server vs client text
  // mismatch — `hasSession()` reads localStorage, so SSR always says false
  // while the client reads the real token. The demo-mode banner copy
  // branches on this, so the difference triggers a React hydration warning.
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => { setAuthenticated(hasSession()); }, []);
  // Authoritative `canMerge` comes from backend when present; client estimate
  // is used only while waiting on the network round-trip. Demo mode never
  // allows merge — the button shows "Önce birim eğit" instead.
  const canMerge =
    isDemoMode ? false : (liveMerge ? liveMerge.canMerge : preview.canMerge);
  const risk = { color: riskColor(riskLabel), label: riskLabel };

  function toggle(idx: number) {
    setSelected((prev) => {
      if (prev.includes(idx)) return prev.filter((i) => i !== idx);
      if (prev.length >= SLOT_COUNT) return prev;
      return [...prev, idx];
    });
  }

  async function performMerge() {
    if (!canMerge) return;
    if (isDemoMode) {
      toast.info(tMerge('previewModeHint'));
      return;
    }
    // Optimistic: clear local selection immediately for snappy feel, then
    // attempt the real merge POST. Falls back to a toast if the backend
    // rejects (e.g. resource cost not met).
    const snapshot = [...selected];
    setSelected([]);
    try {
      const ids = snapshot.map((idx) => pool[idx]?.id).filter(Boolean);
      // /units/merge-roster is the base-level promotion endpoint added
      // in this commit — separate from /units/merge which requires a
      // roomId for in-match merging. Consumes 3 same-type roster units
      // and spawns 1 next-tier unit per MERGE_RECIPES (Marine → Sniper →
      // Mecha Walker → Genetic Warrior → Captain for İnsan).
      const result = await gameServerApi.post<{ type: string; id: string }>(
        '/units/merge-roster',
        { unitIds: ids },
      );
      toast.success(
        `Promosyon başarılı: ${result.type.replace(/_/g, ' ')} (Tier ${sourceTier + 1})`,
      );
      refreshGameResources();
      // Critical: refresh the unit roster so the consumed source units
      // disappear from the pool. Without this, the player can re-tap the
      // same 3 stale cards → backend returns "unit not found" → confusing
      // error toast. Same pattern as refreshGameResources for the wallet.
      refreshGameUnits();
    } catch (err) {
      // Restore selection so the player can retry without re-picking.
      setSelected(snapshot);
      const msg = err instanceof FetchError ? err.message : 'Birleştirme reddedildi';
      toast.error(msg);
    }
  }

  // "TÜMÜNÜ BİRLEŞTİR" — loops through floor(pool/3) merges sequentially so
  // a player sitting on 24 marines doesn't have to tap 8 times. Each call
  // re-reads the local pool snapshot at the time of click; the post-loop
  // refreshGameUnits() then re-syncs against the server's actual state so
  // the next render reflects the result (e.g. 24 marines → 8 snipers, or
  // 24 marines → 8 snipers + further-mergeable if the player wants).
  const [mergingAll, setMergingAll] = useState(false);
  async function performMergeAll() {
    if (isDemoMode || mergingAll) return;
    const batches = Math.floor(pool.length / SLOT_COUNT);
    if (batches < 1) {
      toast.info(`Birleştirme için en az ${SLOT_COUNT} aynı tipte birim gerekli`);
      return;
    }
    setMergingAll(true);
    let succeeded = 0;
    let failed = 0;
    try {
      // Iterate over a local snapshot of the pool — pool itself updates on
      // each refresh after a successful merge.  Process triplets from the
      // first 3*batches entries.
      const ids = pool.slice(0, batches * SLOT_COUNT).map((u) => u.id);
      for (let i = 0; i < batches; i += 1) {
        const triplet = ids.slice(i * SLOT_COUNT, i * SLOT_COUNT + SLOT_COUNT);
        try {
          await gameServerApi.post('/units/merge-roster', { unitIds: triplet });
          succeeded += 1;
        } catch (err) {
          failed += 1;
          // Stop on first failure — subsequent triplets may rely on the
          // same wallet / req sequence and would just pile up errors.
          const msg = err instanceof FetchError ? err.message : 'Birleştirme reddedildi';
          toast.error(`Toplu birleştirme #${i + 1}: ${msg}`);
          break;
        }
      }
      if (succeeded > 0) {
        toast.success(`Toplu birleştirme: ${succeeded} grup başarılı${failed ? ` (${failed} başarısız)` : ''}`);
      }
    } finally {
      setSelected([]);
      refreshGameResources();
      refreshGameUnits();
      setMergingAll(false);
    }
  }

  return (
    <div
      data-race={race.key}
      style={{
        position: 'relative',
        height: '100dvh',
        background: ND.bg,
        color: ND.text,
        fontFamily: ND.body,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <NebulaBg race={race} intensity={0.8} dim={0.5} />

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
            ← Birim Envanteri
          </Link>
          <div style={{ width: 1, height: 14, background: ND.border }} aria-hidden />
          <Sigil race={race} size={16} />
          <H3 style={{ color: ND.text }}>{MERGE_NAMES[race.key as NDRaceKey] ?? 'Birleştirme'}</H3>
          <div style={{ flex: 1 }} />
          <Chip color={race.primary}>×3 → +1</Chip>
        </div>

        <HUD
          race={race}
          level={hud.level}
          levelName={hud.levelName}
          resA={hud.resA}
          resB={hud.resB}
          crystal={hud.crystal}
          science={hud.science !== undefined ? Math.floor(hud.science).toLocaleString() : undefined}
        />

        {/* Hint */}
        <div style={{ padding: '12px 14px 0' }}>
          <Caption>{mergeHint(race.key as NDRaceKey, sourceTier)}</Caption>
        </div>

        {/* Merge ritual canvas */}
        <div style={{ padding: '14px 14px 0' }}>
          <Panel race={race} glow style={{ padding: 14 }}>
            <Eyebrow color={race.primary}>{MERGE_VERB[race.key as NDRaceKey] ?? 'Birleştir'} RİTÜELİ</Eyebrow>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginTop: 12,
            }}>
              {[0, 1, 2].map((slot) => {
                const filled = selected.length > slot;
                return (
                  <MergeSlot
                    key={slot}
                    race={race}
                    filled={filled}
                    tier={sourceTier}
                    onClick={() => {
                      if (filled) {
                        const idx = selected[slot];
                        toggle(idx);
                      }
                    }}
                  />
                );
              })}
              <div
                aria-hidden
                style={{
                  fontFamily: ND.display,
                  fontSize: 24,
                  color: race.primary,
                  margin: '0 6px',
                  textShadow: `0 0 12px ${race.glow}`,
                }}
              >
                →
              </div>
              <ResultSlot race={race} tier={promotedTier} ready={canMerge} name={promotedName} />
            </div>
          </Panel>
        </div>

        {/* Success rate — only renders once the player has actually picked
         *  at least one slot.  Before that the %78 base rate is meaningless
         *  and the big panel dominates the screen for no value.  Slot row
         *  itself carries the "0/3 SLOT" affordance, no need to duplicate it
         *  in a separate hero card. */}
        {selected.length > 0 && (
          <div style={{ padding: '10px 14px 0' }}>
            <Panel race={race} style={{ padding: 12 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 8,
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Eyebrow color={race.primary}>BAŞARI ORANI</Eyebrow>
                  <Code>
                    T{sourceTier} → T{promotedTier} · {promotedName.toUpperCase()}
                  </Code>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span
                    aria-label={`Başarı oranı yüzde ${projectedRate}`}
                    style={{
                      fontFamily: ND.display,
                      fontSize: 26,
                      fontWeight: 700,
                      color: canMerge ? risk.color : ND.textDim,
                      letterSpacing: '0.04em',
                      textShadow: canMerge ? `0 0 12px ${risk.color}66` : undefined,
                      lineHeight: 1,
                    }}
                  >
                    %{projectedRate}
                  </span>
                  <span
                    style={{
                      fontFamily: ND.mono,
                      fontSize: 9,
                      color: canMerge ? risk.color : ND.textMute,
                      letterSpacing: '0.12em',
                    }}
                  >
                    {canMerge ? risk.label : `${selected.length}/${SLOT_COUNT} SLOT`}
                  </span>
                </div>
              </div>
              <Bar
                value={projectedRate}
                max={100}
                color={canMerge ? risk.color : race.primaryDim}
                height={8}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 6,
                  fontFamily: ND.mono,
                  fontSize: 9,
                  color: ND.textMute,
                  letterSpacing: '0.08em',
                }}
              >
                <span>TABAN %{successRate}</span>
                <span>%{projectedRate} / %{successRate}</span>
              </div>
            </Panel>
          </div>
        )}

        {/* Source pool */}
        <div style={{ padding: '14px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow color={race.primary}>{POOL_LABEL[race.key as NDRaceKey] ?? POOL_LABEL.insan}</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Code>TIER</Code>
            {/* Tier selector covers the full Insan/Zerg promotion ladder
             *  (T1..T5). Previously only T2/T3/T4 were visible — a Captain-
             *  laden roster had nowhere to display its top-tier units.
             *  T5 has no merge result (MERGE_RECIPES top), so /merge with
             *  T5 selected is read-only; that's fine — the slot row still
             *  shows the Captain card. */}
            {[1, 2, 3, 4, 5].map((t) => {
              const on = t === sourceTier;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setSourceTier(t);
                    setSelected([]);
                  }}
                  aria-pressed={on}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    padding: '3px 8px',
                    fontFamily: ND.mono,
                    fontSize: 10,
                    color: on ? 'var(--color-bg-elevated)' : ND.textDim,
                    background: on ? race.primary : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${on ? race.primary : ND.border}`,
                    borderRadius: 2,
                  }}
                >
                  T{t}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, padding: '10px 14px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {pool.map((u, i) => {
              const on = selected.includes(i);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(i)}
                  aria-pressed={on}
                  style={{ all: 'unset', cursor: 'pointer', display: 'block' }}
                >
                  <div
                    style={{
                      aspectRatio: '1',
                      position: 'relative',
                      border: `1px solid ${on ? race.primary : ND.border}`,
                      background: on ? `${race.primary}22` : 'rgba(10,14,28,0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: on ? `0 0 12px ${race.glow}66` : undefined,
                    }}
                  >
                    <Sigil race={race} size={20} />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 2,
                        right: 3,
                        fontFamily: ND.mono,
                        fontSize: 8,
                        color: race.primary,
                        letterSpacing: '0.06em',
                      }}
                    >
                      T{u.tier}
                    </span>
                    {on && (
                      <Chip
                        color={race.primary}
                        style={{ position: 'absolute', top: 2, left: 2, fontSize: 7 }}
                      >
                        SEÇ
                      </Chip>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Demo-mode hint — used to be a dashed-border panel sandwiched
         *  between the pool and the CTA.  That was visually heavy for what
         *  is really a "no units yet, train first" nudge.  Now collapsed to
         *  a thin inline strip with a single underlined CTA link — same
         *  information, ~24px tall instead of ~90px, no dashed borders
         *  competing with the slot row outlines.  The Birleştir button is
         *  still hard-gated by canMerge so the demo path can never POST. */}
        {isDemoMode && (
          <div
            style={{
              padding: '8px 14px 4px',
              fontFamily: ND.mono,
              fontSize: 10,
              color: ND.textDim,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: race.primary, letterSpacing: '0.10em' }}>ÖNİZLEME ·</span>
            <span>
              {authenticated
                ? `Tier ${sourceTier} birimin yok —`
                : 'Birleştirmek için'}
            </span>
            <Link
              href={authenticated ? '/base/production' : '/login'}
              style={{ color: race.primary, textDecoration: 'underline' }}
            >
              {authenticated ? 'birim eğit' : 'giriş yap'}
            </Link>
          </div>
        )}

        {/* Bottom CTA */}
        <div style={{
          padding: '10px 14px',
          background: 'rgba(8,10,16,0.92)',
          borderTop: `1px solid ${ND.border}`,
          backdropFilter: 'blur(12px)',
          display: 'flex',
          gap: 8,
        }}>
          <NDButton race={race} variant="ghost" size="md" style={{ flex: 1 }} onClick={() => setSelected([])}>
            İPTAL
          </NDButton>
          <NDButton race={race} size="md" style={{ flex: 2 }} disabled={!canMerge || mergingAll} onClick={performMerge}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {isDemoMode ? 'Önce birim eğit' : `${MERGE_VERB[race.key as NDRaceKey] ?? 'Birleştir'} · ${COST_B}`}
              {!isDemoMode && (
                <>
                  <ResIcon kind={race.resourceB.icon} size={12} color="var(--color-bg-elevated)" />
                  <span style={{ letterSpacing: '0.06em' }}>{race.resourceB.name.toUpperCase()}</span>
                </>
              )}
            </span>
          </NDButton>
        </div>
        {/* "TÜMÜNÜ BİRLEŞTİR" — power-merge button visible only when the
         *  player has >=6 same-type units (so the multi-batch saves real
         *  taps). Floor(pool/3) batches fire sequentially; the bottom
         *  ghost button stays for single-step control. Disabled while
         *  the loop is running so a double-tap can't double-fire. */}
        {!isDemoMode && pool.length >= SLOT_COUNT * 2 && (
          <div
            style={{
              padding: '0 14px 10px',
              background: 'rgba(8,10,16,0.92)',
              display: 'flex',
            }}
          >
            <NDButton
              race={race}
              variant="ghost"
              size="sm"
              style={{ flex: 1 }}
              disabled={mergingAll}
              onClick={performMergeAll}
            >
              {mergingAll
                ? `BİRLEŞTİRİLİYOR…`
                : `TÜMÜNÜ BİRLEŞTİR · ${Math.floor(pool.length / SLOT_COUNT)} GRUP`}
            </NDButton>
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

interface PoolUnit {
  id: string;
  name: string;
  tier: number;
}

function buildPool(race: NDRace, tier: number): PoolUnit[] {
  // Fallback pool — used for guest / pre-login state OR until the
  // game-server's training queue has produced enough units of this
  // tier for the player. Renders 8 visual slots so the layout doesn't
  // collapse, but each carries the same race-flavoured unit name.
  const base = race.units.find((u) => u.t === tier)?.n ?? race.units[0].n;
  // Placeholder ID shape `<race>-<tier>-<suffix>` matches the backend's
  // PLACEHOLDER_RE in merge-preview.service.ts so the demo slots resolve
  // without hitting the "Unit not found" 404 path. The prior format
  // `demo-${race}-${tier}-${i}` started with the literal `demo-` which the
  // regex parsed as `race=demo`, falling through to the not-found branch.
  return Array.from({ length: 8 }, (_, i) => ({
    id: `${race.key}-${tier}-demo${i}`,
    name: base,
    tier,
  }));
}

/* Tier resolver — backend types arrive as bare codes ('marine', 'ghost',
 * 'sniper') without the `_tN` suffix the FE used to grep.  Look up the tier
 * from the race-lex (nd-tokens.RACES[race].units) instead, falling back to
 * tier 1 for unknown types (medic, drone, etc. that exist server-side but
 * aren't in the lex yet).  Used both as the per-unit tag and as the filter
 * predicate so the two stay in sync. */
function resolveUnitTier(type: string, race: NDRace): number {
  const def = race.units.find((ru) =>
    ru.n.toLowerCase().replace(/\s+/g, '_').startsWith(type.split('_')[0]),
  );
  return def?.t ?? 1;
}

/* Map a live game-server PlayerUnitDto into the merge-screen PoolUnit
 * shape. Tier is sourced from the race-lex (see resolveUnitTier) so the
 * filter actually matches the player's roster — the previous _tN regex
 * never matched the backend's bare 'marine'/'ghost' codes, so EVERY unit
 * collapsed to tier 1 and the /merge default of sourceTier=3 ended up
 * filtering all 44 of test13's marines/medics/ghosts down to zero,
 * tripping isDemoMode and rendering the demo placeholders. */
function liveUnitsToPool(
  liveUnits: { id: string; type: string }[] | null,
  race: NDRace,
  tier: number,
): PoolUnit[] {
  if (!liveUnits || liveUnits.length === 0) return [];
  return liveUnits
    .filter((u) => resolveUnitTier(u.type, race) === tier)
    .map((u) => {
      const def = race.units.find((ru) =>
        ru.n.toLowerCase().replace(/\s+/g, '_').startsWith(u.type.split('_')[0]),
      );
      return {
        id: u.id,
        name: def?.n ?? u.type,
        tier: resolveUnitTier(u.type, race),
      };
    });
}

function MergeSlot({
  race,
  filled,
  tier,
  onClick,
}: {
  race: NDRace;
  filled: boolean;
  tier: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={filled ? 'Seçili birimi kaldır' : 'Boş slot'}
      style={{
        all: 'unset',
        cursor: filled ? 'pointer' : 'default',
        width: 64,
        height: 64,
        border: `1px solid ${filled ? race.primary : `${race.primary}44`}`,
        background: filled ? `${race.primary}22` : 'rgba(8,12,26,0.7)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: filled ? `0 0 14px ${race.glow}55` : undefined,
      }}
    >
      {filled ? (
        <>
          <Sigil race={race} size={24} />
          <span style={{
            position: 'absolute',
            bottom: 3,
            right: 4,
            fontFamily: ND.mono,
            fontSize: 8,
            color: race.primary,
          }}>
            T{tier}
          </span>
        </>
      ) : (
        <span style={{ fontFamily: ND.display, fontSize: 24, color: `${race.primary}55` }}>+</span>
      )}
    </button>
  );
}

function ResultSlot({
  race,
  tier,
  ready,
  name,
}: {
  race: NDRace;
  tier: number;
  ready: boolean;
  name: string;
}) {
  return (
    <div
      style={{
        width: 84,
        height: 84,
        border: `1.5px solid ${ready ? race.primary : `${race.primary}55`}`,
        background: ready
          ? `radial-gradient(circle at 50% 40%, ${race.primary}44, transparent 70%), rgba(8,12,26,0.92)`
          : 'rgba(8,12,26,0.7)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: ready ? `0 0 20px ${race.glow}99` : undefined,
      }}
    >
      <Sigil race={race} size={32} glow={ready} />
      <div style={{
        position: 'absolute',
        bottom: 4,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: ND.mono,
        fontSize: 8,
        color: race.primary,
        letterSpacing: '0.06em',
        padding: '0 4px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        T{tier} {name}
      </div>
    </div>
  );
}
