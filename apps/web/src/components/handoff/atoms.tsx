'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ND, type NDRace, type NDResIconKind } from './nd-tokens';
import { NebulaBg } from './Sigil';

/* ── NotchSurface ─────────────────────────────────────────────────────────
 * clip-path + border + glow safely. Clip-path on a single element clips
 * both border AND box-shadow, so the design's 1px stroke and outer glow
 * disappear under inline `border: 1px solid ...`/`boxShadow: ...`.
 *
 * Pattern: an outer wrapper applies `filter: drop-shadow(…)` for the glow
 * (drop-shadow respects clipped silhouettes). A middle clipped div uses the
 * border colour as its background and a `padding` equal to border width so a
 * 1px stroke shows around the inner div. The inner div is clipped 1px tighter
 * and carries the actual content background.
 *
 * Use this any time you'd write `clipPath` + `border` together. */

const notchClip = (n: number) =>
  `polygon(${n}px 0, 100% 0, 100% calc(100% - ${n}px), calc(100% - ${n}px) 100%, 0 100%, 0 ${n}px)`;

interface NotchSurfaceProps {
  children?: ReactNode;
  /** Corner-cut size in px. Default 12 (matches NotchPanel). */
  notch?: number;
  /** 1px outer stroke colour. Omit to skip the stroke layer. */
  borderColor?: string;
  /** Inner content background. Defaults to `ND.surface`. */
  background?: string;
  /** Outer glow colour. Renders via `filter: drop-shadow` so the clipped
   * silhouette is preserved. Omit for no glow. */
  glow?: string;
  /** Glow blur radius. Default 12px. */
  glowSize?: number;
  /** Padding applied to the inner content surface. */
  padding?: number | string;
  /** Extra styles applied to the outermost (glow) wrapper. */
  style?: CSSProperties;
  /** Extra styles applied to the inner content surface. */
  innerStyle?: CSSProperties;
  /** Tag to use for the outermost element. Default 'div'. */
  as?: 'div' | 'span';
}

export function NotchSurface({
  children,
  notch = 12,
  borderColor,
  background,
  glow,
  glowSize = 12,
  padding = 12,
  style,
  innerStyle,
  as = 'div',
}: NotchSurfaceProps) {
  const outerClip = notchClip(notch);
  const innerNotch = Math.max(0, notch - 1);
  const innerClip = notchClip(innerNotch);
  const Tag = as as 'div';
  const innerBg = background ?? ND.surface;

  if (!borderColor) {
    return (
      <Tag
        style={{
          display: 'inline-block',
          filter: glow ? `drop-shadow(0 0 ${glowSize}px ${glow})` : undefined,
          ...style,
        }}
      >
        <div
          style={{
            clipPath: outerClip,
            background: innerBg,
            padding,
            ...innerStyle,
          }}
        >
          {children}
        </div>
      </Tag>
    );
  }

  return (
    <Tag
      style={{
        display: 'inline-block',
        filter: glow ? `drop-shadow(0 0 ${glowSize}px ${glow})` : undefined,
        ...style,
      }}
    >
      <div
        style={{
          clipPath: outerClip,
          background: borderColor,
          padding: 1,
        }}
      >
        <div
          style={{
            clipPath: innerClip,
            background: innerBg,
            padding,
            ...innerStyle,
          }}
        >
          {children}
        </div>
      </div>
    </Tag>
  );
}

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
    <NotchSurface
      notch={notch}
      borderColor={race ? race.primary + '55' : ND.border}
      background={fill || ND.surface}
      padding={12}
      style={{ display: 'block', position: 'relative', ...style }}
    >
      {children}
    </NotchSurface>
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

  type Variant = {
    background: string;
    color: string;
    borderColor?: string;
    glow?: string;
    fontWeight: number;
  };
  const primaryColor = race?.primary || 'oklch(0.78 0.16 220)';
  const primaryDim = race?.primaryDim || 'oklch(0.55 0.13 220)';
  const primaryGlow = race?.glow || 'oklch(0.85 0.18 220)';
  const variants: Record<NDButtonVariant, Variant> = {
    primary: {
      background: `linear-gradient(180deg, ${primaryColor} 0%, ${primaryDim} 100%)`,
      color: '#0A0E1A',
      borderColor: `${primaryGlow}55`,
      glow: `${primaryGlow}66`,
      fontWeight: 700,
    },
    ghost: {
      background: 'rgba(120, 200, 255, 0.06)',
      color: ND.text,
      borderColor: ND.border,
      fontWeight: 600,
    },
    outline: {
      // Inner surface needs an opaque dark fill so the race-tinted outer
      // stripe of NotchSurface (`borderColor: race.primary`) doesn't bleed
      // through and end up matching the text colour. Using `ND.bg` keeps
      // the legible "race outline on dark face" silhouette the design wants.
      background: ND.bg,
      color: race?.primary || ND.text,
      borderColor: race?.primary || ND.borderHi,
      fontWeight: 600,
    },
    danger: {
      // Same reason as outline: opaque face so the red border doesn't
      // collide with the red text.
      background: ND.bg,
      color: ND.danger,
      borderColor: `${ND.danger}77`,
      fontWeight: 600,
    },
  };
  const v = variants[variant];
  return (
    <NotchSurface
      notch={8}
      borderColor={v.borderColor}
      background={v.background}
      glow={v.glow}
      glowSize={16}
      padding={0}
      style={{
        display: full ? 'block' : 'inline-block',
        width: full ? '100%' : undefined,
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      innerStyle={{ padding: 0 }}
    >
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className="nd-btn"
        style={{
          all: 'unset',
          boxSizing: 'border-box',
          height: heights[size],
          padding: padding[size],
          fontSize: fontSize[size],
          fontFamily: ND.display,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: v.color,
          fontWeight: v.fontWeight,
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
        }}
      >
        {icon}
        <span>{children}</span>
      </button>
    </NotchSurface>
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
    // Science (◈) — 4-point diamond outline + center dot.  Matches the
    // glyph used in the BottomNav "MAĞAZA" tab + the inline ◈ characters
    // peppered through battle-result / map for visual consistency.
    science:<g><polygon points="8,1 15,8 8,15 1,8" fill="none" stroke={c} strokeWidth="1.4"/><circle cx="8" cy="8" r="1.6" fill={c}/></g>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: 'inline-block', verticalAlign: 'middle' }} aria-hidden="true">
      {map[kind] || map.cred}
    </svg>
  );
}

