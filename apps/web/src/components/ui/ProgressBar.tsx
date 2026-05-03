interface ProgressBarProps {
  value: number;
  max: number;
  variant?: 'brand' | 'energy' | 'health';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const heightClass = { sm: 'h-1', md: 'h-1.5', lg: 'h-2.5' };

const fillClass = {
  brand: 'progress-fill-brand',
  energy: 'progress-fill-energy',
  health: 'progress-fill-health',
};

export function ProgressBar({ value, max, variant = 'brand', size = 'md', showLabel, label, className }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const isLow = variant === 'health' && percent < 30;

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-text-muted uppercase tracking-wider font-display">{label}</span>}
          <span className="text-xs font-bold ml-auto" style={{ color: isLow ? 'var(--color-danger)' : undefined }}>
            {value.toLocaleString('tr-TR')} / {max.toLocaleString('tr-TR')}
          </span>
        </div>
      )}
      <div className={`progress-track ${heightClass[size]}`}>
        <div
          className={`progress-fill ${fillClass[variant]} ${isLow ? 'low' : ''}`}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}
