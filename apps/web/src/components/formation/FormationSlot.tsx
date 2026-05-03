'use client';

import Image from 'next/image';
import { useState } from 'react';
import clsx from 'clsx';
import { SlotUnit, SlotCommander, RACE_COLORS, CLASS_ICONS } from './types';

/* ─── UnitSlot ─────────────────────────────────────────────────────────── */
interface UnitSlotProps {
  unit: SlotUnit | null;
  slotId: string;
  label?: string;
  animDelay?: number;
  /** Currently selected unit from roster (mobile click-to-place) */
  pendingUnit?: SlotUnit | null;
  onDrop?: (slotId: string, unitId: string) => void;
  /** Called on any click — FormationScreen decides what happens */
  onSlotClick?: (slotId: string, currentUnit: SlotUnit | null) => void;
}

export function UnitSlot({
  unit, slotId, label, animDelay = 0, pendingUnit, onDrop, onSlotClick,
}: UnitSlotProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [imgError,   setImgError]   = useState(false);

  const rc = unit ? RACE_COLORS[unit.race] : null;
  /* When there is a pending unit, highlight empty slots as ready to receive */
  const canReceive = !!pendingUnit && !unit;
  const wouldSwap  = !!pendingUnit && !!unit;

  return (
    <div
      className={clsx(
        'formation-slot w-16 h-20 sm:w-[72px] sm:h-24 flex flex-col items-center justify-center select-none',
        'animate-slot-appear',
        unit ? 'formation-slot-filled' : 'formation-slot-empty',
        isDragOver && 'formation-slot-drag-over',
        canReceive && 'cursor-copy',
        wouldSwap  && 'cursor-copy',
        !pendingUnit && unit && 'cursor-pointer',
        !pendingUnit && !unit && 'cursor-default',
      )}
      style={{ animationDelay: `${animDelay}ms` }}
      draggable={!!unit}
      onDragStart={(e) => {
        if (!unit) return;
        e.dataTransfer.setData('unitId', unit.id);
        e.dataTransfer.setData('fromSlot', slotId);
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const uid = e.dataTransfer.getData('unitId');
        if (uid) onDrop?.(slotId, uid);
      }}
      onClick={() => onSlotClick?.(slotId, unit)}
      role="button"
      aria-label={
        canReceive
          ? `${pendingUnit?.name} için boş slot — yerleştirmek için tıkla`
          : wouldSwap
          ? `${pendingUnit?.name} ile ${unit?.name} yer değiştir`
          : unit
          ? `${unit.name} — kaldırmak için tıkla`
          : `Boş slot${label ? ` (${label})` : ''}`
      }
      title={unit ? `${unit.name} Lv.${unit.level} — Güç: ${unit.power.toLocaleString()}` : 'Birim ekle'}
    >
      {/* Pending-receive highlight ring */}
      {(canReceive || isDragOver) && (
        <div
          className="absolute inset-0 rounded-[6px] pointer-events-none"
          style={{
            border: `2px solid ${pendingUnit ? RACE_COLORS[pendingUnit.race]?.color ?? 'var(--color-brand)' : 'var(--color-brand)'}`,
            boxShadow: `0 0 16px ${pendingUnit ? RACE_COLORS[pendingUnit.race]?.glow ?? 'var(--color-brand-glow)' : 'var(--color-brand-glow)'}`,
            animation: 'race-glow-pulse 1.4s ease-in-out infinite',
          }}
          aria-hidden
        />
      )}

      {unit ? (
        <>
          <div className="relative w-full flex-1 overflow-hidden rounded-t-[6px]">
            {!imgError ? (
              <Image
                src={unit.portrait}
                alt={unit.name}
                fill
                className="object-cover object-top"
                onError={() => setImgError(true)}
                sizes="72px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl" style={{ background: rc?.dim }}>
                {CLASS_ICONS[unit.unitClass]}
              </div>
            )}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `linear-gradient(to top, ${rc?.dim} 0%, transparent 55%)` }}
            />
            <div
              className="absolute top-0.5 right-0.5 px-1 py-px rounded text-[8px] font-display font-bold leading-none"
              style={{ background: rc?.dim, color: rc?.color, border: `1px solid ${rc?.color}40` }}
            >
              {unit.level}
            </div>
            <div className="absolute top-0.5 left-0.5 text-[10px] leading-none" title={unit.unitClass}>
              {CLASS_ICONS[unit.unitClass]}
            </div>
          </div>
          <div
            className="w-full px-1 py-0.5 text-center text-[8px] font-display font-semibold truncate leading-tight"
            style={{ color: rc?.color }}
          >
            {unit.name.split(' ')[0]}
          </div>
        </>
      ) : (
        <div className={clsx('flex flex-col items-center gap-1', canReceive ? 'opacity-80' : 'opacity-40')}>
          <span className="text-lg leading-none" style={canReceive ? { color: 'var(--color-brand)' } : undefined}>
            {canReceive ? '↓' : '+'}
          </span>
          {label && <span className="text-[8px] font-display uppercase tracking-widest">{label}</span>}
        </div>
      )}
    </div>
  );
}

