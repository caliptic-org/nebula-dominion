'use client';

import clsx from 'clsx';
import { GuildTier, TIER_CAPACITY, TIER_LABEL } from '@/types/guild';

type BadgeKind = 'tier' | 'champion';

interface GuildBadgeProps {
  kind: BadgeKind;
  tier?: GuildTier;
  locked?: boolean;
  className?: string;
}

const TIER_STYLE: Record<GuildTier, { fill: string; border: string; glow: string; symbol: string }> = {
  1: { fill: 'linear-gradient(180deg,#cbd5e1,#64748b)', border: '#94a3b8', glow: 'rgba(148,163,184,0.35)', symbol: 'I' },
  2: { fill: 'linear-gradient(160deg,#c4b5fd,#7c3aed)', border: '#a78bfa', glow: 'rgba(124,58,237,0.45)', symbol: 'II' },
  3: { fill: 'linear-gradient(150deg,#6ee7b7,#047857)', border: '#34d399', glow: 'rgba(52,211,153,0.5)',  symbol: 'III' },
  4: { fill: 'linear-gradient(145deg,#fde68a 0%,#f59e0b 40%,#b45309 100%)', border: '#fbbf24', glow: 'rgba(251,191,36,0.55)', symbol: '70+' },
};

export function GuildBadge({ kind, tier = 1, locked, className }: GuildBadgeProps) {
  if (kind === 'champion') {
    return (
      <div
        className={clsx('guild-badge guild-badge--champion', locked && 'guild-badge--locked', className)}
        role="img"
        aria-label={locked ? 'Şampiyon Loncası rozeti (kilitli)' : 'Şampiyon Loncası rozeti'}
      >
        <div className="guild-badge__crown" aria-hidden>
          <svg viewBox="0 0 48 24" width="100%" height="100%">
            <path
              d="M4 22 L8 8 L16 16 L24 4 L32 16 L40 8 L44 22 Z"
              fill="url(#champ-gold)"
              stroke="#fbbf24"
              strokeWidth="1"
            />
            <defs>
              <linearGradient id="champ-gold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            <circle cx="8" cy="8" r="1.5" fill="#fff" />
            <circle cx="24" cy="4" r="1.8" fill="#fff" />
            <circle cx="40" cy="8" r="1.5" fill="#fff" />
          </svg>
        </div>
        <div className="guild-badge__shield" aria-hidden>
          <svg viewBox="0 0 64 64" width="100%" height="100%">
            <path
              d="M32 4 L56 14 L56 36 C56 48 44 58 32 60 C20 58 8 48 8 36 L8 14 Z"
              fill="url(#champ-bg)"
              stroke="#fbbf24"
              strokeWidth="1.5"
            />
            <defs>
              <radialGradient id="champ-bg" cx="50%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#3d2e00" />
                <stop offset="100%" stopColor="#1c1400" />
              </radialGradient>
            </defs>
            <text
              x="32"
              y="42"
              textAnchor="middle"
              fontFamily="var(--font-display, system-ui)"
              fontWeight="800"
              fontSize="24"
              fill="#fbbf24"
              style={{ letterSpacing: 2 }}
            >
              ★
            </text>
          </svg>
        </div>
        <span className="guild-badge__label">ŞAMPİYON</span>
      </div>
    );
  }

  const style = TIER_STYLE[tier];
  return (
    <div
      className={clsx('guild-badge guild-badge--tier', locked && 'guild-badge--locked', className)}
      style={{
        ['--badge-fill' as string]: style.fill,
        ['--badge-border' as string]: style.border,
        ['--badge-glow' as string]: style.glow,
      }}
      role="img"
      aria-label={`${TIER_LABEL[tier]} rozeti — kapasite ${TIER_CAPACITY[tier]} üye`}
    >
      <div className="guild-badge__shield" aria-hidden>
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <path
            d="M32 4 L54 12 L54 36 C54 48 42 58 32 60 C22 58 10 48 10 36 L10 12 Z"
            fill={style.border}
            stroke={style.border}
            strokeWidth="1.5"
            opacity="0.95"
          />
          <text
            x="32"
            y="40"
            textAnchor="middle"
            fontFamily="var(--font-display, system-ui)"
            fontWeight="800"
            fontSize={tier === 4 ? 14 : 22}
            fill="#0b0d12"
          >
            {style.symbol}
          </text>
        </svg>
      </div>
      <span className="guild-badge__label">{TIER_LABEL[tier]}</span>
    </div>
  );
}
