'use client';

import Link from 'next/link';
import { ResourceIcon } from '@/components/ui/ResourceIcon';

interface ResourceBarProps {
  mineral?: number;
  gas?: number;
  energy?: number;
  level?: number;
  age?: number;
  xpPercent?: number;
}

export function TopResourceBar({
  mineral = 1250,
  gas = 640,
  energy = 200,
  level = 1,
  age = 1,
  xpPercent = 42,
}: ResourceBarProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2 px-3 py-2"
      style={{
        background: 'rgba(10, 13, 20, 0.92)',
        borderBottom: '1px solid var(--color-border)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      role="banner"
    >
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 mr-2 shrink-0"
        aria-label="Nebula Dominion ana sayfa"
      >
        <span className="text-xl" aria-hidden>🌌</span>
        <span
          className="hidden sm:block text-xs font-bold tracking-widest text-gradient-brand font-display"
          style={{ letterSpacing: '2px' }}
        >
          ND
        </span>
      </Link>

      {/* Resources */}
      <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-none">
        <ResourceChip type="mineral" value={mineral} />
        <ResourceChip type="gas" value={gas} />
        <ResourceChip type="energy" value={energy} />
      </div>

      {/* Level + XP */}
      <div className="flex items-center gap-2 shrink-0 ml-1">
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-full"
          style={{
            background: 'rgba(16, 20, 36, 0.85)',
            border: '1px solid rgba(255, 206, 58, 0.25)',
          }}
        >
          <span className="font-display text-xs font-bold text-energy whitespace-nowrap">
            Çağ {age} · Sv {level}
          </span>
          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full progress-fill-energy"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function ResourceChip({ type, value }: { type: 'mineral' | 'gas' | 'energy'; value: number }) {
  return (
    <div className={`resource-chip ${type === 'energy' ? 'energy-res' : type}`}>
      <ResourceIcon type={type} size={14} />
      <span>{value.toLocaleString('tr-TR')}</span>
    </div>
  );
}
