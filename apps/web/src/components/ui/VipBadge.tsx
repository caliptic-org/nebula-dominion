'use client';

import Link from 'next/link';

interface VipBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  clickable?: boolean;
}

const GOLD = '#FFD700';
const GOLD_GLOW = 'rgba(255,215,0,0.35)';
const GOLD_DIM = 'rgba(255,215,0,0.12)';

const LEVEL_ICONS: Record<number, string> = {
  1: '🥉', 2: '🥉', 3: '🥈', 4: '🥈', 5: '🥇',
  6: '🥇', 7: '💠', 8: '💠', 9: '💎', 10: '👑',
};

const SIZE_CONFIG = {
  sm: { px: '4px 8px',   fontSize: '0.55rem', iconSize: 10, gap: 4 },
  md: { px: '5px 10px',  fontSize: '0.65rem', iconSize: 13, gap: 5 },
  lg: { px: '6px 14px',  fontSize: '0.75rem', iconSize: 16, gap: 6 },
};

// Module-level keyframe injected once, not per render
const VIP_BADGE_KEYFRAMES = `
  @keyframes vip-badge-pulse {
    0%, 100% { box-shadow: 0 0 12px ${GOLD_GLOW}; }
    50%       { box-shadow: 0 0 22px rgba(255,215,0,0.50); }
  }
`;

let keyframesInjected = false;
function ensureKeyframes() {
  if (keyframesInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = VIP_BADGE_KEYFRAMES;
  document.head.appendChild(style);
  keyframesInjected = true;
}

export function VipBadge({ level, size = 'md', animated = false, clickable = true }: VipBadgeProps) {
  const cfg = SIZE_CONFIG[size];
  const icon = LEVEL_ICONS[Math.min(Math.max(level, 1), 10)] ?? '👑';

  if (animated) ensureKeyframes();

  const badge = (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: cfg.gap,
      padding: cfg.px, borderRadius: 9999,
      background: GOLD_DIM,
      border: `1px solid ${GOLD_GLOW}`,
      boxShadow: animated ? `0 0 12px ${GOLD_GLOW}` : 'none',
      cursor: clickable ? 'pointer' : 'default',
      animation: animated ? 'vip-badge-pulse 2.5s ease-in-out infinite' : 'none',
      textDecoration: 'none',
      userSelect: 'none',
    }}>
      <span style={{ fontSize: cfg.iconSize, lineHeight: 1 }}>{icon}</span>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: cfg.fontSize,
        fontWeight: 800,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: GOLD,
      }}>
        VIP {level}
      </span>
    </span>
  );

  if (clickable) {
    return <Link href="/vip" style={{ textDecoration: 'none' }}>{badge}</Link>;
  }
  return badge;
}
