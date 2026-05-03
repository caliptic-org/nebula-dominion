'use client';

import { useState, useCallback } from 'react';
import { useProgression } from '@/hooks/useProgression';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { STRUCTURE_ASSETS } from '@/lib/assets';
import { BottomNav } from '@/components/ui/BottomNav';
import { MangaPanel } from '@/components/ui/MangaPanel';
import { LevelUpModal } from '@/components/progression/LevelUpModal';
import { UnlockNotification } from '@/components/progression/UnlockNotification';
import { RaceSelectionScreen } from '@/components/race-selection/RaceSelectionScreen';
import { GameMap } from '@/components/game/GameMap';
import { UnitStatsPanel } from '@/components/units/UnitStatsPanel';
import { LevelUpPayload, ContentUnlock } from '@/types/progression';
import { Race, PlayerUnit, DEMO_UNITS, RACE_DESCRIPTIONS } from '@/types/units';

const DEMO_USER_ID = 'demo-player-001';

type TabId = 'progression' | 'race' | 'units';

const TABS: { id: TabId; label: string }[] = [
  { id: 'progression', label: 'İlerleme' },
  { id: 'race', label: 'Irk Seçimi' },
  { id: 'units', label: 'Birimler' },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>('progression');
  const [pendingLevelUp, setPendingLevelUp] = useState<LevelUpPayload | null>(null);
  const [pendingUnlocks, setPendingUnlocks] = useState<ContentUnlock[]>([]);
  const [selectedRace, setSelectedRace] = useState<Race>(Race.HUMAN);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [demoUnits, setDemoUnits] = useState<PlayerUnit[]>(DEMO_UNITS[Race.HUMAN]);

  const { progress, loading } = useProgression({
    userId: DEMO_USER_ID,
    onLevelUp: (payload) => {
      setPendingLevelUp(payload);
      if (payload.newUnlocks.length) setPendingUnlocks(payload.newUnlocks);
    },
  });

  const handleRaceSelect = useCallback((race: Race) => {
    setSelectedRace(race);
    setDemoUnits(DEMO_UNITS[race]);
    setSelectedUnitId(null);
  }, []);

  const handleSelectUnit = useCallback((unit: PlayerUnit | null) => {
    setSelectedUnitId(unit?.id ?? null);
  }, []);

  const handleMoveUnit = useCallback((unitId: string, toX: number, toY: number) => {
    setDemoUnits((prev) =>
      prev.map((u) => (u.id === unitId ? { ...u, positionX: toX, positionY: toY } : u)),
    );
  }, []);

  const selectedUnit = demoUnits.find((u) => u.id === selectedUnitId) ?? null;

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
        <h1 style={{ fontSize: 22, marginBottom: 24, color: '#ffc832' }}>Nebula Dominion</h1>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
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
                color: activeTab === tab.id ? '#ffc832' : '#666',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab.id ? '#ffc832' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'color 0.2s, border-color 0.2s',
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Tab: İlerleme ──────────────────────────────────────────────────── */}
        {activeTab === 'progression' && (
          <>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                <p style={{ color: '#aaa' }}>Yükleniyor…</p>
              </div>
            )}
            {!loading && !progress && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                <p style={{ color: '#f66' }}>İlerleme yüklenemedi.</p>
              </div>
            )}
            {!loading && progress && (
              <>
                <LevelIndicator progress={progress} />

                <section style={{ marginTop: 32 }}>
                  <h2 style={{ fontSize: 14, color: '#888', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Açık İçerikler
                  </h2>
                  {progress.unlockedContent.length === 0 ? (
                    <p style={{ color: '#666', fontSize: 13 }}>Henüz içerik açılmadı.</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {progress.unlockedContent.map((unlock) => (
                        <span
                          key={unlock}
                          style={{
                            padding: '4px 10px',
                            background: 'rgba(255,200,50,0.1)',
                            border: '1px solid rgba(255,200,50,0.3)',
                            borderRadius: 20,
                            fontSize: 12,
                            color: '#ffc832',
                          }}
                        >
                          {unlock.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                <section style={{ marginTop: 32 }}>
                  <h2 style={{ fontSize: 14, color: '#888', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                    İstatistikler
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { label: 'Toplam XP', value: progress.totalXp.toLocaleString('tr-TR') },
                      { label: 'Tier Bonusu', value: `×${progress.tierBonusMultiplier.toFixed(2)}` },
                      { label: 'Yaş', value: `Çağ ${progress.age}` },
                      { label: 'Seviye', value: `${progress.level} / 9` },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        style={{
                          padding: '12px 16px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {/* ─── Tab: Irk Seçimi ────────────────────────────────────────────────── */}
        {activeTab === 'race' && (
          <RaceSelectionScreen
            selectedRace={selectedRace}
            onSelect={handleRaceSelect}
          />
        )}

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
              <span style={{ fontSize: 12, color: '#555', marginRight: 8 }}>Irk:</span>
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
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#444' }}>
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
                  color: '#666',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 12,
                }}
              >
                Birim Listesi
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {demoUnits.length === 0 && (
                  <p style={{ color: '#555', fontSize: 13 }}>Bu ırk için demo birim yok.</p>
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
          </div>
        )}
      </main>
    </>
  );
}
