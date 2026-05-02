'use client';

import { useState, useCallback } from 'react';
import { TopResourceBar } from '@/components/ui/TopResourceBar';
import { BottomNav, type GameTab } from '@/components/ui/BottomNav';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { ResourceIcon } from '@/components/ui/ResourceIcon';
import { useProgression } from '@/hooks/useProgression';
import { LevelUpModal } from '@/components/progression/LevelUpModal';
import { UnlockNotification } from '@/components/progression/UnlockNotification';
import { LevelIndicator } from '@/components/progression/LevelIndicator';
import { RaceSelectionScreen } from '@/components/race-selection/RaceSelectionScreen';
import { GameMap } from '@/components/game/GameMap';
import { UnitStatsPanel } from '@/components/units/UnitStatsPanel';
import { Race, PlayerUnit, DEMO_UNITS, RACE_DESCRIPTIONS } from '@/types/units';
import { LevelUpPayload, ContentUnlock } from '@/types/progression';

const DEMO_USER_ID = 'demo-player-001';

/* ── Tab panels ─────────────────────────────────────────────────────────── */

function HomeTab({
  progress,
  loading,
  selectedRace,
}: {
  progress: ReturnType<typeof useProgression>['progress'];
  loading: boolean;
  selectedRace: Race;
}) {
  const raceDesc = RACE_DESCRIPTIONS[selectedRace];

  const buildings = [
    { id: 'command',  icon: '🏰', label: 'Komuta Merkezi', level: 3, prod: '+12/dk', color: 'var(--color-brand)' },
    { id: 'mineral',  icon: '⛏️',  label: 'Mineral Çıkarıcı', level: 2, prod: '+45/dk', color: 'var(--race-human)' },
    { id: 'refinery', icon: '⚗️',  label: 'Gaz Rafinerisi',   level: 1, prod: '+20/dk', color: 'var(--color-accent)' },
    { id: 'reactor',  icon: '⚡', label: 'Enerji Reaktörü',  level: 2, prod: '+30/dk', color: 'var(--color-energy)' },
    { id: 'barracks', icon: '⚔️', label: 'Kışla',            level: 1, prod: '—',      color: 'var(--color-danger)' },
    { id: 'lab',      icon: '🔬', label: 'Araştırma Lab',    level: 1, prod: '—',      color: 'var(--color-accent)' },
  ];

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Race identity header */}
      <GlassPanel
        padding="md"
        raceColor={raceDesc.color}
        glow
        style={{
          background: `linear-gradient(135deg, ${raceDesc.bgColor} 0%, rgba(7,9,15,0.6) 100%)`,
          borderColor: `${raceDesc.color}40`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 36, filter: `drop-shadow(0 0 8px ${raceDesc.color})` }} aria-hidden>
            {raceDesc.icon}
          </span>
          <div>
            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 2, fontFamily: 'var(--font-display)' }}>
              Aktif Irk
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: raceDesc.color, fontFamily: 'var(--font-display)', letterSpacing: '1px' }}>
              {raceDesc.name}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 }}>{raceDesc.subtitle}</p>
          </div>
          {loading ? null : progress && (
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-energy)', fontFamily: 'var(--font-display)' }}>
                {progress.level}
              </div>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Seviye
              </div>
            </div>
          )}
        </div>

        {!loading && progress && (
          <div style={{ marginTop: 14 }}>
            <ProgressBar value={progress.currentXp} max={progress.xpToNextLevel ?? 1000} variant="xp" size="sm" glow animated label="XP" showValue />
          </div>
        )}
      </GlassPanel>

      {/* Resource summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { type: 'mineral' as const, label: 'Mineral', value: 2450, color: 'var(--race-human)', rate: '+45/dk' },
          { type: 'gas' as const,     label: 'Gas',     value: 1280, color: 'var(--color-accent)', rate: '+20/dk' },
          { type: 'energy' as const,  label: 'Enerji',  value: 870,  color: 'var(--color-energy)', rate: '+30/dk' },
        ].map(({ type, label, value, color, rate }) => (
          <GlassPanel key={type} padding="sm" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
              <ResourceIcon type={type} size={22} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color }}>
              {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>{label}</div>
            <div style={{ fontSize: 9, color: color, opacity: 0.7, marginTop: 1, fontFamily: 'var(--font-display)' }}>{rate}</div>
          </GlassPanel>
        ))}
      </div>

      {/* Buildings grid */}
      <div>
        <h3 style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, fontFamily: 'var(--font-display)' }}>
          Binalar
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {buildings.map((b) => (
            <GlassPanel
              key={b.id}
              padding="sm"
              className="hover-glow"
              style={{ cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.32,0.72,0,1)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }} aria-hidden>{b.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.label}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)' }}>
                      Lv.{b.level}
                    </span>
                    <span style={{ fontSize: 10, color: b.color, fontFamily: 'var(--font-display)' }}>
                      {b.prod}
                    </span>
                  </div>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>

      {/* Progression section */}
      {!loading && progress && (
        <div>
          <h3 style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, fontFamily: 'var(--font-display)' }}>
            İlerleme
          </h3>
          <LevelIndicator progress={progress} />
        </div>
      )}

      {/* Unlocked content */}
      {!loading && progress && progress.unlockedContent.length > 0 && (
        <GlassPanel padding="md">
          <h3 style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, fontFamily: 'var(--font-display)' }}>
            Açık İçerikler
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {progress.unlockedContent.map((u) => (
              <span key={u} className="badge badge-energy">{u.replace(/_/g, ' ')}</span>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}

function MapTab({
  selectedRace,
  demoUnits,
  selectedUnitId,
  onSelectUnit,
  onMoveUnit,
  onRaceSelect,
}: {
  selectedRace: Race;
  demoUnits: PlayerUnit[];
  selectedUnitId: string | null;
  onSelectUnit: (u: PlayerUnit | null) => void;
  onMoveUnit: (id: string, x: number, y: number) => void;
  onRaceSelect: (race: Race) => void;
}) {
  const selectedUnit = demoUnits.find((u) => u.id === selectedUnitId) ?? null;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Race switcher */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {(Object.values(Race) as Race[]).map((race) => {
          const desc = RACE_DESCRIPTIONS[race];
          const active = selectedRace === race;
          return (
            <Button
              key={race}
              variant="race"
              size="sm"
              raceColor={desc.color}
              glow={active}
              onClick={() => onRaceSelect(race)}
              style={{ flexShrink: 0 }}
            >
              {desc.icon} {desc.name}
            </Button>
          );
        })}
      </div>

      {/* Map + Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 12, alignItems: 'start' }}>
        <GameMap
          units={demoUnits}
          selectedUnitId={selectedUnitId}
          onSelectUnit={onSelectUnit}
          onMoveUnit={onMoveUnit}
        />
        <UnitStatsPanel unit={selectedUnit} />
      </div>

      {/* Unit list */}
      <GlassPanel padding="md">
        <h3 style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, fontFamily: 'var(--font-display)' }}>
          Birim Listesi · {demoUnits.length} birim
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {demoUnits.length === 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Bu ırk için demo birim yok.</p>
          )}
          {demoUnits.map((unit) => {
            const desc = RACE_DESCRIPTIONS[unit.race];
            const isSelected = unit.id === selectedUnitId;
            return (
              <Button
                key={unit.id}
                variant="race"
                size="sm"
                raceColor={desc.color}
                glow={isSelected}
                onClick={() => onSelectUnit(isSelected ? null : unit)}
              >
                {desc.icon} {unit.type.replace(/_/g, ' ')} ({unit.positionX},{unit.positionY})
              </Button>
            );
          })}
        </div>
      </GlassPanel>
    </div>
  );
}

