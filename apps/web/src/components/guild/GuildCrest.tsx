'use client';

import clsx from 'clsx';
import { Race } from '@/types/units';

type CrestSize = 'sm' | 'md' | 'lg' | 'xl';

interface GuildCrestProps {
  race: Race;
  size?: CrestSize;
  animated?: boolean;
  className?: string;
  ariaLabel?: string;
}

const SIZE_PX: Record<CrestSize, number> = {
  sm: 48,
  md: 80,
  lg: 120,
  xl: 200,
};

const RACE_GLYPH: Record<Race, string> = {
  [Race.INSAN]:   'M32 6 L52 18 L52 42 L32 56 L12 42 L12 18 Z',
  [Race.ZERG]:    'M32 4 C44 8 52 22 50 36 C48 50 38 58 32 58 C26 58 16 50 14 36 C12 22 20 8 32 4 Z',
  [Race.OTOMAT]:  'M32 4 L56 18 L56 46 L32 60 L8 46 L8 18 Z',
  [Race.CANAVAR]: 'M32 4 L48 12 L56 24 L52 44 L40 56 L24 56 L12 44 L8 24 L16 12 Z',
  [Race.SEYTAN]:  'M32 4 L46 14 L54 30 L46 46 L32 60 L18 46 L10 30 L18 14 Z',
};

const RACE_INNER_LABEL: Record<Race, string> = {
  [Race.INSAN]: '★',
  [Race.ZERG]: '⌬',
  [Race.OTOMAT]: '⚙',
  [Race.CANAVAR]: '⚒',
  [Race.SEYTAN]: '✦',
};

const RACE_VAR_TOKEN: Record<Race, { primary: string; accent: string; bg: string }> = {
  [Race.INSAN]:   { primary: '#4a9eff', accent: '#a8d4ff', bg: '#090f1a' },
  [Race.ZERG]:    { primary: '#44dd44', accent: '#b4ffb4', bg: '#040d04' },
  [Race.OTOMAT]:  { primary: '#00cfff', accent: '#a8e8ff', bg: '#04101a' },
  [Race.CANAVAR]: { primary: '#ff8800', accent: '#ffd280', bg: '#0d0800' },
  [Race.SEYTAN]:  { primary: '#8b2fc9', accent: '#d4a0ff', bg: '#07020d' },
};

export function GuildCrest({ race, size = 'md', animated, className, ariaLabel }: GuildCrestProps) {
  const px = SIZE_PX[size];
  const tokens = RACE_VAR_TOKEN[race];
  const glyph = RACE_GLYPH[race];
  const inner = RACE_INNER_LABEL[race];

  return (
    <div
      className={clsx('guild-crest', animated && 'guild-crest--animated', className)}
      style={{
        width: px,
        height: px,
        // CSS variables consumed by .guild-crest rules
        ['--crest-primary' as string]: tokens.primary,
        ['--crest-accent' as string]: tokens.accent,
        ['--crest-bg' as string]: tokens.bg,
      }}
      role="img"
      aria-label={ariaLabel ?? `${race} lonca arması`}
    >
      <div className="guild-crest__ring" aria-hidden />
      <div className="guild-crest__plate" aria-hidden>
        <svg
          viewBox="0 0 64 64"
          width="100%"
          height="100%"
          className="guild-crest__svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id={`crest-fill-${race}-${size}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tokens.accent} />
              <stop offset="60%" stopColor={tokens.primary} />
              <stop offset="100%" stopColor={tokens.bg} />
            </linearGradient>
            <radialGradient id={`crest-glow-${race}-${size}`} cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor={tokens.accent} stopOpacity="0.5" />
              <stop offset="60%" stopColor={tokens.primary} stopOpacity="0.15" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          <circle cx="32" cy="32" r="30" fill={`url(#crest-glow-${race}-${size})`} />
          <path
            d={glyph}
            fill={`url(#crest-fill-${race}-${size})`}
            stroke={tokens.accent}
            strokeWidth="0.6"
            strokeOpacity="0.6"
          />
          <text
            x="32"
            y="38"
            textAnchor="middle"
            fontFamily="var(--font-display, system-ui)"
            fontWeight="800"
            fontSize="20"
            fill={tokens.accent}
            opacity="0.92"
            style={{ filter: `drop-shadow(0 0 4px ${tokens.primary})` }}
          >
            {inner}
          </text>
        </svg>
      </div>
      {animated && (
        <>
          <span className="guild-crest__spark guild-crest__spark--1" aria-hidden />
          <span className="guild-crest__spark guild-crest__spark--2" aria-hidden />
          <span className="guild-crest__spark guild-crest__spark--3" aria-hidden />
          <span className="guild-crest__spark guild-crest__spark--4" aria-hidden />
        </>
      )}
    </div>
  );
}
