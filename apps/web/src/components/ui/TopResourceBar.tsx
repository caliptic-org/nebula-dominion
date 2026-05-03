'use client';

import { useState, useEffect, useRef } from 'react';
import { ResourceIcon } from './ResourceIcon';
import { ProgressBar } from './ProgressBar';

interface Resources {
  mineral: number;
  gas: number;
  energy: number;
}

interface TopResourceBarProps {
  level?: number;
  age?: number;
  currentXp?: number;
  maxXp?: number;
  resources?: Resources;
  playerName?: string;
}

interface FloatText {
  id: number;
  text: string;
  color: string;
  x: number;
}

function ResourceCell({
  type,
  value,
  color,
  label,
}: {
  type: 'mineral' | 'gas' | 'energy';
  value: number;
  color: string;
  label: string;
}) {
  const [prevValue, setPrevValue] = useState(value);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const diff = value - prevValue;
    if (diff !== 0) {
      const id = nextId.current++;
      setFloats((f) => [...f, { id, text: diff > 0 ? `+${diff}` : `${diff}`, color, x: Math.random() * 20 - 10 }]);
      setTimeout(() => setFloats((f) => f.filter((ft) => ft.id !== id)), 1000);
    }
    setPrevValue(value);
  }, [value]);

  return (
    <div
      className="relative flex items-center gap-1.5 cursor-default select-none"
      title={label}
      aria-label={`${label}: ${value.toLocaleString('tr-TR')}`}
    >
      <span
        className="relative inline-flex items-center justify-center"
        style={{ width: 22, height: 22 }}
        aria-hidden
      >
        <span
          className="hud-ring"
          style={
            {
              ['--hud-ring-color' as string]: `${color}66`,
              ['--hud-ring-shadow-outer' as string]: `${color}22`,
              ['--hud-ring-shadow-inner' as string]: `${color}1A`,
            } as React.CSSProperties
          }
        />
        <span
          className="hud-ring hud-ring-dashed hud-ring-inset"
          style={
            {
              ['--hud-ring-color' as string]: `${color}40`,
            } as React.CSSProperties
          }
        />
        <ResourceIcon type={type} size={18} />
      </span>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          fontWeight: 700,
          color,
          letterSpacing: '0.3px',
          minWidth: 40,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString('tr-TR')}
      </span>

      {floats.map((ft) => (
        <span
          key={ft.id}
          className="animate-float-up pointer-events-none absolute"
          style={{
            top: -18,
            left: ft.x,
            fontSize: 11,
            fontWeight: 800,
            color: ft.color,
            fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
          aria-hidden
        >
          {ft.text}
        </span>
      ))}
    </div>
  );
}

export function TopResourceBar({
  level = 1,
  age = 1,
  currentXp = 240,
  maxXp = 1000,
  resources = { mineral: 2450, gas: 1280, energy: 870 },
  playerName = 'Komutan',
}: TopResourceBarProps) {
  const xpPct = maxXp > 0 ? (currentXp / maxXp) * 100 : 0;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40"
      style={{
        background: 'rgba(7, 9, 15, 0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      aria-label="Kaynak çubuğu"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          padding: '0 12px',
          height: 52,
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        {/* Logo */}
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: '2px',
            color: 'var(--color-brand)',
            textTransform: 'uppercase',
            marginRight: 16,
            whiteSpace: 'nowrap',
            display: 'none',
          }}
          className="sm:!block"
          aria-hidden
        >
          ND
        </span>

        {/* Resources row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flex: 1,
            overflow: 'hidden',
          }}
        >
          <ResourceCell type="mineral" value={resources.mineral} color="var(--race-human)" label="Mineral" />
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} aria-hidden />
          <ResourceCell type="gas" value={resources.gas} color="var(--color-accent)" label="Gas" />
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} aria-hidden />
          <ResourceCell type="energy" value={resources.energy} color="var(--color-energy)" label="Energy" />
        </div>

        {/* XP + Level block */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginLeft: 'auto',
            flexShrink: 0,
          }}
        >
          {/* XP mini bar */}
          <div
            style={{ width: 80, display: 'flex', flexDirection: 'column', gap: 3 }}
            className="hidden sm:flex"
            aria-label={`XP: ${currentXp} / ${maxXp}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                XP
              </span>
              <span style={{ fontSize: 9, color: 'var(--color-accent)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                {Math.round(xpPct)}%
              </span>
            </div>
            <ProgressBar value={currentXp} max={maxXp} variant="xp" size="xs" glow animated />
          </div>

          {/* Level badge */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(123,140,222,0.12)',
              border: '1px solid rgba(123,140,222,0.3)',
              borderRadius: 8,
              padding: '3px 10px',
              minWidth: 48,
            }}
            aria-label={`Seviye ${level}, Çağ ${age}`}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                fontWeight: 900,
                color: 'var(--color-brand)',
                lineHeight: 1,
              }}
            >
              {level}
            </span>
            <span
              style={{
                fontSize: 9,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                lineHeight: 1,
                marginTop: 2,
              }}
            >
              Çağ {age}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
