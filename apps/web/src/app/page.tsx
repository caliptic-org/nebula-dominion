'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { useProgression } from '@/hooks/useProgression';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { STRUCTURE_ASSETS } from '@/lib/assets';
import { BottomNav } from '@/components/ui/BottomNav';
import { MangaPanel } from '@/components/ui/MangaPanel';
import { LevelUpModal } from '@/components/progression/LevelUpModal';
import { UnlockNotification } from '@/components/progression/UnlockNotification';
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

type Tab = 'base' | 'map' | 'battle' | 'commanders' | 'shop';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'base', icon: '🏰', label: 'Ana Üs' },
  { id: 'map', icon: '🌌', label: 'Harita' },
  { id: 'battle', icon: '⚔️', label: 'Savaş' },
  { id: 'commanders', icon: '🤝', label: 'Komutanlar' },
  { id: 'shop', icon: '💎', label: 'Mağaza' },
];

export default function HomePage() {
  const { race, setRace, raceColor, raceGlow } = useRaceTheme();
  const [activeTab, setActiveTab] = useState<Tab>('base');
  const [pendingLevelUp, setPendingLevelUp] = useState<LevelUpPayload | null>(null);
  const [pendingUnlocks, setPendingUnlocks] = useState<ContentUnlock[]>([]);
  const [selectedTile, setSelectedTile] = useState<{ col: number; row: number } | null>(null);
  const [imgError, setImgError] = useState(false);

  const { progress, loading } = useProgression({
    userId: DEMO_USER_ID,
    onLevelUp: (payload) => {
      setPendingLevelUp(payload);
      if (payload.newUnlocks.length) setPendingUnlocks(payload.newUnlocks);
    },
  });

  const raceDesc = RACE_DESCRIPTIONS[race];
  const primaryCommander = raceDesc.commanders[0];

  const handleTileSelect = useCallback((col: number, row: number) => {
    setSelectedTile({ col, row });
  }, []);

  return (
    <>
      <UnlockNotification newUnlocks={pendingUnlocks} />
      {pendingLevelUp && (
        <LevelUpModal
          payload={pendingLevelUp}
          onClose={() => { setPendingLevelUp(null); setPendingUnlocks([]); }}
        />
      )}

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        {/* Title */}
        <h1 style={{ fontSize: 22, marginBottom: 24, color: 'var(--color-energy)' }}>Nebula Dominion</h1>

        {/* Tabs */}
        <div
          className="fixed inset-0 pointer-events-none transition-all duration-700"
          style={{ background: 'var(--gradient-nebula)', zIndex: 0 }}
          aria-hidden
        />
        {/* Halftone */}
        <div className="fixed inset-0 halftone-bg pointer-events-none opacity-15" aria-hidden />

        {/* ── Resource Bar (Top) ────────────────────────────── */}
        <header
          className="relative z-40 sticky top-0"
          style={{
            display: 'flex',
            gap: 4,
            borderBottom: '1px solid var(--color-border)',
            marginBottom: 32,
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 700 : 400,
                color: activeTab === tab.id ? 'var(--color-energy)' : 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab.id ? 'var(--color-energy)' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'color 0.2s, border-color 0.2s',
                marginBottom: -1,
              }}
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
              {!imgError ? (
                <Image
                  src={primaryCommander.portrait}
                  alt={primaryCommander.name}
                  width={36}
                  height={36}
                  className="w-full h-full object-cover object-top"
                  onError={() => setImgError(true)}
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

        {/* ─── Tab: İlerleme ──────────────────────────────────────────────────── */}
        {activeTab === 'progression' && (
          <>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                <p style={{ color: 'var(--color-text-secondary)' }}>Yükleniyor…</p>
              </div>
            )}
            {!loading && !progress && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                <p style={{ color: 'var(--color-danger)' }}>İlerleme yüklenemedi.</p>
              </div>
            )}
            {!loading && progress && (
              <>
                <LevelIndicator progress={progress} />

                <section style={{ marginTop: 32 }}>
                  <h2 style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Açık İçerikler
                  </h2>
                  {progress.unlockedContent.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Henüz içerik açılmadı.</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {progress.unlockedContent.map((unlock) => (
                        <span key={unlock} className="badge badge-energy">
                          {unlock.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                <section style={{ marginTop: 32 }}>
                  <h2 style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                    İstatistikler
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Toplam XP', value: progress.totalXp.toLocaleString('tr-TR') },
                      { label: 'Tier Bonusu', value: `×${progress.tierBonusMultiplier.toFixed(2)}` },
                      { label: 'Yaş', value: `Çağ ${progress.age}` },
                      { label: 'Seviye', value: `${progress.level} / 9` },
                    ].map(({ label, value }) => (
                      <div key={label} className="stat-card">
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
                      </div>
                    ))}
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

        {/* ─── Tab: Birimler ──────────────────────────────────────────────────── */}
        {activeTab === 'units' && (
          <div>
            {/* Race switcher bar */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 24,
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginRight: 8 }}>Irk:</span>
              {(Object.values(Race) as Race[]).map((race) => {
                const desc = RACE_DESCRIPTIONS[race];
                const active = selectedRace === race;
                return (
                  <button
                    key={race}
                    onClick={() => handleRaceSelect(race)}
                    style={{
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: active ? 700 : 400,
                      background: active ? desc.bgColor : 'transparent',
                      border: `1px solid ${active ? desc.color : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 20,
                      color: active ? desc.color : '#666',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {desc.icon} {desc.name}
                  </button>
                );
              })}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-muted)' }}>
                Demo modu • {demoUnits.length} birim
              </span>
            </div>

            {/* Map + Stats Panel */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 240px',
                gap: 20,
                alignItems: 'start',
              }}
            >
              <GameMap
                units={demoUnits}
                selectedUnitId={selectedUnitId}
                onSelectUnit={handleSelectUnit}
                onMoveUnit={handleMoveUnit}
              />
              <UnitStatsPanel unit={selectedUnit} />
            </div>

            {/* Unit list below map */}
            <div style={{ marginTop: 20 }}>
              <h3
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 12,
                }}
              >
                Birim Listesi
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {demoUnits.length === 0 && (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Bu ırk için demo birim yok.</p>
                )}
                {demoUnits.map((unit) => {
                  const desc = RACE_DESCRIPTIONS[unit.race];
                  const isSelected = unit.id === selectedUnitId;
                  return (
                    <button
                      key={unit.id}
                      onClick={() => handleSelectUnit(isSelected ? null : unit)}
                      style={{
                        padding: '8px 14px',
                        background: isSelected ? desc.bgColor : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isSelected ? desc.color : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 8,
                        color: isSelected ? desc.color : '#aaa',
                        fontSize: 12,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {desc.icon} {unit.type.replace(/_/g, ' ')} ({unit.positionX},{unit.positionY})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Map Tab ───────────────────────────────────────── */}
          {activeTab === 'map' && (
            <div className="p-4">
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
                  onTileSelect={handleTileSelect}
                />
              </MangaPanel>
            </div>
          )}

          {/* ── Battle Tab ────────────────────────────────────── */}
          {activeTab === 'battle' && (
            <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-sm mx-auto">
                <div
                  className="text-6xl mb-6 animate-float inline-block"
                  style={{ filter: `drop-shadow(0 0 20px ${raceGlow})` }}
                >
                  ⚔️
                </div>
                <div className="mb-3">
                  <span className="badge badge-race">Savaş Modu</span>
                </div>
                <h2 className="font-display text-2xl font-black text-text-primary mb-3">
                  Savaşa <span style={{ color: raceColor }}>Hazır mısın?</span>
                </h2>
                <p className="text-text-muted text-sm mb-8">
                  Phaser.js ile güçlendirilmiş gerçek zamanlı savaş sahneleri yakında.
                </p>
                <a
                  href={`/battle?race=${race}&mode=pve&userId=${DEMO_USER_ID}`}
                  className="btn-primary inline-flex items-center gap-2"
                  style={{ background: raceColor }}
                >
                  <span>Savaşa Gir</span>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/20 text-xs">→</span>
                </a>
              </div>
            </div>
          )}

          {/* ── Commanders Tab ────────────────────────────────── */}
          {activeTab === 'commanders' && (
            <div className="p-4">
              <Link href="/commanders" className="font-display text-text-muted text-xs uppercase tracking-widest hover:text-text-primary transition-colors">
                Tüm Komutanlar →
              </Link>
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
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
