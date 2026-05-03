'use client';

import { useEffect, useState } from 'react';

interface PowerBarProps {
  current: number;
  max: number;
  raceColor: string;
  raceGlow: string;
}

export function PowerBar({ current, max, raceColor, raceGlow }: PowerBarProps) {
  const [displayed, setDisplayed] = useState(0);
  const pct = Math.min((current / max) * 100, 100);

  /* Animate number counter on mount / change */
  useEffect(() => {
    let start = 0;
    const step = current / 40;
    const timer = setInterval(() => {
      start += step;
      if (start >= current) { setDisplayed(current); clearInterval(timer); }
      else setDisplayed(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [current]);

  const tier = pct < 30 ? 'low' : pct < 60 ? 'mid' : pct < 85 ? 'high' : 'max';
  const tierLabel = { low: 'ZAYIF', mid: 'ORTA', high: 'GÜÇLÜ', max: 'EFSANE' }[tier];
  const tierColor = { low: '#ff3355', mid: '#ffaa22', high: raceColor, max: raceColor }[tier];

  return (
    <div className="w-full">
      {/* Header row */}
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-display text-[10px] uppercase tracking-[0.18em] text-text-muted">Savaş Gücü</span>
          <span
            className="px-2 py-px rounded text-[9px] font-display font-bold uppercase tracking-wider border"
            style={{ color: tierColor, borderColor: `${tierColor}50`, background: `${tierColor}12` }}
          >
            {tierLabel}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span
            className="font-display font-black text-2xl sm:text-3xl tabular-nums leading-none"
            style={{ color: raceColor, textShadow: `0 0 20px ${raceGlow}` }}
          >
            {displayed.toLocaleString()}
          </span>
          <span className="text-text-muted font-body text-xs">/ {max.toLocaleString()}</span>
        </div>
      </div>

      {/* Bar track */}
      <div
        className="relative h-3 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemax={max}
        aria-label="Savaş gücü"
      >
        {/* Fill */}
        <div
          className="power-bar-fill h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${raceColor}88 0%, ${raceColor} 60%, #ffffff40 100%)`,
            boxShadow: `0 0 8px ${raceGlow}`,
          }}
        />

        {/* Segment ticks */}
        {[25, 50, 75].map((p) => (
          <div
            key={p}
            className="absolute top-0 bottom-0 w-px"
            style={{ left: `${p}%`, background: 'rgba(0,0,0,0.4)' }}
          />
        ))}
      </div>

      {/* Manga-style sub-labels */}
      <div className="flex justify-between mt-1">
        <span className="font-display text-[8px] text-text-muted uppercase tracking-widest">MIN</span>
        <span className="font-display text-[8px] uppercase tracking-widest" style={{ color: raceColor }}>
          {pct.toFixed(0)}%
        </span>
        <span className="font-display text-[8px] text-text-muted uppercase tracking-widest">MAX</span>
      </div>
    </div>
  );
}
