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

      {/* Bar track — HUD telemetry style */}
      <div
        className="hud-progress-bar hud-progress-bar--lg hud-progress-bar--scanning"
        style={
          {
            ['--hud-track-bg' as string]: 'rgba(255,255,255,0.04)',
            ['--hud-track-border' as string]: `${raceColor}33`,
            ['--hud-tick-color' as string]: `${raceColor}26`,
            ['--hud-fill-gradient' as string]: `linear-gradient(90deg, ${raceColor}66 0%, ${raceColor} 60%, #ffffff40 100%)`,
            ['--hud-fill-glow' as string]: raceGlow,
            ['--hud-edge-glow' as string]: raceColor,
          } as React.CSSProperties
        }
        role="progressbar"
        aria-valuenow={current}
        aria-valuemax={max}
        aria-label="Savaş gücü"
      >
        <div
          className="hud-progress-fill"
          style={{ width: `${pct}%` }}
        />
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
