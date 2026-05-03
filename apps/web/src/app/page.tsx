'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { useProgression } from '@/hooks/useProgression';
import { LevelUpModal } from '@/components/progression/LevelUpModal';
import { UnlockNotification } from '@/components/progression/UnlockNotification';
import { RaceSelectionScreen } from '@/components/race-selection/RaceSelectionScreen';
import { GameMap } from '@/components/game/GameMap';
import { UnitStatsPanel } from '@/components/units/UnitStatsPanel';
import { TopResourceBar } from '@/components/layout/TopResourceBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ResourceIcon } from '@/components/ui/ResourceIcon';
import { LevelUpPayload, ContentUnlock } from '@/types/progression';
import { Race, PlayerUnit, DEMO_UNITS, RACE_DESCRIPTIONS, UNIT_DISPLAY_NAMES } from '@/types/units';
import Link from 'next/link';

const DEMO_USER_ID = 'demo-player-001';

type TabId = 'home' | 'race' | 'units' | 'progression';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'home',        label: 'Ana Üs',    icon: '🏰' },
  { id: 'race',        label: 'Irk',       icon: '🧬' },
  { id: 'units',       label: 'Birimler',  icon: '⚔️' },
  { id: 'progression', label: 'İlerleme',  icon: '📈' },
];

