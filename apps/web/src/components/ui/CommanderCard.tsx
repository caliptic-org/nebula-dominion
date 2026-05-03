'use client';

import Image from 'next/image';
import { useState } from 'react';
import { CommanderInfo, RACE_DESCRIPTIONS } from '@/types/units';
import clsx from 'clsx';

interface CommanderCardProps {
  commander: CommanderInfo;
  onSelect?: (commander: CommanderInfo) => void;
  selected?: boolean;
  compact?: boolean;
}

export function CommanderCard({ commander, onSelect, selected, compact }: CommanderCardProps) {
  const [imgError, setImgError] = useState(false);
  const desc = RACE_DESCRIPTIONS[commander.race];

  return (
    <button
      onClick={() => onSelect?.(commander)}
      className={clsx(
        'commander-card text-left group relative overflow-hidden',
        !commander.isUnlocked && 'locked',
        selected && 'race-border',
        compact ? 'w-[140px]' : 'w-full',
      )}
      style={{
        '--color-race': desc.color,
        '--color-race-glow': desc.glowColor,
      } as React.CSSProperties}
      aria-pressed={selected}
      aria-label={`${commander.name} komutanı ${!commander.isUnlocked ? '(kilitli)' : ''}`}
    >
      {/* Portrait */}
      <div className={clsx('relative overflow-hidden', compact ? 'h-36' : 'h-52')}>
        {!imgError ? (
          <Image
            src={commander.portrait}
            alt={commander.name}
            fill
            className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
            sizes={compact ? '140px' : '(max-width: 768px) 50vw, 200px'}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl"
            style={{ background: desc.bgColor }}
          >
            {desc.icon}
          </div>
        )}
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${desc.bgColor.replace('0.08', '0.9')} 0%, transparent 60%)`,
          }}
        />
        {/* Manga halftone texture */}
        <span
          className="manga-halftone-overlay"
          style={{ color: desc.color }}
          aria-hidden
        />
        {/* Level badge */}
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-display font-bold"
          style={{ background: desc.bgColor, color: desc.color, border: `1px solid ${desc.color}40` }}
        >
          Lv.{commander.level}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3
          className="font-display font-bold text-sm mb-1"
          style={{ color: desc.color }}
        >
          {commander.name}
        </h3>
        {!compact && (
          <p className="text-text-muted text-xs leading-relaxed line-clamp-2">
            {commander.story}
          </p>
        )}
      </div>

      {/* Lock overlay */}
      {!commander.isUnlocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <span className="text-2xl mb-2">🔒</span>
          <span className="font-display text-xs text-text-muted uppercase tracking-widest">Kilitli</span>
        </div>
      )}

      {/* Selected glow border */}
      {selected && (
        <div
          className="absolute inset-0 rounded-[16px] pointer-events-none"
          style={{
            boxShadow: `inset 0 0 0 2px ${desc.color}, 0 0 20px ${desc.glowColor}`,
          }}
        />
      )}
    </button>
  );
}
