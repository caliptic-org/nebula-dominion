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

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'progression', label: 'İLERLEME',   icon: '⭐' },
  { id: 'race',        label: 'IRK SEÇİMİ', icon: '🛡️' },
  { id: 'units',       label: 'BİRİMLER',   icon: '⚔️' },
];

const RESOURCES = [
  { icon: '💰', label: 'Altın',  value: '124,800', color: '#e8a820' },
  { icon: '⚡', label: 'Enerji', value: '8,420',   color: '#40c8e0' },
  { icon: '🔩', label: 'Maden',  value: '32,550',  color: '#a8c8e0' },
  { icon: '💎', label: 'Taş',    value: '240',     color: '#c880f0' },
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

      {/* ── Top resource bar ──────────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'linear-gradient(180deg, #0d0f1b 0%, #080a13 100%)',
          borderBottom: '1px solid rgba(232,168,32,0.2)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}
      >
        {/* Resources */}
        <div
          className="flex items-center gap-2 px-4 py-2 overflow-x-auto"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        >
          {RESOURCES.map((res) => (
            <div
              key={res.label}
              className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded"
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.07)',
                minWidth: 96,
              }}
            >
              <span className="text-sm">{res.icon}</span>
              <div>
                <div className="text-xs leading-none" style={{ color: 'var(--color-text-muted)' }}>{res.label}</div>
                <div className="text-sm font-black leading-tight" style={{ color: res.color }}>{res.value}</div>
              </div>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm"
              style={{
                background: 'linear-gradient(145deg, #f0c840 0%, #c88010 100%)',
                color: '#1a0e00',
                boxShadow: '0 0 12px rgba(232,168,32,0.3)',
              }}
            >
              K
            </div>
          </div>
        </div>

        {/* Title row */}
        <div className="flex items-center justify-between px-5 py-2.5">
          <div
            className="font-display font-black text-base uppercase tracking-widest"
            style={{
              background: 'linear-gradient(180deg, #f0c840 0%, #c88010 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            🚀 NEBULA DOMINION
          </div>
          <span className="badge badge-brand" style={{ fontSize: 9 }}>DEMO</span>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>

        {/* ── Tab bar ────────────────────────────────────────────────── */}
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
            gap: 2,
            marginBottom: 28,
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(232,168,32,0.18)',
            borderRadius: 8,
            padding: 4,
          }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  color: active ? '#1a0e00' : 'var(--color-text-muted)',
                  background: active ? 'var(--gradient-gold-btn)' : 'transparent',
                  border: active ? '1px solid #c88820' : '1px solid transparent',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: active ? '0 2px 8px rgba(232,168,32,0.3)' : 'none',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab: İlerleme ──────────────────────────────────────────── */}
        {activeTab === 'progression' && (
          <>
            {loading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 200,
                  gap: 12,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 20,
                    height: 20,
                    border: '2px solid rgba(232,168,32,0.2)',
                    borderTopColor: 'var(--color-brand)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <p style={{ color: 'var(--color-text-secondary)' }}>Yükleniyor…</p>
              </div>
            )}
            {!loading && !progress && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                <p style={{ color: 'var(--color-danger)' }}>⚠️ İlerleme yüklenemedi.</p>
              </div>
            )}
            {!loading && progress && (
              <>
                <LevelIndicator progress={progress} />

                {/* Unlocked content */}
                <section
                  style={{
                    marginTop: 24,
                    background: 'linear-gradient(160deg, #12141f 0%, #0c0e17 100%)',
                    border: '1px solid rgba(232,168,32,0.18)',
                    borderRadius: 8,
                    padding: '16px 20px',
                  }}
                >
                  <h2 className="section-header" style={{ marginBottom: 14 }}>Açık İçerikler</h2>
                  {progress.unlockedContent.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Henüz içerik açılmadı.</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {progress.unlockedContent.map((unlock) => (
                        <span key={unlock} className="badge badge-brand">
                          {unlock.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                {/* Stats grid */}
                <section style={{ marginTop: 20 }}>
                  <h2 className="section-header">İstatistikler</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Toplam XP',   value: progress.totalXp.toLocaleString('tr-TR'),             icon: '⭐', color: '#f0c840' },
                      { label: 'Tier Bonusu', value: `×${progress.tierBonusMultiplier.toFixed(2)}`,         icon: '🔥', color: '#e84030' },
                      { label: 'Çağ',         value: `Çağ ${progress.age}`,                                 icon: '🌌', color: '#40c8e0' },
                      { label: 'Seviye',      value: `${progress.level} / 9`,                               icon: '📈', color: '#e8a820' },
                    ].map(({ label, value, icon, color }) => (
                      <div
                        key={label}
                        style={{
                          background: 'linear-gradient(160deg, #12141f 0%, #0c0e17 100%)',
                          border: '1px solid rgba(232,168,32,0.18)',
                          borderRadius: 8,
                          padding: '14px 16px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 14 }}>{icon}</span>
                          <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--color-text-muted)' }}>
                            {label}
                          </span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </MangaPanel>

        {/* ── Tab: Irk Seçimi ────────────────────────────────────────── */}
        {activeTab === 'race' && (
          <RaceSelectionScreen
            selectedRace={selectedRace}
            onSelect={handleRaceSelect}
          />
        )}

        {/* ── Tab: Birimler ──────────────────────────────────────────── */}
        {activeTab === 'units' && (
          <div>
            {/* Race switcher */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 20,
                padding: '12px 16px',
                background: 'linear-gradient(160deg, #12141f 0%, #0c0e17 100%)',
                borderRadius: 8,
                border: '1px solid rgba(232,168,32,0.18)',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  color: 'var(--color-text-muted)',
                  marginRight: 4,
                }}
              >
                Irk:
              </span>
              {(Object.values(Race) as Race[]).map((race) => {
                const desc = RACE_DESCRIPTIONS[race];
                const active = selectedRace === race;
                return (
                  <button
                    key={race}
                    onClick={() => handleRaceSelect(race)}
                    style={{
                      padding: '6px 14px',
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      background: active
                        ? `linear-gradient(135deg, ${desc.color}30 0%, ${desc.color}18 100%)`
                        : 'transparent',
                      border: `1px solid ${active ? desc.color : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 5,
                      color: active ? desc.color : 'var(--color-text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.18s',
                      boxShadow: active ? `0 0 10px ${desc.color}30` : 'none',
                    }}
                  >
                    {desc.icon} {desc.name}
                  </button>
                );
              })}
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 700 }}>
                DEMO • {demoUnits.length} birim
              </span>
            </div>

            {/* Map + Stats Panel */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 240px',
                gap: 16,
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

            {/* Unit list */}
            <div style={{ marginTop: 16 }}>
              <h3 className="section-header" style={{ marginBottom: 12 }}>Birim Listesi</h3>
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
                        padding: '7px 14px',
                        background: isSelected
                          ? `linear-gradient(135deg, ${desc.color}25 0%, ${desc.color}12 100%)`
                          : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isSelected ? desc.color : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 6,
                        color: isSelected ? desc.color : 'var(--color-text-muted)',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.18s',
                        boxShadow: isSelected ? `0 0 8px ${desc.color}30` : 'none',
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                      }}
                    >
                      {desc.icon} {unit.type.replace(/_/g, ' ')}
                      <span style={{ fontSize: 9, marginLeft: 5, opacity: 0.7 }}>
                        ({unit.positionX},{unit.positionY})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
