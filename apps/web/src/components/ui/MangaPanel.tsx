'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

interface MangaPanelProps {
  children: ReactNode;
  className?: string;
  thick?: boolean;
  halftone?: boolean;
  glow?: boolean;
  ink?: boolean;
  style?: React.CSSProperties;
}

export function MangaPanel({
  children,
  className,
  thick,
  halftone = true,
  glow,
  ink,
  style,
}: MangaPanelProps) {
  return (
    <div
      className={clsx(
        'manga-panel',
        thick && 'manga-panel-thick',
        ink && 'ink-border-strong',
        glow && 'race-glow',
        className,
      )}
      style={style}
    >
      {halftone && (
        <span className="manga-halftone-overlay" aria-hidden="true" />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
