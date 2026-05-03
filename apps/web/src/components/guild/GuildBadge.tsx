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

interface GradientStop {
  offset: string;
  color: string;
}

interface TierGradient {
  /** CSS-style angle: 0deg points up, increases clockwise (matches the
   *  CAL-236 brief which specifies CSS `linear-gradient` angles). */
  angle: number;
  stops: GradientStop[];
}

const TIER_STYLE: Record<
  GuildTier,
  { gradient: TierGradient; border: string; glow: string; symbol: string; cssFallback: string }
> = {
  1: {
    gradient: {
      angle: 180,
      stops: [
        { offset: '0%',   color: '#cbd5e1' },
        { offset: '100%', color: '#64748b' },
      ],
    },
    border: '#94a3b8',
    glow: 'rgba(148,163,184,0.35)',
    symbol: 'I',
    cssFallback: 'linear-gradient(180deg,#cbd5e1,#64748b)',
  },
  2: {
    gradient: {
      angle: 160,
      stops: [
        { offset: '0%',   color: '#c4b5fd' },
        { offset: '100%', color: '#7c3aed' },
      ],
    },
    border: '#a78bfa',
    glow: 'rgba(124,58,237,0.45)',
    symbol: 'II',
    cssFallback: 'linear-gradient(160deg,#c4b5fd,#7c3aed)',
  },
  3: {
    gradient: {
      angle: 150,
      stops: [
        { offset: '0%',   color: '#6ee7b7' },
        { offset: '100%', color: '#047857' },
      ],
    },
    border: '#34d399',
    glow: 'rgba(52,211,153,0.5)',
    symbol: 'III',
    cssFallback: 'linear-gradient(150deg,#6ee7b7,#047857)',
  },
  4: {
    gradient: {
      angle: 145,
      stops: [
        { offset: '0%',   color: '#fde68a' },
        { offset: '40%',  color: '#f59e0b' },
        { offset: '100%', color: '#b45309' },
      ],
    },
    border: '#fbbf24',
    glow: 'rgba(251,191,36,0.55)',
    symbol: '70+',
    cssFallback: 'linear-gradient(145deg,#fde68a 0%,#f59e0b 40%,#b45309 100%)',
  },
};

/**
 * Convert a CSS-style gradient angle (0deg = up, clockwise) into SVG
 * `<linearGradient>` x1/y1/x2/y2 coordinates so the visual direction matches
 * the CAL-236 brief's CSS specs.
 */
function cssAngleToSvgCoords(angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const fmt = (n: number) => `${(n * 100).toFixed(2)}%`;
  return {
    x1: fmt(0.5 - dx * 0.5),
    y1: fmt(0.5 - dy * 0.5),
    x2: fmt(0.5 + dx * 0.5),
    y2: fmt(0.5 + dy * 0.5),
  };
}

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
            <defs>
              <linearGradient id="champ-gold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            <path
              d="M4 22 L8 8 L16 16 L24 4 L32 16 L40 8 L44 22 Z"
              fill="url(#champ-gold)"
              stroke="#fbbf24"
              strokeWidth="1"
            />
            <circle cx="8" cy="8" r="1.5" fill="#fff" />
            <circle cx="24" cy="4" r="1.8" fill="#fff" />
            <circle cx="40" cy="8" r="1.5" fill="#fff" />
          </svg>
        </div>
        <div className="guild-badge__shield" aria-hidden>
          <svg viewBox="0 0 64 64" width="100%" height="100%">
            <defs>
              <radialGradient id="champ-bg" cx="50%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#3d2e00" />
                <stop offset="100%" stopColor="#1c1400" />
              </radialGradient>
            </defs>
            <path
              d="M32 4 L56 14 L56 36 C56 48 44 58 32 60 C20 58 8 48 8 36 L8 14 Z"
              fill="url(#champ-bg)"
              stroke="#fbbf24"
              strokeWidth="1.5"
            />
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
  // Each tier's gradient lives under a deterministic ID so multiple badges of
  // the same tier on one page share a single <defs>; different tiers don't
  // clash.
  const gradientId = `guild-tier-grad-${tier}`;
  const coords = cssAngleToSvgCoords(style.gradient.angle);

  return (
    <div
      className={clsx('guild-badge guild-badge--tier', locked && 'guild-badge--locked', className)}
      style={{
        ['--badge-fill' as string]: style.cssFallback,
        ['--badge-border' as string]: style.border,
        ['--badge-glow' as string]: style.glow,
      }}
      role="img"
      aria-label={`${TIER_LABEL[tier]} rozeti — kapasite ${TIER_CAPACITY[tier]} üye`}
    >
      <div className="guild-badge__shield" aria-hidden>
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <defs>
            <linearGradient
              id={gradientId}
              x1={coords.x1}
              y1={coords.y1}
              x2={coords.x2}
              y2={coords.y2}
            >
              {style.gradient.stops.map((s) => (
                <stop key={s.offset} offset={s.offset} stopColor={s.color} />
              ))}
            </linearGradient>
          </defs>
          <path
            d="M32 4 L54 12 L54 36 C54 48 42 58 32 60 C22 58 10 48 10 36 L10 12 Z"
            fill={`url(#${gradientId})`}
            stroke={style.border}
            strokeWidth="1.5"
            opacity="0.98"
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
