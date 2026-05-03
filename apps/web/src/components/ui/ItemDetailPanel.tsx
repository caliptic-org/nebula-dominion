'use client';

import { InventoryItem, RARITY_CONFIG, CATEGORY_CONFIG } from '@/types/inventory';
import { GlowButton } from './GlowButton';

interface ItemDetailPanelProps {
  item: InventoryItem | null;
  onClose?: () => void;
  onUse?: (item: InventoryItem) => void;
  onSell?: (item: InventoryItem) => void;
}

export function ItemDetailPanel({ item, onClose, onUse, onSell }: ItemDetailPanelProps) {
  if (!item) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3 p-6"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span className="text-4xl opacity-30">◈</span>
        <p className="font-display text-xs text-center tracking-widest uppercase opacity-50">
          Eşya seçin
        </p>
      </div>
    );
  }

  const rarity = RARITY_CONFIG[item.rarity];
  const category = CATEGORY_CONFIG[item.category];

  return (
    <div className="flex flex-col h-full overflow-hidden animate-manga-appear">
      {/* Header */}
      <div
        className="px-5 py-4 flex items-start justify-between gap-3"
        style={{
          borderBottom: `1px solid ${rarity.color}30`,
          background: rarity.dimColor,
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="text-4xl leading-none shrink-0"
            style={{ filter: `drop-shadow(0 0 8px ${rarity.color})` }}
            aria-hidden
          >
            {item.icon}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] font-display font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  background: rarity.dimColor,
                  color: rarity.color,
                  border: `1px solid ${rarity.borderColor}`,
                  boxShadow: `0 0 8px ${rarity.glowColor}`,
                }}
              >
                {rarity.label}
              </span>
              <span
                className="text-[10px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  color: category.color,
                  border: `1px solid ${category.color}30`,
                }}
              >
                {category.icon} {category.label}
              </span>
            </div>
            <h2
              className="font-display font-black text-sm mt-1 truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {item.name}
            </h2>
            {/* Rarity stars */}
            <div className="flex gap-0.5 mt-0.5" aria-label={`${rarity.stars} yıldız`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="text-[10px] leading-none"
                  style={{ color: i < rarity.stars ? rarity.color : 'rgba(255,255,255,0.1)' }}
                >
                  &#9733;
                </span>
              ))}
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-xs transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--color-text-muted)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            aria-label="Kapat"
          >
            ✕
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Description */}
        <p
          className="text-xs leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {item.description}
        </p>

        {/* Quantity */}
        <div
          className="flex items-center justify-between px-3 py-2 rounded-lg"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span
            className="text-xs font-display font-bold uppercase tracking-wider"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Adet
          </span>
          <span
            className="font-display font-black text-sm tabular-nums"
            style={{ color: category.color }}
          >
            {item.quantity.toLocaleString()}
          </span>
        </div>

        {/* Effects */}
        {item.effects.length > 0 && (
          <div className="space-y-2">
            <h3
              className="text-[10px] font-display font-black uppercase tracking-widest"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Etki Değerleri
            </h3>
            <div className="space-y-1.5">
              {item.effects.map((effect, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{
                    background: effect.positive
                      ? 'rgba(68,221,136,0.06)'
                      : 'rgba(255,68,68,0.06)',
                    border: `1px solid ${effect.positive ? 'rgba(68,221,136,0.18)' : 'rgba(255,68,68,0.18)'}`,
                  }}
                >
                  <span
                    className="text-xs font-display"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {effect.label}
                  </span>
                  <span
                    className="text-xs font-display font-black tabular-nums"
                    style={{
                      color: effect.positive === false
                        ? 'var(--color-danger)'
                        : 'var(--color-success)',
                    }}
                  >
                    {effect.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sell value */}
        {item.canSell && (
          <div
            className="flex items-center justify-between px-3 py-2 rounded-lg"
            style={{
              background: 'rgba(255,200,50,0.06)',
              border: '1px solid rgba(255,200,50,0.18)',
            }}
          >
            <span
              className="text-xs font-display font-bold uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Satış Değeri
            </span>
            <span
              className="font-display font-black text-sm tabular-nums"
              style={{ color: 'var(--color-energy)' }}
            >
              💎 {item.sellValue}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className="px-5 py-4 flex gap-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {item.canUse && (
          <GlowButton
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => onUse?.(item)}
          >
            Kullan
          </GlowButton>
        )}
        {item.canSell && (
          <GlowButton
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => onSell?.(item)}
          >
            Sat
          </GlowButton>
        )}
        {!item.canUse && !item.canSell && (
          <p
            className="text-[10px] text-center w-full font-display uppercase tracking-widest"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Bu eşya kullanılamaz veya satılamaz
          </p>
        )}
      </div>
    </div>
  );
}
