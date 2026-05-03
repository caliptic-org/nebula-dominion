'use client';

import clsx from 'clsx';

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export function Toggle({ checked, onChange, label, description, disabled, id }: ToggleProps) {
  const inputId = id ?? `toggle-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className="flex items-start justify-between gap-4">
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && (
            <label
              htmlFor={inputId}
              className="block font-display text-sm font-semibold tracking-wide text-text-primary cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="mt-1 text-xs text-text-muted leading-relaxed">{description}</p>
          )}
        </div>
      )}

      <button
        id={inputId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={clsx(
          'relative inline-flex shrink-0 items-center rounded-full transition-all duration-300 ease-spring',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        style={{
          width: 48,
          height: 28,
          background: checked ? 'var(--color-race)' : 'rgba(255,255,255,0.10)',
          border: `1px solid ${checked ? 'var(--color-race)' : 'rgba(255,255,255,0.14)'}`,
          boxShadow: checked ? '0 0 16px var(--color-race-glow)' : 'inset 0 1px 2px rgba(0,0,0,0.4)',
        }}
      >
        <span
          aria-hidden
          className="inline-block rounded-full transition-transform duration-300 ease-spring"
          style={{
            width: 22,
            height: 22,
            background: checked ? '#080a10' : '#e8e8f0',
            transform: checked ? 'translateX(22px)' : 'translateX(2px)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          }}
        />
      </button>
    </div>
  );
}
