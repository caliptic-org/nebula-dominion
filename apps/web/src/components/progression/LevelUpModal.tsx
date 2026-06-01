'use client';

import '@/styles/progression.css';
import { LevelUpPayload, UNLOCK_LABELS, TIER_NAMES } from '@/types/progression';

interface LevelUpModalProps {
  payload: LevelUpPayload;
  /** Optional level *before* the level-up — when provided, renders a
   *  "Lv N → Lv N+1" ribbon so the player sees the delta, not just the
   *  new number. Defaults to `newLevel - 1` if unset. */
  previousLevel?: number;
  onClose: () => void;
}

/** Polar burst — 12 radial particles spawned around the level number for the
 *  first ~600ms after mount. Pure CSS animation via per-index `--angle` and
 *  staggered delay; no JS animation loop. */
const BURST_PARTICLES = Array.from({ length: 12 }, (_, i) => i);

export function LevelUpModal({ payload, previousLevel, onClose }: LevelUpModalProps) {
  const { newLevel, age, tier, rewards, newUnlocks } = payload;
  const prevLevel = previousLevel ?? Math.max(1, newLevel - 1);

  return (
    <div className="level-up-overlay" onClick={onClose}>
      <div className="level-up-modal" onClick={(e) => e.stopPropagation()}>
        {/* Radial particle burst behind the number. pointer-events:none so
         *  the close-overlay click still works through them. */}
        <div className="level-up-burst" aria-hidden>
          {BURST_PARTICLES.map((i) => (
            <span
              key={i}
              className="level-up-particle"
              style={{
                ['--angle' as string]: `${(i * 360) / BURST_PARTICLES.length}deg`,
                ['--delay' as string]: `${i * 20}ms`,
              }}
            />
          ))}
        </div>

        {/* Delta ribbon — "Lv N → Lv N+1" pinned above the title. The arrow
         *  delivers the level-up payoff in one glance even before the player
         *  registers the giant number below. */}
        <div className="level-up-ribbon" aria-hidden>
          <span className="level-up-ribbon-prev">Lv {prevLevel}</span>
          <span className="level-up-ribbon-arrow">→</span>
          <span className="level-up-ribbon-next">Lv {newLevel}</span>
        </div>

        <p className="level-up-title">Seviye Atladın!</p>

        <div className="level-up-number">{newLevel}</div>

        <p className="level-up-subtitle">
          Çağ {age} · {TIER_NAMES[tier] ?? `Tier ${tier}`}
        </p>

        {(rewards.gold || rewards.gems || rewards.title || rewards.badge) && (
          <div className="level-up-rewards">
            {rewards.gold && (
              <span className="reward-chip gold">+{rewards.gold.toLocaleString()} Altın</span>
            )}
            {rewards.gems && (
              <span className="reward-chip gems">+{rewards.gems} Gem</span>
            )}
            {rewards.title && (
              <span className="reward-chip title">🏅 {rewards.title}</span>
            )}
            {rewards.badge && (
              <span className="reward-chip badge">🎖 Rozet</span>
            )}
          </div>
        )}

        {newUnlocks.length > 0 && (
          <div className="level-up-unlocks">
            <strong>Yeni İçerikler Açıldı</strong>
            <ul className="unlock-list">
              {newUnlocks.map((unlock) => (
                <li key={unlock}>{UNLOCK_LABELS[unlock] ?? unlock}</li>
              ))}
            </ul>
          </div>
        )}

        <button className="level-up-close" onClick={onClose}>
          Devam Et
        </button>
      </div>
    </div>
  );
}
