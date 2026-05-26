'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  BaseFieldStatusChip,
  BottomNav,
  Caption,
  Chip,
  Code,
  DraggableBaseField,
  Eyebrow,
  H3,
  HUD,
  ND,
  NDButton,
  Panel,
  RaceQuickActions,
  Screen,
  Sigil,
  TierBanner,
  WizardHint,
  raceLex,
} from '@/components/handoff';
import { useNDRace } from '@/components/handoff/useNDRace';
import type { NDRace } from '@/components/handoff/nd-tokens';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useBaseState } from '@/hooks/useBaseState';
import { useGameBuildings, indexBuildingsByType, type PlayerBuildingDto } from '@/hooks/useGameBuildings';
import { useHudState } from '@/hooks/useHudState';
import { useBaseProductionQueue } from '@/hooks/useBaseProductionQueue';
import { refreshGameResources } from '@/hooks/useGameResources';
import type { NDRaceLex } from '@/components/handoff/race-lex';
import { ShortcutButtons } from '@/components/hud/ShortcutButtons';
import { UnitProductionQueue } from '@/components/hud/UnitProductionQueue';


const BOTTOM_NAV_ROUTES: Record<string, string> = {
  base:     '/base',
  map:      '/map',
  battle:   '/battle',
  alliance: '/alliance',
  shop:     '/shop',
};

/* Race → /base backdrop, using each race's CAPITAL building (slot 0 of
 * race.buildings — the player's main keep). These PNGs are Nebula's own
 * ComfyUI-generated assets with the iso-platform background cleaned up,
 * living under /assets/buildings/<race>/<slug>.png at runtime. The full
 * 30-building-with-platform versions live in the sibling /_orig/ folder
 * but are reserved for future use; runtime + /base both prefer the
 * cleaned versions.
 *
 * Previously this map pointed at /sprites/base-*.png, but those are
 * Caliptic project assets (commit ddc7137, ticket CAL-341) that shouldn't
 * be shipped with Nebula — swapping to Nebula's own renders keeps the
 * project visually self-contained. */
const BASE_BG_FALLBACK: Record<string, string> = {
  insan:   '/assets/buildings/insan/komuta_ussu.png',
  zerg:    '/assets/buildings/zerg/kovan_cekirdegi.png',
  otomat:  '/assets/buildings/otomat/sonsuzluk_cekirdegi.png',
  canavar: '/assets/buildings/canavar/alfa_tahti.png',
  seytan:  '/assets/buildings/seytan/karanlik_taht.png',
};

const QUICK_ACTION_ROUTES: Record<string, string> = {
  build:    '/base/build',
  prod:     '/base/production',
  spawn:    '/base/production',
  compile:  '/base/production',
  hunt:     '/base/production',
  summon:   '/base/production',
  merge:    '/merge',
  mutate:   '/merge',
  eat:      '/merge',
  seal:     '/merge',
  assemble: '/base/build',
  dig:      '/base/build',
  pact:     '/base/build',
  roster:   '/inventory',
};

