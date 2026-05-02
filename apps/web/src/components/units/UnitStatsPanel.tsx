'use client';

import { PlayerUnit, Race, RACE_DESCRIPTIONS, UNIT_DISPLAY_NAMES } from '@/types/units';

interface HpBarProps {
  hp: number;
  maxHp: number;
}

function HpBar({ hp, maxHp }: HpBarProps) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  const color = pct > 60 ? 'var(--color-success)' : pct > 30 ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Can
        </span>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>
          {hp} / {maxHp}
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 4,
            transition: 'width 0.3s ease',
            boxShadow: `0 0 6px ${color}80`,
          }}
        />
      </div>
    </div>
  );
}

interface StatRowProps {
  icon: string;
  label: string;
  value: number | string;
  color?: string;
}

function StatRow({ icon, label, value, color = 'var(--color-text-primary)' }: StatRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        background: 'var(--color-bg-elevated)',
        borderRadius: 8,
        marginBottom: 6,
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

interface UnitStatsPanelProps {
  unit: PlayerUnit | null;
}

export function UnitStatsPanel({ unit }: UnitStatsPanelProps) {
  if (!unit) {
    return (
      <div
        style={{
          padding: 24,
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: 13,
        }}
      >
        Bir birim seçin
      </div>
    );
  }

  const raceDesc = RACE_DESCRIPTIONS[unit.race];
  const displayName = UNIT_DISPLAY_NAMES[unit.type];

  return (
    <div
      style={{
        padding: 20,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${raceDesc.color}30`,
        borderRadius: 12,
      }}
    >
      {/* Unit Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 28 }}>{raceDesc.icon}</span>
        <div>
          <h4
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 800,
              color: raceDesc.color,
            }}
          >
            {displayName}
          </h4>
          <span
            style={{
              fontSize: 10,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            {unit.race}
          </span>
        </div>
      </div>

      {/* HP Bar */}
      <div style={{ marginBottom: 16 }}>
        <HpBar hp={unit.hp} maxHp={unit.maxHp} />
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 16 }}>
        <StatRow icon="⚔️" label="Saldırı" value={unit.attack} color="var(--color-warning)" />
        <StatRow icon="🛡️" label="Savunma" value={unit.defense} color="var(--color-info)" />
        <StatRow icon="💨" label="Hız" value={unit.speed} color="var(--color-success)" />
      </div>

      {/* Position */}
      <div
        style={{
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 8,
          marginBottom: 16,
          display: 'flex',
          gap: 16,
        }}
      >
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
            Konum X
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>{unit.positionX}</div>
        </div>
        <div
          style={{ width: 1, background: 'var(--color-border)' }}
        />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
            Konum Y
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>{unit.positionY}</div>
        </div>
      </div>

      {/* Abilities */}
      {unit.abilities.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 8,
            }}
          >
            Yetenekler
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {unit.abilities.map((ability) => (
              <span
                key={ability}
                style={{
                  padding: '3px 10px',
                  background: `${raceDesc.color}15`,
                  border: `1px solid ${raceDesc.color}35`,
                  borderRadius: 20,
                  fontSize: 11,
                  color: raceDesc.color,
                  fontWeight: 600,
                }}
              >
                {ability.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
