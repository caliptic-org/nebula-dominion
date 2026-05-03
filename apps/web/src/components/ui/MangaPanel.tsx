'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

interface MangaPanelProps {
  children: ReactNode;
  className?: string;
  thick?: boolean;
  halftone?: boolean;
  glow?: boolean;
  style?: React.CSSProperties;
}

export function MangaPanel({ children, className, thick, halftone, glow, style }: MangaPanelProps) {
  return (
    <div
      className={clsx(
        'manga-panel',
        thick && 'manga-panel-thick',
        halftone && 'halftone-bg',
        glow && 'race-glow',
        className,
      )}
      style={style}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
