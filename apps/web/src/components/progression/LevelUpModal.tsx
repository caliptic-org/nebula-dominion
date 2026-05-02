'use client';

import '@/styles/progression.css';
import { LevelUpPayload, UNLOCK_LABELS, TIER_NAMES } from '@/types/progression';

interface LevelUpModalProps {
  payload: LevelUpPayload;
  onClose: () => void;
}

export function LevelUpModal({ payload, onClose }: LevelUpModalProps) {
  const { newLevel, age, tier, rewards, newUnlocks } = payload;

  return (
    <div className="level-up-overlay" onClick={onClose}>
      <div className="level-up-modal" onClick={(e) => e.stopPropagation()}>
        <p className="level-up-title">Seviye Atladın!</p>

        <div className="level-up-number">{newLevel}</div>

        <p className="level-up-subtitle">
          Çağ {age} · {TIER_NAMES[tier] ?? `Tier ${tier}`}
        </p>

        {(rewards.gold || rewards.gems || rewards.title || rewards.badge) && (
          <div className="level-up-rewards">
            {rewards.gold && (
              <span className="reward-chip gold">+{rewards.gold.toLocaleString('tr-TR')} Altın</span>
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
