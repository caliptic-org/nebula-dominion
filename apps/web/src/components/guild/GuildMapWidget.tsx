'use client';

import { useMemo } from 'react';

interface Sector {
  id: string;
  x: number;
  y: number;
  label: string;
  controlled: boolean;
  contested: boolean;
}

interface GuildMapWidgetProps {
  guildTag?: string;
  controlledSectorCount?: number;
  totalSectorCount?: number;
}

// Deterministic pseudo-random from string seed
function seededRandom(seed: string, index: number): number {
  let h = 0;
  const s = seed + String(index);
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) / 0xffffffff);
}

function buildSectors(tag: string, controlled: number, total: number): Sector[] {
  const sectors: Sector[] = [];
  const contested = Math.min(controlled + 2, total) - controlled;

  for (let i = 0; i < total; i++) {
    const angle = (i / total) * Math.PI * 2 + seededRandom(tag, i * 7) * 0.8;
    const radius = 28 + seededRandom(tag, i * 13) * 52;
    sectors.push({
      id: `s${i}`,
      x: 80 + Math.cos(angle) * radius,
      y: 80 + Math.sin(angle) * radius,
      label: String.fromCharCode(65 + (i % 26)) + (i < 26 ? '' : String(Math.floor(i / 26))),
      controlled: i < controlled,
      contested: i >= controlled && i < controlled + contested,
    });
  }
  return sectors;
}

export function GuildMapWidget({
  guildTag = '??',
  controlledSectorCount = 4,
  totalSectorCount = 12,
}: GuildMapWidgetProps) {
  const sectors = useMemo(
    () => buildSectors(guildTag, controlledSectorCount, totalSectorCount),
    [guildTag, controlledSectorCount, totalSectorCount],
  );

  const controlPct = Math.round((controlledSectorCount / totalSectorCount) * 100);

  return (
    <section className="glass-card p-4 space-y-3" aria-labelledby="guild-map-heading">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden>🌌</span>
          <h2 id="guild-map-heading" className="font-display text-sm font-bold text-text-primary tracking-widest uppercase">
            Galaksi Nüfuz Haritası
          </h2>
        </div>
        <span className="text-[10px] text-text-muted font-mono">
          {controlledSectorCount}/{totalSectorCount} sektör
        </span>
      </header>

      {/* Minimap canvas */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at 40% 40%, rgba(74,158,255,0.07) 0%, #02040c 70%)',
          border: '1px solid rgba(0,207,255,0.12)',
          aspectRatio: '1 / 1',
          maxHeight: 220,
        }}
        role="img"
        aria-label={`İttifak galaksi haritası: ${controlledSectorCount} kontrollü sektör`}
      >
        {/* Nebula haze layers */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 60% 40% at 55% 45%, rgba(0,207,255,0.05) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <svg
          viewBox="0 0 160 160"
          width="100%"
          height="100%"
          aria-hidden
          style={{ display: 'block' }}
        >
          <defs>
            <radialGradient id="gmw-star-controlled" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-race, #4a9eff)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--color-race, #4a9eff)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="gmw-star-contested" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffaa22" stopOpacity="1" />
              <stop offset="100%" stopColor="#ffaa22" stopOpacity="0" />
            </radialGradient>
            <filter id="gmw-glow-c">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="gmw-glow-n">
              <feGaussianBlur stdDeviation="1" result="b" />
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Ambient star-field specks */}
          {Array.from({ length: 28 }).map((_, i) => (
            <circle
              key={`bg${i}`}
              cx={seededRandom('bg', i * 3) * 160}
              cy={seededRandom('bg', i * 5) * 160}
              r={seededRandom('bg', i) * 0.7 + 0.3}
              fill="rgba(255,255,255,0.35)"
            />
          ))}

          {/* Sector connection lines between controlled nodes */}
          {sectors.filter(s => s.controlled).map((s, i, arr) => {
            const next = arr[(i + 1) % arr.length];
            if (arr.length < 2) return null;
            return (
              <line
                key={`ln${s.id}`}
                x1={s.x} y1={s.y}
                x2={next.x} y2={next.y}
                stroke="var(--color-race, #4a9eff)"
                strokeOpacity="0.18"
                strokeWidth="0.8"
                strokeDasharray="3 4"
              />
            );
          })}

          {/* Sector nodes */}
          {sectors.map((s) => {
            const r = s.controlled ? 5 : s.contested ? 4 : 3;
            const color = s.controlled
              ? 'var(--color-race, #4a9eff)'
              : s.contested
              ? '#ffaa22'
              : 'rgba(255,255,255,0.18)';
            const glow = s.controlled ? 'gmw-glow-c' : s.contested ? 'gmw-glow-n' : undefined;
            return (
              <g key={s.id} filter={glow ? `url(#${glow})` : undefined}>
                {s.controlled && (
                  <circle cx={s.x} cy={s.y} r={r + 4} fill={`url(#gmw-star-controlled)`} opacity="0.25" />
                )}
                <circle cx={s.x} cy={s.y} r={r} fill={color} />
                {s.controlled && (
                  <text
                    x={s.x}
                    y={s.y - r - 2}
                    textAnchor="middle"
                    fontSize="5"
                    fontFamily="var(--font-display)"
                    fill="var(--color-race, #4a9eff)"
                    opacity="0.8"
                  >
                    {s.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Guild tag at center */}
          <text
            x="80" y="84"
            textAnchor="middle"
            fontSize="9"
            fontFamily="var(--font-display)"
            fontWeight="800"
            fill="rgba(255,255,255,0.12)"
            letterSpacing="2"
          >
            [{guildTag}]
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span
            style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: 'var(--color-race, #4a9eff)',
              boxShadow: '0 0 6px var(--color-race-glow, rgba(74,158,255,0.4))',
              display: 'inline-block',
            }}
          />
          <span className="text-text-secondary">Kontrollü</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: '#ffaa22',
              display: 'inline-block',
            }}
          />
          <span className="text-text-secondary">Çekişmeli</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.18)',
              display: 'inline-block',
            }}
          />
          <span className="text-text-secondary">Nötr</span>
        </div>
      </div>

      {/* Control bar */}
      <div>
        <div className="flex justify-between text-[10px] text-text-muted mb-1.5">
          <span className="font-display uppercase tracking-widest">Galaktik Kontrol</span>
          <span className="text-text-primary font-bold">%{controlPct}</span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          role="progressbar"
          aria-valuenow={controlledSectorCount}
          aria-valuemin={0}
          aria-valuemax={totalSectorCount}
          aria-label={`Galaktik kontrol: %${controlPct}`}
        >
          <div
            className="h-full"
            style={{
              width: `${controlPct}%`,
              background: 'linear-gradient(90deg, var(--color-race, #4a9eff), var(--color-accent, #00cfff))',
              boxShadow: '0 0 8px var(--color-race-glow, rgba(74,158,255,0.4))',
              transition: 'width 0.6s cubic-bezier(0.32,0.72,0,1)',
            }}
          />
        </div>
      </div>
    </section>
  );
}