interface ResPillProps {
  kind: NDResIconKind;
  value: string | number;
  accent?: string;
  /** When provided, the pill renders as a button and calls this on click —
   *  used by the HUD to surface a "what is this / how to earn it" popover. */
  onClick?: () => void;
  /** When `onClick` is set, this lights the border in race accent and
   *  serves as the popover anchor's aria-controls relationship. */
  ariaControls?: string;
  /** When `onClick` is set + popover is open, true marks the pill active. */
  active?: boolean;
}
export function ResPill({ kind, value, accent, onClick, ariaControls, active }: ResPillProps) {
  const sharedStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 8px 4px 6px',
    background: 'rgba(8, 12, 26, 0.7)',
    border: `1px solid ${active && accent ? accent : ND.border}`,
    borderRadius: 3,
    fontFamily: ND.mono,
    fontSize: 11,
    color: ND.text,
    letterSpacing: '0.04em',
    transition: 'border-color 120ms ease',
  };
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        aria-expanded={Boolean(active)}
        aria-controls={ariaControls}
        style={{
          ...sharedStyle,
          cursor: 'pointer',
          font: 'inherit',
        }}
      >
        <ResIcon kind={kind} size={12} color={accent}/>
        <span>{value}</span>
      </button>
    );
  }
  return (
    <div style={sharedStyle}>
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
  /** Science is the cross-race research currency (◈). When undefined the
   *  pill is hidden entirely — keeps fresh accounts that haven't earned
   *  any science from carrying an empty chip in the HUD. */
  science?: string | number;
  /** Optional per-resource live telemetry fed straight from useHudState.
   *  When present, the help popover surfaces "+X/tick · Y / Z depo" so
   *  the player can see whether they're producing anything and whether
   *  they're capped out. */
  resAPerTick?: number;
  resBPerTick?: number;
  crystalPerTick?: number;
  /** Science (◈) telemetry — populated when useHudState exposes
   *  `science / sciencePerTick / scienceCap`.  Per-tick is 0 until the
   *  player garrisons a galaxy node, but we still pass it through so the
   *  popover can honestly report "+0/tick". */
  sciencePerTick?: number;
  resACap?: number;
  resBCap?: number;
  crystalCap?: number;
  scienceCap?: number;
}

/* Per-resource help copy — shown when the player taps a HUD resource pill.
 * Three slots map to game-server resource columns: A=mineral, B=gas,
 * crystal=energy (the canonical binding lives in nd-tokens.ts via
 * Resource.field, consumed by useHudState). The race's own
 * resourceA.name / resourceB.name supply the title so insan reads
 * "Kredi / Yakıt", zerg reads "Biyokütle / Genetik" etc. — keeps the
 * lore consistent while honestly representing the underlying field. */
