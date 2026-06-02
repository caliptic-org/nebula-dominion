'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  BaseField,
  BottomNav,
  Caption,
  Chip,
  Code,
  GatedButton,
  H3,
  HUD,
  ND,
  NDButton,
  Panel,
  RaceTabs,
  ResIcon,
  Screen,
  Sigil,
  raceLex,
} from '@/components/handoff';
import { refreshGates, useGate } from '@/lib/gates';
import Image from 'next/image';
import { useNDRace } from '@/components/handoff/useNDRace';
import { buildingOriginalAsset } from '@/lib/asset-paths';
import type { NDRace } from '@/components/handoff/nd-tokens';
import { useBuildingTypes, type BuildingTypeDto } from '@/hooks/useBuildingTypes';
import { useHudState } from '@/hooks/useHudState';
import { useGameBuildings, refreshBuildings } from '@/hooks/useGameBuildings';
import { useGameResources, formatResource, refreshGameResources } from '@/hooks/useGameResources';
import { computeUpgradeRequirements, canUpgrade } from '@/lib/upgrade-requirements';
import { gameServerApi } from '@/lib/game-server-api';
import { FetchError } from '@/lib/api';
import { toast } from '@/components/handoff/Toaster';
import { hasSession } from '@/lib/session';
import { scaledDurationSec } from '@/lib/game-speed';

interface BuildEntry {
  name: string;
  desc: string;
  locked: boolean;
  /** Optional explanation surfaced when the chip falls back to the locked
   *  state — currently HQ-level requirement for the advanced slots (6, 7).
   *  Lower priority than the gate framework's primaryHint when both apply. */
  lockHint?: string;
  /** Base cost (Lv 0 → Lv 1). Card derives next-level cost from this
   *  via `base × 1.5^level` — same formula the backend's upgradeBuilding
   *  uses. Keeps the card display synced with what the player will
   *  actually pay on click. */
  costA: number;
  costB: number;
  /** Per-tick yield at base level. Multiplied by a level scale factor
   *  client-side for display. Server-side EconomyService applies the
   *  authoritative scaling (basePerHour × levelScaleExponent^(level-1));
   *  we replicate a simpler linear approximation here so the card can
   *  signal "build this, get +15M/tick" without depending on a separate
   *  fetch. 0 = building doesn't produce that resource. */
  yieldMineralPerTick: number;
  yieldGasPerTick: number;
  yieldEnergyPerTick: number;
  durationSec: number;
  level: number;
  /** Backend type code (COMMAND_CENTER, MINERAL_EXTRACTOR…) when matched. */
  backendType?: string;
  /** Path to the 512×512 building art generated via scripts/comfy-gen.js.
   * Empty when the slug from RACES tokens doesn't have a rendered asset. */
  assetPath?: string;
}

const BOTTOM_NAV_ROUTES: Record<string, string> = {
  base:     '/base',
  map:      '/map',
  settings: '/settings',
  alliance: '/alliance',
  shop:     '/shop',
};

export default function BuildMenuPage() {
  // Suspense wrapper required because useSearchParams suspends during SSR
  // pre-render. Without it, Next 14 errors at build time on this route.
  return (
    <Suspense fallback={null}>
      <BuildMenuInner />
    </Suspense>
  );
}

