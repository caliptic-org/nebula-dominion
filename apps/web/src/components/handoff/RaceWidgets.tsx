'use client';

import type { CSSProperties, ReactNode } from 'react';
import { ND, type NDRace, type NDRaceKey } from './nd-tokens';
import { raceLex, type NDRaceLex } from './race-lex';
import { raceShape } from './race-shape';
import { RaceActionIcon } from './RaceActionIcon';

/* ── RaceTabs — tab strip with race-specific corner language ──────────── */

interface RaceTabsProps {
  race: NDRace;
  items: readonly string[];
  active?: number;
  size?: 'sm' | 'md';
  onChange?: (index: number) => void;
}

export function RaceTabs({ race, items, active = 0, size = 'md', onChange }: RaceTabsProps) {
  const fs = size === 'sm' ? 9 : 10;
  const py = size === 'sm' ? '5px' : '6px';
  return (
    <div style={{ display: 'flex', gap: 4, flex: '1 1 0', overflowX: 'auto' }} role="tablist">
      {items.map((label, i) => {
        const on = i === active;
        const shape = raceShape(race.key, 'tab');
        return (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange?.(i)}
            style={{
              all: 'unset',
              padding: `${py} 10px`,
              fontFamily: ND.display,
              fontSize: fs,
              letterSpacing: '0.10em',
              color: on ? '#0A0E1A' : ND.textDim,
              background: on ? race.primary : 'rgba(255,255,255,0.04)',
              border: `1px solid ${on ? race.primary : ND.border}`,
              textTransform: 'uppercase',
              cursor: 'pointer',
              flex: '0 0 auto',
              ...shape,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ── RaceQuickActions — vertical side action buttons ──────────────────── */

interface RaceQuickActionsProps {
  race: NDRace;
  onAction?: (key: string) => void;
}

export function RaceQuickActions({ race, onAction }: RaceQuickActionsProps) {
  const lex = raceLex(race.key);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {lex.quickActions.map((a) => {
        const shape = raceShape(race.key, 'card');
        return (
          <button
            key={a.key}
            type="button"
            onClick={() => onAction?.(a.key)}
            aria-label={a.label}
            style={{
              all: 'unset',
              width: 56,
              height: 44,
              padding: '4px 0',
              background: 'rgba(8,12,26,0.78)',
              border: `1px solid ${race.primary}77`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              color: race.primary,
              cursor: 'pointer',
              ...shape,
            }}
          >
            <RaceActionIcon kind={a.icon} color={race.primary} size={16} />
            <span style={{ fontFamily: ND.display, fontSize: 9, letterSpacing: '0.10em' }}>
              {a.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── BaseVitalsWidget — race-specific vitals badge (top-right) ────────── */

interface VitalsCell { label: string; value: string }
interface VitalsData { title: string; a: VitalsCell; b: VitalsCell; c: VitalsCell }

const VITALS: Record<NDRaceKey, VitalsData> = {
  insan:   { title: 'OPERASYONEL', a: { label: 'SEKTÖR', value: '4/4 ONLINE' }, b: { label: 'ALARM', value: '2' }, c: { label: 'KIT.', value: '%87' } },
  zerg:    { title: 'KOVAN VİTAL.', a: { label: 'VİTAL', value: '%92' },         b: { label: 'LARVA', value: '1.2K' }, c: { label: 'MUT.', value: '4 HAZIR' } },
  otomat:  { title: '::system_load', a: { label: 'CPU', value: '64%' },         b: { label: 'PROC', value: '08/16' }, c: { label: 'WARN', value: '2' } },
  canavar: { title: 'SÜRÜ MORALİ',   a: { label: 'MORAL', value: '+18' },        b: { label: 'AV', value: '3 ✓' },     c: { label: 'AY', value: 'DOLUN.' } },
  seytan:  { title: 'PAKT DURUMU',   a: { label: 'AKTİF', value: 'VII' },        b: { label: 'RUH', value: '3 BAĞLI' },c: { label: 'MÜHÜR', value: '✦ HAZIR' } },
};

interface BaseVitalsWidgetProps {
  race: NDRace;
  style?: CSSProperties;
}

export function BaseVitalsWidget({ race, style }: BaseVitalsWidgetProps) {
  const data = VITALS[race.key];
  const c = race.primary;
  const shape = raceShape(race.key, 'card');
  return (
    <div
      role="status"
      aria-label={data.title}
      style={{
        background: 'rgba(6,8,15,0.85)',
        border: `1px solid ${c}66`,
        padding: '6px 8px',
        minWidth: 142,
        boxShadow: `0 0 12px ${race.glow}33`,
        ...shape,
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: ND.mono,
          fontSize: 8,
          color: c,
          letterSpacing: '0.18em',
        }}
      >
        {data.title}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {[data.a, data.b, data.c].map((cell, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: ND.mono,
                fontSize: 8,
                color: ND.textMute,
                letterSpacing: '0.10em',
              }}
            >
              {cell.label}
            </div>
            <div
              style={{
                fontFamily: ND.display,
                fontSize: 11,
                color: ND.text,
                letterSpacing: '0.04em',
                marginTop: 1,
              }}
            >
              {cell.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── BaseField — race-themed iso silhouette field ─────────────────────── */

interface BaseFieldProps {
  race: NDRace;
  focusedIdx?: number;
  dim?: number;
}

const FIELD_BUILDINGS: Record<NDRaceKey, ReadonlyArray<{ x: number; y: number; w: number; h: number }>> = {
  insan:   [{ x: 90, y: 240, w: 76, h: 44 }, { x: 210, y: 260, w: 92, h: 56 }, { x: 50, y: 330, w: 64, h: 36 }, { x: 230, y: 360, w: 84, h: 48 }, { x: 120, y: 400, w: 56, h: 32 }],
  zerg:    [{ x: 70, y: 240, w: 60, h: 44 }, { x: 200, y: 260, w: 84, h: 60 }, { x: 300, y: 300, w: 60, h: 40 }, { x: 100, y: 380, w: 70, h: 42 }, { x: 240, y: 410, w: 64, h: 40 }],
  otomat:  [{ x: 60, y: 240, w: 80, h: 42 }, { x: 200, y: 240, w: 90, h: 60 }, { x: 60, y: 340, w: 80, h: 42 }, { x: 220, y: 340, w: 90, h: 42 }, { x: 140, y: 410, w: 110, h: 40 }],
  canavar: [{ x: 60, y: 260, w: 70, h: 44 }, { x: 200, y: 240, w: 90, h: 64 }, { x: 290, y: 300, w: 60, h: 40 }, { x: 90, y: 390, w: 70, h: 40 }, { x: 250, y: 400, w: 70, h: 42 }],
  seytan:  [{ x: 80, y: 240, w: 70, h: 44 }, { x: 200, y: 220, w: 80, h: 60 }, { x: 290, y: 260, w: 60, h: 42 }, { x: 80, y: 380, w: 80, h: 42 }, { x: 230, y: 400, w: 80, h: 44 }],
};

export function BaseField({ race, focusedIdx = 1, dim = 1 }: BaseFieldProps) {
  const c = race.primary;
  const buildings = FIELD_BUILDINGS[race.key];
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 390 460"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, opacity: dim, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        <pattern id={`iso-${race.key}`} width="40" height="22" patternUnits="userSpaceOnUse">
          <path d="M0 11 L 20 0 L 40 11 L 20 22 Z" fill="none" stroke={`${c}22`} strokeWidth="0.5" />
        </pattern>
        <radialGradient id={`ground-${race.key}`} cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor={c} stopOpacity="0.14" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="180" width="390" height="280" fill={`url(#iso-${race.key})`} />
      <rect x="0" y="180" width="390" height="280" fill={`url(#ground-${race.key})`} />
      <path d="M 0 320 L 390 300" stroke={`${c}33`} strokeWidth="14" strokeDasharray="2 18" />
      <path d="M 195 200 L 195 460" stroke={`${c}22`} strokeWidth="10" strokeDasharray="2 18" />
      {buildings.map((b, i) => {
        const focus = i === focusedIdx;
        return (
          <g key={i}>
            <ellipse cx={b.x + b.w / 2} cy={b.y + b.h * 1.18} rx={b.w * 0.55} ry="6" fill="#000" opacity="0.45" />
            <path
              d={`M${b.x} ${b.y} L${b.x + b.w / 2} ${b.y - b.h * 0.5} L${b.x + b.w} ${b.y} L${b.x + b.w / 2} ${b.y + b.h * 0.5} Z`}
              fill="oklch(0.26 0.04 250)"
              stroke={focus ? race.glow : `${c}aa`}
              strokeWidth={focus ? 1.5 : 1}
            />
            <path
              d={`M${b.x} ${b.y} L${b.x} ${b.y + b.h * 0.7} L${b.x + b.w / 2} ${b.y + b.h * 1.2} L${b.x + b.w / 2} ${b.y + b.h * 0.5} Z`}
              fill="#0C1224"
              stroke={`${c}66`}
              strokeWidth="1"
            />
            <path
              d={`M${b.x + b.w} ${b.y} L${b.x + b.w} ${b.y + b.h * 0.7} L${b.x + b.w / 2} ${b.y + b.h * 1.2} L${b.x + b.w / 2} ${b.y + b.h * 0.5} Z`}
              fill="#070B17"
              stroke={`${c}55`}
              strokeWidth="1"
            />
            {focus && (
              <g>
                <path
                  d={`M${b.x} ${b.y} L${b.x + b.w / 2} ${b.y - b.h * 0.5} L${b.x + b.w} ${b.y} L${b.x + b.w / 2} ${b.y + b.h * 0.5} Z`}
                  fill="none"
                  stroke={race.glow}
                  strokeWidth="2"
                />
                <rect x={b.x - 3} y={b.y - b.h * 0.5 - 3} width="6" height="6" fill={race.glow} />
                <rect x={b.x + b.w - 3} y={b.y - b.h * 0.5 - 3} width="6" height="6" fill={race.glow} />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── BaseFieldStatusChip — top-left blinking-dot status ───────────────── */

interface BaseFieldStatusChipProps {
  race: NDRace;
  label: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function BaseFieldStatusChip({ race, label, style }: BaseFieldStatusChipProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        background: 'rgba(6,8,15,0.85)',
        border: `1px solid ${race.primary}66`,
        fontFamily: ND.mono,
        fontSize: 10,
        color: race.primary,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        boxShadow: `0 0 12px ${race.glow}33`,
        ...style,
      }}
    >
      <span aria-hidden style={{ color: race.glow, animation: 'nd-blink 1.4s ease-in-out infinite' }}>
        ●
      </span>
      {label}
    </span>
  );
}