type ResSlot = 'A' | 'B' | 'crystal' | 'science';

interface ResInfo {
  title: string;
  description: string;
  howTo: string;
}

function resInfoFor(slot: ResSlot, race: NDRace, t: ReturnType<typeof useTranslations>): ResInfo {
  if (slot === 'A') {
    return {
      title: race.resourceA.name,
      description: t('resA.description'),
      howTo: t('resA.howTo'),
    };
  }
  if (slot === 'B') {
    return {
      title: race.resourceB.name,
      description: t('resB.description'),
      howTo: t('resB.howTo'),
    };
  }
  if (slot === 'science') {
    // Cross-race currency — popover copy comes from the dedicated
    // `science.*` i18n group so it doesn't pull labels from any per-race
    // resourceA/B description.  See messages/{tr,en,zh}.json hud.science.
    return {
      title: t('science.title'),
      description: t('science.description'),
      howTo: t('science.howTo'),
    };
  }
  return {
    title: t('crystal.title'),
    description: t('crystal.description'),
    howTo: t('crystal.howTo'),
  };
}

export function HUD({
  race,
  level = 1,
  levelName = '—',
  resA = '—',
  resB = '—',
  crystal = '—',
  science,
  resAPerTick,
  resBPerTick,
  crystalPerTick,
  sciencePerTick,
  resACap,
  resBCap,
  crystalCap,
  scienceCap,
}: HUDProps) {
  // Single-slot popover: tap a pill to open, tap again or outside to close.
  // Lives in HUD so all three pills share one open-state (only one popover
  // visible at a time keeps the top-bar from getting cluttered).
  const t = useTranslations('hud');
  const [openSlot, setOpenSlot] = useState<ResSlot | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openSlot) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpenSlot(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [openSlot]);

  const toggle = (slot: ResSlot) =>
    setOpenSlot((cur) => (cur === slot ? null : slot));

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: 'linear-gradient(180deg, rgba(6,8,15,0.95) 0%, rgba(6,8,15,0.70) 100%)',
        borderBottom: `1px solid ${ND.border}`,
      }}
    >
      <NotchSurface
        notch={6}
        borderColor={`${race.primary}66`}
        background={`linear-gradient(180deg, ${race.primary}28, transparent)`}
        padding={0}
        innerStyle={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 6px 4px 4px',
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
      </NotchSurface>
      <div style={{ flex: 1 }} />
      <ResPill
        kind={race.resourceA.icon}
        value={resA}
        accent={race.primary}
        onClick={() => toggle('A')}
        active={openSlot === 'A'}
        ariaControls="hud-res-popover"
      />
      <ResPill
        kind={race.resourceB.icon}
        value={resB}
        accent={race.primary}
        onClick={() => toggle('B')}
        active={openSlot === 'B'}
        ariaControls="hud-res-popover"
      />
      <ResPill
        kind="crystal"
        value={crystal}
        accent="oklch(0.82 0.16 80)"
        onClick={() => toggle('crystal')}
        active={openSlot === 'crystal'}
        ariaControls="hud-res-popover"
      />
      {/* Science (◈) — research currency earned from battles + garrisoned
       *  galaxy nodes.  Rendered through ResPill (kind='science') exactly
       *  like the other three pills so the row is *structurally* uniform:
       *  same tag (<button>), same props, same popover-open behaviour.
       *  Earlier this was an inline <div> which made the chip look right
       *  visually but diverged from the others' interactive contract —
       *  no hover/active state, no popover, different DOM shape. */}
      {science !== undefined && (
        <ResPill
          kind="science"
          value={science}
          accent="oklch(0.80 0.18 260)"
          onClick={() => toggle('science')}
          active={openSlot === 'science'}
          ariaControls="hud-res-popover"
        />
      )}

      {openSlot && (
        <ResInfoPopover
          info={resInfoFor(openSlot, race, t)}
          race={race}
          slot={openSlot}
          t={t}
          perTick={
            openSlot === 'A'       ? resAPerTick
            : openSlot === 'B'     ? resBPerTick
            : openSlot === 'science' ? sciencePerTick
            : crystalPerTick
          }
          currentValue={
            openSlot === 'A'       ? resA
            : openSlot === 'B'     ? resB
            : openSlot === 'science' ? (science !== undefined ? String(science) : '—')
            : crystal
          }
          cap={
            openSlot === 'A'       ? resACap
            : openSlot === 'B'     ? resBCap
            : openSlot === 'science' ? scienceCap
            : crystalCap
          }
          onClose={() => setOpenSlot(null)}
        />
      )}
    </div>
  );
}

