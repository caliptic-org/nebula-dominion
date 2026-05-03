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

const TIER_VARIANT: Record<number, string> = {
  1: 'hud-progress-bar--brand',
  2: 'hud-progress-bar--energy',
  3: 'hud-progress-bar--xp',
};

export function XpProgressBar({ currentXp, xpToNext, progressPercent, tier, isMaxLevel }: XpProgressBarProps) {
  const variantClass = isMaxLevel
    ? 'hud-progress-bar--xp'
    : TIER_VARIANT[tier] ?? 'hud-progress-bar--brand';

  return (
    <div className="xp-bar-container">
      <div
        className={clsx('hud-progress-bar', 'hud-progress-bar--md', variantClass, {
          'hud-progress-bar--scanning': !isMaxLevel,
        })}
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="XP İlerlemesi"
      >
        <div
          className="hud-progress-fill"
          style={{ width: `${isMaxLevel ? 100 : progressPercent}%` }}
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