function RaceTab({ selectedRace, onSelect }: { selectedRace: Race; onSelect: (r: Race) => void }) {
  return (
    <div className="animate-slide-up">
      <RaceSelectionScreen selectedRace={selectedRace} onSelect={onSelect} />
    </div>
  );
}

function PlaceholderTab({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div
      className="animate-slide-up"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
        gap: 16,
        textAlign: 'center',
      }}
    >
      <span style={{ fontSize: 56, filter: 'drop-shadow(0 0 16px var(--color-brand-glow))', animation: 'float 6s ease-in-out infinite' }} aria-hidden>
        {icon}
      </span>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 8 }}>
          {title}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', maxWidth: 280, lineHeight: 1.6 }}>
          {subtitle}
        </p>
      </div>
      <span className="badge badge-brand">Yakında</span>
    </div>
  );
}

/* ── Root page ───────────────────────────────────────────────────────────── */

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<GameTab>('home');
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

  return (
    <>
      <UnlockNotification newUnlocks={pendingUnlocks} />
      {pendingLevelUp && (
        <LevelUpModal
          payload={pendingLevelUp}
          onClose={() => {
            setPendingLevelUp(null);
            setPendingUnlocks([]);
          }}
        />
      )}

      {/* Fixed UI chrome */}
      <TopResourceBar
        level={progress?.level ?? 1}
        age={progress?.age ?? 1}
        currentXp={progress?.currentXp ?? 0}
        maxXp={progress?.xpToNextLevel ?? 1000}
      />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Scrollable content area between bars */}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          paddingTop: 60,
          paddingBottom: 72,
          minHeight: '100dvh',
          maxWidth: 640,
          margin: '0 auto',
          padding: '60px 14px 80px',
        }}
      >
        {activeTab === 'home' && (
          <HomeTab progress={progress} loading={loading} selectedRace={selectedRace} />
        )}
        {activeTab === 'map' && (
          <MapTab
            selectedRace={selectedRace}
            demoUnits={demoUnits}
            selectedUnitId={selectedUnitId}
            onSelectUnit={handleSelectUnit}
            onMoveUnit={handleMoveUnit}
            onRaceSelect={handleRaceSelect}
          />
        )}
        {activeTab === 'battle' && (
          <PlaceholderTab icon="⚔️" title="Savaş Alanı" subtitle="Gerçek zamanlı PvP savaşlar yakında geliyor. Phaser.js battle engine entegrasyonu devam ediyor." />
        )}
        {activeTab === 'guild' && (
          <PlaceholderTab icon="🤝" title="Lonca" subtitle="Lonca kurma, üye yönetimi ve Sektör Savaşları özelliği geliştirme aşamasında." />
        )}
        {activeTab === 'shop' && (
          <PlaceholderTab icon="💎" title="Mağaza" subtitle="Kozmetik itemler, hız boostları ve premium pass yakında burada olacak." />
        )}
      </main>
    </>
  );
}
