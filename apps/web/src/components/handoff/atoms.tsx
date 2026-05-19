'use client';

import type { CSSProperties, ReactNode } from 'react';
import { ND, type NDRace, type NDResIconKind } from './nd-tokens';
import { NebulaBg } from './Sigil';

/* ── Panel ────────────────────────────────────────────────────────────── */

interface PanelProps {
  children?: ReactNode;
  style?: CSSProperties;
  race?: NDRace;
  hi?: boolean;
  glow?: boolean;
}

export function Panel({ children, style, race, hi = false, glow = false }: PanelProps) {
  return (
    <div
      style={{
        position: 'relative',
        background: hi ? ND.surfaceHi : ND.surface,
        border: `1px solid ${hi ? ND.borderHi : ND.border}`,
        borderRadius: 6,
        boxShadow:
          glow && race
            ? `0 0 0 1px ${race.primary}40, 0 0 24px -8px ${race.glow}`
            : 'inset 0 1px 0 rgba(255,255,255,0.04)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface NotchPanelProps {
  children?: ReactNode;
  style?: CSSProperties;
  race?: NDRace;
  fill?: string;
  notch?: number;
}

export function NotchPanel({ children, style, race, fill, notch = 12 }: NotchPanelProps) {
  return (
    <div
      style={{
        position: 'relative',
        background: fill || ND.surface,
        border: `1px solid ${race ? race.primary + '55' : ND.border}`,
        clipPath: `polygon(${notch}px 0, 100% 0, 100% calc(100% - ${notch}px), calc(100% - ${notch}px) 100%, 0 100%, 0 ${notch}px)`,
        padding: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Button ───────────────────────────────────────────────────────────── */

type NDButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger';
type NDButtonSize = 'sm' | 'md' | 'lg';

interface NDButtonProps {
  children: ReactNode;
  race?: NDRace;
  variant?: NDButtonVariant;
  size?: NDButtonSize;
  onClick?: () => void;
  style?: CSSProperties;
  full?: boolean;
  icon?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export function NDButton({
  children,
  race,
  variant = 'primary',
  size = 'md',
  onClick,
  style,
  full,
  icon,
  type = 'button',
  disabled = false,
}: NDButtonProps) {
  const heights: Record<NDButtonSize, number> = { sm: 32, md: 40, lg: 48 };
  const padding: Record<NDButtonSize, string> = { sm: '0 12px', md: '0 16px', lg: '0 22px' };
  const fontSize: Record<NDButtonSize, number> = { sm: 12, md: 13, lg: 14 };
  const variants: Record<NDButtonVariant, CSSProperties> = {
    primary: {
      background: `linear-gradient(180deg, ${race?.primary || 'oklch(0.78 0.16 220)'} 0%, ${race?.primaryDim || 'oklch(0.55 0.13 220)'} 100%)`,
      color: '#0A0E1A',
      border: 'none',
      boxShadow: `0 0 0 1px ${race?.glow || 'oklch(0.85 0.18 220)'}55, 0 4px 16px -4px ${race?.glow || 'oklch(0.85 0.18 220)'}66`,
      fontWeight: 700,
    },
    ghost: {
      background: 'rgba(120, 200, 255, 0.06)',
      color: ND.text,
      border: `1px solid ${ND.border}`,
      fontWeight: 600,
    },
    outline: {
      background: 'transparent',
      color: race?.primary || ND.text,
      border: `1px solid ${race?.primary || ND.borderHi}`,
      fontWeight: 600,
    },
    danger: {
      background: 'transparent',
      color: ND.danger,
      border: `1px solid ${ND.danger}77`,
      fontWeight: 600,
    },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        height: heights[size],
        padding: padding[size],
        fontSize: fontSize[size],
        fontFamily: ND.display,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        borderRadius: 4,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: full ? '100%' : undefined,
        clipPath:
          'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
        ...variants[variant],
        ...style,
      }}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

/* ── Bar ──────────────────────────────────────────────────────────────── */

interface BarProps {
  value: number;
  max?: number;
  color: string;
  height?: number;
  label?: string;
  trailing?: string;
}

export function Bar({ value, max = 100, color, height = 6, label, trailing }: BarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ width: '100%' }}>
      {(label || trailing) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            fontFamily: ND.mono,
            color: ND.textDim,
            marginBottom: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          <span>{label}</span>
          <span>{trailing}</span>
        </div>
      )}
      <div
        style={{
          height,
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${ND.border}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 8px ${color}99`,
          }}
        />
      </div>
    </div>
  );
}

/* ── Typography helpers ───────────────────────────────────────────────── */

interface TypoProps { children: ReactNode; style?: CSSProperties }

export const H1 = ({ children, style }: TypoProps) => (
  <div style={{ fontFamily: ND.display, fontSize: 28, fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1.05, ...style }}>
    {children}
  </div>
);
export const H2 = ({ children, style }: TypoProps) => (
  <div style={{ fontFamily: ND.display, fontSize: 20, fontWeight: 600, letterSpacing: '0.06em', lineHeight: 1.1, textTransform: 'uppercase', ...style }}>
    {children}
  </div>
);
export const H3 = ({ children, style }: TypoProps) => (
  <div style={{ fontFamily: ND.display, fontSize: 14, fontWeight: 600, letterSpacing: '0.10em', lineHeight: 1.2, textTransform: 'uppercase', ...style }}>
    {children}
  </div>
);
export const Caption = ({ children, style }: TypoProps) => (
  <div style={{ fontFamily: ND.body, fontSize: 12, color: ND.textDim, lineHeight: 1.45, ...style }}>
    {children}
  </div>
);
export const Code = ({ children, style }: TypoProps) => (
  <span style={{ fontFamily: ND.mono, fontSize: 11, color: ND.textDim, letterSpacing: '0.04em', ...style }}>
    {children}
  </span>
);

interface EyebrowProps { children: ReactNode; color?: string; style?: CSSProperties }
export const Eyebrow = ({ children, color, style }: EyebrowProps) => (
  <div
    style={{
      fontFamily: ND.mono,
      fontSize: 10,
      letterSpacing: '0.20em',
      textTransform: 'uppercase',
      color: color || ND.textDim,
      ...style,
    }}
  >
    {children}
  </div>
);

interface ChipProps { children: ReactNode; color?: string; style?: CSSProperties }
export const Chip = ({ children, color, style }: ChipProps) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 6px',
      fontFamily: ND.mono,
      fontSize: 9,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      border: `1px solid ${color || ND.border}`,
      color: color || ND.textDim,
      background: (color || '#fff') + '10',
      ...style,
    }}
  >
    {children}
  </span>
);

/* ── Resource icons + pill ────────────────────────────────────────────── */

interface ResIconProps { kind: NDResIconKind; size?: number; color?: string }

export function ResIcon({ kind, size = 14, color }: ResIconProps) {
  const c = color || ND.text;
  const map: Record<NDResIconKind, JSX.Element> = {
    cred:   <polygon points="8,1 15,5 15,11 8,15 1,11 1,5" fill="none" stroke={c} strokeWidth="1.4"/>,
    sci:    <g><circle cx="8" cy="8" r="6" fill="none" stroke={c} strokeWidth="1.4"/><circle cx="8" cy="8" r="2" fill={c}/></g>,
    bio:    <path d="M8 1 C 12 5, 12 11, 8 15 C 4 11, 4 5, 8 1 Z" fill="none" stroke={c} strokeWidth="1.4"/>,
    gen:    <g><path d="M3 3 C 13 5, 3 11, 13 13" fill="none" stroke={c} strokeWidth="1.4"/><path d="M13 3 C 3 5, 13 11, 3 13" fill="none" stroke={c} strokeWidth="1.4"/></g>,
    min:    <polygon points="8,1 14,6 12,14 4,14 2,6" fill="none" stroke={c} strokeWidth="1.4"/>,
    cpu:    <g><rect x="3" y="3" width="10" height="10" fill="none" stroke={c} strokeWidth="1.4"/><rect x="6" y="6" width="4" height="4" fill={c}/></g>,
    meat:   <path d="M3 8 Q 8 1, 13 8 Q 8 15, 3 8 Z" fill="none" stroke={c} strokeWidth="1.4"/>,
    blood:  <path d="M8 1 L 13 9 Q 13 14, 8 14 Q 3 14, 3 9 Z" fill="none" stroke={c} strokeWidth="1.4"/>,
    soul:   <g><circle cx="8" cy="8" r="6" fill="none" stroke={c} strokeWidth="1.4"/><path d="M5 6 Q 8 11, 11 6" fill="none" stroke={c} strokeWidth="1.2"/></g>,
    dark:   <g><circle cx="8" cy="8" r="6" fill="none" stroke={c} strokeWidth="1.4"/><path d="M8 2 A 6 6 0 0 1 8 14 Z" fill={c}/></g>,
    crystal:<polygon points="8,1 13,6 10,15 6,15 3,6" fill="none" stroke={c} strokeWidth="1.4"/>,
    energy: <path d="M9 1 L 4 9 L 8 9 L 6 15 L 12 7 L 8 7 Z" fill="none" stroke={c} strokeWidth="1.4"/>,
    pop:    <g><circle cx="8" cy="5" r="2.5" fill="none" stroke={c} strokeWidth="1.4"/><path d="M3 14 Q 8 9, 13 14" fill="none" stroke={c} strokeWidth="1.4"/></g>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: 'inline-block', verticalAlign: 'middle' }} aria-hidden="true">
      {map[kind] || map.cred}
    </svg>
  );
}

interface ResPillProps { kind: NDResIconKind; value: string | number; accent?: string }
export function ResPill({ kind, value, accent }: ResPillProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px 4px 6px',
        background: 'rgba(8, 12, 26, 0.7)',
        border: `1px solid ${ND.border}`,
        borderRadius: 3,
        fontFamily: ND.mono,
        fontSize: 11,
        color: ND.text,
        letterSpacing: '0.04em',
      }}
    >
      <ResIcon kind={kind} size={12} color={accent}/>
      <span>{value}</span>
    </div>
  );
}

/* ── HUD top bar ──────────────────────────────────────────────────────── */

interface HUDProps {
  race: NDRace;
  level?: number;
  levelName?: string;
  resA?: string;
  resB?: string;
  crystal?: string;
  pop?: string;
}

export function HUD({
  race,
  level = 9,
  levelName = 'Metropol',
  resA = '12,480',
  resB = '3,210',
  crystal = '42',
}: HUDProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: 'linear-gradient(180deg, rgba(6,8,15,0.95) 0%, rgba(6,8,15,0.70) 100%)',
        borderBottom: `1px solid ${ND.border}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 6px 4px 4px',
          background: `linear-gradient(180deg, ${race.primary}28, transparent)`,
          border: `1px solid ${race.primary}66`,
          borderRadius: 3,
          clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)',
        }}
      >
        <div
          style={{
            width: 22, height: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: race.primary, color: '#0A0E1A',
            fontFamily: ND.display, fontWeight: 700, fontSize: 12,
          }}
        >
          {level}
        </div>
        <div
          style={{
            lineHeight: 1,
            fontFamily: ND.display,
            fontSize: 10,
            color: ND.text,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {levelName}
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <ResPill kind={race.resourceA.icon} value={resA} accent={race.primary}/>
      <ResPill kind={race.resourceB.icon} value={resB} accent={race.primary}/>
      <ResPill kind="crystal" value={crystal} accent="oklch(0.82 0.16 80)"/>
    </div>
  );
}

/* ── Bottom nav ───────────────────────────────────────────────────────── */

type BottomNavKey = 'base' | 'galaxy' | 'cmd' | 'story' | 'more';

interface BottomNavProps {
  race: NDRace;
  active?: BottomNavKey;
  onChange?: (key: BottomNavKey) => void;
}

export function BottomNav({ race, active = 'base', onChange }: BottomNavProps) {
  const items: { key: BottomNavKey; label: string }[] = [
    { key: 'base',   label: 'Üs' },
    { key: 'galaxy', label: 'Galaksi' },
    { key: 'cmd',    label: 'Komutan' },
    { key: 'story',  label: 'Hikaye' },
    { key: 'more',   label: 'Daha' },
  ];
  const ico = (k: BottomNavKey, c: string) => {
    const s = 18, sw = 1.5;
    if (k === 'base')   return <svg width={s} height={s} viewBox="0 0 18 18"><rect x="2" y="9" width="14" height="7" fill="none" stroke={c} strokeWidth={sw}/><polygon points="2,9 9,3 16,9" fill="none" stroke={c} strokeWidth={sw}/><rect x="7" y="11" width="4" height="5" fill={c} opacity="0.4"/></svg>;
    if (k === 'galaxy') return <svg width={s} height={s} viewBox="0 0 18 18"><circle cx="9" cy="9" r="6" fill="none" stroke={c} strokeWidth={sw}/><ellipse cx="9" cy="9" rx="6" ry="2" fill="none" stroke={c} strokeWidth={sw} transform="rotate(35 9 9)"/></svg>;
    if (k === 'cmd')    return <svg width={s} height={s} viewBox="0 0 18 18"><circle cx="9" cy="6" r="3" fill="none" stroke={c} strokeWidth={sw}/><path d="M3 16 Q 9 10, 15 16" fill="none" stroke={c} strokeWidth={sw}/></svg>;
    if (k === 'story')  return <svg width={s} height={s} viewBox="0 0 18 18"><rect x="3" y="3" width="12" height="12" fill="none" stroke={c} strokeWidth={sw}/><path d="M3 7 H 15 M 7 3 V 15" stroke={c} strokeWidth={sw}/></svg>;
    return              <svg width={s} height={s} viewBox="0 0 18 18"><circle cx="4" cy="9" r="1.5" fill={c}/><circle cx="9" cy="9" r="1.5" fill={c}/><circle cx="14" cy="9" r="1.5" fill={c}/></svg>;
  };
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        borderTop: `1px solid ${ND.border}`,
        background: 'linear-gradient(180deg, rgba(6,8,15,0.85) 0%, rgba(6,8,15,0.98) 100%)',
        padding: '6px 0 10px',
      }}
    >
      {items.map(it => {
        const isOn = it.key === active;
        const c = isOn ? race.primary : ND.textMute;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange?.(it.key)}
            style={{
              all: 'unset',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              position: 'relative',
              cursor: 'pointer',
              padding: '2px 0',
            }}
            aria-current={isOn ? 'page' : undefined}
            aria-label={it.label}
          >
            {isOn && (
              <div
                style={{
                  position: 'absolute',
                  top: -6,
                  height: 2,
                  width: 24,
                  background: race.primary,
                  boxShadow: `0 0 8px ${race.glow}`,
                }}
              />
            )}
            {ico(it.key, c)}
            <span style={{ fontFamily: ND.display, fontSize: 9, color: c, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Screen wrapper ───────────────────────────────────────────────────── */

interface ScreenProps {
  children?: ReactNode;
  race: NDRace;
  dim?: number;
  intensity?: number;
  style?: CSSProperties;
}

export function Screen({ children, race, dim = 1, intensity = 1, style }: ScreenProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        color: ND.text,
        fontFamily: ND.body,
        overflow: 'hidden',
        ...style,
      }}
    >
      <NebulaBg race={race} intensity={intensity} dim={dim} />
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

/* ── Image placeholder ────────────────────────────────────────────────── */

interface ImgSlotProps {
  label: string;
  ratio?: number | string;
  style?: CSSProperties;
  color?: string;
  intensity?: number;
}

export function ImgSlot({ label, ratio, style, color, intensity = 0.06 }: ImgSlotProps) {
  const c = color || ND.borderHi;
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: ratio as string | number | undefined,
        background: `repeating-linear-gradient(135deg, ${c}${Math.round(intensity * 255).toString(16)} 0 6px, transparent 6px 12px), rgba(10,14,28,0.6)`,
        border: `1px dashed ${c}66`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: ND.mono,
          fontSize: 10,
          color: c,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          textAlign: 'center',
          padding: '0 8px',
        }}
      >
        {label}
      </span>
    </div>
  );
}
