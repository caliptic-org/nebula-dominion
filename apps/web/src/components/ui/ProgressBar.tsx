import clsx from 'clsx';

type ProgressVariant = 'brand' | 'energy' | 'health' | 'xp' | 'custom';

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label?: string;
  showValue?: boolean;
  glow?: boolean;
  className?: string;
  customColor?: string;
  animated?: boolean;
}

const VARIANT_COLORS: Record<ProgressVariant, string> = {
  brand:  'var(--color-brand)',
  energy: 'var(--color-energy)',
  health: 'var(--color-success)',
  xp:     'var(--color-accent)',
  custom: 'var(--color-brand)',
};

const VARIANT_GLOW: Record<ProgressVariant, string> = {
  brand:  'var(--color-brand-glow)',
  energy: 'var(--color-energy-dim)',
  health: 'rgba(68,221,136,0.4)',
  xp:     'var(--color-accent-dim)',
  custom: 'transparent',
};

const SIZE_HEIGHTS: Record<NonNullable<ProgressBarProps['size']>, string> = {
  xs: '3px',
  sm: '5px',
  md: '8px',
  lg: '12px',
};

export function ProgressBar({
  value,
  max = 100,
  variant = 'brand',
  size = 'sm',
  label,
  showValue = false,
  glow = false,
  className,
  customColor,
  animated = false,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const color = customColor ?? VARIANT_COLORS[variant];
  const glowColor = VARIANT_GLOW[variant];
  const height = SIZE_HEIGHTS[size];

  return (
    <div className={clsx('w-full', className)}>
      {(label || showValue) && (
        <div
          className="flex justify-between items-center mb-1.5"
          style={{ fontSize: 11 }}
        >
          {label && (
            <span style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {label}
            </span>
          )}
          {showValue && (
            <span style={{ color, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              {value.toLocaleString('tr-TR')} / {max.toLocaleString('tr-TR')}
            </span>
          )}
        </div>
      )}

      <div
        style={{
          height,
          background: 'rgba(255,255,255,0.07)',
          borderRadius: height,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: height,
            transition: animated ? 'width 0.6s cubic-bezier(0.32,0.72,0,1)' : 'width 0.3s ease',
            boxShadow: glow ? `0 0 8px ${glowColor}` : undefined,
            position: 'relative',
          }}
        >
          {glow && pct > 5 && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '20px',
                background: `linear-gradient(to right, transparent, rgba(255,255,255,0.4))`,
                borderRadius: height,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
