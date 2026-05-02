'use client';

import { useState } from 'react';
import {
  EquipmentItem,
  EquipmentSlotType,
  EquipmentStats,
  CommanderEquipment,
  RARITY_COLORS,
  SLOT_META,
  SLOT_ORDER,
  SlotState,
} from '@/types/equipment';
import { EquipmentModal } from './EquipmentModal';

interface EquipmentSlotsProps {
  equipment: CommanderEquipment;
  raceColor: string;
  raceGlow: string;
  inventory: EquipmentItem[];
  inventoryLoading?: boolean;
  inventoryError?: string | null;
  onInventoryRetry?: () => void;
  onEquip?: (slot: EquipmentSlotType, item: EquipmentItem) => void;
  onUnequip?: (slot: EquipmentSlotType) => void;
}

export function EquipmentSlots({
  equipment,
  raceColor,
  raceGlow,
  inventory,
  inventoryLoading,
  inventoryError,
  onInventoryRetry,
  onEquip,
  onUnequip,
}: EquipmentSlotsProps) {
  const [activeSlot, setActiveSlot] = useState<EquipmentSlotType | null>(null);

  function getSlotState(slot: EquipmentSlotType): SlotState {
    if (equipment.lockedSlots?.includes(slot)) return 'locked';
    if (equipment.slots[slot]) return 'filled';
    return 'empty';
  }

  function handleSlotTap(slot: EquipmentSlotType) {
    const state = getSlotState(slot);
    if (state === 'locked') return;
    setActiveSlot(slot);
  }

  function handleSelect(item: EquipmentItem) {
    if (activeSlot) {
      onEquip?.(activeSlot, item);
      setActiveSlot(null);
    }
  }

  function handleClose() {
    setActiveSlot(null);
  }

  return (
    <>
      <div className="p-4">
        <div className="font-display text-[9px] uppercase tracking-widest text-text-muted mb-3">
          Ekipman Slotları
        </div>

        {/* 2×3 grid */}
        <div className="grid grid-cols-3 gap-2">
          {SLOT_ORDER.map((slot) => {
            const state = getSlotState(slot);
            const item = equipment.slots[slot];
            const meta = SLOT_META[slot];
            const rarityStyle = item ? RARITY_COLORS[item.rarity] : null;

            return (
              <button
                key={slot}
                onClick={() => handleSlotTap(slot)}
                disabled={state === 'locked'}
                aria-label={
                  state === 'locked'
                    ? `${meta.label} kilitli`
                    : item
                    ? `${item.name} — değiştir`
                    : `${meta.label} — ekipman ekle`
                }
                className="relative flex flex-col items-center justify-center rounded-xl transition-all duration-200 group"
                style={{
                  height: 76,
                  background:
                    state === 'locked'
                      ? 'rgba(255,255,255,0.02)'
                      : state === 'filled'
                      ? `rgba(${hexToRgb(rarityStyle!.border)},0.08)`
                      : 'rgba(255,255,255,0.03)',
                  border:
                    state === 'locked'
                      ? '1px dashed rgba(255,255,255,0.08)'
                      : state === 'filled'
                      ? `1.5px solid ${rarityStyle!.border}`
                      : '1px dashed rgba(255,255,255,0.2)',
                  boxShadow:
                    state === 'filled'
                      ? `0 0 12px ${rarityStyle!.glow}`
                      : 'none',
                  cursor: state === 'locked' ? 'not-allowed' : 'pointer',
                  opacity: state === 'locked' ? 0.45 : 1,
                }}
              >
                {/* Hover glow overlay for empty slots */}
                {state === 'empty' && (
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={{ background: `${raceColor}10`, border: `1px dashed ${raceColor}60` }}
                  />
                )}

                {/* Slot content */}
                {state === 'locked' ? (
                  <>
                    <span className="text-xl mb-1">🔒</span>
                    <span className="font-display text-[8px] uppercase tracking-widest text-text-muted">
                      {meta.label}
                    </span>
                  </>
                ) : state === 'filled' && item ? (
                  <>
                    {/* Rarity badge */}
                    <div
                      className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                      style={{ background: rarityStyle!.border }}
                      aria-hidden
                    />
                    <span className="text-2xl mb-1 drop-shadow-lg">{item.icon}</span>
                    <span
                      className="font-display text-[8px] font-bold text-center leading-tight px-1 truncate w-full"
                      style={{ color: rarityStyle!.border }}
                    >
                      {item.name}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xl mb-1 opacity-30">{meta.icon}</span>
                    <span className="font-display text-[8px] uppercase tracking-widest text-text-muted">
                      {meta.label}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Active slot detail strip */}
        {activeSlot === null && equipment.slots && (
          <div className="mt-3 space-y-1">
            {SLOT_ORDER.filter((s) => equipment.slots[s]).map((slot) => {
              const item = equipment.slots[slot]!;
              const rarityStyle = RARITY_COLORS[item.rarity];
              return (
                <div
                  key={slot}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span
                    className="font-display text-[9px] font-bold flex-1"
                    style={{ color: rarityStyle.border }}
                  >
                    {item.name}
                  </span>
                  <StatBadges stats={item.stats} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Equipment selection modal */}
      {activeSlot !== null && (
        <EquipmentModal
          slot={activeSlot}
          currentItem={equipment.slots[activeSlot]}
          inventory={inventory}
          inventoryLoading={inventoryLoading}
          inventoryError={inventoryError}
          onRetry={onInventoryRetry}
          raceColor={raceColor}
          raceGlow={raceGlow}
          onSelect={handleSelect}
          onClose={handleClose}
          onUnequip={
            equipment.slots[activeSlot]
              ? () => { onUnequip?.(activeSlot); setActiveSlot(null); }
              : undefined
          }
        />
      )}
    </>
  );
}

function StatBadges({ stats }: { stats: EquipmentStats }) {
  const entries = Object.entries(stats).filter(([, v]) => v !== undefined && v !== 0) as [string, number][];
  const labels: Record<string, string> = { attack: 'ATK', defense: 'DEF', speed: 'HZ', hp: 'HP' };
  return (
    <div className="flex gap-1">
      {entries.map(([key, val]) => (
        <span
          key={key}
          className="font-display text-[8px] font-bold px-1 py-0.5 rounded"
          style={{
            background: val > 0 ? 'rgba(68,255,136,0.1)' : 'rgba(255,51,85,0.1)',
            color: val > 0 ? '#44ff88' : '#ff3355',
          }}
        >
          {val > 0 ? '+' : ''}{val} {labels[key] ?? key.toUpperCase()}
        </span>
      ))}
    </div>
  );
}

function hexToRgb(hex: string): string {
  const m = hex.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return '255,255,255';
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
}
