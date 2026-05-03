'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { useProgression } from '@/hooks/useProgression';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { STRUCTURE_ASSETS } from '@/lib/assets';
import { BottomNav } from '@/components/ui/BottomNav';
import { MangaPanel } from '@/components/ui/MangaPanel';
import { LevelUpModal } from '@/components/progression/LevelUpModal';
import { UnlockNotification } from '@/components/progression/UnlockNotification';
import { OnboardingFirstSession } from '@/components/hud/OnboardingFirstSession';
import { NextSessionHookBanner } from '@/components/hud/NextSessionHookBanner';
import { LevelUpPayload, ContentUnlock } from '@/types/progression';
import clsx from 'clsx';

const IsometricTilemap = dynamic(
  () => import('@/components/game/IsometricTilemap').then(m => m.IsometricTilemap),
  { ssr: false, loading: () => (
    <div className="w-full h-[400px] rounded-lg animate-pulse flex items-center justify-center"
         style={{ background: 'rgba(13,17,23,0.8)' }}>
      <span className="font-display text-xs text-text-muted uppercase tracking-widest">Harita Yükleniyor…</span>
    </div>
  )}
);

// TODO(auth): replace DEMO_USER_ID with the authenticated session's userId.
// The /battle route should also resolve the user from session/cookie rather
// than receiving it via query string (avoids leaking IDs to logs / referrers).
const DEMO_USER_ID = 'demo-player-001';

const STRUCTURES_ON_MAP = [
  { col: 3, row: 2, structureKey: 'kovan_kalbi' as keyof typeof STRUCTURE_ASSETS },
  { col: 7, row: 4, structureKey: 'yutucu_yildiz_akademisi' as keyof typeof STRUCTURE_ASSETS },
  { col: 5, row: 7, structureKey: 'sonsuzluk_cekirdegi' as keyof typeof STRUCTURE_ASSETS },
  { col: 11, row: 3, structureKey: 'atalar_magarasi' as keyof typeof STRUCTURE_ASSETS },
];

const RESOURCES = [
  { icon: '💎', label: 'Mineral', value: 2400, color: '#4a9eff' },
  { icon: '⚗️', label: 'Gas', value: 840, color: '#44ff88' },
  { icon: '⚡', label: 'Enerji', value: 1200, color: '#ffc832' },
  { icon: '👥', label: 'Nüfus', value: '12/50', color: '#cc00ff' },
];

type Tab = 'base' | 'map' | 'commanders' | 'shop';
type NavTabId = Tab | 'battle';

const TABS: { id: NavTabId; icon: string; label: string }[] = [
  { id: 'base', icon: '🏰', label: 'Ana Üs' },
  { id: 'map', icon: '🌌', label: 'Harita' },
  { id: 'battle', icon: '⚔️', label: 'Savaş' },
  { id: 'commanders', icon: '🤝', label: 'Komutanlar' },
  { id: 'shop', icon: '💎', label: 'Mağaza' },
];

