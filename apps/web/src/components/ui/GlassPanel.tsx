import { HTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'card' | 'panel';
  hoverable?: boolean;
  neon?: boolean;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ variant = 'card', hoverable, neon, className, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          variant === 'card' ? 'glass-card' : 'glass-panel',
          hoverable && 'hover-glow cursor-pointer',
          neon && 'neon-border',
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

GlassPanel.displayName = 'GlassPanel';
