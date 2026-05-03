'use client';

import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'energy' | 'danger' | 'race';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  loading?: boolean;
  raceColor?: string;
  glow?: boolean;
  fullWidth?: boolean;
}

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-7 py-3.5 text-base gap-2.5',
};

const FONT_SIZE: Record<ButtonSize, string> = { sm: '11px', md: '13px', lg: '15px' };

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  trailingIcon,
  loading = false,
  raceColor,
  glow = false,
  fullWidth = false,
  className,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '10px',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: FONT_SIZE[size],
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    transition: 'all 0.2s cubic-bezier(0.32,0.72,0,1)',
    width: fullWidth ? '100%' : undefined,
    border: 'none',
    outline: 'none',
    userSelect: 'none',
    ...style,
  };

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: 'var(--color-brand)',
      color: '#fff',
      boxShadow: glow ? '0 0 16px var(--color-brand-glow)' : '0 2px 8px rgba(0,0,0,0.3)',
    },
    secondary: {
      background: 'var(--color-bg-elevated)',
      color: 'var(--color-text-primary)',
      border: '1px solid var(--color-border-hover)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-text-secondary)',
      border: '1px solid var(--color-border)',
    },
    energy: {
      background: 'var(--color-energy)',
      color: '#07090f',
      boxShadow: glow ? '0 0 16px rgba(255,200,50,0.4)' : '0 2px 8px rgba(0,0,0,0.3)',
    },
    danger: {
      background: 'var(--color-danger)',
      color: '#fff',
      boxShadow: glow ? '0 0 16px rgba(255,68,68,0.4)' : '0 2px 8px rgba(0,0,0,0.3)',
    },
    race: {
      background: raceColor ? `${raceColor}20` : 'var(--color-bg-elevated)',
      color: raceColor ?? 'var(--color-text-primary)',
      border: `1px solid ${raceColor ? `${raceColor}50` : 'var(--color-border)'}`,
      boxShadow: glow && raceColor ? `0 0 14px ${raceColor}30` : undefined,
    },
  };

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={clsx(SIZE_STYLES[size], className)}
      style={{ ...baseStyle, ...variantStyles[variant] }}
    >
      {loading ? (
        <span
          style={{
            width: 14,
            height: 14,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            display: 'inline-block',
          }}
          aria-hidden
        />
      ) : icon ? (
        <span aria-hidden style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
      ) : null}
      <span>{children}</span>
      {trailingIcon && (
        <span
          aria-hidden
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            transition: 'transform 0.2s cubic-bezier(0.32,0.72,0,1)',
          }}
        >
          {trailingIcon}
        </span>
      )}
    </button>
  );
}