export default function HomePage() {
  const router = useRouter();
  const { race, setRace, raceColor, raceGlow } = useRaceTheme();
  const [activeTab, setActiveTab] = useState<Tab>('base');
  const [pendingLevelUp, setPendingLevelUp] = useState<LevelUpPayload | null>(null);
  const [pendingUnlocks, setPendingUnlocks] = useState<ContentUnlock[]>([]);
  const [selectedTile, setSelectedTile] = useState<{ col: number; row: number } | null>(null);
  const [avatarImgError, setAvatarImgError] = useState(false);
  const [portraitImgError, setPortraitImgError] = useState(false);

  const { progress, loading } = useProgression({
    userId: DEMO_USER_ID,
    onLevelUp: (payload) => {
      setPendingLevelUp(payload);
      if (payload.newUnlocks.length) setPendingUnlocks(payload.newUnlocks);
    },
  });

  const {
    hydrated: onboardingHydrated,
    isFirstSession,
    shouldShowNextSessionHook,
    markIntroSeen,
  } = useOnboarding();
  // The cinematic Onboarding overlay only renders for brand-new players who
  // haven't yet finished their tutorial battle. We gate on `hydrated` to
  // avoid flashing it during SSR or before localStorage has been read.
  const showOnboardingOverlay = onboardingHydrated && isFirstSession;

  const raceDesc = RACE_DESCRIPTIONS[race];
  const primaryCommander = raceDesc.commanders[0];
  const tutorialBattleHref = `/battle?race=${race}&mode=pve&tutorial=1`;
  const battleHref =
    onboardingHydrated && !shouldShowNextSessionHook
      ? tutorialBattleHref
      : `/battle?race=${race}&mode=pve`;

  return (
    <>
      <UnlockNotification newUnlocks={pendingUnlocks} />
      {pendingLevelUp && (
        <LevelUpModal
          payload={pendingLevelUp}
          onClose={() => { setPendingLevelUp(null); setPendingUnlocks([]); }}
        />
      )}
      {showOnboardingOverlay && (
        <OnboardingFirstSession
          onSkip={markIntroSeen}
          battleHref={tutorialBattleHref}
        />
      )}

      <div
        className="min-h-[100dvh] flex flex-col relative"
        style={{ background: 'var(--color-bg)' }}
      >
        {/* Nebula background */}
        <div
          className="fixed inset-0 pointer-events-none transition-all duration-700"
          style={{ background: 'var(--gradient-nebula)', zIndex: 0 }}
          aria-hidden
        />
        {/* Halftone */}
        <div className="fixed inset-0 halftone-bg pointer-events-none opacity-15" aria-hidden />

        {/* Next-session hook — only shown after a player has finished onboarding. */}
        {shouldShowNextSessionHook && <NextSessionHookBanner />}

        {/* ── Resource Bar (Top) ────────────────────────────── */}
        <header
          className="relative z-40 sticky top-0"
          style={{
            background: 'rgba(8,10,16,0.9)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex items-center justify-between px-3 py-2 gap-2">
            {/* Logo */}
            <span
              className="font-display text-[10px] font-black tracking-[0.2em] uppercase shrink-0 hidden sm:block"
              style={{ color: raceColor }}
            >
              ◆ NEBULA
            </span>

            {/* Resources */}
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap overflow-x-auto">
              {RESOURCES.map((r) => (
                <div key={r.label} className="resource-bar shrink-0" title={r.label}>
                  <span aria-hidden>{r.icon}</span>
                  <span style={{ color: r.color }}>
                    {typeof r.value === 'number' ? r.value.toLocaleString('tr-TR') : r.value}
                  </span>
                </div>
              ))}
              {/* XP bar */}
              {progress && (
                <div className="resource-bar shrink-0 gap-2">
                  <span aria-hidden>✨</span>
                  <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progress.xpProgressPercent}%`,
                        background: raceColor,
                      }}
                    />
                  </div>
                  <span className="text-text-muted text-[10px]">Lv.{progress.level}</span>
                </div>
              )}
            </div>

            {/* Commander mini avatar */}
            <button
              className="shrink-0 w-9 h-9 rounded-full border-2 overflow-hidden transition-all duration-300 hover:scale-110"
              style={{ borderColor: raceColor, boxShadow: `0 0 10px ${raceGlow}` }}
              title={primaryCommander.name}
            >
              {!avatarImgError ? (
                <Image
                  src={primaryCommander.portrait}
                  alt={primaryCommander.name}
                  width={36}
                  height={36}
                  className="w-full h-full object-cover object-top"
                  onError={() => setAvatarImgError(true)}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-sm"
                  style={{ background: raceDesc.bgColor, color: raceColor }}
                >
                  {raceDesc.icon}
                </div>
              )}
            </button>
          </div>
        </header>

        {/* ── Main Content ──────────────────────────────────── */}
        <main className="relative z-10 flex-1 overflow-auto pb-24">

          {/* ── Base Tab ──────────────────────────────────────── */}
          {/* Kept mounted (hidden when inactive) so the IsometricTilemap canvas
              survives tab switches without remount + re-init + image reload. */}
          <div
            className={clsx('flex-col lg:flex-row gap-4 p-4 h-full', activeTab === 'base' ? 'flex' : 'hidden')}
            aria-hidden={activeTab !== 'base'}
          >

              {/* Left: Tilemap */}
              <div className="flex-1 flex flex-col gap-4 min-w-0">
                {/* Tilemap header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge badge-race">Ana Üs</span>
                    </div>
                    <h2 className="font-display text-lg font-black text-text-primary">
                      {raceDesc.name} <span style={{ color: raceColor }}>İmparatorluğu</span>
                    </h2>
                  </div>
                  {selectedTile && (
                    <span
                      className="font-display text-[10px] uppercase tracking-widest px-3 py-1 rounded-full"
                      style={{ background: raceDesc.bgColor, color: raceColor, border: `1px solid ${raceColor}30` }}
                    >
                      [{selectedTile.col}, {selectedTile.row}] seçili
                    </span>
                  )}
                </div>

                {/* Isometric Tilemap */}
                <MangaPanel className="overflow-hidden rounded-lg">
                  <IsometricTilemap
                    race={race}
                    structures={STRUCTURES_ON_MAP}
                    onTileSelect={(col, row) => setSelectedTile({ col, row })}
                  />
                </MangaPanel>

                {/* Left production stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Mineral/dk', value: '+120', color: '#4a9eff' },
                    { label: 'Gas/dk', value: '+45', color: '#44ff88' },
                    { label: 'Enerji/dk', value: '+80', color: '#ffc832' },
                    { label: 'Yapı', value: `${STRUCTURES_ON_MAP.length}/12`, color: raceColor },
                  ].map((s) => (
                    <MangaPanel key={s.label} className="p-3">
                      <div className="font-display text-[9px] uppercase tracking-widest text-text-muted mb-1">{s.label}</div>
                      <div className="font-display text-lg font-black" style={{ color: s.color }}>{s.value}</div>
                    </MangaPanel>
                  ))}
                </div>
              </div>

              {/* Right: Commander Card + Structures */}
              <div className="lg:w-72 shrink-0 flex flex-col gap-4">
                {/* Commander card */}
                <MangaPanel className="overflow-hidden" glow>
                  <div className="relative h-52 overflow-hidden">
                    {!portraitImgError ? (
                      <Image
                        src={primaryCommander.portrait}
                        alt={primaryCommander.name}
                        fill
                        className="object-cover object-top"
                        onError={() => setPortraitImgError(true)}
                        style={{ filter: `drop-shadow(0 4px 12px ${raceGlow})` }}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-6xl"
                        style={{ background: raceDesc.bgColor }}
                      >
                        {raceDesc.icon}
                      </div>
                    )}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to top, ${raceDesc.bgColor.replace('0.08', '0.9')} 0%, transparent 50%)`,
                      }}
                    />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div
                        className="font-display text-base font-black"
                        style={{ color: raceColor, textShadow: `0 0 12px ${raceGlow}` }}
                      >
                        {primaryCommander.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="badge text-[9px]"
                          style={{ background: raceDesc.bgColor, color: raceColor, border: `1px solid ${raceColor}40` }}
                        >
                          Lv.{primaryCommander.level}
                        </span>
                        <span className="text-text-muted text-[10px]">{raceDesc.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="font-display text-[9px] uppercase tracking-widest text-text-muted mb-2">Yetenekler</div>
                    <div className="flex flex-wrap gap-1.5">
                      {primaryCommander.abilities.map((ab) => (
                        <span
                          key={ab}
                          className="px-2 py-0.5 rounded text-[10px] font-display"
                          style={{ background: `${raceColor}12`, color: raceColor, border: `1px solid ${raceColor}25` }}
                        >
                          {ab}
                        </span>
                      ))}
                    </div>
                  </div>
                </MangaPanel>

                {/* Active structures list */}
                <MangaPanel className="p-4">
                  <div className="font-display text-[9px] uppercase tracking-widest text-text-muted mb-3">
                    Aktif Yapılar
                  </div>
                  <div className="space-y-2">
                    {raceDesc.structures.map((sk) => {
                      const structureKey = sk as keyof typeof STRUCTURE_ASSETS;
                      return (
                        <div
                          key={sk}
                          className="flex items-center gap-3 p-2 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          <div
                            className="relative w-10 h-10 rounded overflow-hidden shrink-0"
                            style={{ background: raceDesc.bgColor }}
                          >
                            <Image
                              src={STRUCTURE_ASSETS[structureKey]}
                              alt={sk}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-display text-xs font-bold text-text-primary capitalize">
                              {sk.replace(/_/g, ' ')}
                            </div>
                            <div className="text-text-muted text-[10px]">Seviye 1</div>
                          </div>
                          <div
                            className="ml-auto w-2 h-2 rounded-full animate-pulse"
                            style={{ background: raceColor }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </MangaPanel>

                {/* Race switcher */}
                <MangaPanel className="p-4">
                  <div className="font-display text-[9px] uppercase tracking-widest text-text-muted mb-3">
                    Irk Değiştir
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.values(Race) as Race[]).map((r) => {
                      const d = RACE_DESCRIPTIONS[r];
                      const active = r === race;
                      return (
                        <button
                          key={r}
                          onClick={() => setRace(r)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-display font-bold transition-all duration-200"
                          style={{
                            background: active ? d.bgColor : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${active ? d.color : 'rgba(255,255,255,0.08)'}`,
                            color: active ? d.color : '#555',
                          }}
                        >
                          {d.icon} {d.name}
                        </button>
                      );
                    })}
                  </div>
                </MangaPanel>
              </div>
            </div>

          {/* ── Map Tab ───────────────────────────────────────── */}
          <div className={clsx('p-4', activeTab === 'map' ? 'block' : 'hidden')} aria-hidden={activeTab !== 'map'}>
              <div className="flex items-center gap-2 mb-4">
                <span className="badge badge-race">Galaksi Haritası</span>
                <h2 className="font-display text-lg font-black text-text-primary">
                  Nebula <span style={{ color: raceColor }}>Sektörü</span>
                </h2>
              </div>
              <MangaPanel className="overflow-hidden rounded-lg">
                <IsometricTilemap
                  race={race}
                  structures={STRUCTURES_ON_MAP}
                  onTileSelect={(col, row) => setSelectedTile({ col, row })}
                />
              </MangaPanel>
            </div>

          {/* ── Commanders Tab ────────────────────────────────── */}
          {activeTab === 'commanders' && (
            <div className="p-4">
              <a href="/commanders" className="font-display text-text-muted text-xs uppercase tracking-widest hover:text-text-primary transition-colors">
                Tüm Komutanlar →
              </a>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {raceDesc.commanders.map((cmd) => (
                  <div
                    key={cmd.id}
                    className={clsx(
                      'commander-card overflow-hidden',
                      !cmd.isUnlocked && 'locked',
                    )}
                  >
                    <div className="relative h-36 overflow-hidden">
                      <Image
                        src={cmd.portrait}
                        alt={cmd.name}
                        fill
                        className="object-cover object-top"
                      />
                      <div
                        className="absolute inset-0"
                        style={{ background: `linear-gradient(to top, ${raceDesc.bgColor.replace('0.08', '0.8')} 0%, transparent 50%)` }}
                      />
                      {!cmd.isUnlocked && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-2xl">🔒</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="font-display text-xs font-bold" style={{ color: raceColor }}>{cmd.name}</div>
                      <div className="text-text-muted text-[10px]">Lv.{cmd.level}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Shop Tab ──────────────────────────────────────── */}
          {activeTab === 'shop' && (
            <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="text-6xl mb-4 animate-float">💎</div>
              <div className="mb-3"><span className="badge badge-race">Premium Mağaza</span></div>
              <h2 className="font-display text-2xl font-black text-text-primary mb-2">Yakında</h2>
              <p className="text-text-muted text-sm">Kozmetik item&apos;lar ve premium içerikler geliyor.</p>
            </div>
          )}
        </main>

        {/* ── Bottom Navigation ─────────────────────────────── */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-3"
          style={{
            background: 'rgba(8,10,16,0.96)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(24px)',
          }}
        >
          {TABS.map((tab) => {
            const active = tab.id !== 'battle' && activeTab === tab.id;
            const handleClick = () => {
              if (tab.id === 'battle') {
                router.push(battleHref);
              } else {
                setActiveTab(tab.id);
              }
            };
            return (
              <button
                key={tab.id}
                onClick={handleClick}
                className={clsx(
                  'bottom-nav-item transition-all duration-300',
                  active && 'active',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span className="text-lg leading-none" aria-hidden>{tab.icon}</span>
                <span className="font-display text-[9px] uppercase tracking-wide">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
