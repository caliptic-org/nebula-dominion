'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { GlowButton } from '@/components/ui/GlowButton';
import clsx from 'clsx';

interface StatBarProps {
  label: string;
  value: number;
  color: string;
}

function StatBar({ label, value, color }: StatBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="font-display text-[10px] uppercase tracking-widest text-text-muted">{label}</span>
        <span className="font-display text-xs font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-white/06 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
        />
      </div>
    </div>
  );
}

interface RaceSelectionScreenProps {
  selectedRace: Race | null;
  onSelect: (race: Race) => void;
  onConfirm?: (race: Race) => void;
}

export function RaceSelectionScreen({ selectedRace, onSelect, onConfirm }: RaceSelectionScreenProps) {
  const { setRace } = useRaceTheme();
  const [hoveredRace, setHoveredRace] = useState<Race | null>(null);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  const races = Object.values(Race) as Race[];
  const activeRace = hoveredRace ?? selectedRace ?? Race.INSAN;
  const activeDesc = RACE_DESCRIPTIONS[activeRace];

  function handleSelect(race: Race) {
    onSelect(race);
    setRace(race);
  }

  return (
    <div
      className="min-h-[100dvh] relative overflow-hidden flex flex-col"
      style={{ background: 'var(--color-bg)' }}
      data-race={activeDesc.dataRace}
    >
      {/* Animated race-themed background */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 0%, ${activeDesc.glowColor} 0%, transparent 70%)`,
          zIndex: 0,
        }}
        aria-hidden
      />

      {/* Halftone texture */}
      <div className="fixed inset-0 halftone-bg pointer-events-none opacity-20" aria-hidden />

      {/* Manga speed lines */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute h-px w-full opacity-20"
            style={{
              top: `${8 + i * 11}%`,
              background: `linear-gradient(90deg, transparent 0%, ${activeDesc.color}20 50%, transparent 100%)`,
              transform: `rotate(${-1 + i * 0.3}deg)`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-20 pt-8 pb-4 px-4 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <span
            className="badge"
            style={{ background: activeDesc.bgColor, color: activeDesc.color, border: `1px solid ${activeDesc.color}40` }}
          >
            Irk Seçimi
          </span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight">
          <span className="text-text-primary">Hangi Irk</span>{' '}
          <span style={{ color: activeDesc.color, textShadow: `0 0 20px ${activeDesc.glowColor}` }}>
            Sen Olacaksın?
          </span>
        </h1>
        <p className="mt-2 text-text-muted text-sm">Her ırkın benzersiz lore&apos;u ve savaş biçimi var</p>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

        {/* Left: Race selector tabs */}
        <div className="relative z-10 flex flex-row lg:flex-col gap-2 px-4 lg:px-6 lg:py-6 overflow-x-auto lg:overflow-x-visible lg:w-56 shrink-0">
          {races.map((race) => {
            const desc = RACE_DESCRIPTIONS[race];
            const active = selectedRace === race;
            return (
              <button
                key={race}
                onClick={() => handleSelect(race)}
                onMouseEnter={() => setHoveredRace(race)}
                onMouseLeave={() => setHoveredRace(null)}
                className={clsx(
                  'relative flex items-center gap-3 px-4 py-3 rounded-xl shrink-0 lg:w-full text-left',
                  'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                  'border',
                  active
                    ? 'scale-[1.02]'
                    : 'hover:scale-[1.01] bg-white/02 border-white/06 hover:border-white/15',
                )}
                style={active ? {
                  background: desc.bgColor,
                  borderColor: desc.color,
                  boxShadow: `0 0 20px ${desc.glowColor}`,
                } : {}}
                aria-pressed={active}
              >
                <span className="text-xl leading-none">{desc.icon}</span>
                <div className="min-w-0">
                  <div
                    className="font-display text-sm font-bold truncate"
                    style={{ color: active ? desc.color : 'var(--color-text-secondary)' }}
                  >
                    {desc.name}
                  </div>
                  <div className="text-text-muted text-[10px] truncate">{desc.subtitle}</div>
                </div>
                {active && (
                  <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                    style={{ background: desc.color, boxShadow: `0 0 6px ${desc.color}` }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Center: Character portrait + lore */}
        <div className="relative flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
          {/* Portrait panel */}
          <div className="relative flex-1 flex items-end justify-center min-h-[300px] lg:min-h-0 overflow-hidden">
            {/* Race atmosphere glow */}
            <div
              className="absolute inset-0 transition-all duration-700"
              style={{
                background: `radial-gradient(ellipse 80% 70% at 50% 100%, ${activeDesc.glowColor} 0%, transparent 65%)`,
              }}
              aria-hidden
            />

            {/* Character portrait */}
            <div className="relative z-10 h-[55vh] lg:h-full w-full max-w-xs lg:max-w-sm flex items-end justify-center">
              {!imgError[activeRace] ? (
                <Image
                  key={activeRace}
                  src={activeDesc.primaryCommanderPortrait}
                  alt={`${activeDesc.name} komutanı`}
                  fill
                  className="object-contain object-bottom transition-all duration-500 animate-slide-up"
                  onError={() => setImgError(prev => ({ ...prev, [activeRace]: true }))}
                  priority
                  style={{
                    filter: `drop-shadow(0 0 32px ${activeDesc.glowColor}) drop-shadow(0 8px 16px rgba(0,0,0,0.7))`,
                  }}
                />
              ) : (
                <div
                  className="w-40 h-40 flex items-center justify-center text-7xl"
                  style={{ filter: `drop-shadow(0 0 20px ${activeDesc.glowColor})` }}
                >
                  {activeDesc.icon}
                </div>
              )}
            </div>

            {/* Manga panel bottom gradient */}
            <div
              className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
              style={{
                background: `linear-gradient(to top, var(--color-bg) 0%, transparent 100%)`,
              }}
              aria-hidden
            />
          </div>

          {/* Info panel */}
          <div
            className="relative z-10 flex flex-col justify-between p-6 lg:p-8 lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div>
              {/* Race name */}
              <div className="mb-2">
                <span
                  className="badge"
                  style={{ background: activeDesc.bgColor, color: activeDesc.color, border: `1px solid ${activeDesc.color}40` }}
                >
                  {activeRace.toUpperCase()}
                </span>
              </div>
              <h2
                className="font-display text-2xl font-black mb-1"
                style={{ color: activeDesc.color, textShadow: `0 0 16px ${activeDesc.glowColor}` }}
              >
                {activeDesc.name}
              </h2>
              <p className="text-text-muted text-xs mb-4">{activeDesc.subtitle}</p>

              {/* Lore */}
              <div
                className="manga-panel p-4 mb-6"
                style={{ borderColor: `${activeDesc.color}20` }}
              >
                <p className="text-text-secondary text-xs leading-relaxed">{activeDesc.lore}</p>
              </div>

              {/* Stats */}
              <div className="space-y-3 mb-6">
                <h3 className="font-display text-[10px] uppercase tracking-widest text-text-muted mb-2">
                  Savaş İstatistikleri
                </h3>
                <StatBar label="Saldırı" value={activeDesc.stats.attack} color={activeDesc.color} />
                <StatBar label="Savunma" value={activeDesc.stats.defense} color={activeDesc.color} />
                <StatBar label="Hız" value={activeDesc.stats.speed} color={activeDesc.color} />
                <StatBar label="Can" value={activeDesc.stats.hp} color={activeDesc.color} />
              </div>

              {/* Commanders preview */}
              <div>
                <h3 className="font-display text-[10px] uppercase tracking-widest text-text-muted mb-3">
                  Komutanlar ({activeDesc.commanders.length})
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {activeDesc.commanders.slice(0, 4).map((cmd) => (
                    <div
                      key={cmd.id}
                      className="relative w-10 h-10 rounded-lg overflow-hidden border"
                      style={{ borderColor: `${activeDesc.color}30` }}
                      title={cmd.name}
                    >
                      {!imgError[cmd.id] ? (
                        <Image
                          src={cmd.portrait}
                          alt={cmd.name}
                          fill
                          className="object-cover object-top"
                          onError={() => setImgError(prev => ({ ...prev, [cmd.id]: true }))}
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-lg"
                          style={{ background: activeDesc.bgColor }}
                        >
                          {activeDesc.icon}
                        </div>
                      )}
                      {!cmd.isUnlocked && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px]">🔒</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            {selectedRace && (
              <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <GlowButton
                  onClick={() => onConfirm?.(selectedRace)}
                  className="w-full"
                  icon={<span>→</span>}
                  style={{
                    background: RACE_DESCRIPTIONS[selectedRace].color,
                    boxShadow: `0 4px 24px ${RACE_DESCRIPTIONS[selectedRace].glowColor}`,
                  }}
                >
                  {RACE_DESCRIPTIONS[selectedRace].name} Seç
                </GlowButton>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