/* ─── CommanderSlot ─────────────────────────────────────────────────────── */
interface CommanderSlotProps {
  commander: SlotCommander | null;
  slotId: string;
  index: number;
  animDelay?: number;
  pendingCommander?: SlotCommander | null;
  onDrop?: (slotId: string, commanderId: string) => void;
  onSlotClick?: (slotId: string, currentCmd: SlotCommander | null) => void;
}

export function CommanderSlot({
  commander, slotId, index, animDelay = 0, pendingCommander, onDrop, onSlotClick,
}: CommanderSlotProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [imgError,   setImgError]   = useState(false);

  const rc = commander ? RACE_COLORS[commander.race] : null;
  const canReceive = !!pendingCommander && !commander;
  const wouldSwap  = !!pendingCommander && !!commander;

  return (
    <div
      className={clsx(
        'formation-slot w-[68px] h-[88px] sm:w-20 sm:h-[104px] flex flex-col items-center justify-center select-none',
        'animate-slot-appear',
        commander ? 'formation-slot-filled' : 'formation-slot-empty',
        isDragOver && 'formation-slot-drag-over',
        (canReceive || wouldSwap) && 'cursor-copy',
        !pendingCommander && commander && 'cursor-pointer',
      )}
      style={{ animationDelay: `${animDelay}ms` }}
      draggable={!!commander}
      onDragStart={(e) => {
        if (!commander) return;
        e.dataTransfer.setData('commanderId', commander.id);
        e.dataTransfer.setData('fromSlot', slotId);
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const cid = e.dataTransfer.getData('commanderId');
        if (cid) onDrop?.(slotId, cid);
      }}
      onClick={() => onSlotClick?.(slotId, commander)}
      role="button"
      aria-label={
        canReceive
          ? `${pendingCommander?.name} için boş komutan slotu — yerleştirmek için tıkla`
          : commander
          ? `${commander.name} komutanı — kaldırmak için tıkla`
          : `Komutan slotu ${index + 1}`
      }
    >
      {/* Pending-receive ring */}
      {(canReceive || isDragOver) && (
        <div
          className="absolute inset-0 rounded-[6px] pointer-events-none"
          style={{
            border: `2px solid ${pendingCommander ? RACE_COLORS[pendingCommander.race]?.color ?? 'var(--color-brand)' : 'var(--color-brand)'}`,
            boxShadow: `0 0 16px ${pendingCommander ? RACE_COLORS[pendingCommander.race]?.glow ?? 'var(--color-brand-glow)' : 'var(--color-brand-glow)'}`,
            animation: 'race-glow-pulse 1.4s ease-in-out infinite',
          }}
          aria-hidden
        />
      )}

      {commander ? (
        <>
          <div className="absolute top-0.5 inset-x-0 flex justify-center gap-px pointer-events-none">
            {Array.from({ length: Math.min(commander.level, 5) }).map((_, i) => (
              <span key={i} className="text-[6px]" style={{ color: rc?.color }}>★</span>
            ))}
          </div>
          <div className="relative w-full flex-1 overflow-hidden rounded-t-[6px] mt-3">
            {!imgError ? (
              <Image
                src={commander.portrait}
                alt={commander.name}
                fill
                className="object-cover object-top"
                onError={() => setImgError(true)}
                sizes="80px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: rc?.dim }}>👑</div>
            )}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `linear-gradient(to top, ${rc?.dim} 0%, transparent 55%)` }}
            />
          </div>
          <div
            className="w-full px-1 py-0.5 text-center text-[8px] font-display font-bold truncate"
            style={{ color: rc?.color }}
          >
            {commander.name.split(' ')[0]}
          </div>
          <div
            className="absolute inset-0 rounded-[6px] pointer-events-none animate-race-glow-pulse"
            style={{ boxShadow: `inset 0 0 0 1px ${rc?.color}50` }}
          />
        </>
      ) : (
        <div className={clsx('flex flex-col items-center gap-1', canReceive ? 'opacity-80' : 'opacity-35')}>
          <span
            className="text-xl leading-none font-display"
            style={canReceive ? { color: 'var(--color-brand)' } : undefined}
          >
            {canReceive ? '↓' : '👑'}
          </span>
          <span className="text-[7px] font-display uppercase tracking-widest">Komutan</span>
          <span className="text-[9px] font-body opacity-60">{index + 1}</span>
        </div>
      )}
    </div>
  );
}
