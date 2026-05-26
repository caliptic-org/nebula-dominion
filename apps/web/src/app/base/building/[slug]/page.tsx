'use client';

/**
 * /base/building/[slug] — Single-building detail page
 *
 * Reached from /base's DETAY button (per-slot deep-link) or any place
 * that wants to surface a building's portrait + level + cost + actions
 * without scrolling through the whole /base/build catalog.
 *
 * Layout (top → bottom):
 *   ← back / header (race-tinted bar)
 *   HUD (live wallet + tier)
 *   Hero image (PNG sprite, large)
 *   Stat strip (level, status, build-time, cap)
 *   Tabs: Genel · Yetenekler · Yükselt
 *   CTAs: İnşa Et · Eğit · Yükselt
 *
 * Backend wiring:
 *   - useGameBuildings → live owned-instance (level + status)
 *   - useGameResources → wallet for cost-affordability check
 *   - POST /buildings (game-server) → start construction
 *   - Other actions toast until their endpoints land.
 */

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Bar,
  Caption,
  Chip,
  Code,
  DetailLayout,
  Eyebrow,
  H2,
  HUD,
  ND,
  NDButton,
  Panel,
  ResIcon,
  ScreenFooter,
  ScreenHeader,
  Sigil,
  toast,
  useNDRace,
  raceLex,
} from '@/components/handoff';
import { useBaseState } from '@/hooks/useBaseState';
import { formatResource, useGameResources, refreshGameResources } from '@/hooks/useGameResources';
import { useGameBuildings, indexBuildingsByType } from '@/hooks/useGameBuildings';
import { useBuildingTypes } from '@/hooks/useBuildingTypes';
import { gameServerApi } from '@/lib/game-server-api';
import { FetchError } from '@/lib/api';
import { hasSession } from '@/lib/session';

// Reuses the slug→backendType mapping that /base/build defines. Duplicated
// here for now because /base/build is a client component — extract to a
// shared lib once a third consumer appears.
// Post-migration full 16-type mapping — mirrors /base/build. Aligned
// with migration 1779635000000-AddTsBuildingEnumValues which added the
// 12 TS-only enum values to Postgres.
const SLUG_TO_BACKEND_TYPE: Record<string, string> = {
  komuta_ussu:        'command_center',
  reaktor_modulu:     'solar_plant',
  // gas/Yakıt source for insan — paired with the new slot in nd-tokens.ts
  // so insan players can actually accrue Yakıt instead of staying at 0.
  yakit_rafinerisi:   'gas_refinery',
  kisla:              'barracks',
  bilim_akademisi:    'academy',
  subspace_anteni:    'shield_generator',
  genetik_lab:        'factory',
  kovan_cekirdegi:    'command_center',
  biyokutle_havuzu:   'mineral_extractor',
  mutasyon_cukuru:    'spawning_pool',
  genom_tumsegi:      'hatchery',
  yutucu_tumsek:      'shield_generator',
  subspace_damari:    'gas_refinery',
  sonsuzluk_cekirdegi:'command_center',
  veri_kaynagi:       'solar_plant',
  // gas/Hesap source for otomat — same rationale as yakit_rafinerisi.
  hesap_havuzu:       'gas_refinery',
  montaj_hatti:       'nano_forge',
  mantik_matrisi:     'cyber_core',
  cihaz_hazinesi:     'quantum_reactor',
  subspace_cozucu:    'defense_matrix',
  alfa_tahti:         'command_center',
  av_kampi:           'mineral_extractor',
  vahsi_cukur:        'barracks',
  atalar_sunagi:      'gas_refinery',
  atalar_magarasi:    'shield_generator',
  boyut_yarigi:       'factory',
  karanlik_taht:      'command_center',
  ruh_toplayici:      'gas_refinery',
  lanet_tapinagi:     'barracks',
  pakt_sembolu:       'academy',
  yasak_grimoire:     'shield_generator',
  yarik_kapisi:       'turret',
};

interface PageProps {
  params: { slug: string };
}

function fmt(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return '—';
  return Number(n).toLocaleString();
}