function BuildMenuInner() {
  const race = useNDRace();
  const router = useRouter();
  const t = useTranslations('build');
  const lex = raceLex(race.key);
  const params = useSearchParams();
  const focusSlug = params.get('focus');
  const hud = useHudState();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  // 1-second ticker used by the construction-countdown rendering. Bound to
  // a useState/useEffect pair so React re-renders the build button every
  // second while a building is mid-construction. The ticker only mounts
  // when there's actually an in-flight construction (see effect below).
  const [, setNowTick] = useState(0);

  // Live backend config: cost / build time / max-per-player numbers from
  // game-server's BUILDING_CONFIGS. Used to overlay real values on the
  // race-flavoured slots; if the fetch fails we keep the mock numbers.
  const { types: backendTypes } = useBuildingTypes();
  // Live owned-buildings roster. Drives the "already built — upgrade
  // instead" branch in handleStartBuild so the player can't accidentally
  // spawn N duplicate command centers by tapping "İnşa Başlat" twice.
  // Also feeds real per-building levels into the catalog cards so the
  // displayed "Lv N" chip matches what the detail page shows.
  const { data: liveBuildings } = useGameBuildings();
  const catalog = useMemo<BuildEntry[]>(
    () => buildCatalog(race, backendTypes, liveBuildings ?? []),
    [race, backendTypes, liveBuildings],
  );
  const lockedCount = catalog.filter((c) => c.locked).length;

  // Filter pills (`lex.buildTabs`) split the 6-slot catalog into themed
  // categories. Tab 0 = "Tümü" → show all. Each subsequent tab maps to
  // a slot index range based on the race's themed grouping (capital +
  // resource + military + science + frontier ≈ 6 slots / 5 tabs).
  // The mapping is approximate (each race lex defines its own 5 tabs);
  // we slice the catalog evenly so every tab has at least 1-2 entries.
  const visibleCatalog = useMemo(() => {
    if (activeTab === 0) return catalog; // "Tümü"
    // Tab N (1..4) gets the slot at index (N-1)*2 and (N-1)*2 + 1 if any.
    const start = (activeTab - 1) * 2;
    const slice = catalog.slice(start, start + 2);
    return slice.length > 0 ? slice : catalog;
  }, [catalog, activeTab]);

  // Preselect the building the player tapped on /base (?focus=<slug>).
  // Falls through to the local state once the user clicks another card.
  useEffect(() => {
    if (!focusSlug) return;
    const match = race.buildings.find((b) => b.slug === focusSlug);
    if (match) setSelectedName(match.n);
  }, [focusSlug, race]);

  const selected = catalog.find((c) => c.name === selectedName) ?? catalog[0];

  // If the player already has an in-flight construction of the selected
  // building type, pull the row so the CTA can render a live countdown
  // ("İNŞA · 0:42") instead of generic "İNŞA BAŞLAT". The button stays
  // disabled while constructing — most building types have maxPerPlayer
  // === 1 and the backend rejects a second POST while one is pending.
  const selectedConstructing = useMemo(() => {
    if (!liveBuildings || !selected?.backendType) return null;
    return (
      liveBuildings.find(
        (b) =>
          b.type === selected.backendType &&
          b.status === 'constructing' &&
          b.constructionCompleteAt,
      ) ?? null
    );
  }, [liveBuildings, selected]);

  // Best (highest-level) owned instance of the selected building. Drives
  // the catalog-side YÜKSELT CTA: when this is non-null the player can
  // upgrade right from /base/build without bouncing to the detail page.
  // Matches the level the catalog chip + detail page display.
  const selectedOwned = useMemo(() => {
    if (!liveBuildings || !selected?.backendType) return null;
    let best: typeof liveBuildings[number] | null = null;
    for (const b of liveBuildings) {
      if (b.type !== selected.backendType) continue;
      if (b.status === 'destroyed') continue;
      if (!best || b.level > best.level) best = b;
    }
    return best;
  }, [liveBuildings, selected]);

  // Upgrade-cost scaling mirrors game-server's BuildingsService.upgrade:
  // baseCost × 1.5^currentLevel for mineral+gas, plus a flat science tax
  // at target level ≥ 5 (targetLevel × 50 — see upgrade-requirements.ts).
  // Computed eagerly so the YÜKSELT label can render "L 3 → 4" with a
  // disabled state if the wallet falls short, no extra POST round-trip.
  const upgradeCost = useMemo(() => {
    if (!selected || !selectedOwned) return null;
    const targetLevel = selectedOwned.level + 1;
    return {
      mineral: Math.round(selected.costA * Math.pow(1.5, selectedOwned.level)),
      gas:     Math.round(selected.costB * Math.pow(1.5, selectedOwned.level)),
      science: targetLevel >= 5 ? targetLevel * 50 : 0,
    };
  }, [selected, selectedOwned]);

  // Live wallet — drives the "EKSİK KAYNAK" disable on the YÜKSELT CTA.
  // Same hook /base uses; broadcast invalidation refreshes both views.
  const { data: wallet } = useGameResources();

  // HQ-Lv / science requirements computed via the shared frontend mirror
  // of buildings.service's upgrade-requirements gate. When the backend
  // would reject the POST, we surface the blocker text on the CTA so the
  // player sees "Komuta Üssü Lv 3 gerekli" without firing a bad request.
  const upgradeReqs = useMemo(() => {
    if (!selectedOwned) return [];
    return computeUpgradeRequirements({
      building: {
        type: selectedOwned.type,
        level: selectedOwned.level,
        status: selectedOwned.status,
      },
      targetLevel: selectedOwned.level + 1,
      ownedBuildings: (liveBuildings ?? []).map((b) => ({
        type: b.type,
        level: b.level,
        status: b.status,
      })),
      scienceBalance: wallet?.science ?? 0,
    });
  }, [selectedOwned, liveBuildings, wallet?.science]);
  const upgradeReqsMet = canUpgrade(upgradeReqs);
  const upgradeBlocker = upgradeReqs.find((r) => !r.met)?.label;

  // Affordability — checked against the live wallet. Each value is treated
  // strictly (>=) so the click never produces a backend 4xx; the user sees
  // a disabled button + greyscale label instead of a toast bounce-off.
  const canAffordUpgrade =
    !!upgradeCost &&
    !!wallet &&
    wallet.mineral >= upgradeCost.mineral &&
    wallet.gas     >= upgradeCost.gas &&
    wallet.science >= upgradeCost.science;

  // Upgrade cooldown — buildings.service writes constructionCompleteAt at
  // upgrade time even though status stays 'active', so the player keeps
  // collecting trickle while the level visually settles in. We honour the
  // deadline as a button-disable so a double-tap can't queue a phantom
  // upgrade ahead of the server's idempotency window.
  const upgradeCooldownDeadline = selectedOwned?.constructionCompleteAt
    ? new Date(selectedOwned.constructionCompleteAt).getTime()
    : null;
  const upgradeInCooldown =
    upgradeCooldownDeadline != null && upgradeCooldownDeadline > Date.now();
  const upgradeCooldownSec = upgradeInCooldown
    ? Math.max(0, Math.ceil((upgradeCooldownDeadline! - Date.now()) / 1000))
    : 0;

  // 1-second ticker — needed for the constructing countdown AND for the
  // post-upgrade cooldown so the BEKLE · Xs label refreshes every second.
  // Mounts only while one of those timers is live; idle catalogs don't
  // burn re-renders.
  useEffect(() => {
    if (!selectedConstructing && !upgradeInCooldown) return;
    const id = window.setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [selectedConstructing, upgradeInCooldown]);

  // Tracks the in-flight upgrade POST so a double-tap can't fire two
  // simultaneous requests against the same building id.
  const [upgradingId, setUpgradingId] = useState<string | null>(null);
  async function handleInlineUpgrade() {
    if (!selectedOwned || !selected) return;
    if (!hasSession()) {
      toast.error(t('toastLoginRequired'));
      return;
    }
    if (upgradeInCooldown) return;
    if (!upgradeReqsMet) {
      toast.error(upgradeBlocker ?? t('toastLocked'));
      return;
    }
    if (!canAffordUpgrade) {
      toast.error(t('toastRejected', { message: 'Yetersiz kaynak' }));
      return;
    }
    if (upgradingId === selectedOwned.id) return;
    setUpgradingId(selectedOwned.id);
    try {
      await gameServerApi.post(`/buildings/${selectedOwned.id}/upgrade`);
      toast.success(
        `${selected.name} Lv ${selectedOwned.level} → ${selectedOwned.level + 1}`,
      );
      refreshGameResources();
      refreshBuildings();
      refreshGates();
    } catch (err) {
      const message =
        err instanceof FetchError
          ? t('toastRejected', { message: err.message })
          : err instanceof Error
            ? err.message
            : t('toastUnknownError');
      toast.error(message);
    } finally {
      setUpgradingId(null);
    }
  }

  // MM:SS remaining until completion. Clamps to 0 so a finished-but-not-
  // yet-polled row reads "0:00" instead of negative seconds.
  function fmtRemaining(completeAt: string | null): string {
    if (!completeAt) return '0:00';
    const ms = new Date(completeAt).getTime() - Date.now();
    const sec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  const [busy, setBusy] = useState(false);
  async function handleStartBuild() {
    if (!selected || busy) return;
    if (selected.locked) {
      toast.error(t('toastLocked'));
      return;
    }
    if (!hasSession()) {
      toast.error(t('toastLoginRequired'));
      return;
    }
    const type = selected.backendType;
    if (!type) {
      // The race-flavoured catalog has 6 slots but the backend type table
      // exposes 16 generic types; if the matched slot lacks a backendType,
      // we can't safely fire POST /buildings. Fall back to a clear toast
      // until the slug↔type mapping is added (gap #75).
      toast.info(t('toastNoMapping', { name: selected.name }));
      return;
    }
    // Already-built guard. The capital starter has a `COMMAND_CENTER` row
    // from seed; if the player taps "İnşa Başlat" on the capital slot, we
    // used to POST `/buildings` again and spawn a duplicate at a random
    // tile — repeated taps stacked N command centers.  Now we route to the
    // existing building's detail page where the upgrade flow lives.  Most
    // building configs in game-server have maxPerPlayer === 1, so duplicate
    // creation isn't actually a feature — POSTing a second one was just a
    // backend permissiveness bug.
    if (liveBuildings && liveBuildings.some((b) => b.type === type)) {
      const existing = liveBuildings.find((b) => b.type === type)!;
      // Resolve to the same race-flavored slug the existing /base/building
      // detail page expects.
      const slug =
        race.buildings.find((b) => b.n === selected.name)?.slug ??
        selected.name.toLowerCase().replace(/\s+/g, '-');
      toast.info(t('toastAlreadyBuilt', { name: selected.name }));
      router.push(`/base/building/${slug}?id=${existing.id}`);
      return;
    }
    // Find a tile that isn't already occupied. The 8×8 grid the backend
    // uses gives 64 slots, and starter accounts have ≤6 buildings, so a
    // simple random retry loop terminates in O(1) practice. Falls back
    // to (0,0) after 20 tries (extremely unlikely).
    function pickFreeTile(): { x: number; y: number } {
      const occupied = new Set(
        (liveBuildings ?? []).map((b) => `${b.positionX},${b.positionY}`),
      );
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const x = Math.floor(Math.random() * 8);
        const y = Math.floor(Math.random() * 8);
        if (!occupied.has(`${x},${y}`)) return { x, y };
      }
      return { x: 0, y: 0 };
    }

    setBusy(true);
    try {
      const { x: positionX, y: positionY } = pickFreeTile();
      await gameServerApi.post('/buildings', { type, positionX, positionY });
      toast.success(t('toastStarted', { name: selected.name, duration: selected.durationSec }));
      // Wallet debited + buildings list changed — broadcast both so every
      // mounted consumer repolls immediately without waiting for the tick.
      refreshGameResources();
      refreshBuildings();
      // New building unlocks the next gate tier (e.g. command_center Lv 2
      // unlocks barracks, barracks unlocks turret). Tell the gate hook to
      // re-fetch so the catalog tiles update without a page refresh.
      refreshGates();
    } catch (err) {
      const message =
        err instanceof FetchError
          ? t('toastRejected', { message: err.message })
          : err instanceof Error
          ? err.message
          : t('toastUnknownError');
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-race={race.key} style={{ position: 'relative', height: '100dvh', overflow: 'hidden' }}>
      <Screen race={race} dim={0.55} style={{ height: '100dvh' }}>
        <HUD
          race={race}
          level={hud.level}
          levelName={hud.levelName}
          resA={hud.resA}
          resB={hud.resB}
          crystal={hud.crystal}
          science={hud.science !== undefined ? formatResource(Math.floor(hud.science)) : undefined}
        />

        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {/* Dimmed field behind */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.22,
              pointerEvents: 'none',
            }}
          >
            <BaseField race={race} focusedIdx={-1} />
          </div>

          {/* Back strip floating over the dimmed field */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              background: 'rgba(8,10,16,0.55)',
              borderBottom: `1px solid ${ND.border}`,
              backdropFilter: 'blur(6px)',
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
            <Code style={{ color: race.primary }}>{lex.fieldName}</Code>
          </div>

          {/* Bottom sheet */}
          <div
            style={{
              marginTop: 'auto',
              position: 'relative',
              background:
                race.key === 'seytan'
                  ? 'linear-gradient(180deg, rgba(20,2,6,0.96), rgba(8,1,3,0.98))'
                  : 'rgba(6,10,24,0.96)',
              borderTop: `1px solid ${race.primary}66`,
              padding: '14px 14px 18px',
              boxShadow: `0 -12px 40px ${race.glow}22`,
              maxHeight: '78%',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <div
                aria-hidden
                style={{
                  width: 40,
                  height: 3,
                  background: race.primary,
                  borderRadius: 2,
                  boxShadow: `0 0 6px ${race.glow}`,
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
                gap: 8,
              }}
            >
              <H3 style={{ color: ND.text }}>{lex.catalogName}</H3>
              <Code>{lex.morphHint} · {lockedCount} KİLİT</Code>
            </div>

            <div style={{ marginBottom: 12 }}>
              <RaceTabs race={race} items={lex.buildTabs} active={activeTab} onChange={setActiveTab} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {visibleCatalog.map((entry) => (
                <BuildingCard
                  key={entry.name}
                  race={race}
                  entry={entry}
                  selected={selected?.name === entry.name}
                  onSelect={() => {
                    // Card tap is a SELECT only — bottom CTA bar handles
                    // both navigation ("DETAY" → /base/building/[slug]) and
                    // action ("YÜKSELT" / "İNŞA ET"). Previously the card
                    // auto-routed to the detail page, which made the bottom
                    // buttons useless: by the time the player saw them, the
                    // page had already jumped away.
                    setSelectedName(entry.name);
                  }}
                />
              ))}
            </div>
            {visibleCatalog.length === 0 && (
              <Caption style={{ textAlign: 'center', padding: 16 }}>
                {t('noResults')}
              </Caption>
            )}

            {/* CTAs — replaced the old "Tümü filter reset + İnşa Et" pair
             *  with an adaptive Detay + Yükselt/İnşa pair so the catalog
             *  doubles as an upgrade panel (the user no longer has to
             *  drill into /base/building/[slug] just to bump Lv N → N+1).
             *  RaceTabs above already exposes the "Tümü" filter — the
             *  dedicated reset button was redundant.
             *
             *  Sticky-bottom positioning: position: sticky + bottom: 0
             *  keeps the action bar glued to the bottom of the scrollable
             *  sheet so the player doesn't have to scroll down every time
             *  they pick a card. Negative bottom-margin + extra padding-top
             *  produces a soft gradient fade against the cards above so
             *  the boundary reads as a deliberate UI band, not a clip.
             *  At natural-bottom (last card reached) the sheet's own
             *  background blends in, matching the pre-sticky design. */}
            <div
              style={{
                position: 'sticky',
                bottom: 0,
                marginTop: 12,
                marginLeft: -14,
                marginRight: -14,
                marginBottom: -18,
                padding: '14px 14px 18px',
                display: 'flex',
                gap: 8,
                background:
                  race.key === 'seytan'
                    ? 'linear-gradient(180deg, rgba(20,2,6,0) 0%, rgba(20,2,6,0.94) 38%, rgba(8,1,3,0.98) 100%)'
                    : 'linear-gradient(180deg, rgba(6,10,24,0) 0%, rgba(6,10,24,0.94) 38%, rgba(6,10,24,0.98) 100%)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                zIndex: 2,
              }}
            >
              {/* Left: DETAY → routes to the detail page when the player
               *  wants the full breakdown (requirements list, cost table,
               *  construction history). Disabled when nothing is selected
               *  or the slot is still locked. */}
              <NDButton
                race={race}
                variant="ghost"
                size="md"
                style={{ flex: 1 }}
                disabled={!selected || selected.locked}
                onClick={() => {
                  if (!selected) return;
                  const slug = race.buildings.find((b) => b.n === selected.name)?.slug;
                  if (slug) router.push(`/base/building/${slug}`);
                }}
              >
                DETAY
              </NDButton>
              {/* Right: adaptive primary CTA. If the player already owns
               *  this building → YÜKSELT (with full requirement / cost /
               *  cooldown gating). Otherwise → İNŞA ET via the existing
               *  GatedButton path (locked tiles, gate-framework hints).
               *  Both halves are big-touch (size md, flex 2) so the
               *  primary action is unambiguous on mobile. */}
              {selectedOwned ? (
                <NDButton
                  race={race}
                  size="md"
                  style={{ flex: 2 }}
                  disabled={
                    upgradeInCooldown ||
                    !upgradeReqsMet ||
                    !canAffordUpgrade ||
                    upgradingId === selectedOwned.id
                  }
                  onClick={handleInlineUpgrade}
                >
                  {upgradingId === selectedOwned.id
                    ? 'YÜKSELTILIYOR…'
                    : upgradeInCooldown
                      ? `BEKLE · ${upgradeCooldownSec}s`
                      : !upgradeReqsMet
                        ? `KİLİTLİ · ${upgradeBlocker ?? 'gereksinim'}`
                        : !canAffordUpgrade
                          ? 'EKSİK KAYNAK'
                          : `YÜKSELT · Lv ${selectedOwned.level} → ${selectedOwned.level + 1}`}
                </NDButton>
              ) : (
                <GatedButton
                  race={race}
                  size="md"
                  style={{ flex: 2 }}
                  gateId={selected?.backendType ? `base.build.${selected.backendType}` : 'base.build.command_center'}
                  forceDisabled={
                    (selected?.locked ?? false) || busy || !!selectedConstructing
                  }
                  onClick={handleStartBuild}
                >
                  {selectedConstructing
                    ? t('constructing', { time: fmtRemaining(selectedConstructing.constructionCompleteAt) })
                    : busy
                      ? t('sending')
                      : selected
                        // lex.actionVerb ("İNŞA", "MUTASYON", etc.) is race-flavor
                        // and already the action verb — stop concatenating the
                        // localized "BAŞLAT/START" after it, which produced
                        // "İNŞA START · Komuta Üssü" mixed-language strings on
                        // EN-locale sessions.  Single localized template now
                        // keeps the language consistent.
                        ? `${lex.actionVerb} · ${selected.name}`
                        : lex.actionVerb}
                </GatedButton>
              )}
            </div>
          </div>
        </div>

        <BottomNav
          race={race}
          active="base"
          onChange={(key) => router.push(BOTTOM_NAV_ROUTES[key] ?? '/base')}
        />
      </Screen>
    </div>
  );
}

/* ─── Building card ────────────────────────────────────────────────────── */

interface BuildingCardProps {
  race: NDRace;
  entry: BuildEntry;
  selected: boolean;
  onSelect: () => void;
}

function BuildingCard({ race, entry, selected, onSelect }: BuildingCardProps) {
  const tBuild = useTranslations('build');
  // Asset placeholder: many of the 30 ComfyUI building renders take ~5 min
  // each, so during a fresh sweep some PNGs won't exist yet on disk. Track
  // image-load failures locally and fall back to the original SVG silhouette
  // so the card never shows a broken placeholder. Resets when the slug
  // (asset path) changes — useful when sweep finishes and user reloads.
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => { setImgFailed(false); }, [entry.assetPath]);
  const showImage = !!entry.assetPath && !imgFailed;
  // Gate-aware lock chip: when a tile is locked, prefer the gate's
  // primaryHint ("Komuta Üssü Lv 2") over the generic "KİLİTLİ" copy so
  // the player sees the actual blocker without opening the modal. Falls
  // back to entry.lockHint (HQ-level threshold computed in buildCatalog
  // for the advanced slots 6,7), then to the generic chip text when no
  // hint source has anything to say — keeps the chip honest even if the
  // gate registry doesn't know about a freshly-added building type yet.
  const gate = useGate(entry.backendType ? `base.build.${entry.backendType}` : '');
  const lockHint =
    (gate && !gate.unlocked ? gate.primaryHint : null) ?? entry.lockHint ?? null;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      disabled={entry.locked}
      style={{ all: 'unset', cursor: entry.locked ? 'not-allowed' : 'pointer', display: 'block' }}
    >
      <Panel
        race={race}
        glow={selected && !entry.locked}
        style={{
          padding: 8,
          border:
            selected && !entry.locked
              ? `1px solid ${race.primary}`
              : `1px solid ${ND.border}`,
          opacity: entry.locked ? 0.55 : 1,
        }}
      >
        <div
          aria-hidden
          style={{
            // Image area boosted from 64 -> 140 so the full iso building is
            // visible without cropping. objectFit: 'contain' (vs 'cover')
            // shows the whole 512×512 ComfyUI render scaled down to fit,
            // never overlapping the text rows below. Cards can stretch
            // downward freely — the grid uses auto rows.
            aspectRatio: '1 / 1',
            position: 'relative',
            overflow: 'hidden',
            background: `linear-gradient(180deg, ${race.primary}11, transparent)`,
            border: `1px dashed ${race.primary}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {showImage && entry.assetPath ? (
            // ComfyUI-generated iso building art (512×512). After strip-bg.py
            // the assets are transparent — `contain` keeps the whole silhouette
            // visible with race-tinted bg gradient peeking through behind it.
            // The bottom-fade mask still helps blend the small base platform
            // on unstripped assets but is a soft no-op on transparent ones.
            <Image
              src={entry.assetPath}
              alt={entry.name}
              fill
              sizes="(max-width: 480px) 30vw, 180px"
              style={{
                objectFit: 'contain',
                filter: entry.locked ? 'grayscale(0.7)' : undefined,
                WebkitMaskImage:
                  'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
                maskImage:
                  'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
              }}
              priority={false}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <svg width="48" height="40" viewBox="0 0 48 40" aria-hidden="true">
              <path
                d="M 4 28 L 24 14 L 44 28 L 24 36 Z"
                fill="rgba(40,52,76,0.85)"
                stroke={race.primary}
                strokeWidth="0.8"
              />
              <path
                d="M 4 28 L 4 32 L 24 40 L 24 36 Z"
                fill="#0C1224"
                stroke={`${race.primary}aa`}
                strokeWidth="0.5"
              />
              <path
                d="M 44 28 L 44 32 L 24 40 L 24 36 Z"
                fill="#070B17"
                stroke={`${race.primary}88`}
                strokeWidth="0.5"
              />
            </svg>
          )}
        </div>

        <div
          style={{
            marginTop: 6,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <H3 style={{ color: ND.text, fontSize: 10 }}>{entry.name}</H3>
          {entry.locked ? (
            <Chip>{lockHint ?? tBuild('chipLocked')}</Chip>
          ) : entry.level > 0 ? (
            <Chip color={race.primary}>Lv {entry.level}</Chip>
          ) : (
            // No backend-known level for this slot yet → don't lie with "Lv 0".
            // Player can build/upgrade from here; the chip says so plainly.
            <Chip>{tBuild('chipNew')}</Chip>
          )}
        </div>

        <Caption style={{ fontSize: 10, marginTop: 2 }}>{entry.desc}</Caption>

        {/* COST row — shows what the next click will actually cost:
            - At Lv 0 (not built): base construction cost (M / G).
            - At Lv N>0: upgrade cost = base × 1.5^N + science when N≥4
              (targetLevel = N+1, science gate kicks in at targetLevel≥5).
            Mirrors backend's upgradeBuilding formula in
            apps/game-server/src/buildings/buildings.service.ts so the
            displayed price matches the actual debit on click.

            The "Lv N → N+1" prefix only appears when the player owns
            the building; the YENİ branch keeps the visual quiet so the
            catalog browse view stays clean. */}
        {(() => {
          const targetLevel = entry.level + 1;
          const scale = Math.pow(1.5, entry.level);
          const nextCostA = Math.round(entry.costA * scale);
          const nextCostB = Math.round(entry.costB * scale);
          const scienceCost = targetLevel >= 5 ? targetLevel * 50 : 0;
          return (
            <div
              style={{
                marginTop: 6,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                fontFamily: ND.mono,
                fontSize: 10,
              }}
            >
              {entry.level > 0 && (
                <div
                  style={{
                    fontSize: 9,
                    color: ND.textDim,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Lv {entry.level} → {targetLevel}
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: race.primary,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <ResIcon kind={race.resourceA.icon} size={11} color={race.primary} />
                  {nextCostA.toLocaleString()}
                </span>
                <span aria-hidden style={{ color: ND.textMute }}>·</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <ResIcon kind={race.resourceB.icon} size={11} color={race.primary} />
                  {nextCostB.toLocaleString()}
                </span>
                {scienceCost > 0 && (
                  <>
                    <span aria-hidden style={{ color: ND.textMute }}>·</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <ResIcon kind="science" size={11} color={race.primary} />
                      {scienceCost.toLocaleString()}
                    </span>
                  </>
                )}
              </div>
              {/* YIELD row — only when the building actually produces
                  something. Hides zero-yield buildings (kışla, akademi,
                  fabrika, kalkan jeneratörü) so the card doesn't render
                  a misleading "+0/tick" stripe.

                  Scale by 1.18^(level-1) to mirror backend's
                  recalculateProductionRates legacy-fallback formula
                  (1.18 = the default levelScaleExponent the DB-driven
                  path would use). Number shown is the rate the player
                  ACTUALLY trickles AT THE CURRENT LEVEL, so an upgraded
                  building's card matches the wallet behaviour. Lv 1 → 1.0×,
                  Lv 5 → 1.94×, Lv 10 → 4.43×. */}
              {(() => {
                const yieldScale = Math.pow(1.18, Math.max(0, entry.level - 1));
                const scaledM = Math.round(entry.yieldMineralPerTick * yieldScale);
                const scaledG = Math.round(entry.yieldGasPerTick * yieldScale);
                // Energy production scales; consumption does not.
                // Recompute net = (basePos × scale) - (baseNeg) so the
                // displayed value matches the backend's actual trickle.
                const baseEnergy = entry.yieldEnergyPerTick;
                const scaledE = baseEnergy >= 0
                  ? Math.round(baseEnergy * yieldScale)
                  : baseEnergy; // pure drain buildings keep their cost flat
                const hasYield = scaledM !== 0 || scaledG !== 0 || scaledE !== 0;
                if (!hasYield) return null;
                return (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: ND.ok,
                      flexWrap: 'wrap',
                      fontSize: 9,
                    }}
                  >
                    {scaledM !== 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        <ResIcon kind={race.resourceA.icon} size={9} color={ND.ok} />
                        +{scaledM.toLocaleString()}/tick
                      </span>
                    )}
                    {scaledG !== 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        <ResIcon kind={race.resourceB.icon} size={9} color={ND.ok} />
                        +{scaledG.toLocaleString()}/tick
                      </span>
                    )}
                    {scaledE !== 0 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 2,
                          color: scaledE < 0 ? ND.danger : ND.ok,
                        }}
                      >
                        <ResIcon
                          kind="energy"
                          size={9}
                          color={scaledE < 0 ? ND.danger : ND.ok}
                        />
                        {scaledE > 0 ? '+' : ''}
                        {scaledE.toLocaleString()}/tick
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}
      </Panel>
    </button>
  );
}

/* ─── Catalog builder ──────────────────────────────────────────────────── */

/* Slot-slug → backend BuildingType enum string mapping.
 *
 * After migration `1779635000000-AddTsBuildingEnumValues`, the Postgres
 * buildings_type_enum and the TS enum are aligned — all 16 TS values are
 * insertable. So every race slug now maps to a thematically appropriate
 * specific type (mineral_extractor for "resource extractor" themes,
 * academy/research_lab for "science" themes, etc.) instead of the
 * generic 4-type intersection. */
const SLUG_TO_BACKEND_TYPE: Record<string, string> = {
  // Insan — sleek military sci-fi
  komuta_ussu:        'command_center',
  reaktor_modulu:     'solar_plant',       // power generator
  yakit_rafinerisi:   'gas_refinery',      // gas/Yakıt — added so insan players actually accrue Yakıt (was 0)
  kisla:              'barracks',          // unit training
  bilim_akademisi:    'academy',           // advanced research
  subspace_anteni:    'shield_generator',  // long-range defense
  genetik_lab:        'factory',           // heavy unit production

  // Zerg — organic hive
  kovan_cekirdegi:    'command_center',
  biyokutle_havuzu:   'mineral_extractor', // biomass extraction
  mutasyon_cukuru:    'spawning_pool',     // unit spawn
  genom_tumsegi:      'hatchery',          // genome research
  yutucu_tumsek:      'shield_generator',  // defensive carapace
  subspace_damari:    'gas_refinery',      // exotic resource

  // Otomat — cybernetic
  sonsuzluk_cekirdegi:'command_center',
  veri_kaynagi:       'solar_plant',       // data/power core
  hesap_havuzu:       'gas_refinery',      // gas/Hesap — added so otomat players actually accrue Hesap (was 0)
  montaj_hatti:       'nano_forge',        // assembly line
  mantik_matrisi:     'cyber_core',        // logic matrix
  cihaz_hazinesi:     'quantum_reactor',   // device storage
  subspace_cozucu:    'defense_matrix',    // subspace defense

  // Canavar — primal tribal
  alfa_tahti:         'command_center',
  av_kampi:           'mineral_extractor', // hunt/forage
  vahsi_cukur:        'barracks',          // savage training
  atalar_sunagi:      'gas_refinery',      // blood essence
  atalar_magarasi:    'shield_generator',  // ancestral defense
  boyut_yarigi:       'factory',           // dimension rift forge

  // Seytan — dark occult
  karanlik_taht:      'command_center',
  ruh_toplayici:      'gas_refinery',      // soul essence
  lanet_tapinagi:     'barracks',          // summon training
  pakt_sembolu:       'academy',           // pact knowledge
  yasak_grimoire:     'shield_generator',  // dark wards
  yarik_kapisi:       'turret',            // dimensional gate
};

/* Build the displayed catalog. We always show 6 race-flavoured slots from
 * `RACES[race].buildings` (the design is race-specific). When the backend
 * BUILDING_CONFIGS list is available we replace the synthesised cost/time
 * numbers with real data for the slot's mapped type.
 *
 * `ownedBuildings` feeds real per-building levels so the "Lv N" chip
 * on each catalog card matches the level shown on the detail page. */
// HQ-level thresholds for the two "advanced" race slots (index 6 + 7 across
// every race entry in nd-tokens). Mirrors the static `locked: true` flags but
// resolves DYNAMICALLY so the slot opens when the player has actually built
// up — instead of staying locked forever like the old hardcoded version did.
// Slot 6 = "kadim güç" tier (subspace_anteni / yutucu_tumsek / cihaz_hazinesi
// / atalar_magarasi) → HQ Lv 3.  Slot 7 = "Tier-4 birim" tier (genetik_lab /
// subspace_damari / subspace_cozucu / boyut_yarigi) → HQ Lv 4. Keeps the
// frontend honest about prerequisites; the buildings.service backend
// upgrade-requirements still does the authoritative gate at construction time.
const ADVANCED_SLOT_HQ_THRESHOLD: Record<number, number> = {
  6: 3,
  7: 4,
};

function buildCatalog(
  race: NDRace,
  backendTypes: BuildingTypeDto[],
  ownedBuildings: import('@/hooks/useGameBuildings').PlayerBuildingDto[],
): BuildEntry[] {
  // Index the backend table by type code so we can look up by mapped slug.
  const byType = new Map<string, BuildingTypeDto>();
  backendTypes.forEach((t) => byType.set(t.type, t));

  // Index owned active/constructing buildings by type, KEEPING THE HIGHEST
  // LEVEL when the player has multiple instances of the same type.  The
  // previous `Map.set` last-write-wins meant a freshly-built Lv 1 instance
  // would overwrite the existing Lv 3 instance's value depending on backend
  // response order — and produced the "neden kendiliğinden lvl atlıyorlar"
  // illusion in the catalog where the chip "flickered" between the two
  // instances' levels.  Detail page also uses the highest-level instance
  // now (see `bestOwnedInstance`), so the two views agree.
  const ownedByType = new Map<string, number>();
  for (const ob of ownedBuildings) {
    if (ob.status === 'destroyed') continue;
    const prev = ownedByType.get(ob.type) ?? 0;
    if (ob.level > prev) ownedByType.set(ob.type, ob.level);
  }

  // HQ level drives the dynamic-lock check on advanced slots (6, 7).
  const hqLevel = ownedByType.get('command_center') ?? 0;

  return race.buildings.map((b, i) => {
    const mappedType = b.slug ? SLUG_TO_BACKEND_TYPE[b.slug] : undefined;
    const backend = mappedType ? byType.get(mappedType) : undefined;
    const base = (i + 1) * 220;
    // Use the real owned-building level if the player has one; otherwise 0
    // (the chip renders "YENİ" for 0 — see the JSX below the catalog list).
    const ownedLevel = mappedType ? (ownedByType.get(mappedType) ?? 0) : 0;

    // Static `locked: true` slots open when HQ reaches the threshold for
    // that slot index.  Below threshold → still locked + show the HQ-Lv
    // requirement so the player knows what to upgrade.  Above threshold →
    // fully unlocked, normal build/upgrade flow.
    const requiredHq = ADVANCED_SLOT_HQ_THRESHOLD[i];
    const dynamicallyLocked =
      b.locked && requiredHq != null ? hqLevel < requiredHq : b.locked;
    const lockHint =
      b.locked && requiredHq != null && hqLevel < requiredHq
        ? `Komuta Üssü Lv ${requiredHq} gerekli (şu an Lv ${hqLevel})`
        : undefined;

    return {
      name: b.n,
      desc: b.t,
      locked: dynamicallyLocked,
      lockHint,
      costA: backend?.cost.mineral ?? base,
      costB: backend?.cost.gas ?? Math.round(base * 0.35),
      yieldMineralPerTick: backend?.production.mineralPerTick ?? 0,
      yieldGasPerTick: backend?.production.gasPerTick ?? 0,
      // Net energy = production - consumption. Negative for buildings
      // that DRAIN the grid (factories, shield generators); positive
      // for power plants. The card surface only colours positive as
      // "yield" and negative as "drain" so the player can spot a
      // power-hungry building before they accept the upgrade.
      yieldEnergyPerTick:
        (backend?.production.energyPerTick ?? 0) -
        (backend?.energyConsumptionPerTick ?? 0),
      // Display duration matches what the server actually applies —
      // scaledDurationSec divides by NEXT_PUBLIC_GAME_SPEED_MULTIPLIER
      // so a 1000× playtest doesn't show "30s" on a card that resolves
      // server-side in ~30ms. Default speed (1) → unchanged display.
      durationSec: scaledDurationSec(backend?.buildTimeSeconds ?? 90 + i * 60),
      level: dynamicallyLocked ? 0 : ownedLevel,
      backendType: mappedType ?? backend?.type,
      // Catalog uses the ORIGINAL render (cosmic backdrop intact) — this
      // is a browse view where each card frames the building inside its
      // own panel, so the kozmik backdrop reads as intended art rather
      // than a halo.  /base composites onto the iso scene and prefers
      // the bg-removed twin from `buildingAsset()` instead.
      assetPath: b.slug ? buildingOriginalAsset(race.key, b.slug, 1) : undefined,
    };
  });
}
