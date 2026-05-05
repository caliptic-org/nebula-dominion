'use client';

import clsx from 'clsx';
import { InventoryItem, ItemRarity, RARITY_CONFIG, CATEGORY_CONFIG } from '@/types/inventory';

interface InventoryItemCardProps {
  item: InventoryItem;
  selected?: boolean;
  onClick?: () => void;
}

export function InventoryItemCard({ item, selected, onClick }: InventoryItemCardProps) {
  const rarity = RARITY_CONFIG[item.rarity];
  const category = CATEGORY_CONFIG[item.category];
  const isHighRarity = item.rarity === ItemRarity.EFSANEVI || item.rarity === ItemRarity.DESTANSI;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative group w-full aspect-square rounded-xl flex flex-col items-center justify-center',
        'transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
        'cursor-pointer select-none overflow-hidden',
        selected ? 'scale-[1.04]' : 'hover:scale-[1.02]',
      )}
      style={{
        background: selected ? rarity.dimColor : 'rgba(13,17,23,0.88)',
        border: `2px solid ${selected ? rarity.color : rarity.borderColor}`,
        boxShadow: selected
          ? `2px 2px 0 rgba(0,0,0,0.85), 0 0 18px ${rarity.glowColor}, inset 0 0 0 1px ${rarity.color}40`
          : `2px 2px 0 rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4)`,
        backdropFilter: 'blur(8px)',
      }}
      aria-label={item.name}
      aria-pressed={selected}
    >
      <div
        className="absolute top-0 left-3 right-3 h-[2px] rounded-full"
        style={{ background: category.color, opacity: 0.8 }}
        aria-hidden
      />

      {isHighRarity && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 60%, ${rarity.color}22 0%, transparent 65%)`,
          }}
          aria-hidden
        />
      )}


      <span
        className="text-2xl sm:text-3xl leading-none z-10 transition-transform duration-200 group-hover:scale-110"
        style={{ filter: isHighRarity ? `drop-shadow(0 0 6px ${rarity.color})` : undefined }}
        aria-hidden
      >
        {item.icon}
      </span>

      {item.quantity > 1 && (
        <span
          className="absolute bottom-1 right-1 text-[9px] font-display font-black tabular-nums leading-none px-1 py-0.5 rounded z-10"
          style={{
            background: 'rgba(0,0,0,0.8)',
            color: category.color,
            border: `1px solid ${category.color}40`,
          }}
        >
          {item.quantity > 999 ? '999+' : `×${item.quantity}`}
        </span>
      )}

      <div className="absolute bottom-1 left-1 flex gap-px z-10" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className="text-[6px] leading-none"
            style={{ color: i < rarity.stars ? rarity.color : 'rgba(255,255,255,0.1)' }}
          >
            &#9733;
          </span>
        ))}
      </div>

      {selected && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ boxShadow: `inset 0 0 0 2px ${rarity.color}` }}
          aria-hidden
        />
      )}
    </button>
  );
}
