'use client';

import { clsx } from 'clsx';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { ND, type RaceTheme } from '@/lib/nd-tokens';

/* ── Screen ───────────────────────────────────────────────────────────── */

interface ScreenProps extends HTMLAttributes<HTMLDivElement> {
  /** Race providing the background tint. Required so screens stay readable. */
  race: RaceTheme;
  /** Intensity of the nebula glow (0–1). Defaults to 1. */
  intensity?: number;
  /** Overall dimmer for inactive/preview states (0–1). Defaults to 1. */
  dim?: number;
  /**
   * Fixed-width iOS frame body (390×844). Set to `false` to fill the
   * available area instead — handy for full-page layouts.
   */
  framed?: boolean;
  children?: ReactNode;
}

/**
 * Race-tinted dark backdrop for a screen. Renders a layered radial gradient
 * over the deep void colour so each race feels distinct without changing
 * surrounding chrome.
 */
export function Screen({
  race,
  intensity = 1,
  dim = 1,
  framed = false,
  className,
  style,
  children,
  ...rest
}: ScreenProps) {
  const layers = [
    `radial-gradient(60% 60% at 20% 15%, ${race.primary} 0%, transparent 60%)`,
    `radial-gradient(55% 55% at 85% 80%, oklch(0.55 0.18 280) 0%, transparent 70%)`,
    `radial-gradient(80% 80% at 50% 50%, transparent 0%, rgba(0,0,0,0.55) 100%)`,
    ND.bg,
  ].join(', ');

  return (
    <div
      {...rest}
      data-nd-screen
      className={clsx(
        'relative overflow-hidden text-nd-text font-nd-body',
        framed ? 'w-[390px] h-[844px] rounded-[32px] ring-1 ring-white/10' : 'w-full h-full',
        className,
      )}
      style={{
        background: layers,
        // dim/intensity drive the gradient strength; cheap and reversible.
        // We tint via opacity so a low-emphasis preview reads as inactive.
        opacity: Math.min(1, Math.max(0, intensity * dim)),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Frame ────────────────────────────────────────────────────────────── */

interface FrameProps extends HTMLAttributes<HTMLDivElement> {
  /** Padding tier — maps to ND.spacing. Defaults to `lg`. */
  pad?: keyof typeof ND.spacing;
  children?: ReactNode;
}

/**
 * Spacer / container that flows children in a vertical stack with consistent
 * gap and the active density's padding. Use inside `<Screen>` as the body.
 */
export function Frame({ pad = 'lg', className, style, children, ...rest }: FrameProps) {
  return (
    <div
      {...rest}
      className={clsx('relative flex flex-col gap-[var(--nd-density-gap)]', className)}
      style={{
        padding: ND.spacing[pad],
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Panel ────────────────────────────────────────────────────────────── */

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** When true, uses the elevated surface + brighter border. */
  hi?: boolean;
  /** Adds a race-tinted halo. Requires `race`. */
  glow?: boolean;
  race?: RaceTheme;
  /** Render with a clip-path notched corner (uses `nd-notch`). */
  notch?: boolean;
  children?: ReactNode;
}

export function Panel({
  hi = false,
  glow = false,
  race,
  notch = false,
  className,
  style,
  children,
  ...rest
}: PanelProps) {
  return (
    <div
      {...rest}
      className={clsx(
        'relative rounded-md backdrop-blur',
        hi ? 'bg-nd-surface-hi border border-nd-line-hi' : 'bg-nd-surface border border-nd-line',
        notch && 'nd-notch rounded-none',
        className,
      )}
      style={{
        boxShadow: glow && race
          ? `0 0 0 1px ${race.primary}40, 0 0 24px -8px ${race.glow}`
          : 'inset 0 1px 0 rgba(255,255,255,0.04)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── NeonBorder ───────────────────────────────────────────────────────── */

interface NeonBorderProps extends HTMLAttributes<HTMLDivElement> {
  race: RaceTheme;
  /** Border thickness in px. Defaults to 1. */
  width?: number;
  /** Spread of the outer glow halo in px. Defaults to 18. */
  spread?: number;
  /** When true, also pulses the glow softly. */
  pulse?: boolean;
  children?: ReactNode;
}

/**
 * Race-tinted border with an outer halo. Wrap any block to give it the
 * "powered" feeling of HUD bezels without redefining the wrapper's layout.
 */
export function NeonBorder({
  race,
  width = 1,
  spread = 18,
  pulse = false,
  className,
  style,
  children,
  ...rest
}: NeonBorderProps) {
  return (
    <div
      {...rest}
      className={clsx('relative rounded-md', pulse && 'animate-nd-glow', className)}
      style={{
        border: `${width}px solid ${race.primary}`,
        boxShadow: `0 0 ${spread}px -2px ${race.glow}, inset 0 0 ${Math.max(4, spread / 2)}px -2px ${race.primaryDim}`,
        color: race.primary,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── RaceChip ─────────────────────────────────────────────────────────── */

interface RaceChipProps {
  race: RaceTheme;
  /** When true, signals this chip represents the active race. */
  active?: boolean;
  /** Optional override label. Defaults to the race's `short` tag. */
  label?: string;
  /** Click handler — when omitted the chip renders as a span. */
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function RaceChip({ race, active = false, label, onClick, className, style }: RaceChipProps) {
  const text = label ?? race.short;
  const inner = (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: race.primary, boxShadow: active ? `0 0 6px ${race.glow}` : 'none' }}
      />
      {text}
    </span>
  );
  const base = clsx(
    'inline-flex items-center gap-1.5 px-1.5 py-0.5 font-nd-mono text-[10px] uppercase tracking-[0.14em] rounded-sm border',
    className,
  );
  const inlineStyle: CSSProperties = {
    borderColor: active ? race.primary : `${race.primary}55`,
    color: active ? race.primary : 'var(--nd-text-dim)',
    background: active ? `${race.primary}18` : 'transparent',
    ...style,
  };
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={base} style={inlineStyle} aria-pressed={active}>
        {inner}
      </button>
    );
  }
  return (
    <span className={base} style={inlineStyle}>
      {inner}
    </span>
  );
}

/* ── Stat ─────────────────────────────────────────────────────────────── */

interface StatProps {
  /** Tiny eyebrow label above the value (e.g. "GÜÇ"). */
  label: string;
  /** The headline value (e.g. "12,480" or "Lv 24"). */
  value: ReactNode;
  /** Optional trailing detail (delta, suffix). */
  trailing?: ReactNode;
  /** Race-tinted accent on the value. */
  race?: RaceTheme;
  align?: 'left' | 'center' | 'right';
  className?: string;
  style?: CSSProperties;
}

export function Stat({ label, value, trailing, race, align = 'left', className, style }: StatProps) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-0.5',
        align === 'center' && 'items-center text-center',
        align === 'right' && 'items-end text-right',
        className,
      )}
      style={style}
    >
      <span className="font-nd-mono text-[9px] tracking-[0.20em] uppercase text-nd-mute">{label}</span>
      <span
        className="font-nd-display text-[18px] leading-none tracking-[0.04em]"
        style={{ color: race?.primary ?? 'var(--nd-text)' }}
      >
        {value}
      </span>
      {trailing != null && (
        <span className="font-nd-mono text-[10px] tracking-[0.06em] text-nd-muted">{trailing}</span>
      )}
    </div>
  );
}
