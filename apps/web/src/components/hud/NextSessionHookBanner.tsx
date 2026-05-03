'use client';

import { useEffect, useState } from 'react';
import { useRaceTheme } from '@/hooks/useRaceTheme';

const DISMISS_KEY = 'nebula:nextSessionHook:dismissedAt';

interface NextSessionHookBannerProps {
  /** Pretend "next session" countdown — purely visual, real schedule comes from backend later. */
  hoursUntilReady?: number;
  /** Pretend "in-progress" structure that finishes tomorrow. */
  structureLabel?: string;
  progressPercent?: number;
}

/**
 * Sticky banner shown at the top of the home page after a player has finished
 * their onboarding tutorial battle. The hook is the "Hooked" model day-2
 * variable reward: we promise a structure completion + welcome reward
 * waiting for them tomorrow.
 *
 * The banner persists its dismissal in localStorage so a player who closed it
 * doesn't see it on every reload, but it re-appears each new day until the
 * actual day-2 reward flow lands.
 */
export function NextSessionHookBanner({
  hoursUntilReady = 16,
  structureLabel = 'Kışla',
  progressPercent = 40,
}: NextSessionHookBannerProps) {
  const { raceColor, raceGlow } = useRaceTheme();
  const [dismissed, setDismissed] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY);
      if (!raw) {
        setDismissed(false);
        return;
      }
      const at = new Date(raw).getTime();
      if (Number.isNaN(at)) {
        setDismissed(false);
        return;
      }
      // Re-show the banner once a calendar day has passed.
      const oneDayMs = 24 * 60 * 60 * 1000;
      setDismissed(Date.now() - at < oneDayMs);
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    } catch {
      // ignore quota errors
    }
  };

  const hours = Math.max(1, Math.round(hoursUntilReady));

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative z-40 px-3 sm:px-4 py-2.5 flex items-center gap-3 border-b"
      style={{
        background: `linear-gradient(90deg, ${raceColor}18 0%, rgba(8,10,16,0.9) 60%)`,
        borderColor: `${raceColor}40`,
        boxShadow: `0 1px 24px ${raceGlow}`,
      }}
      data-testid="next-session-hook"
    >
      <span
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base font-display font-black"
        style={{
          background: `${raceColor}28`,
          border: `1px solid ${raceColor}66`,
          color: raceColor,
        }}
        aria-hidden
      >
        ⏳
      </span>

      <div className="min-w-0 flex-1">
        <div className="font-display text-[10px] uppercase tracking-widest" style={{ color: raceColor }}>
          Yarın seni bekleyen ödül
        </div>
        <div className="font-display text-xs sm:text-sm font-bold text-text-primary truncate">
          {structureLabel} %{Math.round(progressPercent)} tamamlanıyor
          <span className="text-text-muted font-normal"> · ~{hours} saat sonra hazır</span>
        </div>
        <div
          className="mt-1 h-1 w-full rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          aria-hidden
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, Math.max(0, progressPercent))}%`,
              background: raceColor,
              boxShadow: `0 0 8px ${raceGlow}`,
            }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 font-display text-[10px] uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors px-2 py-1 rounded"
        aria-label="Banner'ı kapat"
      >
        ✕
      </button>
    </div>
  );
}
