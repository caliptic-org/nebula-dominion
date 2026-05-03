'use client';

import { GuildTier, TIER_CAPACITY } from '@/types/guild';

interface GuildCapacityBarProps {
  current: number;
  tier: GuildTier;
}

const TIER_BREAKPOINTS: GuildTier[] = [1, 2, 3, 4];

export function GuildCapacityBar({ current, tier }: GuildCapacityBarProps) {
  const max = TIER_CAPACITY[4];
  const pct = Math.min(100, (current / max) * 100);
  const tierCap = TIER_CAPACITY[tier];

  return (
    <div className="space-y-2" aria-label="Lonca kapasitesi">
      <div className="flex justify-between text-xs">
        <span className="text-text-secondary">
          <strong className="text-text-primary font-display">{current}</strong>
          <span className="text-text-muted"> / {tierCap} üye</span>
        </span>
        <span className="text-text-muted">Tier {tier} · max {max}</span>
      </div>
      <div className="capacity-bar" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={current}>
        <div className="capacity-bar__fill" style={{ width: `${pct}%` }} />
        <div className="capacity-bar__ticks" aria-hidden>
          {TIER_BREAKPOINTS.map((t) => {
            const left = (TIER_CAPACITY[t] / max) * 100;
            if (t === 4) return null;
            return (
              <span
                key={t}
                className="capacity-bar__tick"
                style={{ marginLeft: `calc(${left}% - 1px)`, position: 'absolute' }}
              />
            );
          })}
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-text-muted font-display tracking-widest">
        {TIER_BREAKPOINTS.map((t) => (
          <span key={t}>T{t} · {TIER_CAPACITY[t]}</span>
        ))}
      </div>
    </div>
  );
}
