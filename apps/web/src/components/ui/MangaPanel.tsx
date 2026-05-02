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
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-8 h-8 pointer-events-none" aria-hidden>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M0 0 L16 0" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
          <path d="M0 0 L0 16" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
        </svg>
      </div>
      <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none" style={{ transform: 'scaleX(-1)' }} aria-hidden>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M0 0 L16 0" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
          <path d="M0 0 L0 16" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 w-8 h-8 pointer-events-none" style={{ transform: 'scaleY(-1)' }} aria-hidden>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M0 0 L16 0" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
          <path d="M0 0 L0 16" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none" style={{ transform: 'scale(-1,-1)' }} aria-hidden>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M0 0 L16 0" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
          <path d="M0 0 L0 16" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
        </svg>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