function fmtDuration(sec: number | undefined): string {
  if (!sec || !Number.isFinite(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}dk`;
  return `${m}dk ${s}s`;
}

function Inner({ slug }: { slug: string }) {
  const race = useNDRace();
  const lex = raceLex(race.key);
  const router = useRouter();
  const t = useTranslations('build');

  // ALL hooks must run on every render — moving the early-return below
  // them avoids a "Rendered fewer hooks than expected" crash when the
  // slug doesn't match any of the player's race slots (deep-link from a
  // stale URL, race switched mid-session, or a different race's slug
  // pasted in the address bar).  The redirect happens in a useEffect
  // after all hooks resolve so React's order is stable.
  const slotIndex = useMemo(
    () => race.buildings.findIndex((b) => b.slug === slug),
    [race, slug],
  );
  const tokenBuilding = slotIndex >= 0 ? race.buildings[slotIndex] : null;

  const { data: live } = useBaseState();
  const liveLevel = live?.tier?.currentLevel;
  const liveTierName = live?.tier?.raceSpecificTierName ?? live?.tier?.currentTierName;

  const { data: resources } = useGameResources();
  const resA = resources ? formatResource(resources.mineral) : '12,480';
  const resB = resources ? formatResource(resources.gas) : '3,210';
  const resCrystal = resources ? formatResource(resources.energy) : '42';

  const { types: backendTypes } = useBuildingTypes();
  const backendType = SLUG_TO_BACKEND_TYPE[slug];
  const backendCfg = backendTypes.find((t) => t.type === backendType);

  const { data: liveBuildings } = useGameBuildings();
  const ownedList = liveBuildings && backendType
    ? indexBuildingsByType(liveBuildings).get(backendType) ?? []
    : [];
  const owned = ownedList[0] ?? null;

  const costA = backendCfg?.cost.mineral ?? Math.max(slotIndex + 1, 1) * 220;
  const costB = backendCfg?.cost.gas ?? Math.round(Math.max(slotIndex + 1, 1) * 220 * 0.35);
  const buildSec = backendCfg?.buildTimeSeconds ?? 90 + Math.max(slotIndex, 0) * 60;
  const maxPerPlayer = backendCfg?.maxPerPlayer ?? 1;
  const canAfford =
    !!resources && resources.mineral >= costA && resources.gas >= costB;

  const [activeTab, setActiveTab] = useState<'genel' | 'yetenekler' | 'yukselt'>('genel');
  const [busy, setBusy] = useState(false);
  // Tracks the building currently being upgraded so the button can disable
  // mid-flight without a separate global busy flag — multiple buildings
  // wouldn't collide here today, but the per-id pattern keeps future
  // bulk-upgrade flows from disabling unrelated buttons.
  const [upgradingId, setUpgradingId] = useState<string | null>(null);

  // Recovery redirect for stale/invalid slugs — runs AFTER all hooks so
  // React's hook order stays stable across renders.  Renders null in the
  // meantime so we don't try to deref tokenBuilding below.
  if (!tokenBuilding) {
    if (typeof window !== 'undefined') {
      // Schedule the redirect for the next tick so the render commits
      // cleanly first — calling router.replace synchronously during
      // render emits a Next warning.
      Promise.resolve().then(() => router.replace('/base/build'));
    }
    return null;
  }

  async function handleBuild() {
    if (busy || tokenBuilding?.locked) return;
    if (!hasSession()) {
      toast.error(t('toastLoginRequired'));
      return;
    }
    if (!backendType) {
      toast.info(t('toastNoMapping', { name: tokenBuilding?.n ?? slug }));
      return;
    }
    setBusy(true);
    try {
      const positionX = Math.floor(Math.random() * 8);
      const positionY = Math.floor(Math.random() * 8);
      await gameServerApi.post('/buildings', { type: backendType, positionX, positionY });
      toast.success(t('toastStarted', { name: tokenBuilding?.n ?? slug, duration: buildSec }));
    } catch (err) {
      const msg = err instanceof FetchError ? err.message : t('toastUnknownError');
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const assetPath = `/assets/buildings/${race.key}/${slug}.png`;

  const statusChip = tokenBuilding.locked
    ? 'KİLİTLİ'
    : owned
      ? owned.status === 'constructing'
        ? 'İNŞA EDİLİYOR'
        : `AKTİF · Lv ${owned.level}`
      : 'YAPILMAMIŞ';

  return (
    <DetailLayout
      race={race}
      bgDim={0.5}
      mainStyle={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 14px' }}
      header={
        <>
          <HUD
            race={race}
            level={liveLevel ?? 9}
            levelName={liveTierName ?? 'Metropol'}
            resA={resA}
            resB={resB}
            crystal={resCrystal}
            science={resources ? formatResource(resources.science) : undefined}
          />
          <ScreenHeader
            onBack={() => router.push('/base')}
            backLabel="Ana Üs"
            eyebrow={lex.catalogName}
            title={tokenBuilding.n}
            right={
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Sigil race={race} size={16} />
                <Code style={{ color: race.primary }}>SLOT {slotIndex + 1}/6</Code>
              </div>
            }
          />
        </>
      }
      footer={
        <ScreenFooter>
          <Link href="/base/production" style={{ textDecoration: 'none' }}>
            <NDButton race={race} variant="ghost" size="md">EĞİT</NDButton>
          </Link>
          <NDButton
            race={race}
            size="md"
            full
            disabled={(tokenBuilding.locked ?? false) || busy}
            onClick={handleBuild}
          >
            {busy
              ? 'GÖNDERİLİYOR…'
              : owned
                ? `${lex.actionVerb} BAŞLAT · Lv ${owned.level + 1}`
                : `${lex.actionVerb} BAŞLAT`}
          </NDButton>
        </ScreenFooter>
      }
    >
      {/* Scrollable body */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Hero image + identity */}
          <Panel race={race} glow style={{ padding: 14, display: 'flex', gap: 14 }}>
            <div
              aria-hidden
              style={{
                width: 140,
                height: 140,
                flexShrink: 0,
                position: 'relative',
                background: `linear-gradient(180deg, ${race.primary}1a, transparent)`,
                border: `1px dashed ${race.primary}55`,
                overflow: 'hidden',
              }}
            >
              <Image
                src={assetPath}
                alt={tokenBuilding.n}
                fill
                sizes="140px"
                style={{
                  objectFit: 'contain',
                  filter: tokenBuilding.locked ? 'grayscale(0.7)' : undefined,
                }}
                priority
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Eyebrow color={race.primary}>{lex.catalogName}</Eyebrow>
              <H2 style={{ marginTop: 4, color: ND.text }}>{tokenBuilding.n}</H2>
              <Caption style={{ marginTop: 6 }}>{tokenBuilding.t}</Caption>
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <Chip
                  color={
                    tokenBuilding.locked
                      ? ND.textMute
                      : owned?.status === 'constructing'
                        ? ND.warn
                        : race.primary
                  }
                >
                  {statusChip}
                </Chip>
                {backendType && <Chip color={ND.textDim}>{backendType}</Chip>}
                <Chip color={ND.textDim}>SLOT {slotIndex + 1}/6</Chip>
              </div>
            </div>
          </Panel>

          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <StatTile label="MALİYET MIN" value={fmt(costA)} accent={race.primary} icon={<ResIcon kind={race.resourceA.icon} size={12} color={race.primary} />} />
            <StatTile label="MALİYET GAS" value={fmt(costB)} accent={race.primary} icon={<ResIcon kind={race.resourceB.icon} size={12} color={race.primary} />} />
            <StatTile label="SÜRE"        value={fmtDuration(buildSec)} accent={ND.text} />
            <StatTile label="MAX"         value={`${ownedList.length}/${maxPerPlayer}`} accent={ND.textDim} />
          </div>

          {/* Tabs */}
          <div role="tablist" style={{ display: 'flex', gap: 6 }}>
            {(['genel', 'yetenekler', 'yukselt'] as const).map((t) => {
              const on = activeTab === t;
              const label = t === 'genel' ? 'Genel' : t === 'yetenekler' ? 'Yetenekler' : 'Yükselt';
              return (
                <button
                  key={t}
                  role="tab"
                  aria-selected={on}
                  type="button"
                  onClick={() => setActiveTab(t)}
                  style={{
                    all: 'unset',
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 6px',
                    fontFamily: ND.display,
                    fontSize: 10,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    background: on
                      ? `linear-gradient(180deg, ${race.primary}28, ${race.primary}10)`
                      : 'transparent',
                    border: `1px solid ${on ? race.primary : ND.border}`,
                    color: on ? race.primary : ND.textDim,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {activeTab === 'genel' && (
            <Panel race={race} style={{ padding: 12 }}>
              <Eyebrow color={race.primary}>GENEL BAKIŞ</Eyebrow>
              <Caption style={{ marginTop: 8, fontSize: 12, lineHeight: 1.55 }}>
                {tokenBuilding.t}. Bu yapı{' '}
                {backendCfg ? (
                  <>
                    arka uç tarafında <strong style={{ color: race.primary }}>{backendType}</strong>{' '}
                    olarak modellenmiş. Tick başına{' '}
                    <strong style={{ color: ND.ok }}>
                      {backendCfg.production.mineralPerTick} mineral · {backendCfg.production.gasPerTick} gas · {backendCfg.production.energyPerTick} enerji
                    </strong>{' '}
                    üretir, {backendCfg.energyConsumptionPerTick} enerji tüketir.
                  </>
                ) : (
                  <>henüz arka uçta tanımlı değil. Yapımı başlatılırsa stub konfigle çalışır.</>
                )}
              </Caption>
              {owned && (
                <div style={{ marginTop: 12 }}>
                  <Bar
                    value={owned.status === 'active' ? 100 : 65}
                    color={owned.status === 'constructing' ? ND.warn : ND.ok}
                    label={owned.status === 'constructing' ? 'İNŞAAT İLERLEMESİ' : 'OPERASYONEL DURUM'}
                    trailing={owned.status === 'active' ? 'TAM KAPASİTE' : 'DEVAM EDİYOR'}
                  />
                </div>
              )}
            </Panel>
          )}

          {activeTab === 'yetenekler' && (
            <Panel race={race} style={{ padding: 12 }}>
              <Eyebrow color={race.primary}>YETENEKLER</Eyebrow>
              <ul style={{ marginTop: 8, paddingLeft: 18, color: ND.textDim, fontSize: 12, lineHeight: 1.7 }}>
                <li>
                  <strong style={{ color: ND.text }}>Üretim:</strong>{' '}
                  {backendCfg
                    ? `${backendCfg.production.mineralPerTick} min / ${backendCfg.production.gasPerTick} gas / ${backendCfg.production.energyPerTick} enj per tick`
                    : 'pasif'}
                </li>
                <li>
                  <strong style={{ color: ND.text }}>Tüketim:</strong>{' '}
                  {backendCfg ? `${backendCfg.energyConsumptionPerTick} enerji / tick` : '—'}
                </li>
                <li>
                  <strong style={{ color: ND.text }}>Limit:</strong> Oyuncu başı{' '}
                  {maxPerPlayer} adet
                </li>
                <li>
                  <strong style={{ color: ND.text }}>Inşa süresi:</strong> {fmtDuration(buildSec)}
                </li>
              </ul>
              <Caption style={{ marginTop: 10, fontSize: 11 }}>
                Detaylı yetenek ağacı yakında — şu an arka uç konfigi tek seviyelik üretim üzerinden çalışıyor.
              </Caption>
            </Panel>
          )}

          {activeTab === 'yukselt' && (
            <Panel race={race} style={{ padding: 12 }}>
              <Eyebrow color={race.primary}>YÜKSELTME</Eyebrow>
              <Caption style={{ marginTop: 8, fontSize: 12, lineHeight: 1.55 }}>
                {owned
                  ? `Mevcut seviye: ${owned.level}. Sıradaki seviyeyi ${Math.round(costA * Math.pow(1.5, owned.level)).toLocaleString()} ${race.resourceA.name} + ${Math.round(costB * Math.pow(1.5, owned.level)).toLocaleString()} ${race.resourceB.name} ile yükseltebilirsin.`
                  : 'Bu slot henüz inşa edilmemiş. Önce yapımı başlat, sonra seviyeleri buradan görürsün.'}
              </Caption>
              <div style={{ marginTop: 12 }}>
                <NDButton
                  race={race}
                  size="md"
                  full
                  disabled={!owned || tokenBuilding.locked || upgradingId === owned?.id}
                  onClick={async () => {
                    if (!owned) {
                      toast.info(t('toastBuildFirst'));
                      return;
                    }
                    if (!hasSession()) {
                      toast.error(t('toastLoginForUpgrade'));
                      return;
                    }
                    setUpgradingId(owned.id);
                    try {
                      // POST /api/buildings/:id/upgrade — game-server scales
                      // cost 1.5× per existing level and bumps the row.
                      // Production rates are recalculated server-side so
                      // the wallet trickle picks up the new tier within
                      // one tick. Wallet refresh fires immediately so the
                      // HUD pill doesn't lag the visible level bump.
                      await gameServerApi.post(`/buildings/${owned.id}/upgrade`);
                      toast.success(t('toastUpgraded', { name: tokenBuilding.n, level: owned.level + 1 }));
                      refreshGameResources();
                    } catch (err) {
                      const msg =
                        err instanceof FetchError
                          ? err.message
                          : err instanceof Error
                            ? err.message
                            : t('toastUpgradeFailed');
                      toast.error(msg);
                    } finally {
                      setUpgradingId(null);
                    }
                  }}
                >
                  {upgradingId === owned?.id
                    ? t('upgrading')
                    : owned
                      ? t('upgradeToLevel', { level: owned.level + 1 })
                      : t('upgradeLocked')}
                </NDButton>
              </div>
            </Panel>
          )}
      </div>
    </DetailLayout>
  );
}

function StatTile({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'rgba(8,12,26,0.6)',
        border: `1px solid ${ND.border}`,
        padding: '8px 10px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: ND.mono,
          fontSize: 9,
          color: ND.textMute,
          letterSpacing: '0.12em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 3,
          fontFamily: ND.display,
          fontSize: 13,
          color: accent,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {icon}
        {value}
      </div>
    </div>
  );
}

export default function BuildingDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={null}>
      <Inner slug={params.slug} />
    </Suspense>
  );
}
