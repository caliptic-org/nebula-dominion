'use client';

import { clsx } from 'clsx';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

interface BaseProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Display-rank typography atoms.
 *
 * Sizes (px / line-height / letter-spacing) follow handoff/nd-tokens.jsx so
 * dev preview matches the static comp 1:1. `font-nd-display`,
 * `font-nd-body`, and `font-nd-mono` are Tailwind utilities defined in
 * tailwind.config.ts and backed by next/font/google variables loaded in
 * src/app/layout.tsx.
 */

export function H1({ children, className, ...rest }: BaseProps) {
  return (
    <div
      {...rest}
      className={clsx(
        'font-nd-display text-[28px] font-bold tracking-[0.04em] leading-[1.05] text-nd-text',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function H2({ children, className, ...rest }: BaseProps) {
  return (
    <div
      {...rest}
      className={clsx(
        'font-nd-display text-[20px] font-semibold tracking-[0.06em] leading-[1.1] uppercase text-nd-text',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function H3({ children, className, ...rest }: BaseProps) {
  return (
    <div
      {...rest}
      className={clsx(
        'font-nd-display text-[14px] font-semibold tracking-[0.10em] leading-[1.2] uppercase text-nd-text',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Caption({ children, className, ...rest }: BaseProps) {
  return (
    <div
      {...rest}
      className={clsx(
        'font-nd-body text-[12px] leading-[1.45] text-nd-muted',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Inline monospace label — render code-like values, tick counters, hashes. */
export function Mono({ children, className, ...rest }: BaseProps) {
  return (
    <span
      {...rest}
      className={clsx(
        'font-nd-mono text-[11px] tracking-[0.04em] text-nd-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}

interface EyebrowProps extends BaseProps {
  /** Override colour. Defaults to muted text. */
  color?: string;
}

/** Tiny uppercase label that sits above a heading. */
export function Eyebrow({ children, color, className, style, ...rest }: EyebrowProps) {
  return (
    <div
      {...rest}
      className={clsx(
        'font-nd-mono text-[10px] tracking-[0.20em] uppercase',
        !color && 'text-nd-muted',
        className,
      )}
      style={{ color, ...style }}
    >
      {children}
    </div>
  );
}