export default function BaseHomePage() {
  const race = useNDRace();
  const router = useRouter();
  const t = useTranslations('base');
  const lex = raceLex(race.key);
  const hud = useHudState();
  const [focusedIdx, setFocusedIdx] = useState(1);
  const focusedBuilding = race.buildings[focusedIdx] ?? race.buildings[0];

  // Live tier progress (level, age, xp%). Falls back to mock when guest or
  // when the API errors so the HUD never goes blank.
  /* MERGE: kept useBaseState for liveAge (backdrop selection) and for the
   * focused-building card status; HUD itself now reads from useHudState. */
  const { data: live } = useBaseState();
  const liveAge = live?.tier?.currentAge;

  // Live buildings — used to show the real level + status (constructing
  // vs active) on the focused-building card. The slot-slug → backend type
  // mapping is duplicated from /base/build; the focusedBuilding's slug is
  // hashed to a likely-type via the same first letters.
  const { data: liveBuildings } = useGameBuildings();
  const bldgIndex = liveBuildings ? indexBuildingsByType(liveBuildings) : null;

  // COMMAND_CENTER building UUID — used as the base ID for the production
  // queue endpoint.  Fresh accounts have no COMMAND_CENTER yet (null →
  // hook no-ops and the overlay shows nothing).
  const commandCenterBuilding = liveBuildings?.find(
    (b) => b.type === 'command_center',
  ) ?? null;
  const { queue: liveProductionQueue } = useBaseProductionQueue(
    commandCenterBuilding?.id ?? null,
  );
  // Coarse slug→type fallback: when the player owns ≥1 instance of any
  // building type, the focused slot picks the first one to surface its
  // level. Once we share SLUG_TO_BACKEND_TYPE between /base + /base/build
  // this becomes a precise lookup.
  const focusedLiveBuilding = bldgIndex
    ? Array.from(bldgIndex.values())[focusedIdx]?.[0] ?? null
    : null;

  // First-session redirect: brand-new players are routed to the multi-step
  // tutorial (`/tutorial?step=1`). Once the player completes or skips the
  // tutorial, `useOnboarding.hasCompletedTutorial` flips and the redirect
  // becomes a no-op. Tutorial step persistence lives in `nebula:tutorial:v1`.
  const { hydrated, isFirstSession } = useOnboarding();
  useEffect(() => {
    if (!hydrated) return;
    if (!isFirstSession) return;
    let resume = 1;
    try {
      const raw = window.localStorage.getItem('nebula:tutorial:v1');
      if (raw) {
        const parsed = JSON.parse(raw) as { stepIndex?: number };
        if (parsed?.stepIndex && Number.isFinite(parsed.stepIndex)) {
          resume = Math.min(6, Math.max(1, parsed.stepIndex));
        }
      }
    } catch {
      /* fall back to step 1 */
    }
    router.replace(`/tutorial?step=${resume}`);
  }, [hydrated, isFirstSession, router]);

  /* Age-aware backdrop: the original plan was 5 races × 6 ages of
   * ComfyUI-generated landscape art under /assets/bases/<race>/age-<n>.png,
   * but those files were never committed (gitignored ComfyUI output) and
   * are no longer on disk. Until we regenerate the 30-image sweep, fall
   * back to each race's existing illustrated sprite — they're cleaner
   * single-figure scenes than the era landscapes but they don't 404 and
   * keep the page from rendering with a blank backdrop. Other consumers
   * of these sprites (battle-result, map) keep using them unchanged.
   *
   * Once the sweep regenerates, swap this back to the age-aware path
   * and delete the BASE_BG_FALLBACK map below. */
  const safeAge = Math.min(6, Math.max(1, liveAge ?? 1));
  void safeAge; // kept for the future age-aware swap-back
  const baseBg = BASE_BG_FALLBACK[race.key];

  /* Story-unlock toast: when the player's `safeAge` advances past the value
   * we last surfaced, pop a chip pointing at /story-gallery. Persisted in
   * localStorage so the toast only fires on the actual transition, not
   * every visit at the new age. */
  const [storyToast, setStoryToast] = useState<{ age: number } | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = 'nebula:story:last-seen-age:v1';
    let lastSeen = 0;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) lastSeen = Number(raw);
    } catch { /* ignore */ }
    if (safeAge > lastSeen) {
      setStoryToast({ age: safeAge });
      try { window.localStorage.setItem(key, String(safeAge)); } catch { /* ignore */ }
    }
  }, [safeAge]);

  /* Level-up readiness toast: when xpPercent hits 100, the player can
   * advance via /tier-up but nothing in the world tells them so — /tier-up
   * is only reachable from the burger-menu drawer. Without this nudge, a
   * new player grinds past the cap, sees their XP bar stuck at 100%, and
   * concludes the game is bugged or progression is gated by something
   * invisible.  Persists the last level shown so the toast doesn't re-fire
   * every visit at the same level. */
  const [levelUpToast, setLevelUpToast] = useState<{ level: number } | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hud.xpPercent < 100) return;
    const key = 'nebula:levelup:last-shown-level:v1';
    let lastShown = 0;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) lastShown = Number(raw);
    } catch { /* ignore */ }
    if (hud.level > lastShown) {
      setLevelUpToast({ level: hud.level });
      try {
        window.localStorage.setItem(key, String(hud.level));
      } catch {
        /* ignore */
      }
    }
  }, [hud.xpPercent, hud.level]);

  return (
    <div data-race={race.key} style={{ position: 'relative', height: '100dvh' }}>
      {/* Era-specific backdrop becomes a top horizon/sky band (NebulaBg's
       * bgImage mask now fades out by 60% — see Sigil.tsx). The bottom
       * ~50% of the screen is the iso tilemap below. dim dropped from
       * 0.5 → 0.3 so the race-tinted nebula gradient doesn't mute the
       * per-tile ground palette. */}
      <Screen race={race} dim={0.3} style={{ height: '100%' }} bgImage={baseBg}>
        <HUD
          race={race}
          level={hud.level}
          levelName={hud.levelName}
          resA={hud.resA}
          resB={hud.resB}
          crystal={hud.crystal}
          science={hud.science !== undefined ? Math.floor(hud.science).toLocaleString() : undefined}
          resAPerTick={hud.resAPerTick}
          resBPerTick={hud.resBPerTick}
          crystalPerTick={hud.crystalPerTick}
          resACap={hud.resACap}
          resBCap={hud.resBCap}
          crystalCap={hud.crystalCap}
        />

        <TierBanner race={race} level={hud.level} age={hud.age} xpPercent={hud.xpPercent} />

        {/* New-chapter toast: shown when player.safeAge advances past the
            persisted threshold. Self-dismisses on click and links to
            /story-gallery so the player can replay the era's chapters. */}
        {storyToast && (
          <Link
            href={`/story?race=${race.key}`}
            onClick={() => setStoryToast(null)}
            style={{
              position: 'absolute',
              top: 90,
              left: 12,
              right: 12,
              padding: '10px 14px',
              background: `linear-gradient(90deg, ${race.primary}33, ${race.glow}11)`,
              border: `1px solid ${race.primary}88`,
              color: ND.text,
              fontFamily: ND.display,
              fontSize: 12,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              textAlign: 'center',
              textDecoration: 'none',
              zIndex: 5,
              animation: 'nd-slide-up 600ms ease-out',
            }}
            aria-label={t('storyChapterAriaLabel')}
          >
            {t('storyChapterUnlocked', { age: storyToast.age })}
          </Link>
        )}

        {/* Level-up readiness toast: shown when xp bar hits 100%.  Stacks
            below storyToast (top: 130) when both fire on the same visit so
            neither covers the other. Click → /tier-up where the actual
            level-up flow lives. */}
        {levelUpToast && (
          <Link
            href="/tier-up"
            onClick={() => setLevelUpToast(null)}
            style={{
              position: 'absolute',
              top: storyToast ? 130 : 90,
              left: 12,
              right: 12,
              padding: '10px 14px',
              background: `linear-gradient(90deg, ${race.glow}33, ${race.primary}22)`,
              border: `1px solid ${race.primary}`,
              boxShadow: `0 0 14px -2px ${race.glow}`,
              color: ND.text,
              fontFamily: ND.display,
              fontSize: 12,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              textAlign: 'center',
              textDecoration: 'none',
              zIndex: 5,
              animation: 'nd-slide-up 600ms ease-out',
            }}
            aria-label={t('levelUpAriaLabel')}
          >
            {t('levelUpReady', { from: levelUpToast.level, to: levelUpToast.level + 1 })}
          </Link>
        )}

        {/* Main field — race-themed iso silhouette + floating widgets.
            The field itself lives inside DraggableBaseField (pan via drag).
            Floating widgets (status chip, vitals, toast, quick actions, card)
            sit OUTSIDE the draggable layer so they stay pinned to the viewport. */}
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          <DraggableBaseField
            race={race}
            focusedIdx={focusedIdx}
            onSelect={setFocusedIdx}
          />

          {/* status chip top-left */}
          <div style={{ position: 'absolute', top: 12, left: 12 }}>
            <BaseFieldStatusChip race={race} label={lex.statusOk} />
          </div>

          {/* quick actions mid-right + TOPLA collect button */}
          <div style={{ position: 'absolute', right: 10, top: '32%', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <RaceQuickActions
              race={race}
              onAction={(key) => {
                const route = QUICK_ACTION_ROUTES[key];
                if (route) router.push(route);
              }}
            />
            {/* Resource collect — polls the latest wallet values from the backend.
              * Resources accumulate passively per tick; this button makes the
              * current total visible immediately. Disabled for 3s after each tap. */}
            <CollectButton race={race} />
          </div>

          {/* Selected-building card.  Has two states:
            *   - collapsed (default): mini chip in bottom-left ~160px wide,
            *     showing the building sigil + name. Keeps the iso field
            *     fully visible.
            *   - expanded (hover OR tap): full card with status chip,
            *     description, İNŞA / DETAY buttons, and the building
            *     selector strip.
            *   The hover trigger uses pointer events so touch devices
            *     promote to tap-to-toggle naturally — `cardOpen` state
            *     stays true after tap and clears on second tap. */}
          <BuildingCard
            race={race}
            lex={lex}
            t={t}
            focusedBuilding={focusedBuilding}
            focusedLiveBuilding={focusedLiveBuilding}
            focusedIdx={focusedIdx}
            setFocusedIdx={setFocusedIdx}
          />
        </div>

        {/* Right-rail shortcuts (chat / missions / inventory) and bottom-left
         *  production queue — both are HUD overlays that sit above the iso
         *  field but below the bottom nav.  The queue is live-wired to
         *  GET /api/bases/:id/production-queue (CAL-586); collapses to
         *  nothing when the player has no units in flight. */}
        <ShortcutButtons
          unreadMessages={3}
          activeMissions={2}
          inventoryStatus="full"
          onChatClick={() => router.push('/chat')}
          onMissionsClick={() => router.push('/missions')}
          onInventoryClick={() => router.push('/inventory')}
        />
        {/* Pass the live queue array; the component returns null when empty,
          * so the overlay disappears automatically when nothing is in
          * flight.  DEMO_QUEUE is no longer injected now that CAL-586 is
          * wired. */}
        <UnitProductionQueue queue={liveProductionQueue} />

        <BottomNav
          race={race}
          active="base"
          onChange={(key) => router.push(BOTTOM_NAV_ROUTES[key] ?? '/base')}
        />

        {/* New-player progression hint — reads live server state and
         *  surfaces the first incomplete step (build resource bldg,
         *  train first unit, visit galaxy, …). Auto-dismisses each step
         *  as the player completes it; user can opt out entirely. */}
        <WizardHint />
      </Screen>
    </div>
  );
}

interface BuildingSelectorProps {
  race: NDRace;
  focusedIdx: number;
  onSelect: (idx: number) => void;
}

function BuildingSelector({ race, focusedIdx, onSelect }: BuildingSelectorProps) {
  const tBase = useTranslations('base');
  return (
    <div
      role="tablist"
      aria-label={tBase('buildingSelectorAriaLabel')}
      style={{
        marginTop: 10,
        paddingTop: 8,
        borderTop: `1px dashed ${ND.border}`,
        display: 'flex',
        gap: 4,
        overflowX: 'auto',
      }}
    >
      {race.buildings.map((b, i) => {
        const on = i === focusedIdx;
        return (
          <button
            key={b.n}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(i)}
            disabled={b.locked}
            style={{
              all: 'unset',
              cursor: b.locked ? 'not-allowed' : 'pointer',
              flex: '1 1 0',
              minWidth: 44,
              padding: '4px 6px',
              textAlign: 'center',
              fontFamily: ND.mono,
              fontSize: 9,
              letterSpacing: '0.06em',
              color: b.locked ? ND.textMute : on ? '#0A0E1A' : ND.textDim,
              background: on ? race.primary : 'rgba(255,255,255,0.04)',
              border: `1px solid ${on ? race.primary : ND.border}`,
              opacity: b.locked ? 0.5 : 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {b.locked ? '🔒 ' : ''}{b.n}
          </button>
        );
      })}
    </div>
  );
}

/* ── Building card with collapse-on-mouseout behavior ──────────────────── */

interface BuildingCardProps {
  race: NDRace;
  lex: NDRaceLex;
  t: ReturnType<typeof useTranslations>;
  focusedBuilding: NDRace['buildings'][number];
  focusedLiveBuilding: PlayerBuildingDto | null;
  focusedIdx: number;
  setFocusedIdx: (idx: number) => void;
}

/**
 * Two-state focused-building card:
 *
 *   - collapsed (default): a ~180px chip in the bottom-left showing only
 *     the building sigil + name + tiny status dot.  Keeps the iso field
 *     fully visible behind it so the player can navigate the map
 *     without the card eating half the screen.
 *
 *   - expanded (on hover OR tap): the original full card with status
 *     chip, description, İNŞA / DETAY buttons, and the building selector
 *     strip below.
 *
 * Hover-based via pointer events; touch devices promote to tap-to-toggle
 * naturally — `expanded` state stays true after a tap and clears on a
 * second tap or when the player taps outside the card.
 */
function BuildingCard({
  race,
  lex,
  t,
  focusedBuilding,
  focusedLiveBuilding,
  focusedIdx,
  setFocusedIdx,
}: BuildingCardProps) {
  const [hovered, setHovered] = useState(false);
  const [tapToggled, setTapToggled] = useState(false);
  const expanded = hovered || tapToggled;

  const statusColor = focusedBuilding.locked
    ? ND.textMute
    : focusedLiveBuilding?.status === 'constructing'
      ? ND.warn
      : race.primary;

  const statusLabel = focusedBuilding.locked
    ? t('buildingLocked')
    : focusedLiveBuilding
      ? focusedLiveBuilding.status === 'constructing'
        ? t('buildingConstructing')
        : t('buildingActiveLevel', { level: focusedLiveBuilding.level })
      : t('buildingUnbuilt');

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        // In collapsed mode we anchor to the LEFT only (auto-width chip).
        // In expanded mode we stretch full-width as before so the existing
        // two-column layout has room to breathe.
        left: 12,
        right: expanded ? 12 : 'auto',
        transition: 'right 220ms ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {expanded ? (
        <Panel race={race} glow style={{ padding: 10 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div
              aria-hidden
              style={{
                width: 64,
                height: 64,
                flexShrink: 0,
                background: `linear-gradient(180deg, ${race.primary}22, transparent)`,
                border: `1px dashed ${race.primary}66`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sigil race={race} size={36} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <H3 style={{ color: ND.text, fontSize: 12 }}>
                  {focusedBuilding.n.toUpperCase()}
                </H3>
                <Chip color={statusColor}>{statusLabel}</Chip>
              </div>
              <Caption style={{ fontSize: 11, marginTop: 2 }}>
                {focusedBuilding.locked ? focusedBuilding.t : race.capitalDescription}
              </Caption>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <Link
                  href={`/base/build${
                    focusedBuilding.slug ? `?focus=${focusedBuilding.slug}` : ''
                  }`}
                  style={{ textDecoration: 'none' }}
                >
                  <NDButton race={race} variant="outline" size="sm">
                    {lex.actionVerb}
                  </NDButton>
                </Link>
                <Link
                  href={
                    focusedBuilding.slug
                      ? `/base/building/${focusedBuilding.slug}`
                      : '/base/build'
                  }
                  style={{ textDecoration: 'none' }}
                >
                  <NDButton race={race} variant="ghost" size="sm">
                    {t('detailButton').toUpperCase()}
                  </NDButton>
                </Link>
                {/* Explicit collapse button so tap-to-expand users have a
                 *  clear way back to the compact view. Hover users can
                 *  just move the cursor away. */}
                <button
                  type="button"
                  aria-label={t('collapseCardAriaLabel')}
                  onClick={() => {
                    setTapToggled(false);
                    setHovered(false);
                  }}
                  style={{
                    marginLeft: 'auto',
                    background: 'transparent',
                    border: `1px solid ${ND.border}`,
                    color: ND.textDim,
                    fontFamily: ND.mono,
                    fontSize: 11,
                    padding: '4px 8px',
                    cursor: 'pointer',
                    borderRadius: 3,
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          </div>
          <BuildingSelector
            race={race}
            focusedIdx={focusedIdx}
            onSelect={setFocusedIdx}
          />
        </Panel>
      ) : (
        <button
          type="button"
          onClick={() => setTapToggled(true)}
          aria-label={`${focusedBuilding.n} kartını aç`}
          title={statusLabel}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px 8px 8px',
            background: 'rgba(8, 12, 26, 0.78)',
            border: `1px solid ${race.primary}66`,
            borderRadius: 8,
            boxShadow: `0 0 14px -4px ${race.glow}99`,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            cursor: 'pointer',
            color: ND.text,
            fontFamily: ND.display,
          }}
        >
          <span
            aria-hidden
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              background: `${race.primary}22`,
              border: `1px dashed ${race.primary}66`,
              flexShrink: 0,
            }}
          >
            <Sigil race={race} size={18} />
          </span>
          <span
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              lineHeight: 1.1,
              maxWidth: 140,
            }}
          >
            <span
              style={{
                fontSize: 11,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 140,
              }}
            >
              {focusedBuilding.n}
            </span>
            <span
              style={{
                fontFamily: ND.mono,
                fontSize: 8,
                letterSpacing: '0.12em',
                color: statusColor,
                marginTop: 2,
              }}
            >
              ● {statusLabel}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

/* ── CollectButton — one-tap resource refresh ───────────────────────────── */
// Resources accumulate passively from buildings each tick. Tapping TOPLA
// polls the backend wallet immediately so the player sees the latest total.
function CollectButton({ race }: { race: NDRace }) {
  const [cooling, setCooling] = useState(false);

  const handle = () => {
    if (cooling) return;
    refreshGameResources();
    setCooling(true);
    window.setTimeout(() => setCooling(false), 3000);
  };

  const shape = {
    clipPath: 'none',
    borderRadius: 4,
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={cooling}
      aria-label="Kaynakları topla"
      style={{
        all: 'unset',
        width: 56,
        height: 44,
        padding: '4px 0',
        background: cooling ? 'rgba(8,12,26,0.45)' : 'rgba(8,12,26,0.78)',
        border: `1px solid ${cooling ? race.primary + '33' : race.primary + '77'}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        color: cooling ? race.primary + '66' : race.primary,
        cursor: cooling ? 'default' : 'pointer',
        transition: 'opacity 200ms',
        ...shape,
      }}
    >
      {/* coin / collect icon */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 5v6M6 7l2-2 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontFamily: ND.display, fontSize: 9, letterSpacing: '0.10em' }}>
        {cooling ? '···' : 'TOPLA'}
      </span>
    </button>
  );
}
