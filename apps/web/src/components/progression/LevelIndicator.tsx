'use client';

import '@/styles/progression.css';
import clsx from 'clsx';
import { PlayerProgress, TIER_NAMES } from '@/types/progression';
import { XpProgressBar } from './XpProgressBar';

interface LevelIndicatorProps {
  progress: PlayerProgress;
}

export function LevelIndicator({ progress }: LevelIndicatorProps) {
  const { age, level, tier, currentXp, xpToNextLevel, xpProgressPercent, isMaxLevel } = progress;

  return (
    <div className={clsx('level-indicator', `tier-${tier}`)}>
      <div className="level-badge">
        <span className="age-label">Çağ {age}</span>
        <span className="level-number">{level}</span>
      </div>

      <div className="level-info">
        <span className="tier-name">{TIER_NAMES[tier] ?? `Tier ${tier}`}</span>
        <XpProgressBar
          currentXp={currentXp}
          xpToNext={xpToNextLevel}
          progressPercent={xpProgressPercent}
          tier={tier}
          isMaxLevel={isMaxLevel}
        />
        {!isMaxLevel && (
          <span className="xp-label">
            Sonraki seviye: {((xpToNextLevel ?? 0) - currentXp).toLocaleString('tr-TR')} XP
          </span>
        )}
      </div>
    </div>
  );
}
