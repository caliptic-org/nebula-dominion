'use client';

import { useState } from 'react';
import { Race, RACE_DESCRIPTIONS, RaceDescription } from '@/types/units';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface StatBarProps {
  label: string;
  value: number;
  color: string;
}

function StatBar({ label, value, color }: StatBarProps) {
  return (
    <div className="mb-2.5">
      <div className="flex justify-between mb-1">
        <span className="font-display text-xs uppercase tracking-wider text-text-muted">{label}</span>
        <span className="font-display text-xs font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="progress-track h-1.5">
        <div
          className="progress-fill h-full rounded-full transition-all duration-500"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            boxShadow: `0 0 6px ${color}50`,
          }}
        />
      </div>
    </div>
  );
}

interface RaceCardProps {
  race: Race;
  desc: RaceDescription;
  selected: boolean;
  onSelect: () => void;
}

function RaceCard({ race, desc, selected, onSelect }: RaceCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-pressed={selected}
      className="relative rounded-2xl p-6 cursor-pointer transition-all duration-300 flex flex-col"
      style={{
        background: selected
          ? `linear-gradient(135deg, ${desc.bgColor} 0%, rgba(10,13,20,0.85) 70%)`
          : hovered
          ? `${desc.bgColor}`
          : 'rgba(13, 17, 32, 0.7)',
        border: `2px solid ${selected ? desc.color : hovered ? `${desc.color}50` : 'rgba(255,255,255,0.07)'}`,
        boxShadow: selected
          ? `0 0 32px ${desc.color}30, 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`
          : hovered
          ? `0 8px 24px rgba(0,0,0,0.4), 0 0 16px ${desc.color}18`
          : '0 4px 16px rgba(0,0,0,0.3)',
        transform: hovered || selected ? 'translateY(-4px)' : 'none',
        backdropFilter: 'blur(14px)',
        flex: '1 1 260px',
        minWidth: 240,
        maxWidth: 340,
      }}
    >
      {/* Selected indicator */}
      {selected && (
        <div
          className="absolute top-3 right-3 font-display font-black text-black uppercase rounded-full px-2.5 py-0.5"
          style={{
            background: desc.color,
            fontSize: '9px',
            letterSpacing: '0.8px',
          }}
        >
          SEÇİLDİ ✓
        </div>
      )}

      {/* Neon corner accent */}
      <div
        className="absolute top-0 left-0 w-12 h-12 pointer-events-none"
        style={{
          borderTop: `2px solid ${desc.color}`,
          borderLeft: `2px solid ${desc.color}`,
          borderTopLeftRadius: 14,
          opacity: selected ? 1 : 0.3,
        }}
        aria-hidden
      />

      {/* Race icon + name */}
      <div className="flex items-center gap-4 mb-4">
        <span
          className="text-5xl leading-none"
          style={{
            filter: selected || hovered ? `drop-shadow(0 0 12px ${desc.color})` : 'none',
            transition: 'filter 0.3s',
          }}
        >
          {desc.icon}
        </span>
        <div>
          <h3 className="font-display text-xl font-black leading-none mb-1" style={{ color: desc.color }}>
            {desc.name}
          </h3>
          <p className="font-body text-xs text-text-muted uppercase tracking-wider">{desc.subtitle}</p>
        </div>
      </div>

      {/* Description */}
      <p className="font-body text-sm text-text-secondary leading-relaxed mb-4 flex-1">
        {desc.description}
      </p>

      {/* Stats */}
      <div className="space-y-0">
        <StatBar label="Saldırı"  value={desc.stats.attack}  color={desc.color} />
        <StatBar label="Savunma" value={desc.stats.defense} color={desc.color} />
        <StatBar label="Hız"      value={desc.stats.speed}   color={desc.color} />
        <StatBar label="Can"      value={desc.stats.hp}      color={desc.color} />
      </div>

      {/* Race tag */}
      <div
        className="inline-flex items-center gap-1.5 mt-4 px-3 py-1 rounded-full font-display font-bold uppercase self-start"
        style={{
          background: `${desc.color}14`,
          border: `1px solid ${desc.color}35`,
          color: desc.color,
          fontSize: '10px',
          letterSpacing: '1px',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: desc.color, display: 'inline-block' }} />
        {race}
      </div>
    </div>
  );
}

interface RaceSelectionScreenProps {
  selectedRace: Race | null;
  onSelect: (race: Race) => void;
}

export function RaceSelectionScreen({ selectedRace, onSelect }: RaceSelectionScreenProps) {
  return (
    <div className="py-2">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="font-display text-2xl font-black text-text-primary mb-2">
          <span className="text-gradient-brand">Irk Seçimi</span>
        </h2>
        <p className="font-body text-text-secondary text-sm">
          Savaş stilini belirle — her ırkın kendine özgü güçlü yanları var.
        </p>

        {/* Race color indicators */}
        <div className="flex justify-center gap-2 mt-3">
          {(Object.values(Race) as Race[]).map((race) => {
            const desc = RACE_DESCRIPTIONS[race];
            const active = selectedRace === race;
            return (
              <button
                key={race}
                onClick={() => onSelect(race)}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: desc.color,
                  boxShadow: active ? `0 0 8px ${desc.color}` : 'none',
                  transform: active ? 'scale(1.5)' : 'scale(1)',
                }}
                aria-label={`${desc.name} ırkını seç`}
              />
            );
          })}
        </div>
      </div>

      {/* Race cards */}
      <div className="flex flex-wrap gap-4 justify-center mb-6">
        {(Object.values(Race) as Race[]).map((race) => (
          <RaceCard
            key={race}
            race={race}
            desc={RACE_DESCRIPTIONS[race]}
            selected={selectedRace === race}
            onSelect={() => onSelect(race)}
          />
        ))}
      </div>

      {/* Confirm section */}
      {selectedRace && (
        <div className="text-center animate-fade-in-scale">
          <div
            className="inline-flex items-center gap-3 px-6 py-3 rounded-xl font-display font-black text-black text-sm uppercase tracking-wider"
            style={{
              background: `linear-gradient(135deg, ${RACE_DESCRIPTIONS[selectedRace].color}, ${RACE_DESCRIPTIONS[selectedRace].color}cc)`,
              boxShadow: `0 4px 24px ${RACE_DESCRIPTIONS[selectedRace].color}40`,
              letterSpacing: '1px',
            }}
          >
            <span>{RACE_DESCRIPTIONS[selectedRace].icon}</span>
            <span>{RACE_DESCRIPTIONS[selectedRace].name} Seçildi!</span>
          </div>
          <p className="text-text-muted text-xs font-body mt-2">
            Birimler sekmesinden birliklerini görüntüleyebilirsin.
          </p>
        </div>
      )}
    </div>
  );
}
