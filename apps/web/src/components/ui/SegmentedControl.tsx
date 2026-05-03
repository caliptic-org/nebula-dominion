'use client';

import clsx from 'clsx';
import { ReactNode } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  description?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (next: T) => void;
  ariaLabel?: string;
  fullWidth?: boolean;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  fullWidth = true,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={clsx('inline-flex p-1 rounded-xl gap-1', fullWidth && 'w-full')}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={clsx(
              'flex-1 flex flex-col items-center justify-center gap-1 px-3 py-2.5 rounded-lg',
              'font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ease-spring',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
            )}
            style={{
              background: active ? 'var(--color-race)' : 'transparent',
              color: active ? '#080a10' : 'var(--color-text-secondary)',
              boxShadow: active ? '0 0 16px var(--color-race-glow), inset 0 1px 0 rgba(255,255,255,0.2)' : undefined,
            }}
          >
            {opt.icon && <span aria-hidden className="text-base leading-none">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.description && (
              <span
                className="text-[10px] font-normal normal-case tracking-normal opacity-80"
                style={{ color: active ? '#080a10' : 'var(--color-text-muted)' }}
              >
                {opt.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
