'use client';

import { PlayerUnit, Race, RACE_DESCRIPTIONS, UNIT_DISPLAY_NAMES } from '@/types/units';

interface HpBarProps {
  hp: number;
  maxHp: number;
}

function HpBar({ hp, maxHp }: HpBarProps) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  const color = pct > 60 ? '#44dd88' : pct > 30 ? '#e8a820' : '#e84030';
  const glow = pct > 60 ? 'rgba(68,221,136,0.5)' : pct > 30 ? 'rgba(232,168,32,0.5)' : 'rgba(232,64,48,0.5)';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          Can
        </span>
        <span style={{ fontSize: 12, color, fontWeight: 800 }}>
          {hp} / {maxHp}
        </span>
      </div>
      <div
        style={{
          height: 10,
          background: 'rgba(255,255,255,0.07)',
          borderRadius: 5,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
            borderRadius: 5,
            transition: 'width 0.3s ease',
            boxShadow: `0 0 8px ${glow}`,
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
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '5px 5px 0 0',
            }}
          />
        </div>
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
        padding: '7px 12px',
        background: 'rgba(0,0,0,0.25)',
        borderRadius: 6,
        marginBottom: 5,
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', flex: 1, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </span>
      <span style={{ fontSize: 15, fontWeight: 900, color }}>{value}</span>
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
          background: 'linear-gradient(160deg, #12141f 0%, #0c0e17 100%)',
          border: '1px solid rgba(232,168,32,0.18)',
          borderRadius: 10,
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.4 }}>⚔️</div>
        Bir birim seçin
      </div>
    );
  }

  const raceDesc = RACE_DESCRIPTIONS[unit.race];
  const displayName = UNIT_DISPLAY_NAMES[unit.type];

  return (
    <div
      style={{
        background: 'linear-gradient(160deg, #12141f 0%, #0c0e17 100%)',
        border: `1px solid ${raceDesc.color}40`,
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px ${raceDesc.color}10`,
      }}
    >
      {/* Header band */}
      <div
        style={{
          background: `linear-gradient(90deg, ${raceDesc.color}20 0%, transparent 100%)`,
          borderBottom: `1px solid ${raceDesc.color}30`,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: `${raceDesc.color}20`,
            border: `1px solid ${raceDesc.color}50`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
          }}
          aria-hidden
        >
          {raceDesc.icon}
        </div>
        <div>
          <h4
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 900,
              color: raceDesc.color,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {displayName}
          </h4>
          <span
            style={{
              fontSize: 9,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontWeight: 700,
            }}
          >
            {unit.race}
          </span>
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* HP Bar */}
        <div style={{ marginBottom: 14 }}>
          <HpBar hp={unit.hp} maxHp={unit.maxHp} />
        </div>

        {/* Stats */}
        <div style={{ marginBottom: 14 }}>
          <StatRow icon="⚔️" label="Saldırı" value={unit.attack}  color="#e8a820" />
          <StatRow icon="🛡️" label="Savunma" value={unit.defense} color="#40c8e0" />
          <StatRow icon="💨" label="Hız"     value={unit.speed}   color="#44dd88" />
        </div>

        {/* Position */}
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 6,
            marginBottom: 14,
            display: 'flex',
            gap: 12,
          }}
        >
          {[{ label: 'X', val: unit.positionX }, { label: 'Y', val: unit.positionY }].map((pos, i) => (
            <>
              {i > 0 && <div key="sep" style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />}
              <div key={pos.label} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 3, letterSpacing: 0.6 }}>
                  Konum {pos.label}
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text-primary)' }}>{pos.val}</div>
              </div>
            </>
          ))}
        </div>

        {/* Abilities */}
        {unit.abilities.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 900,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              Yetenekler
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {unit.abilities.map((ability) => (
                <span
                  key={ability}
                  style={{
                    padding: '3px 10px',
                    background: `${raceDesc.color}15`,
                    border: `1px solid ${raceDesc.color}35`,
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 800,
                    color: raceDesc.color,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                  }}
                >
                  {ability.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
