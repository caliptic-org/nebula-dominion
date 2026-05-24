'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bar,
  BaseFieldStatusChip,
  BaseVitalsWidget,
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
  raceLex,
} from '@/components/handoff';
import { useNDRace } from '@/components/handoff/useNDRace';
import type { NDRace } from '@/components/handoff/nd-tokens';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useBaseState } from '@/hooks/useBaseState';
import { useGameBuildings, indexBuildingsByType } from '@/hooks/useGameBuildings';
import { useHudState } from '@/hooks/useHudState';

const BOTTOM_NAV_ROUTES: Record<string, string> = {
  base: '/base',
  galaxy: '/map',
  cmd: '/commanders',
  story: '/story-gallery',
  more: '/settings',
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
            aria-label="Yeni hikaye bölümü açıldı"
          >
            ✦ YENİ ÇAĞ {storyToast.age} HİKAYE BÖLÜMÜ AÇILDI · DOKUN ›
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

          {/* vitals widget top-right */}
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            <BaseVitalsWidget race={race} />
          </div>

          {/* production-complete toast */}
          <Panel
            race={race}
            glow
            style={{
              position: 'absolute',
              top: 76,
              right: 12,
              padding: '8px 10px',
              // Fixed width (not max) so the panel renders the same size
              // regardless of unit-name length — shrink-to-fit was making
              // it 95px and the "Sniper" text crammed against the right
              // viewport edge. 178px sits flush with the vitals widget
              // above and the quick-actions stack beneath without
              // overlapping the iso buildings.
              width: 178,
            }}
          >
            <Code style={{ color: race.primary }}>{lex.productionVerb} TAMAM</Code>
            <div
              style={{
                fontFamily: ND.display,
                fontSize: 12,
                color: ND.text,
                marginTop: 2,
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              ×4 {race.units[1]?.n ?? race.units[0].n}
            </div>
            <div style={{ marginTop: 6 }}>
              <Bar value={100} color={race.primary} height={2} />
            </div>
          </Panel>

          {/* quick actions mid-right — each race's keys route via the
            * QUICK_ACTION_ROUTES table at the top of the file. Unknown keys
            * are no-ops; add them to the table when new actions land. */}
          <div style={{ position: 'absolute', right: 10, top: '32%' }}>
            <RaceQuickActions
              race={race}
              onAction={(key) => {
                const route = QUICK_ACTION_ROUTES[key];
                if (route) router.push(route);
              }}
            />
          </div>

          {/* selected building card bottom */}
          <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
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
                    {/* When the player owns this slot, replace the static
                     *  KİLİTLİ/AKTİF chip with the live status from
                     *  /api/buildings (constructing / active / destroyed).
                     *  Includes the real level so "Lv N" is visible. */}
                    <Chip
                      color={
                        focusedBuilding.locked
                          ? ND.textMute
                          : focusedLiveBuilding?.status === 'constructing'
                            ? ND.warn
                            : race.primary
                      }
                    >
                      {focusedBuilding.locked
                        ? 'KİLİTLİ'
                        : focusedLiveBuilding
                          ? focusedLiveBuilding.status === 'constructing'
                            ? 'İNŞA EDİLİYOR'
                            : `AKTİF · Lv ${focusedLiveBuilding.level}`
                          : 'YAPILMAMIŞ'}
                    </Chip>
                  </div>
                  <Caption style={{ fontSize: 11, marginTop: 2 }}>
                    {focusedBuilding.locked ? focusedBuilding.t : race.capitalDescription}
                  </Caption>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {/* İnşa Et → catalog (full build list, pre-focused). */}
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
                    {/* DETAY → single-building detail page (image, stats,
                     *  tabs, upgrade actions). Falls back to /base/build
                     *  when the slot has no slug (locked / placeholder). */}
                    <Link
                      href={
                        focusedBuilding.slug
                          ? `/base/building/${focusedBuilding.slug}`
                          : '/base/build'
                      }
                      style={{ textDecoration: 'none' }}
                    >
                      <NDButton race={race} variant="ghost" size="sm">
                        DETAY
                      </NDButton>
                    </Link>
                  </div>
                </div>
              </div>
              {/* Building selector strip — bottom of card */}
              <BuildingSelector
                race={race}
                focusedIdx={focusedIdx}
                onSelect={setFocusedIdx}
              />
            </Panel>
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

interface BuildingSelectorProps {
  race: NDRace;
  focusedIdx: number;
  onSelect: (idx: number) => void;
}

function BuildingSelector({ race, focusedIdx, onSelect }: BuildingSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Yapı seçici"
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
