'use client';

import Image from 'next/image';
import { useState } from 'react';
import clsx from 'clsx';
import { SlotUnit, SlotCommander, RACE_COLORS, CLASS_ICONS, RaceKey } from './types';

interface UnitRosterProps {
  units: SlotUnit[];
  commanders: SlotCommander[];
  placedUnitIds: Set<string>;
  placedCommanderIds: Set<string>;
  mode: 'units' | 'commanders';
  onModeChange: (m: 'units' | 'commanders') => void;
}

export function UnitRoster({
  units, commanders, placedUnitIds, placedCommanderIds, mode, onModeChange,
}: UnitRosterProps) {
  const [filter, setFilter] = useState<RaceKey | 'all'>('all');

  const filteredUnits = units.filter(
    (u) => (filter === 'all' || u.race === filter) && !placedUnitIds.has(u.id)
  );
  const filteredCmds = commanders.filter(
    (c) => (filter === 'all' || c.race === filter) && !placedCommanderIds.has(c.id)
  );

  const races: Array<{ key: RaceKey | 'all'; label: string }> = [
    { key: 'all', label: 'Tümü' },
    { key: 'insan',   label: 'İnsan' },
    { key: 'zerg',    label: 'Zerg' },
    { key: 'otomat',  label: 'Otomat' },
    { key: 'canavar', label: 'Canavar' },
    { key: 'seytan',  label: 'Şeytan' },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Mode toggle */}
      <div className="flex gap-1 mb-3 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {(['units', 'commanders'] as const).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={clsx(
              'flex-1 py-1.5 rounded-md text-[10px] font-display font-bold uppercase tracking-wider transition-all duration-250',
              mode === m
                ? 'bg-brand text-text-inverse'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            {m === 'units' ? 'Birimler' : 'Komutanlar'}
          </button>
        ))}
      </div>

      {/* Race filter */}
      <div className="flex flex-wrap gap-1 mb-3">
        {races.map(({ key, label }) => {
          const rc = key !== 'all' ? RACE_COLORS[key] : null;
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={clsx(
                'px-2 py-px rounded text-[9px] font-display uppercase tracking-wider border transition-all duration-200',
                active
                  ? 'border-transparent'
                  : 'border-transparent hover:border-white/10',
              )}
              style={{
                background:  active ? (rc?.dim ?? 'rgba(255,255,255,0.12)')  : 'rgba(255,255,255,0.04)',
                color:       active ? (rc?.color ?? '#fff')                  : 'rgba(255,255,255,0.4)',
                boxShadow:   active && rc ? `0 0 8px ${rc.glow}` : 'none',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-1.5">
        {mode === 'units' ? (
          filteredUnits.length === 0 ? (
            <p className="text-text-muted font-body text-xs text-center py-4">Tüm birimler yerleştirildi</p>
          ) : (
            filteredUnits.map((u) => <UnitRosterRow key={u.id} unit={u} />)
          )
        ) : (
          filteredCmds.length === 0 ? (
            <p className="text-text-muted font-body text-xs text-center py-4">Tüm komutanlar yerleştirildi</p>
          ) : (
            filteredCmds.map((c) => <CommanderRosterRow key={c.id} commander={c} />)
          )
        )}
      </div>
    </div>
  );
}

/* ─── Unit row ─────────────────────────────────────────────────────────── */
function UnitRosterRow({ unit }: { unit: SlotUnit }) {
  const [imgError, setImgError] = useState(false);
  const rc = RACE_COLORS[unit.race];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('unitId', unit.id);
        e.dataTransfer.setData('fromRoster', 'true');
      }}
      className="flex items-center gap-2.5 p-2 rounded-lg cursor-grab active:cursor-grabbing
                 border border-transparent hover:border-white/08 group
                 transition-all duration-250 hover:bg-white/[0.03]"
      title={`${unit.name} — Güç: ${unit.power.toLocaleString()} — Sürükle & Bırak`}
    >
      {/* Thumb */}
      <div
        className="relative w-9 h-9 rounded-md overflow-hidden flex-shrink-0"
        style={{ border: `1px solid ${rc.color}30` }}
      >
        {!imgError ? (
          <Image src={unit.portrait} alt={unit.name} fill className="object-cover object-top" onError={() => setImgError(true)} sizes="36px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-base" style={{ background: rc.dim }}>
            {CLASS_ICONS[unit.unitClass]}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-xs font-bold truncate" style={{ color: rc.color }}>{unit.name}</span>
          <span className="text-[9px] text-text-muted font-display">Lv.{unit.level}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] text-text-muted">{CLASS_ICONS[unit.unitClass]}</span>
          <span className="text-[9px] font-display text-text-muted uppercase tracking-wider">{unit.unitClass}</span>
        </div>
      </div>

      {/* Power */}
      <div className="text-right flex-shrink-0">
        <div className="font-display text-xs font-bold tabular-nums" style={{ color: rc.color }}>
          {unit.power.toLocaleString()}
        </div>
        <div className="text-[8px] text-text-muted font-display uppercase tracking-wider">güç</div>
      </div>

      {/* Drag handle */}
      <div className="opacity-0 group-hover:opacity-40 transition-opacity text-text-muted text-sm flex-shrink-0" aria-hidden>⠿</div>
    </div>
  );
}

/* ─── Commander row ────────────────────────────────────────────────────── */
function CommanderRosterRow({ commander }: { commander: SlotCommander }) {
  const [imgError, setImgError] = useState(false);
  const rc = RACE_COLORS[commander.race];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('commanderId', commander.id);
        e.dataTransfer.setData('fromRoster', 'true');
      }}
      className="flex items-center gap-2.5 p-2 rounded-lg cursor-grab active:cursor-grabbing
                 border border-transparent hover:border-white/08 group
                 transition-all duration-250 hover:bg-white/[0.03]"
    >
      <div
        className="relative w-9 h-9 rounded-md overflow-hidden flex-shrink-0"
        style={{ border: `1px solid ${rc.color}50`, boxShadow: `0 0 8px ${rc.glow}` }}
      >
        {!imgError ? (
          <Image src={commander.portrait} alt={commander.name} fill className="object-cover object-top" onError={() => setImgError(true)} sizes="36px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl" style={{ background: rc.dim }}>👑</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-xs font-bold truncate" style={{ color: rc.color }}>{commander.name}</span>
          <span className="text-[9px] text-text-muted font-display">Lv.{commander.level}</span>
        </div>
        <div className="flex gap-0.5 mt-0.5">
          {Array.from({ length: Math.min(commander.level, 5) }).map((_, i) => (
            <span key={i} className="text-[7px]" style={{ color: rc.color }}>★</span>
          ))}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="font-display text-xs font-bold tabular-nums" style={{ color: rc.color }}>
          {commander.power.toLocaleString()}
        </div>
        <div className="text-[8px] text-text-muted font-display uppercase tracking-wider">güç</div>
      </div>
    </div>
  );
}
