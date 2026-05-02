'use client';

import Image from 'next/image';
import { useState } from 'react';
import clsx from 'clsx';
import { SlotUnit, SlotCommander, RACE_COLORS, CLASS_ICONS } from './types';

interface UnitSlotProps {
  unit: SlotUnit | null;
  slotId: string;
  label?: string;
  animDelay?: number;
  onDrop?: (slotId: string, unitId: string) => void;
  onRemove?: (slotId: string) => void;
  onDragStart?: (unitId: string) => void;
}

export function UnitSlot({ unit, slotId, label, animDelay = 0, onDrop, onRemove, onDragStart }: UnitSlotProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [imgError, setImgError] = useState(false);

  const rc = unit ? RACE_COLORS[unit.race] : null;

  return (
    <div
      className={clsx(
        'formation-slot w-16 h-20 sm:w-[72px] sm:h-24 flex flex-col items-center justify-center cursor-pointer select-none',
        'animate-slot-appear',
        unit ? 'formation-slot-filled' : 'formation-slot-empty',
        isDragOver && 'formation-slot-drag-over',
      )}
      style={{ animationDelay: `${animDelay}ms` }}
      draggable={!!unit}
      onDragStart={(e) => {
        if (!unit) return;
        e.dataTransfer.setData('unitId', unit.id);
        e.dataTransfer.setData('fromSlot', slotId);
        onDragStart?.(unit.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const uid = e.dataTransfer.getData('unitId');
        if (uid) onDrop?.(slotId, uid);
      }}
      onClick={() => {
        if (unit) onRemove?.(slotId);
      }}
      role="button"
      aria-label={unit ? `${unit.name} — kaldırmak için tıkla` : `Boş slot${label ? ` (${label})` : ''}`}
      title={unit ? `${unit.name} Lv.${unit.level} — Güç: ${unit.power.toLocaleString()}` : 'Birim ekle'}
    >
      {unit ? (
        <>
          {/* Portrait */}
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
              <div
                className="w-full h-full flex items-center justify-center text-xl"
                style={{ background: rc?.dim }}
              >
                {CLASS_ICONS[unit.unitClass]}
              </div>
            )}
            {/* Race glow overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `linear-gradient(to top, ${rc?.dim} 0%, transparent 55%)` }}
            />
            {/* Level badge */}
            <div
              className="absolute top-0.5 right-0.5 px-1 py-px rounded text-[8px] font-display font-bold leading-none"
              style={{ background: rc?.dim, color: rc?.color, border: `1px solid ${rc?.color}40` }}
            >
              {unit.level}
            </div>
            {/* Class icon */}
            <div
              className="absolute top-0.5 left-0.5 text-[10px] leading-none"
              title={unit.unitClass}
            >
              {CLASS_ICONS[unit.unitClass]}
            </div>
          </div>

          {/* Name strip */}
          <div
            className="w-full px-1 py-0.5 text-center text-[8px] font-display font-semibold truncate leading-tight"
            style={{ color: rc?.color }}
          >
            {unit.name.split(' ')[0]}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1 opacity-40">
          <span className="text-lg leading-none">+</span>
          {label && <span className="text-[8px] font-display uppercase tracking-widest">{label}</span>}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────── */

interface CommanderSlotProps {
  commander: SlotCommander | null;
  slotId: string;
  index: number;
  animDelay?: number;
  onDrop?: (slotId: string, commanderId: string) => void;
  onRemove?: (slotId: string) => void;
}

export function CommanderSlot({ commander, slotId, index, animDelay = 0, onDrop, onRemove }: CommanderSlotProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [imgError, setImgError] = useState(false);

  const rc = commander ? RACE_COLORS[commander.race] : null;

  return (
    <div
      className={clsx(
        'formation-slot w-[68px] h-[88px] sm:w-20 sm:h-[104px] flex flex-col items-center justify-center cursor-pointer select-none',
        'animate-slot-appear',
        commander ? 'formation-slot-filled' : 'formation-slot-empty',
        isDragOver && 'formation-slot-drag-over',
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
      onClick={() => { if (commander) onRemove?.(slotId); }}
      role="button"
      aria-label={commander ? `${commander.name} komutanı — kaldırmak için tıkla` : `Komutan slotu ${index + 1}`}
    >
      {commander ? (
        <>
          {/* Star indicator */}
          <div className="absolute top-0.5 inset-x-0 flex justify-center gap-px pointer-events-none">
            {Array.from({ length: Math.min(commander.level, 5) }).map((_, i) => (
              <span key={i} className="text-[6px]" style={{ color: rc?.color }}>★</span>
            ))}
          </div>

          {/* Portrait */}
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
              <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: rc?.dim }}>
                👑
              </div>
            )}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `linear-gradient(to top, ${rc?.dim} 0%, transparent 55%)` }}
            />
          </div>

          {/* Name */}
          <div
            className="w-full px-1 py-0.5 text-center text-[8px] font-display font-bold truncate"
            style={{ color: rc?.color }}
          >
            {commander.name.split(' ')[0]}
          </div>

          {/* Glow border pulse */}
          <div
            className="absolute inset-0 rounded-[6px] pointer-events-none animate-race-glow-pulse"
            style={{ boxShadow: `inset 0 0 0 1px ${rc?.color}50` }}
          />
        </>
      ) : (
        <div className="flex flex-col items-center gap-1 opacity-35">
          <span className="text-xl leading-none font-display">👑</span>
          <span className="text-[7px] font-display uppercase tracking-widest">Komutan</span>
          <span className="text-[9px] font-body opacity-60">{index + 1}</span>
        </div>
      )}
    </div>
  );
}
