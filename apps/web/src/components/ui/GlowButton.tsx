'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'race';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
}

export function GlowButton({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  className,
  disabled,
  ...props
}: GlowButtonProps) {
  const sizes = {
    sm: 'px-4 py-1.5 text-xs gap-1.5',
    md: 'px-6 py-2.5 text-sm gap-2',
    lg: 'px-8 py-3.5 text-base gap-2.5',
  };

  const variants = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    race: 'btn-primary',
  };

  return (
    <button
      className={clsx(
        variants[variant],
        sizes[size],
        'btn-speed-flash',
        'group relative flex items-center justify-center font-display font-bold tracking-widest uppercase rounded-full',
        'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <span
            className="inline-block w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"
            aria-hidden
          />
          <span>Yükleniyor…</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          {icon && (
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/20
                         transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                         group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-110"
              aria-hidden
            >
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  );
}
