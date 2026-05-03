'use client';

import clsx from 'clsx';
import { ChangeEvent } from 'react';

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (next: number) => void;
  label?: string;
  icon?: string;
  disabled?: boolean;
  id?: string;
  formatValue?: (v: number) => string;
}

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  label,
  icon,
  disabled,
  id,
  formatValue,
}: SliderProps) {
  const inputId = id ?? `slider-${Math.random().toString(36).slice(2, 8)}`;
  const percent = ((value - min) / (max - min)) * 100;

  function handle(e: ChangeEvent<HTMLInputElement>) {
    onChange(Number(e.target.value));
  }

  return (
    <div className={clsx('flex flex-col gap-2', disabled && 'opacity-50')}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="font-display text-xs font-semibold tracking-widest uppercase text-text-secondary flex items-center gap-2"
          >
            {icon && <span aria-hidden className="text-base">{icon}</span>}
            {label}
          </label>
          <span
            className="font-mono text-xs font-bold tabular-nums px-2 py-0.5 rounded"
            style={{
              background: 'var(--color-race-dim)',
              color: 'var(--color-race)',
              border: '1px solid var(--color-race-glow)',
              minWidth: 44,
              textAlign: 'center',
            }}
          >
            {formatValue ? formatValue(value) : value}
          </span>
        </div>
      )}

      <div className="relative h-6 flex items-center">
        <div
          className="absolute inset-x-0 h-2 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)' }}
          aria-hidden
        >
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${percent}%`,
              background: 'linear-gradient(90deg, var(--color-race) 0%, var(--color-race) 100%)',
              boxShadow: `0 0 12px var(--color-race-glow)`,
            }}
          />
        </div>
        <input
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handle}
          disabled={disabled}
          aria-label={label}
          className="settings-slider"
        />
      </div>
    </div>
  );
}
