'use client';

import { useState } from 'react';
import { Race, RACE_DESCRIPTIONS, RaceDescription } from '@/types/units';

interface StatBarProps {
  label: string;
  value: number;
  color: string;
}

function StatBar({ label, value, color }: StatBarProps) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color, fontWeight: 700 }}>{value}</span>
      </div>
      <div
        style={{
          height: 5,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${value}%`,
            background: color,
            borderRadius: 3,
            transition: 'width 0.4s ease',
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

  const baseStyle: React.CSSProperties = {
    position: 'relative',
    background: selected ? desc.bgColor : 'rgba(255,255,255,0.03)',
    border: `2px solid ${selected ? desc.color : hovered ? `${desc.color}60` : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 16,
    padding: '28px 24px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    transform: hovered || selected ? 'translateY(-4px)' : 'translateY(0)',
    boxShadow: selected
      ? `0 0 24px ${desc.color}40, 0 8px 32px rgba(0,0,0,0.4)`
      : hovered
      ? `0 8px 24px rgba(0,0,0,0.3), 0 0 12px ${desc.color}20`
      : '0 4px 12px rgba(0,0,0,0.2)',
    flex: '1 1 280px',
    minWidth: 260,
    maxWidth: 340,
  };

  return (
    <div
      style={baseStyle}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-pressed={selected}
    >
      {/* Selected badge */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: desc.color,
            color: '#000',
            fontSize: 10,
            fontWeight: 800,
            padding: '3px 8px',
            borderRadius: 10,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          Seçildi
        </div>
      )}

      {/* Icon + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span
          style={{
            fontSize: 42,
            lineHeight: 1,
            filter: selected ? 'drop-shadow(0 0 8px currentColor)' : 'none',
          }}
        >
          {desc.icon}
        </span>
        <div>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: desc.color }}>
            {desc.name}
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: '#888', marginTop: 2 }}>{desc.subtitle}</p>
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 13,
          color: '#bbb',
          lineHeight: 1.6,
          marginBottom: 20,
          minHeight: 60,
        }}
      >
        {desc.description}
      </p>

      {/* Stats Bars */}
      <div style={{ marginBottom: 20 }}>
        <StatBar label="Saldırı" value={desc.stats.attack} color={desc.color} />
        <StatBar label="Savunma" value={desc.stats.defense} color={desc.color} />
        <StatBar label="Hız" value={desc.stats.speed} color={desc.color} />
        <StatBar label="Can" value={desc.stats.hp} color={desc.color} />
      </div>

      {/* Race tag */}
      <div
        style={{
          display: 'inline-block',
          padding: '4px 10px',
          background: `${desc.color}18`,
          border: `1px solid ${desc.color}40`,
          borderRadius: 20,
          fontSize: 11,
          color: desc.color,
          fontWeight: 600,
        }}
      >
        {race.toUpperCase()}
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
    <div
      style={{
        minHeight: '100%',
        background: 'transparent',
        padding: '32px 0',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 900,
            margin: 0,
            background: 'linear-gradient(135deg, #fff 0%, #aaa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Irk Seçimi
        </h2>
        <p style={{ color: '#666', fontSize: 14, marginTop: 8 }}>
          Savaş stilinizi belirleyin — her ırkın benzersiz güçlü yanları var.
        </p>
      </div>

      {/* Race Cards */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
          justifyContent: 'center',
          marginBottom: 40,
        }}
      >
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
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '12px 32px',
              background: RACE_DESCRIPTIONS[selectedRace].color,
              color: '#000',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 0.5,
              boxShadow: `0 4px 20px ${RACE_DESCRIPTIONS[selectedRace].color}50`,
              cursor: 'default',
            }}
          >
            {RACE_DESCRIPTIONS[selectedRace].icon} {RACE_DESCRIPTIONS[selectedRace].name} Seçildi
          </div>
          <p style={{ color: '#555', fontSize: 12, marginTop: 10 }}>
            Birimler sekmesinden birliklerinizi görüntüleyebilirsiniz.
          </p>
        </div>
      )}
    </div>
  );
}
