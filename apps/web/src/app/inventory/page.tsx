'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  InventoryItem,
  ItemCategory,
  ItemRarity,
  SortMode,
  CATEGORY_CONFIG,
  RARITY_CONFIG,
  DEMO_INVENTORY,
} from '@/types/inventory';
import { MangaPanel } from '@/components/ui/MangaPanel';
import { InventoryItemCard } from '@/components/ui/InventoryItemCard';
import { ItemDetailPanel } from '@/components/ui/ItemDetailPanel';
import clsx from 'clsx';

const CAPACITY_MAX = 200;
const CAPACITY_USED = 170;
const CAPACITY_WARN_THRESHOLD = 0.8;

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: SortMode.NADIR,      label: 'Nadir' },
  { value: SortMode.ADET,       label: 'Adet'  },
  { value: SortMode.SON_ALINAN, label: 'Son Alınan' },
];

const RARITY_ORDER: ItemRarity[] = [
  ItemRarity.EFSANEVI,
  ItemRarity.DESTANSI,
  ItemRarity.NADIR,
  ItemRarity.YAYGIN,
  ItemRarity.SIRADAN,
];

export default function InventoryPage() {
  const [activeCategory, setActiveCategory] = useState<ItemCategory>(ItemCategory.TUMSU);
  const [sortMode, setSortMode] = useState<SortMode>(SortMode.NADIR);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(DEMO_INVENTORY[4]);

  const categories = Object.values(ItemCategory) as ItemCategory[];

  const filteredItems = useMemo(() => {
    const items = activeCategory === ItemCategory.TUMSU
      ? DEMO_INVENTORY
      : DEMO_INVENTORY.filter(i => i.category === activeCategory);

    return [...items].sort((a, b) => {
      if (sortMode === SortMode.NADIR) {
        return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
      }
      if (sortMode === SortMode.ADET) {
        return b.quantity - a.quantity;
      }
      return b.acquiredAt - a.acquiredAt;
    });
  }, [activeCategory, sortMode]);

  const capacityRatio = CAPACITY_USED / CAPACITY_MAX;
  const isNearFull = capacityRatio >= CAPACITY_WARN_THRESHOLD;
  const isFull = capacityRatio >= 1;

  function handleItemClick(item: InventoryItem) {
    setSelectedItem(item);
  }

  return (
    <div
      className="h-dvh flex flex-col relative overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Backgrounds */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--gradient-nebula)', zIndex: 0 }}
        aria-hidden
      />
      <div className="fixed inset-0 halftone-bg pointer-events-none opacity-10" aria-hidden />

      {/* Top bar */}
      <header
        className="relative z-40 sticky top-0 flex items-center justify-between px-4 py-3 gap-3"
        style={{
          background: 'rgba(8,10,16,0.92)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/"
            className="font-display text-[11px] uppercase tracking-widest hover:text-text-primary transition-colors flex items-center gap-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ← Ana Üs
          </Link>
          <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <h1
            className="font-display font-black text-sm uppercase tracking-widest"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Envanter
          </h1>
        </div>

        {/* Capacity bar */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[10px] font-display uppercase tracking-wider shrink-0"
            style={{ color: isNearFull ? 'var(--color-warning)' : 'var(--color-text-muted)' }}
          >
            {CAPACITY_USED}/{CAPACITY_MAX}
          </span>
          <div
            className="w-24 h-2 rounded-full overflow-hidden shrink-0"
            style={{ background: 'rgba(255,255,255,0.08)' }}
            role="progressbar"
            aria-valuenow={CAPACITY_USED}
            aria-valuemax={CAPACITY_MAX}
            aria-label="Depo kapasitesi"
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(capacityRatio * 100, 100)}%`,
                background: isFull
                  ? 'var(--color-danger)'
                  : isNearFull
                  ? 'var(--color-warning)'
                  : 'var(--color-success)',
                boxShadow: isFull
                  ? '0 0 6px var(--color-danger)'
                  : isNearFull
                  ? '0 0 6px var(--color-warning)'
                  : undefined,
              }}
            />
          </div>
          {isNearFull && (
            <span
              className="text-[9px] font-display font-black uppercase tracking-wider shrink-0 animate-pulse"
              style={{ color: isFull ? 'var(--color-danger)' : 'var(--color-warning)' }}
            >
              {isFull ? '! DOLU' : '! Yakın'}
            </span>
          )}
        </div>
      </header>

      {/* Filter + Sort row */}
      <div
        className="relative z-30 sticky top-[53px] px-4 py-2 flex items-center gap-3 overflow-x-auto"
        style={{
          background: 'rgba(8,10,16,0.88)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Category tabs */}
        <div className="flex items-center gap-1.5 shrink-0">
          {categories.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const active = cat === activeCategory;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-display font-bold shrink-0 transition-all duration-200"
                style={{
                  background: active ? cfg.dimColor : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? cfg.color : 'rgba(255,255,255,0.07)'}`,
                  color: active ? cfg.color : 'var(--color-text-muted)',
                  boxShadow: active ? `0 0 8px ${cfg.color}40` : 'none',
                }}
              >
                <span>{cfg.icon}</span>
                <span className="hidden sm:inline">{cfg.label}</span>
              </button>
            );
          })}
        </div>

        <div
          className="h-4 w-px shrink-0"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          aria-hidden
        />

        {/* Sort buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {SORT_OPTIONS.map((opt) => {
            const active = opt.value === sortMode;
            return (
              <button
                key={opt.value}
                onClick={() => setSortMode(opt.value)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-display font-bold shrink-0 transition-all duration-150"
                style={{
                  background: active ? 'rgba(123,140,222,0.15)' : 'transparent',
                  color: active ? 'var(--color-brand)' : 'var(--color-text-muted)',
                  border: `1px solid ${active ? 'rgba(123,140,222,0.3)' : 'transparent'}`,
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <span
          className="ml-auto text-[10px] font-display shrink-0"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {filteredItems.length} eşya
        </span>
      </div>

      {/* Main layout */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Item Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {filteredItems.map((item) => (
              <InventoryItemCard
                key={item.id}
                item={item}
                selected={selectedItem?.id === item.id}
                onClick={() => handleItemClick(item)}
              />
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div
              className="flex flex-col items-center justify-center py-24 gap-3"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <span className="text-5xl opacity-20">◈</span>
              <p className="font-display text-xs uppercase tracking-widest opacity-50">
                Bu kategoride eşya yok
              </p>
            </div>
          )}
        </div>

        {/* Detail panel — desktop side, mobile bottom sheet */}
        <aside
          className={clsx(
            'lg:w-80 xl:w-96 shrink-0',
            'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
            'lg:border-l',
          )}
          style={{
            background: 'rgba(13,17,23,0.92)',
            borderColor: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <MangaPanel className="h-full min-h-[320px]">
            <ItemDetailPanel
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
              onUse={(item) => alert(`Kullanıldı: ${item.name}`)}
              onSell={(item) => alert(`Satıldı: ${item.name} — 💎 ${item.sellValue}`)}
            />
          </MangaPanel>
        </aside>
      </main>
    </div>
  );
}
