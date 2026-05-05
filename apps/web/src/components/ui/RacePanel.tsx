'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

interface RacePanelProps {
  children: ReactNode;
  className?: string;
  isActive?: boolean;
  as?: 'div' | 'section' | 'aside' | 'article';
  style?: React.CSSProperties;
  role?: string;
  'aria-label'?: string;
}

export function RacePanel({
  children,
  className,
  isActive,
  as: Tag = 'div',
  style,
  role,
  'aria-label': ariaLabel,
}: RacePanelProps) {
  return (
    <Tag
      className={clsx('race-panel', isActive && 'is-active', className)}
      style={style}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </Tag>
  );
}
