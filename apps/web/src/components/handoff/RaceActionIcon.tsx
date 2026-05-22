import type { NDQuickActionIcon } from './race-lex';

interface RaceActionIconProps {
  kind: NDQuickActionIcon;
  color: string;
  size?: number;
}

export function RaceActionIcon({ kind, color, size = 16 }: RaceActionIconProps) {
  const c = color;
  const map: Record<NDQuickActionIcon, JSX.Element> = {
    hammer: (
      <g>
        <path d="M3 13 L 13 3 M 1 15 L 5 11" stroke={c} strokeWidth="1.6" />
        <rect x="9" y="1" width="6" height="4" stroke={c} strokeWidth="1.4" fill="none" />
      </g>
    ),
    helmet: (
      <path
        d="M2 9 Q 8 1, 14 9 L 14 12 L 2 12 Z M 5 12 V 14 M 11 12 V 14"
        stroke={c}
        strokeWidth="1.4"
        fill="none"
      />
    ),
    star: (
      <polygon
        points="8,1 10,6 15,6 11,9 13,14 8,11 3,14 5,9 1,6 6,6"
        stroke={c}
        strokeWidth="1.2"
        fill="none"
      />
    ),
    egg: (
      <g>
        <ellipse cx="8" cy="9" rx="5" ry="6" stroke={c} strokeWidth="1.4" fill="none" />
        <circle cx="8" cy="9" r="2" fill={c} />
      </g>
    ),
    helix: (
      <g>
        <path d="M4 1 Q 12 5, 4 9 Q 12 13, 4 15" stroke={c} strokeWidth="1.3" fill="none" />
        <path d="M12 1 Q 4 5, 12 9 Q 4 13, 12 15" stroke={c} strokeWidth="1.3" fill="none" />
      </g>
    ),
    spiral: (
      <path
        d="M8 8 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0 m -2 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0 m -3 0 a 6 6 0 1 0 12 0"
        stroke={c}
        strokeWidth="1.2"
        fill="none"
      />
    ),
    gear: (
      <g>
        <circle cx="8" cy="8" r="3" fill="none" stroke={c} strokeWidth="1.4" />
        <g stroke={c} strokeWidth="1.4">
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={8 + Math.cos(a) * 4}
                y1={8 + Math.sin(a) * 4}
                x2={8 + Math.cos(a) * 6.5}
                y2={8 + Math.sin(a) * 6.5}
              />
            );
          })}
        </g>
      </g>
    ),
    cpu: (
      <g>
        <rect x="3" y="3" width="10" height="10" stroke={c} strokeWidth="1.4" fill="none" />
        <rect x="6" y="6" width="4" height="4" fill={c} />
        <g stroke={c} strokeWidth="1">
          <line x1="5" y1="1" x2="5" y2="3" />
          <line x1="8" y1="1" x2="8" y2="3" />
          <line x1="11" y1="1" x2="11" y2="3" />
          <line x1="5" y1="13" x2="5" y2="15" />
          <line x1="11" y1="13" x2="11" y2="15" />
        </g>
      </g>
    ),
    fuse: (
      <g>
        <circle cx="4" cy="8" r="2.5" fill="none" stroke={c} strokeWidth="1.4" />
        <circle cx="12" cy="8" r="2.5" fill="none" stroke={c} strokeWidth="1.4" />
        <line x1="6.5" y1="8" x2="9.5" y2="8" stroke={c} strokeWidth="1.4" />
      </g>
    ),
    claw: (
      <path
        d="M2 13 Q 4 4, 7 13 M 6 13 Q 8 3, 11 13 M 10 13 Q 12 4, 14 13"
        stroke={c}
        strokeWidth="1.4"
        fill="none"
      />
    ),
    fang: (
      <g>
        <polygon points="3,2 6,12 5,2" fill={c} />
        <polygon points="11,2 10,12 13,2" fill={c} />
      </g>
    ),
    jaw: (
      <path
        d="M2 6 Q 8 14, 14 6 M 4 6 L 5 9 M 8 6 L 8 10 M 12 6 L 11 9"
        stroke={c}
        strokeWidth="1.4"
        fill="none"
      />
    ),
    sigil: (
      <g>
        <polygon points="8,1 14,12 2,12" stroke={c} strokeWidth="1.4" fill="none" />
        <circle cx="8" cy="9" r="2" fill={c} />
      </g>
    ),
    flame: (
      <path
        d="M8 1 Q 4 6, 5 10 Q 6 13, 8 14 Q 10 13, 11 10 Q 12 6, 8 1 Z M 8 7 Q 9 10, 8 12 Q 7 10, 8 7"
        stroke={c}
        strokeWidth="1.2"
        fill={`${c}55`}
      />
    ),
    rune: (
      <g>
        <circle cx="8" cy="8" r="6" stroke={c} strokeWidth="1.2" fill="none" />
        <path d="M8 3 V 13 M 4 6 L 12 10 M 12 6 L 4 10" stroke={c} strokeWidth="1.2" />
      </g>
    ),
    roster: (
      <g stroke={c} strokeWidth="1.3" fill="none">
        <rect x="2" y="2" width="5" height="5" />
        <rect x="9" y="2" width="5" height="5" />
        <rect x="2" y="9" width="5" height="5" />
        <rect x="9" y="9" width="5" height="5" />
      </g>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: 'block' }} aria-hidden="true">
      {map[kind]}
    </svg>
  );
}
