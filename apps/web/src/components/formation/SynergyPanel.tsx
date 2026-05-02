'use client';

import { RaceSynergy, RACE_COLORS, SYNERGY_RULES } from './types';

interface SynergyPanelProps {
  synergies: RaceSynergy[];
}

export function SynergyPanel({ synergies }: SynergyPanelProps) {
  const active = synergies.filter((s) => s.count >= 2);

  if (synergies.length === 0) {
    return (
      <div className="flex items-center justify-center h-12 opacity-30">
        <span className="font-display text-xs uppercase tracking-widest text-text-muted">Sinerji yok — birim ekle</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {synergies.map((syn) => {
        const rc = RACE_COLORS[syn.race];
        const rules = SYNERGY_RULES[syn.race];
        const nextThreshold = rules.find((r) => !r.active)?.threshold ?? null;

        return (
          <div key={syn.race} className="relative">
            {/* Race header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="font-display text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: rc.color }}
                >
                  {rc.label}
                </span>
                {/* Unit count pips */}
                <div className="flex gap-0.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-sm transition-all duration-300"
                      style={{
                        background: i < syn.count ? rc.color : 'rgba(255,255,255,0.08)',
                        boxShadow: i < syn.count ? `0 0 4px ${rc.glow}` : 'none',
                      }}
                    />
                  ))}
                </div>
                <span className="text-text-muted font-body text-[10px]">×{syn.count}</span>
              </div>

              {nextThreshold && syn.count < nextThreshold && (
                <span className="text-[9px] font-display text-text-muted uppercase tracking-wider">
                  +{nextThreshold - syn.count} → sonraki bonus
                </span>
              )}
            </div>

            {/* Bonus list */}
            <div className="flex flex-wrap gap-1.5">
              {rules.map((bonus) => {
                const unlocked = syn.count >= bonus.threshold;
                return (
                  <div
                    key={bonus.threshold}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-display uppercase tracking-wider border transition-all duration-400"
                    style={{
                      background:   unlocked ? rc.dim       : 'rgba(255,255,255,0.03)',
                      borderColor:  unlocked ? rc.color     : 'rgba(255,255,255,0.08)',
                      color:        unlocked ? rc.color     : 'rgba(255,255,255,0.25)',
                      boxShadow:    unlocked ? `0 0 8px ${rc.glow}` : 'none',
                    }}
                  >
                    <span>{bonus.threshold}×</span>
                    <span>{bonus.description}</span>
                    {unlocked && <span className="text-[8px]">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {active.length === 0 && (
        <p className="text-text-muted font-body text-xs mt-1">
          Sinerji için aynı ırktan 2+ birim ekle.
        </p>
      )}
    </div>
  );
}
