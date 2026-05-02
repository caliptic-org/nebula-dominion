import clsx from 'clsx';
import type { CSSProperties, ElementType, ReactNode } from 'react';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  glow?: boolean;
  glowColor?: string;
  bordered?: boolean;
  raceColor?: string;
  style?: CSSProperties;
  as?: ElementType;
}

const PADDING_MAP = {
  none: '0',
  sm:   '12px',
  md:   '20px',
  lg:   '28px',
};

export function GlassPanel({
  children,
  className,
  padding = 'md',
  glow = false,
  glowColor,
  bordered = true,
  raceColor,
  style,
  as: Tag = 'div',
}: GlassPanelProps) {
  const borderColor = raceColor
    ? `${raceColor}30`
    : 'var(--color-border)';

  const boxShadow = glow
    ? `0 0 24px ${glowColor ?? raceColor ?? 'var(--color-brand-glow)'}`
    : undefined;

  const Component = Tag as 'div';

  return (
    <Component
      className={clsx('glass-card', className)}
      style={{
        padding: PADDING_MAP[padding],
        border: bordered ? `1px solid ${borderColor}` : undefined,
        boxShadow,
        ...style,
      }}
    >
      {children}
    </Component>
  );
}
