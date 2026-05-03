'use client';

import clsx from 'clsx';

export type RaidDifficulty = 'normal' | 'hard' | 'elite';

interface RaidBossHeroProps {
  difficulty: RaidDifficulty;
  bossName: string;
  bossSubtitle?: string;
  weeklyDropMultiplier: number;
  className?: string;
}

const DIFFICULTY_CONFIG: Record<
  RaidDifficulty,
  { label: string; badgeBg: string; ringMarks: number; gradient: string; vignette: string }
> = {
  normal: {
    label: 'NORMAL',
    badgeBg: '#d97706',
    ringMarks: 1,
    gradient: 'linear-gradient(180deg,#1a1008 0%,#3d2a0a 60%,#1a1008 100%)',
    vignette: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
  },
  hard: {
    label: 'HARD',
    badgeBg: '#dc2626',
    ringMarks: 2,
    gradient: 'linear-gradient(180deg,#1a0505 0%,#7f1d1d 60%,#1a0505 100%)',
    vignette: 'radial-gradient(ellipse at center, transparent 30%, rgba(127,29,29,0.55) 100%)',
  },
  elite: {
    label: 'ELİT',
    badgeBg: '#7c3aed',
    ringMarks: 3,
    gradient: 'linear-gradient(180deg,#05010d 0%,#4c1d95 55%,#05010d 100%)',
    vignette: 'radial-gradient(ellipse at center, transparent 25%, rgba(124,58,237,0.55) 100%)',
  },
};

export function RaidBossHero({
  difficulty,
  bossName,
  bossSubtitle,
  weeklyDropMultiplier,
  className,
}: RaidBossHeroProps) {
  const cfg = DIFFICULTY_CONFIG[difficulty];

  return (
    <div
      className={clsx('raid-hero', `raid-hero--${difficulty}`, className)}
      style={{ background: cfg.gradient }}
      role="region"
      aria-label={`Haftalık raid bossu: ${bossName} (${cfg.label})`}
    >
      <div className="raid-hero__layer raid-hero__layer--back" aria-hidden />
      <div className="raid-hero__layer raid-hero__layer--mid" aria-hidden />
      <div className="raid-hero__layer raid-hero__layer--front" aria-hidden />

      <div className="raid-hero__silhouette" aria-hidden>
        <svg viewBox="0 0 200 220" width="100%" height="100%">
          <defs>
            <linearGradient id={`boss-${difficulty}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#000" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <path
            d="M100 12 C70 12 56 30 60 64 C40 80 36 116 60 134 C44 154 60 184 78 196 C90 210 110 210 122 196 C140 184 156 154 140 134 C164 116 160 80 140 64 C144 30 130 12 100 12 Z M82 64 L92 76 L82 88 Z M118 64 L108 76 L118 88 Z M70 110 L130 110 L120 130 L80 130 Z"
            fill={`url(#boss-${difficulty})`}
            stroke={cfg.badgeBg}
            strokeWidth={difficulty === 'elite' ? 1.5 : 1}
            strokeOpacity={difficulty === 'normal' ? 0.4 : 0.7}
          />
        </svg>
      </div>

      <div className="raid-hero__vignette" style={{ background: cfg.vignette }} aria-hidden />

      <div className="raid-hero__badge" style={{ background: cfg.badgeBg }}>
        <span className="raid-hero__badge-marks" aria-hidden>
          {Array.from({ length: cfg.ringMarks }).map((_, i) => (
            <span key={i} />
          ))}
        </span>
        <span className="raid-hero__badge-label">{cfg.label}</span>
      </div>

      <div className="raid-hero__meta">
        <p className="raid-hero__subtitle">{bossSubtitle ?? 'Haftalık Lonca Raid'}</p>
        <h2 className="raid-hero__title">{bossName}</h2>
        <p className="raid-hero__reward">
          <span aria-hidden>🧬</span> Mutasyon Özü ×{weeklyDropMultiplier} drop
        </p>
      </div>
    </div>
  );
}
