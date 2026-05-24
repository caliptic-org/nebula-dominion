/* RaceTierBadge — race-specific glyph used inside tier filter / chooser
 * buttons across roster, inventory, and merge screens. Each race renders a
 * distinct silhouette (matching path nodes in RaceTierPath) so the tier
 * filter strip carries the same shape language as the rest of the screen.
 */

import type { CSSProperties } from 'react';
import type { NDRace } from './nd-tokens';

interface RaceTierBadgeProps {
  race: NDRace;
  tier: number;
  size?: number;
  locked?: boolean;
  active?: boolean;
  style?: CSSProperties;
}

export function RaceTierBadge({
  race,
  tier,
  size = 18,
  locked = false,
  active = false,
  style,
}: RaceTierBadgeProps) {
  const c = race.primary;
  const g = race.glow;

  const stroke = active ? '#0A0E1A' : locked ? `${c}55` : c;
  const fill = active ? '#0A0E1A22' : locked ? 'transparent' : `${c}1f`;
  const textColor = active ? '#0A0E1A' : locked ? `${c}88` : c;
  const sw = active ? 1.6 : 1.2;

  const shape = buildShape(race.key, stroke, fill, sw);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        display: 'block',
        filter: active ? `drop-shadow(0 0 4px ${g})` : undefined,
        opacity: locked ? 0.75 : 1,
        ...style,
      }}
      aria-hidden="true"
    >
      {shape}
      {locked ? (
        <LockGlyph color={textColor} />
      ) : (
        <text
          x="12"
          y="15.5"
          textAnchor="middle"
          fontFamily="Chakra Petch, system-ui, sans-serif"
          fontSize="9"
          fontWeight="700"
          fill={textColor}
          letterSpacing="0.5"
        >
          {tier}
        </text>
      )}
    </svg>
  );
}

function buildShape(
  key: NDRace['key'],
  stroke: string,
  fill: string,
  sw: number,
): JSX.Element {
  switch (key) {
    case 'insan':
      return (
        <polygon
          points="12,2.5 20.5,7.5 20.5,16.5 12,21.5 3.5,16.5 3.5,7.5"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="miter"
        />
      );
    case 'zerg':
      return (
        <ellipse
          cx="12"
          cy="12"
          rx="9.5"
          ry="8.5"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
    case 'otomat':
      return (
        <rect
          x="2.5"
          y="2.5"
          width="19"
          height="19"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
    case 'canavar':
      return (
        <polygon
          points="12,2 22,8 18.5,21.5 5.5,21.5 2,8"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      );
    case 'seytan':
      return (
        <polygon
          points="12,1.5 22.5,12 12,22.5 1.5,12"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="miter"
        />
      );
  }
}

function LockGlyph({ color }: { color: string }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round">
      <rect x="8" y="11" width="8" height="6.5" rx="0.6" fill={color} opacity="0.18" />
      <path d="M9.3 11 V9 a2.7 2.7 0 0 1 5.4 0 V11" />
      <circle cx="12" cy="14.2" r="0.9" fill={color} stroke="none" />
    </g>
  );
}
