'use client';

import type { CSSProperties, ReactElement } from 'react';
import type { RaceTheme, SigilKey } from '@/lib/nd-tokens';

interface SigilProps {
  race: RaceTheme;
  size?: number;
  /** When true, drops a coloured shadow around the sigil. */
  glow?: boolean;
  /**
   * Override the sigil shape independent of `race`. Defaults to the race's
   * own `sigil` key (TRIDENT for insan, HIVE for zerg, CORE for otomat, FANG
   * for canavar, SIGIL for seytan).
   */
  sigil?: SigilKey;
  className?: string;
  style?: CSSProperties;
}

/**
 * Race emblem rendered as pure geometric SVG (no figurative artwork).
 * Mirrors handoff/nd-tokens.jsx Sigil — shapes are addressed by SigilKey so
 * any race-themed surface can render any sigil if needed.
 */
export function Sigil({
  race,
  size = 32,
  glow = false,
  sigil,
  className,
  style,
}: SigilProps) {
  const key: SigilKey = sigil ?? race.sigil;
  const fill = race.primary;
  const stroke = race.glow;

  const inner: Record<SigilKey, ReactElement> = {
    TRIDENT: (
      <g>
        <polygon points="32,6 56,56 8,56" fill="none" stroke={stroke} strokeWidth="2" />
        <polygon points="32,18 48,48 16,48" fill={fill} opacity="0.25" />
        <line x1="32" y1="6" x2="32" y2="58" stroke={stroke} strokeWidth="1.2" />
      </g>
    ),
    HIVE: (
      <g>
        <circle cx="32" cy="32" r="22" fill="none" stroke={stroke} strokeWidth="2" />
        <path d="M32 12 L42 32 L32 52 L22 32 Z" fill={fill} opacity="0.35" />
        <circle cx="32" cy="32" r="6" fill={stroke} />
      </g>
    ),
    CORE: (
      <g>
        <rect x="10" y="10" width="44" height="44" fill="none" stroke={stroke} strokeWidth="2" />
        <rect x="18" y="18" width="28" height="28" fill={fill} opacity="0.30" />
        <line x1="10" y1="32" x2="54" y2="32" stroke={stroke} strokeWidth="1" />
        <line x1="32" y1="10" x2="32" y2="54" stroke={stroke} strokeWidth="1" />
      </g>
    ),
    FANG: (
      <g>
        <polygon points="32,8 56,24 48,56 16,56 8,24" fill="none" stroke={stroke} strokeWidth="2" />
        <polygon points="32,18 46,28 40,48 24,48 18,28" fill={fill} opacity="0.30" />
        <circle cx="24" cy="34" r="2" fill={stroke} />
        <circle cx="40" cy="34" r="2" fill={stroke} />
      </g>
    ),
    SIGIL: (
      <g>
        <polygon points="32,6 58,32 32,58 6,32" fill="none" stroke={stroke} strokeWidth="2" />
        <polygon points="32,18 46,32 32,46 18,32" fill={fill} opacity="0.35" />
        <line x1="6" y1="32" x2="58" y2="32" stroke={stroke} strokeWidth="0.8" />
      </g>
    ),
  };

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{
        display: 'block',
        color: race.primary,
        filter: glow ? `drop-shadow(0 0 8px ${race.glow})` : undefined,
        ...style,
      }}
    >
      {inner[key]}
    </svg>
  );
}
