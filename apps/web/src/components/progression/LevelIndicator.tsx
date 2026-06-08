'use client';

import '@/styles/progression.css';
import clsx from 'clsx';
import { PlayerProgress, TIER_NAMES } from '@/types/progression';
import { XpProgressBar } from './XpProgressBar';

interface LevelIndicatorProps {
  progress: PlayerProgress;
}

// Mirror of the game-server prestige constants (level-config.ts). Display
// only — the authoritative bonus is computed server-side in
// ProgressionService.getPrestigeProductionBonus.
const PRESTIGE_PROD_PCT_PER_LEVEL = 2;
const PRESTIGE_PROD_PCT_CAP = 100;

export function LevelIndicator({ progress }: LevelIndicatorProps) {
  const {
    age,
    level,
    tier,
    currentXp,
    xpToNextLevel,
    xpProgressPercent,
    isMaxLevel,
    prestigeLevel,
    prestigeXp,
    prestigeXpPerLevel,
  } = progress;

  const prestigeBonusPct = Math.min(
    PRESTIGE_PROD_PCT_CAP,
    (prestigeLevel ?? 0) * PRESTIGE_PROD_PCT_PER_LEVEL,
  );
  const prestigeProgressPct =
    prestigeXpPerLevel > 0
      ? Math.min(100, ((prestigeXp ?? 0) / prestigeXpPerLevel) * 100)
      : 0;
  const atBonusCap = prestigeBonusPct >= PRESTIGE_PROD_PCT_CAP;

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
            Sonraki seviye: {((xpToNextLevel ?? 0) - currentXp).toLocaleString()} XP
          </span>
        )}

        {/* FLOW-004 endgame prestige — only meaningful once maxed, where the
            normal XP bar pins at MAX SEVİYE. Post-max XP feeds this track for
            a permanent production bonus. */}
        {isMaxLevel && (
          <div className="prestige-block">
            <div className="prestige-header">
              <span className="prestige-badge">★ Prestij {prestigeLevel ?? 0}</span>
              <span className="prestige-bonus">+{prestigeBonusPct}% üretim</span>
            </div>
            <div className="xp-bar-container">
              <div
                className="hud-progress-bar hud-progress-bar--md hud-progress-bar--xp"
                role="progressbar"
                aria-valuenow={prestigeProgressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Prestij İlerlemesi"
              >
                <div
                  className="hud-progress-fill"
                  style={{ width: `${prestigeProgressPct}%` }}
                />
              </div>
              <div className="xp-bar-labels">
                <span>
                  {(prestigeXp ?? 0).toLocaleString()} / {prestigeXpPerLevel.toLocaleString()} XP
                </span>
                <span>
                  {atBonusCap ? 'ÜRETİM BONUSU MAKS' : 'Sonraki prestij'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