/* ── HUD resource info popover ────────────────────────────────────────── */

function ResInfoPopover({
  info,
  race,
  slot,
  perTick,
  currentValue,
  cap,
  onClose,
  t,
}: {
  info: ResInfo;
  race: NDRace;
  slot: ResSlot;
  perTick?: number;
  currentValue?: string;
  cap?: number;
  onClose: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const isCrystal = slot === 'crystal';
  const accent = isCrystal ? 'oklch(0.82 0.16 80)' : race.primary;
  const fmtNum = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1000 ? `${(n / 1000).toFixed(1)}K`
    : Math.floor(n).toLocaleString();
  const rateText = perTick !== undefined ? (perTick > 0 ? `+${fmtNum(perTick)}/tick` : '0/tick') : null;
  const capText = cap !== undefined && cap > 0 ? `${currentValue ?? '—'} / ${fmtNum(cap)}` : null;
  // Race-aware "build this to earn more" hint. Different slots point to
  // different race buildings:
  //   A (mineral) → slot 0 (Capital — produces mineral via baseline)
  //   B (gas)     → slot 3 (Research/secondary that boosts gas/genome)
  //   crystal     → slot 1 (Energy producer — reactor / spore pool / etc.)
  // Previously slot A also pointed at slot 1 ("Reaktör Modülü"), which
  // taught players the wrong building when their mineral was low. Slot 0
  // is the player's capital — upgrading it improves baseline yield on
  // every race, so it's always a sensible "next step" for the A pill.
  const focusSlotIdx = slot === 'A' ? 0 : slot === 'B' ? 3 : 1;
  const focusBuilding = race.buildings[focusSlotIdx];
  const focusHref = focusBuilding?.slug
    ? `/base/build?focus=${focusBuilding.slug}`
    : '/base/build';
  return (
    <div
      id="hud-res-popover"
      role="dialog"
      aria-label={`${info.title} ${t('resPopover.aboutSuffix')}`}
      style={{
        position: 'absolute',
        // Anchor to the right edge of the HUD — same edge as the pill
        // cluster — and let the width clamp keep it on-screen instead
        // of computing a per-pill offset that overflows on narrow
        // viewports. Mobile 375px viewport can't safely shift a 240px
        // panel 156px to the left of the right pill (= overflow -21).
        right: 10,
        top: 'calc(100% + 6px)',
        zIndex: 30,
        // Clamp keeps the popover under the rightmost pill on desktop
        // (240px wide) but shrinks to viewport-edge-aware width on
        // narrow phones (375 - 20 padding = 355 max; usually hits 232).
        width: 232,
        maxWidth: 'calc(100vw - 20px)',
        background: 'rgba(6,8,15,0.96)',
        border: `1px solid ${accent}55`,
        borderRadius: 6,
        padding: '8px 10px',
        boxShadow: `0 12px 28px -10px rgba(0,0,0,0.6), 0 0 16px -6px ${accent}66`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        fontSize: 11,
        lineHeight: 1.4,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            fontFamily: ND.display,
            fontSize: 12,
            color: accent,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            lineHeight: 1.1,
          }}
        >
          {info.title}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('resPopover.close')}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '0 4px',
            color: ND.textMute,
            fontFamily: ND.mono,
            fontSize: 13,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Live telemetry row — answers "kaç tane üretiyorum, depo doldu mu"
       *  before the player even reads the description. Rate first (the
       *  actionable number), cap second. */}
      {(rateText || capText) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
            fontFamily: ND.mono,
            fontSize: 10,
          }}
        >
          {rateText && (
            <span
              style={{
                color: perTick && perTick > 0 ? accent : ND.danger,
                letterSpacing: '0.04em',
              }}
            >
              {rateText}
            </span>
          )}
          {capText && (
            <span style={{ color: ND.textDim, letterSpacing: '0.02em' }}>
              · {capText}
            </span>
          )}
        </div>
      )}

      <p
        style={{
          margin: 0,
          fontFamily: ND.body,
          fontSize: 10.5,
          lineHeight: 1.4,
          color: ND.textDim,
        }}
      >
        {info.description}
      </p>
      <div
        style={{
          marginTop: 6,
          padding: '5px 7px',
          borderRadius: 4,
          background: `${accent}14`,
          border: `1px solid ${accent}33`,
          fontFamily: ND.body,
          fontSize: 10,
          lineHeight: 1.35,
          color: ND.text,
        }}
      >
        <span
          style={{
            display: 'block',
            fontFamily: ND.mono,
            fontSize: 7.5,
            letterSpacing: '0.18em',
            color: accent,
            textTransform: 'uppercase',
            marginBottom: 2,
          }}
        >
          {t('resPopover.howToLabel')}
        </span>
        {focusBuilding ? (
          <>
            <strong style={{ color: accent }}>{focusBuilding.n}</strong>{' '}
            {t('resPopover.buildAction')}
          </>
        ) : (
          info.howTo
        )}
      </div>
      <a
        href={focusHref}
        onClick={onClose}
        style={{
          display: 'inline-block',
          marginTop: 8,
          padding: '5px 8px',
          background: accent,
          color: '#06080F',
          fontFamily: ND.display,
          fontSize: 9.5,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          borderRadius: 3,
          boxShadow: `0 0 10px -3px ${accent}99`,
        }}
      >
        {focusBuilding?.n
          ? t('resPopover.buildCtaLink', { name: focusBuilding.n })
          : t('resPopover.openCatalog')}
      </a>
    </div>
  );
}

