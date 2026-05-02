'use client';

import { PlayerUnit, RACE_DESCRIPTIONS, UNIT_DISPLAY_NAMES } from '@/types/units';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface StatRowProps {
  icon: string;
  label: string;
  value: number | string;
  color?: string;
}

function StatRow({ icon, label, value, color = 'var(--color-text-primary)' }: StatRowProps) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{ background: 'var(--color-bg-elevated)', marginBottom: 6 }}
    >
      <span className="text-base" aria-hidden>{icon}</span>
      <span className="font-body text-xs flex-1" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="font-display text-sm font-bold" style={{ color }}>{value}</span>
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
        className="glass-card flex flex-col items-center justify-center gap-2 text-center"
        style={{ padding: 24, minHeight: 160 }}
      >
        <span className="text-2xl opacity-30" aria-hidden>🪖</span>
        <p className="font-body text-sm" style={{ color: 'var(--color-text-muted)' }}>Bir birim seçin</p>
      </div>
    );
  }

  const raceDesc = RACE_DESCRIPTIONS[unit.race];
  const displayName = UNIT_DISPLAY_NAMES[unit.type];

  return (
    <div
      className="glass-card"
      style={{
        padding: 16,
        border: `1px solid ${raceDesc.color}25`,
        boxShadow: `0 0 20px ${raceDesc.color}10`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className="text-3xl"
          style={{ filter: `drop-shadow(0 0 8px ${raceDesc.color})` }}
        >
          {raceDesc.icon}
        </span>
        <div>
          <h4 className="font-display font-black leading-none mb-0.5" style={{ fontSize: 15, color: raceDesc.color }}>
            {displayName}
          </h4>
          <span
            className="font-display uppercase"
            style={{ fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.8px' }}
          >
            {unit.race}
          </span>
        </div>
      </div>

      {/* HP Bar */}
      <div className="mb-4">
        <ProgressBar value={unit.hp} max={unit.maxHp} variant="health" size="md" showLabel label="Can" />
      </div>

      {/* Stats */}
      <div className="mb-4">
        <StatRow icon="⚔️" label="Saldırı" value={unit.attack}  color="var(--color-warning)"  />
        <StatRow icon="🛡️" label="Savunma" value={unit.defense} color="var(--color-info)"     />
        <StatRow icon="💨" label="Hız"     value={unit.speed}   color="var(--color-success)"  />
      </div>

      {/* Position */}
      <div
        className="flex rounded-lg mb-4 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        <div className="flex-1 flex flex-col items-center py-2">
          <span className="font-display text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text-muted)', fontSize: '9px' }}>X</span>
          <span className="font-display text-base font-bold text-text-primary">{unit.positionX}</span>
        </div>
        <div style={{ width: 1, background: 'var(--color-border)' }} />
        <div className="flex-1 flex flex-col items-center py-2">
          <span className="font-display text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text-muted)', fontSize: '9px' }}>Y</span>
          <span className="font-display text-base font-bold text-text-primary">{unit.positionY}</span>
        </div>
      </div>

      {/* Abilities */}
      {unit.abilities.length > 0 && (
        <div>
          <p
            className="font-display uppercase mb-2"
            style={{ fontSize: '9px', letterSpacing: '1px', color: 'var(--color-text-muted)' }}
          >
            Yetenekler
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unit.abilities.map((ability) => (
              <span
                key={ability}
                className="font-display font-bold uppercase"
                style={{
                  padding: '2px 8px',
                  background: `${raceDesc.color}12`,
                  border: `1px solid ${raceDesc.color}30`,
                  borderRadius: 20,
                  fontSize: 10,
                  color: raceDesc.color,
                  letterSpacing: '0.5px',
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
