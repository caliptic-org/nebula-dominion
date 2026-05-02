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
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color, fontWeight: 900 }}>{value}</span>
      </div>
      <div
        style={{
          height: 7,
          background: 'rgba(255,255,255,0.07)',
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            borderRadius: 4,
            transition: 'width 0.4s ease',
            boxShadow: `0 0 6px ${color}70`,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              background: 'rgba(255,255,255,0.18)',
              borderRadius: '4px 4px 0 0',
            }}
          />
        </div>
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
      style={{
        position: 'relative',
        background: selected
          ? `linear-gradient(160deg, ${desc.color}20 0%, #0c0e17 100%)`
          : 'linear-gradient(160deg, #12141f 0%, #0c0e17 100%)',
        border: `2px solid ${
          selected ? desc.color : hovered ? `${desc.color}60` : 'rgba(232,168,32,0.18)'
        }`,
        borderRadius: 12,
        padding: '24px 20px',
        cursor: 'pointer',
        transition: 'all 0.22s ease',
        transform: hovered || selected ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: selected
          ? `0 0 28px ${desc.color}35, 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 ${desc.color}20`
          : hovered
          ? `0 8px 24px rgba(0,0,0,0.4), 0 0 14px ${desc.color}18`
          : '0 4px 14px rgba(0,0,0,0.35)',
        flex: '1 1 260px',
        minWidth: 240,
        maxWidth: 320,
        overflow: 'hidden',
      }}
    >
      {/* Top border accent */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${desc.color}, transparent)`,
          }}
          aria-hidden
        />
      )}

      {/* Selected badge */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: desc.color,
            color: '#000',
            fontSize: 9,
            fontWeight: 900,
            padding: '3px 8px',
            borderRadius: 3,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          ✓ SEÇİLDİ
        </div>
      )}

      {/* Icon + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 10,
            background: `${desc.color}15`,
            border: `1px solid ${desc.color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
            flexShrink: 0,
            boxShadow: selected ? `0 0 14px ${desc.color}40` : 'none',
          }}
          aria-hidden
        >
          {desc.icon}
        </div>
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 900,
              color: desc.color,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {desc.name}
          </h3>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2, fontWeight: 600 }}>
            {desc.subtitle}
          </p>
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 12,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
          marginBottom: 18,
          minHeight: 54,
        }}
      >
        {desc.description}
      </p>

      {/* Stats */}
      <div style={{ marginBottom: 16 }}>
        <StatBar label="Saldırı" value={desc.stats.attack}  color={desc.color} />
        <StatBar label="Savunma" value={desc.stats.defense} color={desc.color} />
        <StatBar label="Hız"     value={desc.stats.speed}   color={desc.color} />
        <StatBar label="Can"     value={desc.stats.hp}      color={desc.color} />
      </div>

      {/* Faction tag + select button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            padding: '3px 10px',
            background: `${desc.color}15`,
            border: `1px solid ${desc.color}35`,
            borderRadius: 3,
            fontSize: 9,
            fontWeight: 900,
            color: desc.color,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          {race}
        </div>
        {!selected && (
          <div
            style={{
              padding: '4px 14px',
              background: `${desc.color}15`,
              border: `1px solid ${desc.color}50`,
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 900,
              color: desc.color,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            SEÇMEK İÇİN TIKLA
          </div>
        )}
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
    <div style={{ padding: '8px 0 32px' }}>
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 32,
          padding: '24px 16px',
          background: 'linear-gradient(160deg, #12141f 0%, #0c0e17 100%)',
          border: '1px solid rgba(232,168,32,0.2)',
          borderRadius: 10,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #e8a820, #f0c840, #e8a820)',
          }}
          aria-hidden
        />
        <h2
          style={{
            fontSize: 26,
            fontWeight: 900,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: 2,
            background: 'linear-gradient(180deg, #f0c840 0%, #c88010 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          🛡️ FRAKSIYON SEÇİMİ
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 8, fontWeight: 600 }}>
          Savaş stilinizi belirleyin — her fraksiyonun benzersiz güçlü yanları var.
        </p>
      </div>

      {/* Race Cards grid */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'center',
          marginBottom: 32,
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

      {/* Confirm banner */}
      {selectedRace && (
        <div
          style={{
            background: `linear-gradient(135deg, ${RACE_DESCRIPTIONS[selectedRace].color}18 0%, rgba(0,0,0,0.3) 100%)`,
            border: `1px solid ${RACE_DESCRIPTIONS[selectedRace].color}50`,
            borderRadius: 10,
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            boxShadow: `0 0 20px ${RACE_DESCRIPTIONS[selectedRace].color}20`,
          }}
        >
          <span style={{ fontSize: 24 }}>{RACE_DESCRIPTIONS[selectedRace].icon}</span>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: RACE_DESCRIPTIONS[selectedRace].color,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              {RACE_DESCRIPTIONS[selectedRace].name} SEÇİLDİ ✓
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
              Birimler sekmesinden birliklerinizi görüntüleyebilirsiniz.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
