'use client';

import { useState, useMemo } from 'react';
import {
  EquipmentItem,
  EquipmentSlotType,
  EquipmentRarity,
  EquipmentStats,
  RARITY_COLORS,
  SLOT_META,
} from '@/types/equipment';
import { MangaPanel } from './MangaPanel';

const RARITY_ORDER: EquipmentRarity[] = [
  EquipmentRarity.EFSANEVI,
  EquipmentRarity.DESTANSI,
  EquipmentRarity.NADIR,
  EquipmentRarity.YAYGIN,
  EquipmentRarity.SIRADAN,
];

interface EquipmentModalProps {
  slot: EquipmentSlotType;
  currentItem?: EquipmentItem;
  inventory: EquipmentItem[];
  inventoryLoading?: boolean;
  inventoryError?: string | null;
  onRetry?: () => void;
  raceColor: string;
  raceGlow: string;
  mutating?: boolean;
  onSelect: (item: EquipmentItem) => void;
  onClose: () => void;
  onUnequip?: () => void;
}

export function EquipmentModal({
  slot,
  currentItem,
  inventory: allInventory,
  inventoryLoading = false,
  inventoryError = null,
  onRetry,
  raceColor,
  raceGlow,
  mutating = false,
  onSelect,
  onClose,
  onUnequip,
}: EquipmentModalProps) {
  const [hovered, setHovered] = useState<EquipmentItem | null>(null);
  const [rarityFilter, setRarityFilter] = useState<EquipmentRarity | null>(null);

  const slotMeta = SLOT_META[slot];

  // Items available for this slot, sorted by rarity desc
  const inventory = useMemo(() => {
    const items = allInventory.filter((i) => i.slot === slot);
    return items
      .filter((i) => !rarityFilter || i.rarity === rarityFilter)
      .sort(
        (a, b) =>
          RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
      );
  }, [allInventory, slot, rarityFilter]);

  // Preview: show hovered item or current item
  const preview = hovered ?? currentItem ?? null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(8,10,16,0.88)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`${slotMeta.label} ekipmanı seç`}
    >
      <div
        className="modal-diagonal-panel modal-diagonal-panel-race relative w-full sm:max-w-lg flex flex-col"
        style={{
          '--color-race': raceColor,
          '--color-race-glow': raceGlow,
          maxHeight: '90dvh',
        } as React.CSSProperties}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `${raceColor}18`, border: `1px solid ${raceColor}40` }}
            >
              {slotMeta.icon}
            </div>
            <div>
              <div className="font-display text-xs font-black text-text-primary">{slotMeta.label} Seç</div>
              <div className="font-display text-[9px] uppercase tracking-widest text-text-muted">
                {inventory.length} ekipman mevcut
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#555d7a' }}
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        {/* Body: inventory list + preview panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Inventory list */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Rarity filter chips */}
            <div className="flex gap-1.5 px-4 py-3 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setRarityFilter(null)}
                className="shrink-0 font-display text-[9px] uppercase tracking-widest px-3 py-1 rounded-full transition-all duration-200"
                style={{
                  background: rarityFilter === null ? `${raceColor}25` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${rarityFilter === null ? raceColor : 'rgba(255,255,255,0.08)'}`,
                  color: rarityFilter === null ? raceColor : '#555d7a',
                }}
              >
                Tümü
              </button>
              {RARITY_ORDER.map((r) => {
                const rc = RARITY_COLORS[r];
                const active = rarityFilter === r;
                return (
                  <button
                    key={r}
                    onClick={() => setRarityFilter(active ? null : r)}
                    className="shrink-0 font-display text-[9px] uppercase tracking-widest px-3 py-1 rounded-full transition-all duration-200"
                    style={{
                      background: active ? `${rc.border}20` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? rc.border : 'rgba(255,255,255,0.08)'}`,
                      color: active ? rc.border : '#555d7a',
                    }}
                  >
                    {rc.label}
                  </button>
                );
              })}
            </div>

            {/* Item list */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {inventoryLoading ? (
                <div className="space-y-2" aria-busy="true" aria-label="Envanter yükleniyor">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl animate-pulse"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-lg shrink-0"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      />
                      <div className="flex-1 space-y-2">
                        <div
                          className="h-2.5 w-2/3 rounded"
                          style={{ background: 'rgba(255,255,255,0.06)' }}
                        />
                        <div
                          className="h-2 w-1/2 rounded"
                          style={{ background: 'rgba(255,255,255,0.04)' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : inventoryError ? (
                <div className="flex flex-col items-center justify-center h-40 text-center px-4" role="alert">
                  <span className="text-3xl mb-2">⚠️</span>
                  <div className="font-display text-xs uppercase tracking-widest text-text-muted mb-1">
                    Envanter yüklenemedi
                  </div>
                  <div className="text-text-secondary text-[11px] mb-3 break-words">
                    {inventoryError}
                  </div>
                  {onRetry && (
                    <button
                      onClick={onRetry}
                      className="font-display text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors"
                      style={{
                        background: `${raceColor}18`,
                        border: `1px solid ${raceColor}40`,
                        color: raceColor,
                      }}
                    >
                      Tekrar Dene
                    </button>
                  )}
                </div>
              ) : inventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-text-muted">
                  <span className="text-3xl mb-2 opacity-30">📦</span>
                  <span className="font-display text-xs uppercase tracking-widest">Envanter Boş</span>
                </div>
              ) : (
                inventory.map((item) => {
                  const rc = RARITY_COLORS[item.rarity];
                  const isCurrent = currentItem?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      disabled={mutating || isCurrent}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150 group disabled:cursor-not-allowed"
                      style={{
                        background: isCurrent
                          ? `${rc.border}15`
                          : 'rgba(255,255,255,0.02)',
                        border: isCurrent
                          ? `1.5px solid ${rc.border}80`
                          : '1px solid rgba(255,255,255,0.05)',
                        boxShadow: isCurrent ? `0 0 10px ${rc.glow}` : 'none',
                        opacity: mutating && !isCurrent ? 0.5 : 1,
                      }}
                      onMouseEnter={() => setHovered(item)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(item)}
                      onBlur={() => setHovered(null)}
                      onClick={() => onSelect(item)}
                      aria-pressed={isCurrent}
                      aria-busy={mutating || undefined}
                    >
                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                        style={{
                          background: `${rc.border}12`,
                          border: `1px solid ${rc.border}40`,
                        }}
                      >
                        {item.icon}
                      </div>

                      {/* Name + rarity */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="font-display text-xs font-bold truncate"
                            style={{ color: rc.border }}
                          >
                            {item.name}
                          </span>
                          {isCurrent && (
                            <span
                              className="font-display text-[8px] px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ background: `${rc.border}20`, color: rc.border, border: `1px solid ${rc.border}40` }}
                            >
                              Mevcut
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          <StatChips stats={item.stats} currentStats={currentItem?.stats} />
                        </div>
                      </div>

                      {/* Equip arrow */}
                      {!isCurrent && (
                        <span
                          className="text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          style={{ color: raceColor }}
                        >
                          →
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Preview panel (desktop only) */}
          {preview && (
            <div
              className="hidden sm:flex w-52 shrink-0 flex-col"
              style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="p-4 flex-1 overflow-y-auto">
                <div className="font-display text-[9px] uppercase tracking-widest text-text-muted mb-3">
                  Önizleme
                </div>
                <ItemPreview item={preview} current={currentItem} />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {onUnequip && (
          <div
            className="px-5 py-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <button
              onClick={onUnequip}
              disabled={mutating}
              aria-busy={mutating || undefined}
              className="w-full font-display text-xs uppercase tracking-widest py-2.5 rounded-xl transition-colors disabled:cursor-not-allowed"
              style={{
                background: 'rgba(255,51,85,0.08)',
                border: '1px solid rgba(255,51,85,0.25)',
                color: '#ff3355',
                opacity: mutating ? 0.5 : 1,
              }}
            >
              {mutating ? 'İşleniyor…' : 'Ekipmanı Çıkar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function StatChips({
  stats,
  currentStats,
}: {
  stats: EquipmentStats;
  currentStats?: EquipmentStats;
}) {
  const labels: Record<string, string> = { attack: 'ATK', defense: 'DEF', speed: 'HZ', hp: 'HP' };
  return (
    <>
      {Object.entries(stats)
        .filter(([, v]) => v !== undefined && v !== 0)
        .map(([key, val]) => {
          const v = val as number;
          const prev = (currentStats as Record<string, number | undefined> | undefined)?.[key] ?? 0;
          const diff = v - prev;
          const isUpgrade = diff > 0;
          const isSame = diff === 0;
          return (
            <span
              key={key}
              className="font-display text-[8px] font-bold px-1.5 py-0.5 rounded"
              style={{
                background: v > 0 ? 'rgba(68,255,136,0.08)' : 'rgba(255,51,85,0.08)',
                color: v > 0 ? '#44ff88' : '#ff3355',
              }}
            >
              {v > 0 ? '+' : ''}
              {v} {labels[key] ?? key.toUpperCase()}
              {!isSame && currentStats && (
                <span style={{ color: isUpgrade ? '#44ff88' : '#ff3355', opacity: 0.7 }}>
                  {' '}({isUpgrade ? '▲' : '▼'}{Math.abs(diff)})
                </span>
              )}
            </span>
          );
        })}
    </>
  );
}

function ItemPreview({
  item,
  current,
}: {
  item: EquipmentItem;
  current?: EquipmentItem;
}) {
  const rc = RARITY_COLORS[item.rarity];
  const labels: Record<string, string> = { attack: 'Saldırı', defense: 'Savunma', speed: 'Hız', hp: 'Can' };

  const allKeys = Array.from(
    new Set([...Object.keys(item.stats), ...(current ? Object.keys(current.stats) : [])])
  );

  return (
    <div className="space-y-4">
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl mx-auto"
        style={{
          background: `${rc.border}12`,
          border: `2px solid ${rc.border}`,
          boxShadow: `0 0 20px ${rc.glow}`,
        }}
      >
        {item.icon}
      </div>

      {/* Name & rarity */}
      <div className="text-center">
        <div
          className="font-display text-sm font-black"
          style={{ color: rc.border, textShadow: `0 0 12px ${rc.glow}` }}
        >
          {item.name}
        </div>
        <div
          className="font-display text-[9px] uppercase tracking-widest mt-1"
          style={{ color: `${rc.border}99` }}
        >
          {rc.label}
        </div>
      </div>

      {/* Description */}
      <MangaPanel className="p-3">
        <p className="text-text-secondary text-[10px] leading-relaxed text-center">
          {item.description}
        </p>
      </MangaPanel>

      {/* Stat comparison */}
      <div className="space-y-2">
        <div className="font-display text-[9px] uppercase tracking-widest text-text-muted">
          {current ? 'Karşılaştırma' : 'İstatistikler'}
        </div>
        {allKeys
          .filter((k) => (item.stats as any)[k] || (current?.stats as any)?.[k])
          .map((key) => {
            const newVal: number = (item.stats as any)[key] ?? 0;
            const oldVal: number = (current?.stats as any)?.[key] ?? 0;
            const diff = newVal - oldVal;
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="font-display text-[9px] text-text-muted w-16 shrink-0">
                  {labels[key] ?? key}
                </span>
                {/* Old value */}
                {current && (
                  <span className="font-display text-[9px] text-text-muted w-8 text-right">
                    {oldVal > 0 ? `+${oldVal}` : oldVal}
                  </span>
                )}
                {/* Arrow */}
                {current && (
                  <span className="text-[9px] text-text-muted">→</span>
                )}
                {/* New value */}
                <span
                  className="font-display text-[9px] font-bold w-8 text-right"
                  style={{
                    color:
                      !current || diff === 0
                        ? '#e8e8f0'
                        : diff > 0
                        ? '#44ff88'
                        : '#ff3355',
                  }}
                >
                  {newVal > 0 ? `+${newVal}` : newVal}
                </span>
                {/* Diff indicator */}
                {current && diff !== 0 && (
                  <span
                    className="font-display text-[8px] font-bold"
                    style={{ color: diff > 0 ? '#44ff88' : '#ff3355' }}
                  >
                    ({diff > 0 ? '▲' : '▼'}{Math.abs(diff)})
                  </span>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
