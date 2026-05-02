'use client';

import '@/styles/progression.css';
import clsx from 'clsx';

interface XpProgressBarProps {
  currentXp: number;
  xpToNext: number | null;
  progressPercent: number;
  tier: number;
  isMaxLevel?: boolean;
}

export function XpProgressBar({ currentXp, xpToNext, progressPercent, tier, isMaxLevel }: XpProgressBarProps) {
  const fillClass = clsx({
    'xp-bar-fill': true,
    'tier-2': tier === 2,
    'tier-3': tier === 3,
    maxed: isMaxLevel,
  });

  return (
    <div className="xp-bar-container">
      <div className="xp-bar-track">
        <div
          className={fillClass}
          style={{ width: `${isMaxLevel ? 100 : progressPercent}%` }}
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="XP İlerlemesi"
        />
      </div>
      <div className="xp-bar-labels">
        <span>{currentXp.toLocaleString('tr-TR')} XP</span>
        {isMaxLevel ? (
          <span>MAX SEVİYE</span>
        ) : (
          <span>{xpToNext?.toLocaleString('tr-TR')} XP gerekli</span>
        )}
      </div>
    </div>
  );
}
