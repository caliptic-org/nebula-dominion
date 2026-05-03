'use client';

import { Race, RACE_DESCRIPTIONS } from '@/types/units';

interface RaceSelectionScreenProps {
  selectedRace: Race | null;
  onSelect: (race: Race) => void;
  onConfirm: (race: Race) => void;
}

export function RaceSelectionScreen({ selectedRace, onSelect, onConfirm }: RaceSelectionScreenProps) {
  const races = Object.values(Race);
  const activeDesc = selectedRace ? RACE_DESCRIPTIONS[selectedRace] : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '48px 24px',
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 32,
      }}
    >
      <header style={{ textAlign: 'center', maxWidth: 720 }}>
        <p
          style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: 2,
            marginBottom: 8,
          }}
        >
          Irkını Seç
        </p>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 900,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Galaksideki kaderini belirle
        </h1>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          maxWidth: 1200,
          width: '100%',
        }}
      >
        {races.map((race) => {
          const desc = RACE_DESCRIPTIONS[race];
          const isActive = selectedRace === race;
          return (
            <button
              key={race}
              type="button"
              onClick={() => onSelect(race)}
              aria-pressed={isActive}
              style={{
                position: 'relative',
                padding: '20px 16px',
                borderRadius: 14,
                background: isActive ? desc.bgColor : 'rgba(255,255,255,0.03)',
                border: `2px solid ${isActive ? desc.color : 'var(--color-border)'}`,
                boxShadow: isActive ? `0 0 24px ${desc.glowColor}` : 'none',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>{desc.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: desc.color, marginBottom: 2 }}>
                {desc.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                {desc.subtitle}
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {desc.description}
              </p>
            </button>
          );
        })}
      </div>

      {activeDesc && selectedRace && (
        <button
          type="button"
          onClick={() => onConfirm(selectedRace)}
          style={{
            padding: '14px 32px',
            borderRadius: 10,
            border: 'none',
            background: activeDesc.color,
            color: '#000',
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: 1,
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: `0 0 24px ${activeDesc.glowColor}`,
          }}
        >
          {activeDesc.name} ile devam et
        </button>
      )}
    </div>
  );
}
