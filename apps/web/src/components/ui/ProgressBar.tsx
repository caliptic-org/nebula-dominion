import clsx from 'clsx';

type ProgressVariant = 'brand' | 'accent' | 'energy' | 'health' | 'xp' | 'danger' | 'custom';

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
  scanning?: boolean;
}

const VARIANT_LABEL_COLOR: Record<ProgressVariant, string> = {
  brand:  'var(--color-brand)',
  accent: 'var(--color-accent)',
  energy: 'var(--color-energy)',
  health: 'var(--color-success)',
  xp:     '#c04aff',
  danger: 'var(--color-danger)',
  custom: 'var(--color-accent)',
};

export function ProgressBar({
  value,
  max = 100,
  variant = 'accent',
  size = 'sm',
  label,
  showValue = false,
  glow = true,
  className,
  customColor,
  animated = true,
  scanning = false,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const labelColor = customColor ?? VARIANT_LABEL_COLOR[variant];

  const customStyle =
    variant === 'custom' && customColor
      ? ({
          ['--hud-fill-gradient' as string]: `linear-gradient(90deg, ${customColor}66, ${customColor})`,
          ['--hud-fill-glow' as string]: `${customColor}99`,
          ['--hud-edge-glow' as string]: customColor,
          ['--hud-track-border' as string]: `${customColor}33`,
          ['--hud-tick-color' as string]: `${customColor}33`,
        } as React.CSSProperties)
      : undefined;

  return (
    <div className={clsx('w-full', className)}>
      {(label || showValue) && (
        <div
          className="flex justify-between items-baseline mb-1.5"
          style={{ fontSize: 11 }}
        >
          {label && (
            <span
              style={{
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
              }}
            >
              {label}
            </span>
          )}
          {showValue && (
            <span
              style={{
                color: labelColor,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.05em',
              }}
            >
              {value.toLocaleString('tr-TR')} / {max.toLocaleString('tr-TR')}
            </span>
          )}
        </div>
      )}

      <div
        className={clsx(
          'hud-progress-bar',
          `hud-progress-bar--${size}`,
          variant !== 'custom' && `hud-progress-bar--${variant}`,
          scanning && 'hud-progress-bar--scanning',
        )}
        style={customStyle}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="hud-progress-fill"
          style={{
            width: `${pct}%`,
            transition: animated
              ? 'width 0.6s cubic-bezier(0.32,0.72,0,1)'
              : 'none',
            boxShadow: glow ? undefined : 'none',
          }}
        />
      </div>
    </div>
  );
}
