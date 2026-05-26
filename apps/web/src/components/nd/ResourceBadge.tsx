'use client';

import { clsx } from 'clsx';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import type { ResourceIconKind } from '@/lib/nd-tokens';

interface ResIconProps {
  kind: ResourceIconKind;
  size?: number;
  color?: string;
}

/** Tiny resource glyph rendered from the design handoff palette. */
export function ResIcon({ kind, size = 14, color = 'currentColor' }: ResIconProps) {
  const map: Record<ResourceIconKind, ReactElement> = {
    cred:    <polygon points="8,1 15,5 15,11 8,15 1,11 1,5" fill="none" stroke={color} strokeWidth="1.4" />,
    sci:     <g><circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="1.4" /><circle cx="8" cy="8" r="2" fill={color} /></g>,
    bio:     <path d="M8 1 C 12 5, 12 11, 8 15 C 4 11, 4 5, 8 1 Z" fill="none" stroke={color} strokeWidth="1.4" />,
    gen:     <g><path d="M3 3 C 13 5, 3 11, 13 13" fill="none" stroke={color} strokeWidth="1.4" /><path d="M13 3 C 3 5, 13 11, 3 13" fill="none" stroke={color} strokeWidth="1.4" /></g>,
    min:     <polygon points="8,1 14,6 12,14 4,14 2,6" fill="none" stroke={color} strokeWidth="1.4" />,
    cpu:     <g><rect x="3" y="3" width="10" height="10" fill="none" stroke={color} strokeWidth="1.4" /><rect x="6" y="6" width="4" height="4" fill={color} /></g>,
    meat:    <path d="M3 8 Q 8 1, 13 8 Q 8 15, 3 8 Z" fill="none" stroke={color} strokeWidth="1.4" />,
    blood:   <path d="M8 1 L 13 9 Q 13 14, 8 14 Q 3 14, 3 9 Z" fill="none" stroke={color} strokeWidth="1.4" />,
    soul:    <g><circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="1.4" /><path d="M5 6 Q 8 11, 11 6" fill="none" stroke={color} strokeWidth="1.2" /></g>,
    dark:    <g><circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="1.4" /><path d="M8 2 A 6 6 0 0 1 8 14 Z" fill={color} /></g>,
    crystal: <polygon points="8,1 13,6 10,15 6,15 3,6" fill="none" stroke={color} strokeWidth="1.4" />,
    energy:  <path d="M9 1 L 4 9 L 8 9 L 6 15 L 12 7 L 8 7 Z" fill="none" stroke={color} strokeWidth="1.4" />,
    pop:     <g><circle cx="8" cy="5" r="2.5" fill="none" stroke={color} strokeWidth="1.4" /><path d="M3 14 Q 8 9, 13 14" fill="none" stroke={color} strokeWidth="1.4" /></g>,
    // Science (◈) — matches the glyph in atoms.tsx ResIcon so any consumer
    // of this badge can render `kind="science"` without diverging from
    // the HUD's diamond + center-dot symbol.
    science: <g><polygon points="8,1 15,8 8,15 1,8" fill="none" stroke={color} strokeWidth="1.4" /><circle cx="8" cy="8" r="1.6" fill={color} /></g>,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {map[kind]}
    </svg>
  );
}

interface ResourceBadgeProps {
  kind: ResourceIconKind;
  /** The amount, e.g. `"12,480"` or `2_300`. */
  value: ReactNode;
  /** Optional short label (max ~6 chars). Renders muted before the value. */
  label?: string;
  /** Race-tinted accent on the icon and outline. */
  accent?: string;
  /** Optional trailing delta or unit suffix. */
  trailing?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
  style?: CSSProperties;
}

/**
 * Compact resource pill used in HUDs and detail panels. Mirrors `ResPill`
 * from the handoff. Pass `accent={race.primary}` to tint with the active
 * race; omit for a neutral chrome look.
 */
export function ResourceBadge({
  kind,
  value,
  label,
  accent,
  trailing,
  size = 'md',
  className,
  style,
}: ResourceBadgeProps) {
  const px = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]';
  const iconSize = size === 'sm' ? 11 : 12;
  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1.5 font-nd-mono tracking-[0.04em] rounded-sm border bg-[rgba(8,12,26,0.7)] text-nd-text',
        px,
        className,
      )}
      style={{
        borderColor: accent ? `${accent}44` : 'var(--nd-border)',
        ...style,
      }}
    >
      <ResIcon kind={kind} size={iconSize} color={accent ?? 'var(--nd-text-dim)'} />
      {label && <span className="text-nd-mute uppercase text-[9px] tracking-[0.10em]">{label}</span>}
      <span>{value}</span>
      {trailing != null && <span className="text-nd-muted">{trailing}</span>}
    </div>
  );
}