/* ── Bottom nav ───────────────────────────────────────────────────────── *
 * Single shared 5-tab navigation used across every primary game screen
 * (Base, Map, Battle, Alliance, Shop).  Secondary screens like /missions,
 * /profile, /settings deliberately omit BottomNav since their own back
 * affordance returns the player to the originating tab.
 *
 * Tab keys mirror the GalaxyMapScreen design tokens so the same 5 chips
 * appear on every primary route — no more per-screen drift between the
 * old "story/cmd/more" navigation and the new "map/battle/alliance/shop"
 * one.  See ../nd/screens/GalaxyMapScreen.tsx for the icon palette this
 * draws from.
 */

type BottomNavKey = 'base' | 'map' | 'battle' | 'alliance' | 'shop';

interface BottomNavProps {
  race: NDRace;
  /** Highlighted tab. Pass `null` (or omit) on screens that aren't one of
   *  the 5 primary destinations so no tab pulses active. */
  active?: BottomNavKey | null;
  onChange?: (key: BottomNavKey) => void;
}

export function BottomNav({ race, active = 'base', onChange }: BottomNavProps) {
  const items: { key: BottomNavKey; label: string; icon: string }[] = [
    { key: 'base',     label: 'ÜS',     icon: '◈' },
    { key: 'map',      label: 'HARİTA', icon: '⊕' },
    { key: 'battle',   label: 'SAVAŞ',  icon: '⚔' },
    { key: 'alliance', label: 'LONCA',  icon: '⬡' },
    { key: 'shop',     label: 'MAĞAZA', icon: '◆' },
  ];
  return (
    <nav
      aria-label="Ana navigasyon"
      style={{
        flexShrink: 0,
        zIndex: 10,
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        background: 'rgba(6,8,15,0.97)',
        borderTop: `1px solid ${ND.border}`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
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
              justifyContent: 'center',
              gap: 2,
              padding: '8px 0',
              minHeight: 52,
              position: 'relative',
              cursor: 'pointer',
              color: c,
              transition: 'color 150ms ease-out',
            }}
            aria-current={isOn ? 'page' : undefined}
            aria-label={it.label}
          >
            {isOn && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 24,
                  height: 2,
                  background: race.primary,
                  borderRadius: 1,
                  boxShadow: `0 0 8px ${race.glow}`,
                }}
              />
            )}
            <span style={{ fontSize: 16, lineHeight: 1 }}>{it.icon}</span>
            <span
              style={{
                fontFamily: ND.mono,
                fontSize: 8,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
              }}
            >
              {it.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/* ── Screen wrapper ───────────────────────────────────────────────────── */

interface ScreenProps {
  children?: ReactNode;
  race: NDRace;
  dim?: number;
  intensity?: number;
  style?: CSSProperties;
  /** Optional per-screen backdrop image (e.g. /assets/bases/<race>/age-<n>.png).
   *  Forwarded into NebulaBg so the SVG nebula layers tint the photo instead
   *  of an opaque #06080F fill. Without this, screens like /base were hiding
   *  their per-age ComfyUI art under the default deep-space background. */
  bgImage?: string | null;
}

export function Screen({ children, race, dim = 1, intensity = 1, style, bgImage }: ScreenProps) {
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
      <NebulaBg race={race} intensity={intensity} dim={dim} bgImage={bgImage} />
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