const BUILDINGS = [
  { icon: '🏗️', name: 'Komuta Merkezi', level: 1, producing: 'Mineral', color: 'var(--color-mineral)' },
  { icon: '⛏️', name: 'Maden Ocağı',   level: 2, producing: '+50/dk',   color: 'var(--color-mineral)' },
  { icon: '🔬', name: 'Araştırma Lab', level: 1, producing: 'Teknoloji', color: 'var(--color-brand)'   },
  { icon: '🏭', name: 'Üretim Fabrikası', level: 1, producing: 'Birim', color: 'var(--color-accent)'   },
  { icon: '⚡', name: 'Enerji Reaktörü', level: 2, producing: '+80/dk',  color: 'var(--color-energy)'  },
  { icon: '🛡️', name: 'Savunma Kulesi', level: 1, producing: 'Koruma',  color: 'var(--color-danger)'  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
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

  const handleMoveUnit = useCallback((unitId: string, toX: number, toY: number) => {
    setDemoUnits((prev) =>
      prev.map((u) => (u.id === unitId ? { ...u, positionX: toX, positionY: toY } : u)),
    );
  }, []);

  const selectedUnit = demoUnits.find((u) => u.id === selectedUnitId) ?? null;
  const raceDesc = RACE_DESCRIPTIONS[selectedRace];

  return (
    <>
      <UnlockNotification newUnlocks={pendingUnlocks} />
      {pendingLevelUp && (
        <LevelUpModal
          payload={pendingLevelUp}
          onClose={() => { setPendingLevelUp(null); setPendingUnlocks([]); }}
        />
      )}

      <TopResourceBar
        mineral={1250}
        gas={640}
        energy={200}
        level={progress?.level ?? 1}
        age={progress?.age ?? 1}
        xpPercent={progress?.xpProgressPercent ?? 42}
      />

      {/* Main scrollable area with top/bottom padding for fixed bars */}
      <main
        className="min-h-screen"
        style={{ paddingTop: '56px', paddingBottom: '64px', background: 'var(--color-bg)' }}
      >
        {/* Inner tabs nav */}
        <div
          className="sticky z-40 flex overflow-x-auto scrollbar-none"
          style={{
            top: '56px',
            background: 'rgba(10,13,20,0.95)',
            borderBottom: '1px solid var(--color-border)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 px-3 transition-all relative font-display"
                style={{
                  color: active ? 'var(--color-energy)' : 'var(--color-text-muted)',
                  fontSize: '10px',
                  fontWeight: active ? 800 : 500,
                  letterSpacing: '0.5px',
                  minWidth: 72,
                }}
                aria-selected={active}
              >
                {active && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ background: 'var(--color-energy)' }}
                    aria-hidden
                  />
                )}
                <span className="text-base leading-none" aria-hidden>{tab.icon}</span>
                <span>{tab.label.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        <div className="max-w-2xl mx-auto px-3 py-4">

          {/* ─── Tab: Ana Üs ───────────────────────────────────────────────── */}
          {activeTab === 'home' && (
            <div className="space-y-4 animate-slide-in-up">

              {/* Player HQ banner */}
              <GlassPanel
                className="p-5 relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${raceDesc.bgColor} 0%, rgba(10,13,20,0.8) 60%)`,
                  border: `1px solid ${raceDesc.color}30`,
                }}
              >
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="text-3xl"
                      style={{ filter: `drop-shadow(0 0 8px ${raceDesc.color})` }}
                    >
                      {raceDesc.icon}
                    </span>
                    <div>
                      <h1 className="font-display text-lg font-black text-text-primary">
                        Komutan&apos;ın Üssü
                      </h1>
                      <p className="text-xs font-body" style={{ color: raceDesc.color }}>
                        {raceDesc.name} · {raceDesc.subtitle}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <span className="badge badge-energy font-display">
                        Çağ {progress?.age ?? 1} · Sv {progress?.level ?? 1}
                      </span>
                    </div>
                  </div>

                  {progress && (
                    <ProgressBar
                      value={progress.currentXp}
                      max={progress.currentXp + (progress.xpToNextLevel ?? 0)}
                      variant="energy"
                      size="md"
                      showLabel
                      label="XP"
                    />
                  )}
                </div>
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-7xl opacity-5 pointer-events-none select-none"
                  aria-hidden
                >
                  {raceDesc.icon}
                </span>
              </GlassPanel>

              {/* Quick actions */}
              <div className="grid grid-cols-3 gap-2">
                <Link
                  href="/battle"
                  className="glass-card flex flex-col items-center gap-1.5 py-4 px-2 transition-all hover-glow text-center"
                  style={{ border: '1px solid var(--color-danger)20' }}
                >
                  <span className="text-2xl" aria-hidden>⚔️</span>
                  <span className="font-display text-xs font-bold text-text-secondary tracking-wider">SAVAŞ</span>
                </Link>
                <button
                  onClick={() => setActiveTab('units')}
                  className="glass-card flex flex-col items-center gap-1.5 py-4 px-2 transition-all hover-glow"
                  style={{ border: '1px solid var(--color-accent)20' }}
                >
                  <span className="text-2xl" aria-hidden>🪖</span>
                  <span className="font-display text-xs font-bold text-text-secondary tracking-wider">BİRİMLER</span>
                </button>
                <button
                  onClick={() => setActiveTab('race')}
                  className="glass-card flex flex-col items-center gap-1.5 py-4 px-2 transition-all hover-glow"
                  style={{ border: `1px solid ${raceDesc.color}20` }}
                >
                  <span className="text-2xl" aria-hidden>{raceDesc.icon}</span>
                  <span className="font-display text-xs font-bold text-text-secondary tracking-wider">IRK</span>
                </button>
              </div>

              {/* Resources summary */}
              <GlassPanel className="p-4">
                <h2 className="font-display text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
                  Kaynaklar
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { type: 'mineral' as const, label: 'Mineral', value: 1250, max: 2000 },
                    { type: 'gas' as const,     label: 'Gaz',     value: 640,  max: 1000 },
                    { type: 'energy' as const,  label: 'Enerji',  value: 200,  max: 500  },
                  ]).map(({ type, label, value, max }) => (
                    <div key={type} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <ResourceIcon type={type} size={14} />
                        <span className="font-display text-xs font-bold tracking-wide"
                          style={{ color: type === 'mineral' ? 'var(--color-mineral)' : type === 'gas' ? 'var(--color-gas)' : 'var(--color-energy)' }}>
                          {value.toLocaleString('tr-TR')}
                        </span>
                      </div>
                      <ProgressBar
                        value={value}
                        max={max}
                        variant={type === 'energy' ? 'energy' : 'brand'}
                        size="sm"
                      />
                      <span className="text-text-muted" style={{ fontSize: '9px' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </GlassPanel>

              {/* Buildings grid */}
              <div>
                <h2 className="font-display text-xs font-bold text-text-muted uppercase tracking-widest mb-3 px-1">
                  Binalar
                </h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {BUILDINGS.map((b) => (
                    <GlassPanel
                      key={b.name}
                      hoverable
                      className="p-3 flex flex-col gap-2"
                      style={{ border: `1px solid ${b.color}18` }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl" aria-hidden>{b.icon}</span>
                        <span className="badge" style={{
                          background: `${b.color}18`,
                          color: b.color,
                          border: `1px solid ${b.color}30`,
                          fontSize: '9px',
                        }}>
                          Sv {b.level}
                        </span>
                      </div>
                      <div>
                        <p className="text-text-primary font-semibold text-sm leading-none mb-0.5">{b.name}</p>
                        <p className="text-text-muted font-body" style={{ fontSize: '11px' }}>
                          {b.producing}
                        </p>
                      </div>
                      <button
                        className="w-full py-1 rounded text-center font-display font-bold transition-all"
                        style={{
                          background: `${b.color}12`,
                          border: `1px solid ${b.color}25`,
                          color: b.color,
                          fontSize: '10px',
                          letterSpacing: '0.5px',
                        }}
                      >
                        YÜKSELt
                      </button>
                    </GlassPanel>
                  ))}
                </div>
              </div>

              {/* Unit slots */}
              <GlassPanel className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-xs font-bold text-text-muted uppercase tracking-widest">
                    Ordu ({demoUnits.length})
                  </h2>
                  <button
                    onClick={() => setActiveTab('units')}
                    className="text-xs text-brand hover:text-brand-hover font-semibold transition-colors font-display"
                  >
                    Tümü →
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {demoUnits.length === 0 && (
                    <p className="text-text-muted text-sm font-body">Bu ırk için demo birim yok.</p>
                  )}
                  {demoUnits.slice(0, 6).map((unit) => {
                    const desc = RACE_DESCRIPTIONS[unit.race];
                    const hpPercent = (unit.hp / unit.maxHp) * 100;
                    return (
                      <div
                        key={unit.id}
                        className="flex flex-col gap-1 p-2 rounded-lg cursor-pointer transition-all"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid ${desc.color}20`,
                          minWidth: 70,
                        }}
                        onClick={() => setActiveTab('units')}
                        role="button"
                        tabIndex={0}
                      >
                        <span className="text-xl text-center" aria-hidden>{desc.icon}</span>
                        <p className="text-center font-body font-semibold leading-tight"
                          style={{ fontSize: '9px', color: desc.color }}>
                          {UNIT_DISPLAY_NAMES[unit.type]}
                        </p>
                        <div className="progress-track h-1">
                          <div
                            className={`progress-fill ${hpPercent < 30 ? 'progress-fill-health low' : 'progress-fill-health'}`}
                            style={{ width: `${hpPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassPanel>
            </div>
          )}

          {/* ─── Tab: Irk Seçimi ───────────────────────────────────────────── */}
          {activeTab === 'race' && (
            <div className="animate-slide-in-up">
              <RaceSelectionScreen selectedRace={selectedRace} onSelect={handleRaceSelect} />
            </div>
          )}

          {/* ─── Tab: Birimler ─────────────────────────────────────────────── */}
          {activeTab === 'units' && (
            <div className="space-y-4 animate-slide-in-up">
              {/* Race selector */}
              <div className="flex gap-2 flex-wrap">
                {(Object.values(Race) as Race[]).map((race) => {
                  const desc = RACE_DESCRIPTIONS[race];
                  const active = selectedRace === race;
                  return (
                    <button
                      key={race}
                      onClick={() => handleRaceSelect(race)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-full font-display font-bold transition-all"
                      style={{
                        fontSize: '11px',
                        letterSpacing: '0.5px',
                        background: active ? `${desc.color}18` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${active ? desc.color : 'rgba(255,255,255,0.08)'}`,
                        color: active ? desc.color : 'var(--color-text-muted)',
                        boxShadow: active ? `0 0 12px ${desc.color}30` : 'none',
                      }}
                    >
                      <span>{desc.icon}</span>
                      <span>{desc.name.toUpperCase()}</span>
                    </button>
                  );
                })}
              </div>

              {/* Map + stats panel */}
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 200px' }}>
                <GameMap
                  units={demoUnits}
                  selectedUnitId={selectedUnitId}
                  onSelectUnit={handleSelectUnit}
                  onMoveUnit={handleMoveUnit}
                />
                <UnitStatsPanel unit={selectedUnit} />
              </div>

              {/* Unit card grid */}
              <div>
                <h2 className="font-display text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
                  Birim Listesi
                </h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {demoUnits.length === 0 && (
                    <p className="text-text-muted text-sm col-span-full font-body">Bu ırk için demo birim yok.</p>
                  )}
                  {demoUnits.map((unit) => {
                    const desc = RACE_DESCRIPTIONS[unit.race];
                    const isSelected = unit.id === selectedUnitId;
                    const hpPct = (unit.hp / unit.maxHp) * 100;
                    return (
                      <GlassPanel
                        key={unit.id}
                        hoverable
                        className="p-3 cursor-pointer"
                        style={{
                          border: `1px solid ${isSelected ? desc.color : desc.color + '20'}`,
                          boxShadow: isSelected ? `0 0 16px ${desc.color}30` : undefined,
                        }}
                        onClick={() => handleSelectUnit(isSelected ? null : unit)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleSelectUnit(isSelected ? null : unit)}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl" aria-hidden>{desc.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-bold text-xs truncate" style={{ color: desc.color }}>
                              {UNIT_DISPLAY_NAMES[unit.type]}
                            </p>
                            <p className="text-text-muted font-body" style={{ fontSize: '10px' }}>
                              ({unit.positionX},{unit.positionY})
                            </p>
                          </div>
                        </div>
                        <ProgressBar value={unit.hp} max={unit.maxHp} variant="health" size="sm" showLabel />
                        <div className="flex gap-2 mt-1.5">
                          <span className="text-text-muted font-body" style={{ fontSize: '10px' }}>ATK {unit.attack}</span>
                          <span className="text-text-muted font-body" style={{ fontSize: '10px' }}>DEF {unit.defense}</span>
                          <span className="text-text-muted font-body" style={{ fontSize: '10px' }}>SPD {unit.speed}</span>
                        </div>
                        {unit.abilities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {unit.abilities.slice(0, 2).map((ab) => (
                              <span
                                key={ab}
                                className="font-display font-bold uppercase"
                                style={{
                                  fontSize: '8px',
                                  background: `${desc.color}12`,
                                  border: `1px solid ${desc.color}25`,
                                  color: desc.color,
                                  borderRadius: 4,
                                  padding: '1px 5px',
                                  letterSpacing: '0.5px',
                                }}
                              >
                                {ab.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </GlassPanel>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab: İlerleme ─────────────────────────────────────────────── */}
          {activeTab === 'progression' && (
            <div className="space-y-4 animate-slide-in-up">
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <span className="inline-block w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" aria-hidden />
                </div>
              )}
              {!loading && !progress && (
                <GlassPanel className="p-8 text-center">
                  <p className="text-status-danger font-body">İlerleme verisi yüklenemedi.</p>
                </GlassPanel>
              )}
              {!loading && progress && (
                <>
                  {/* Level card */}
                  <GlassPanel className="p-5" style={{ border: '1px solid var(--color-energy)20' }}>
                    <div className="flex items-center gap-4">
                      <div
                        className="flex flex-col items-center justify-center w-16 h-16 rounded-full shrink-0"
                        style={{ background: 'var(--gradient-energy)' }}
                      >
                        <span className="font-display text-xs font-bold text-black opacity-70">ÇAĞ {progress.age}</span>
                        <span className="font-display text-2xl font-black text-black leading-none">{progress.level}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-energy uppercase tracking-wider text-sm mb-2">
                          {progress.level < 9 ? `Seviye ${progress.level}` : 'MAX SEVİYE'}
                        </p>
                        <ProgressBar
                          value={progress.currentXp}
                          max={progress.currentXp + (progress.xpToNextLevel ?? 0)}
                          variant="energy"
                          size="lg"
                          showLabel
                          label="XP"
                        />
                      </div>
                    </div>
                  </GlassPanel>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Toplam XP',   value: progress.totalXp.toLocaleString('tr-TR'), icon: '⭐', color: 'var(--color-energy)' },
                      { label: 'Tier Bonusu', value: `×${progress.tierBonusMultiplier.toFixed(2)}`, icon: '💥', color: 'var(--color-accent)' },
                      { label: 'Çağ',         value: `${progress.age} / 6`, icon: '🌌', color: 'var(--color-brand)' },
                      { label: 'Seviye',      value: `${progress.level} / 9`, icon: '📊', color: 'var(--color-mineral)' },
                    ].map(({ label, value, icon, color }) => (
                      <GlassPanel key={label} className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg" aria-hidden>{icon}</span>
                          <span className="font-display text-xs text-text-muted uppercase tracking-wider">{label}</span>
                        </div>
                        <p className="font-display text-xl font-black" style={{ color }}>{value}</p>
                      </GlassPanel>
                    ))}
                  </div>

                  {/* Unlocked content */}
                  {progress.unlockedContent.length > 0 && (
                    <GlassPanel className="p-4">
                      <h2 className="font-display text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
                        Açık İçerikler
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {progress.unlockedContent.map((unlock) => (
                          <span key={unlock} className="badge badge-energy">
                            {unlock.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </GlassPanel>
                  )}

                  {/* Age timeline */}
                  <GlassPanel className="p-4">
                    <h2 className="font-display text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
                      Çağ Zaman Çizelgesi
                    </h2>
                    <div className="flex gap-1">
                      {Array.from({ length: 6 }, (_, i) => i + 1).map((age) => {
                        const done = age < progress.age;
                        const current = age === progress.age;
                        return (
                          <div
                            key={age}
                            className="flex-1 flex flex-col items-center gap-1"
                          >
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-xs"
                              style={{
                                background: done ? 'var(--gradient-brand)' : current ? 'var(--gradient-energy)' : 'var(--color-bg-elevated)',
                                border: current ? '2px solid var(--color-energy)' : '1px solid var(--color-border)',
                                color: done || current ? '#000' : 'var(--color-text-muted)',
                                boxShadow: current ? '0 0 12px var(--color-energy-glow)' : 'none',
                              }}
                            >
                              {age}
                            </div>
                            <div
                              className="w-full h-1 rounded-full"
                              style={{
                                background: done ? 'var(--color-brand)' : current ? 'var(--color-energy)' : 'var(--color-border)',
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </GlassPanel>
                </>
              )}
            </div>
          )}

        </div>
      </main>

      <BottomNav />
    </>
  );
}
