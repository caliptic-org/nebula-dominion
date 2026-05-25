'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BaseField,
  BottomNav,
  Caption,
  Chip,
  Code,
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
import Image from 'next/image';
import { useNDRace } from '@/components/handoff/useNDRace';
import type { NDRace } from '@/components/handoff/nd-tokens';
import { useBuildingTypes, type BuildingTypeDto } from '@/hooks/useBuildingTypes';
import { useBaseState } from '@/hooks/useBaseState';
import { useHudState } from '@/hooks/useHudState';
import { refreshGameResources } from '@/hooks/useGameResources';
import { gameServerApi } from '@/lib/game-server-api';
import { FetchError } from '@/lib/api';
import { toast } from '@/components/handoff/Toaster';
import { hasSession } from '@/lib/session';

interface BuildEntry {
  name: string;
  desc: string;
  locked: boolean;
  costA: number;
  costB: number;
  durationSec: number;
  level: number;
  /** Backend type code (COMMAND_CENTER, MINERAL_EXTRACTOR…) when matched. */
  backendType?: string;
  /** Path to the 512×512 building art generated via scripts/comfy-gen.js.
   * Empty when the slug from RACES tokens doesn't have a rendered asset. */
  assetPath?: string;
}

const BOTTOM_NAV_ROUTES: Record<string, string> = {
  base: '/base',
  galaxy: '/map',
  cmd: '/commanders',
  story: '/story-gallery',
  more: '/settings',
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
  const lex = raceLex(race.key);
  const params = useSearchParams();
  const focusSlug = params.get('focus');
  const hud = useHudState();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  // Live tier progress — same pipe /base uses. Drives the catalog tier level
  // (HUD now sources from useHudState above). Falls back to mock when there's
  // no JWT or the API errors.
  const { data: live } = useBaseState();
  const liveLevel = live?.tier?.currentLevel;

  // Live backend config: cost / build time / max-per-player numbers from
  // game-server's BUILDING_CONFIGS. Used to overlay real values on the
  // race-flavoured slots; if the fetch fails we keep the mock numbers.
  const { types: backendTypes } = useBuildingTypes();
  const catalog = useMemo<BuildEntry[]>(
    () => buildCatalog(race, backendTypes, liveLevel ?? null),
    [race, backendTypes, liveLevel],
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

  const [busy, setBusy] = useState(false);
  async function handleStartBuild() {
    if (!selected || busy) return;
    if (selected.locked) {
      toast.error('Bu yapı henüz kilitli');
      return;
    }
    if (!hasSession()) {
      toast.error('Giriş yapmadan inşaat başlatılamaz');
      return;
    }
    const type = selected.backendType;
    if (!type) {
      // The race-flavoured catalog has 6 slots but the backend type table
      // exposes 16 generic types; if the matched slot lacks a backendType,
      // we can't safely fire POST /buildings. Fall back to a clear toast
      // until the slug↔type mapping is added (gap #75).
      toast.info(`${selected.name} için arka uç eşlemesi yok — yakında`);
      return;
    }
    setBusy(true);
    try {
      // Pick a random unoccupied-ish tile. Without the live `buildings`
      // roster we can't truly check occupation, but the 8×8 grid the
      // backend uses gives plenty of room for the first few placements.
      const positionX = Math.floor(Math.random() * 8);
      const positionY = Math.floor(Math.random() * 8);
      await gameServerApi.post('/buildings', { type, positionX, positionY });
      toast.success(`${selected.name} inşaatı başlatıldı (${selected.durationSec}s)`);
      // Wallet just got debited server-side — broadcast so every mounted
      // useGameResources (HUD pill, /base summary, etc.) repolls instead
      // of waiting for the 5s poll tick.
      refreshGameResources();
    } catch (err) {
      const message =
        err instanceof FetchError
          ? `İnşaat reddedildi: ${err.message}`
          : err instanceof Error
          ? err.message
          : 'Bilinmeyen hata';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-race={race.key} style={{ position: 'relative', minHeight: '100dvh' }}>
      <Screen race={race} dim={0.55} style={{ minHeight: '100dvh' }}>
        <HUD
          race={race}
          level={hud.level}
          levelName={hud.levelName}
          resA={hud.resA}
          resB={hud.resB}
          crystal={hud.crystal}
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
                    setSelectedName(entry.name);
                    // Card tap routes to the detail page — quicker than
                    // selecting and then hitting "İnşa Et" again.
                    const slug = race.buildings.find((b) => b.n === entry.name)?.slug;
                    if (slug) router.push(`/base/building/${slug}`);
                  }}
                />
              ))}
            </div>
            {visibleCatalog.length === 0 && (
              <Caption style={{ textAlign: 'center', padding: 16 }}>
                Bu filtrede kayıt yok.
              </Caption>
            )}

            {/* CTAs */}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              {/* Reset filter — jumps back to "Tümü" tab when the player
               *  drilled into a sub-category and wants to see everything
               *  again. Replaces the old "Filtre yakında" stub button that
               *  duplicated functionality already provided by RaceTabs above. */}
              <NDButton
                race={race}
                variant="ghost"
                size="md"
                style={{ flex: 1 }}
                disabled={activeTab === 0}
                onClick={() => setActiveTab(0)}
              >
                TÜMÜ
              </NDButton>
              <NDButton
                race={race}
                size="md"
                style={{ flex: 2 }}
                disabled={(selected?.locked ?? false) || busy}
                onClick={handleStartBuild}
              >
                {busy
                  ? 'GÖNDERİLİYOR…'
                  : selected
                    ? `${lex.actionVerb} BAŞLAT · ${selected.name}`
                    : `${lex.actionVerb} BAŞLAT`}
              </NDButton>
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
  // Asset placeholder: many of the 30 ComfyUI building renders take ~5 min
  // each, so during a fresh sweep some PNGs won't exist yet on disk. Track
  // image-load failures locally and fall back to the original SVG silhouette
  // so the card never shows a broken placeholder. Resets when the slug
  // (asset path) changes — useful when sweep finishes and user reloads.
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => { setImgFailed(false); }, [entry.assetPath]);
  const showImage = !!entry.assetPath && !imgFailed;

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
            <Chip>KİLİT</Chip>
          ) : entry.level > 0 ? (
            <Chip color={race.primary}>Lv {entry.level}</Chip>
          ) : (
            // No backend-known level for this slot yet → don't lie with "Lv 0".
            // Player can build/upgrade from here; the chip says so plainly.
            <Chip>YENİ</Chip>
          )}
        </div>

        <Caption style={{ fontSize: 10, marginTop: 2 }}>{entry.desc}</Caption>

        <div
          style={{
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: ND.mono,
            fontSize: 10,
            color: race.primary,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <ResIcon kind={race.resourceA.icon} size={11} color={race.primary} />
            {entry.costA}
          </span>
          <span aria-hidden style={{ color: ND.textMute }}>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <ResIcon kind={race.resourceB.icon} size={11} color={race.primary} />
            {entry.costB}
          </span>
        </div>
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
 * numbers with real data for the slot's mapped type. */
function buildCatalog(
  race: NDRace,
  backendTypes: BuildingTypeDto[],
  liveTierLevel: number | null,
): BuildEntry[] {
  // Index the backend table by type code so we can look up by mapped slug.
  const byType = new Map<string, BuildingTypeDto>();
  backendTypes.forEach((t) => byType.set(t.type, t));

  return race.buildings.map((b, i) => {
    const mappedType = b.slug ? SLUG_TO_BACKEND_TYPE[b.slug] : undefined;
    const backend = mappedType ? byType.get(mappedType) : undefined;
    const base = (i + 1) * 220;
    return {
      name: b.n,
      desc: b.t,
      locked: b.locked,
      costA: backend?.cost.mineral ?? base,
      costB: backend?.cost.gas ?? Math.round(base * 0.35),
      durationSec: backend?.buildTimeSeconds ?? 90 + i * 60,
      // i === 0 is the race's capital (headquarters). Tying its visible
      // level to the player's tier level matches what /base's HUD shows
      // and gives the screen one trustworthy number until per-building
      // levels land server-side.
      level: b.locked ? 0 : i === 0 ? liveTierLevel ?? 1 : 0,
      backendType: mappedType ?? backend?.type,
      assetPath: b.slug ? `/assets/buildings/${race.key}/${b.slug}.png` : undefined,
    };
  });
}
