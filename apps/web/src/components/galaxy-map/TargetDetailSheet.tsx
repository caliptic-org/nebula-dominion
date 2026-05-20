'use client';

/**
 * TargetDetailSheet — hedef gezegen / üs detay ekranı
 *
 * Galaksi haritasında bir düşman üssüne tıklanınca aşağıdan yükselen tam ekran
 * detail sheet. İçerir:
 *   • Hedef kimlik başlığı (isim, ırk rozeti, koordinatlar)
 *   • Gezegen görsel önizlemesi (ırk rengi ile animasyonlu plasma orb)
 *   • Savunma gücü bölümü (güç barı + tehdit seviyesi)
 *   • Kaynak ödülü bölümü (mineral/gaz/enerji)
 *   • Irka özgü tehdit göstergesi
 *   • Saldırı hazırlık CTA + keşfet ikincil aksiyon
 */

import { useEffect, useRef, useState } from 'react';
import type { WorldBase } from '@/components/game/WorldMap';

// ── Types ──────────────────────────────────────────────────────────────────

export interface TargetDetailSheetProps {
  /** When true the sheet slides up into view */
  visible: boolean;
  /** The enemy base being inspected */
  base: WorldBase | null;
  /** Player's own race, used for threat-level context */
  playerRace?: string;
  /** Called when the user confirms the attack (navigates to battle-prep) */
  onAttack: (base: WorldBase) => void;
  /** Called when the user requests a scout mission */
  onScout: (base: WorldBase) => void;
  /** Called to dismiss the sheet */
  onClose: () => void;
  /** Optional pending action ID for loading states */
  pendingActionId?: string | null;
}

// ── Race meta ──────────────────────────────────────────────────────────────

interface RaceMeta {
  label: string;
  color: string;
  rgb: string;
  threatTag: string;
  threatDesc: string;
  icon: string;
}

const RACE_META: Record<string, RaceMeta> = {
  zerg: {
    label: 'Zerg',
    color: '#44ff44',
    rgb: '68,255,68',
    threatTag: 'BİYO-TEHDİT',
    threatDesc: 'Organik ordu — hızlı üreme, yoğun swarm saldırısı. Uzak mesafe savunması zayıf.',
    icon: '🦠',
  },
  otomat: {
    label: 'Otomat',
    color: '#00cfff',
    rgb: '0,207,255',
    threatTag: 'MEKANİK-TEHDİT',
    threatDesc: 'Zırhlı mekanik ünite — yüksek dayanıklılık, kesin ateş hassasiyeti. Sayısal baskı ile etkisiz.',
    icon: '🤖',
  },
  canavar: {
    label: 'Canavar',
    color: '#ff6600',
    rgb: '255,102,0',
    threatTag: 'KABA-GÜÇ-TEHDİT',
    threatDesc: 'Devasa bireysel güç — düşük sayı, yüksek hasar. Çoklu küçük birim tacizine karşı savunmasız.',
    icon: '👹',
  },
  insan: {
    label: 'İnsan',
    color: '#4a9eff',
    rgb: '74,158,255',
    threatTag: 'STRATEJİK-TEHDİT',
    threatDesc: 'Dengeli ordu — güçlü taktiksel esneklik. Uzun kuşatmada dikkatli ol.',
    icon: '🧑‍🚀',
  },
  seytan: {
    label: 'Şeytan',
    color: '#cc00ff',
    rgb: '204,0,255',
    threatTag: 'PSİONİK-TEHDİT',
    threatDesc: 'Psiyonik manipülasyon — moral bozucu efektler, gizli hamleler. Keşif kritik.',
    icon: '👿',
  },
};

const FALLBACK_RACE: RaceMeta = {
  label: 'Bilinmeyen',
  color: '#ff3355',
  rgb: '255,51,85',
  threatTag: 'TANIMLANMAMIŞ',
  threatDesc: 'Düşman ırkı tespit edilemedi. Keşif önce tamamlanmalı.',
  icon: '❓',
};

// ── Threat level calc ──────────────────────────────────────────────────────

type ThreatLevel = 'düşük' | 'orta' | 'yüksek' | 'kritik';

function getThreatLevel(power: number): { level: ThreatLevel; color: string; pct: number } {
  if (power < 1_000)  return { level: 'düşük',   color: '#44ff88', pct: Math.round((power / 1000) * 22) + 3  };
  if (power < 2_500)  return { level: 'orta',    color: '#ffc832', pct: Math.round(((power - 1000) / 1500) * 28) + 25 };
  if (power < 3_800)  return { level: 'yüksek',  color: '#ff8800', pct: Math.round(((power - 2500) / 1300) * 25) + 53 };
  return                     { level: 'kritik',  color: '#ff3355', pct: Math.min(97, Math.round(((power - 3800) / 1500) * 18) + 78) };
}

// ── Resource reward estimate ───────────────────────────────────────────────

function estimateRewards(power: number, level: number) {
  const base = Math.floor((power * 0.08) + level * 400);
  return {
    mineral: Math.floor(base * 1.2),
    gas:     Math.floor(base * 0.6),
    energy:  Math.floor(base * 0.4),
  };
}

// ── Plasma orb canvas ──────────────────────────────────────────────────────

function PlasmaOrb({ color, size = 120 }: { color: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const timeRef   = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    const draw = (t: number) => {
      timeRef.current = t;
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const radius = size * 0.34;

      // Outer glow ring
      const outerGrad = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius * 1.8);
      outerGrad.addColorStop(0, `rgba(${r},${g},${b},0.18)`);
      outerGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Core plasma body
      const pulse = 0.94 + 0.06 * Math.sin(t * 0.0018);
      const coreGrad = ctx.createRadialGradient(
        cx - radius * 0.18, cy - radius * 0.22, 0,
        cx, cy, radius * pulse,
      );
      coreGrad.addColorStop(0,   `rgba(255,255,255,0.90)`);
      coreGrad.addColorStop(0.25, `rgba(${r},${g},${b},0.95)`);
      coreGrad.addColorStop(0.65, `rgba(${Math.floor(r*0.5)},${Math.floor(g*0.5)},${Math.floor(b*0.5)},0.85)`);
      coreGrad.addColorStop(1,   `rgba(0,0,0,0)`);
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Rotating plasma filament
      const angle = t * 0.0008;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      const filGrad = ctx.createLinearGradient(-radius, 0, radius, 0);
      filGrad.addColorStop(0, `rgba(${r},${g},${b},0)`);
      filGrad.addColorStop(0.5, `rgba(${r},${g},${b},0.35)`);
      filGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = filGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.9, radius * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [color, size]);

  return <canvas ref={canvasRef} width={size} height={size} className="block" aria-hidden />;
}

// ── Stat Bar ──────────────────────────────────────────────────────────────

function StatBar({ label, pct, color, value }: { label: string; pct: number; color: string; value: string }) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    bar.style.width = '0%';
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => { bar.style.width = `${pct}%`; });
    });
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-display text-[9px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </span>
        <span className="font-display text-[11px] font-bold" style={{ color }}>
          {value}
        </span>
      </div>
      {/* Bar track */}
      <div
        className="relative h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          ref={barRef}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: '0%',
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            boxShadow: `0 0 8px ${color}60`,
            transition: 'width 900ms cubic-bezier(0.32,0.72,0,1)',
          }}
        />
      </div>
    </div>
  );
}

// ── Resource Reward Card ──────────────────────────────────────────────────

function RewardCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    /* Double-bezel card */
    <div
      className="flex-1 min-w-0"
      style={{
        background: `rgba(${color.startsWith('#') ? hexToRgb(color) : color},0.07)`,
        border: `1px solid rgba(${color.startsWith('#') ? hexToRgb(color) : color},0.20)`,
        borderRadius: '0.875rem',
        padding: '2px',
      }}
    >
      <div
        className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-[0.75rem]"
        style={{
          background: 'rgba(0,0,0,0.35)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)',
        }}
      >
        <span className="text-lg leading-none" aria-hidden>{icon}</span>
        <span
          className="font-display text-[12px] font-black leading-none"
          style={{ color, textShadow: `0 0 10px ${color}50` }}
        >
          +{value.toLocaleString('tr-TR')}
        </span>
        <span className="font-body text-[9px] uppercase tracking-[0.12em]" style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </span>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ── Main Component ─────────────────────────────────────────────────────────

export function TargetDetailSheet({
  visible,
  base,
  playerRace,
  onAttack,
  onScout,
  onClose,
  pendingActionId,
}: TargetDetailSheetProps) {
  const [rendered, setRendered] = useState(false);

  // Delay mount so the open animation plays on first show
  useEffect(() => {
    if (visible) setRendered(true);
  }, [visible]);

  if (!rendered && !visible) return null;

  const race    = base?.race?.toLowerCase() ?? '';
  const raceMeta = RACE_META[race] ?? FALLBACK_RACE;
  const power   = base?.power ?? 0;
  const level   = base?.level ?? 1;
  const threat  = getThreatLevel(power);
  const rewards = estimateRewards(power, level);

  const isAttackPending = pendingActionId === 'attack';
  const isScoutPending  = pendingActionId === 'scout';
  const anyPending      = pendingActionId !== null && pendingActionId !== undefined;

  return (
    /* Backdrop */
    <div
      className="absolute inset-0 z-50"
      style={{
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Dimmed overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(0,0,8,0.55)',
          backdropFilter: 'blur(2px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 400ms cubic-bezier(0.32,0.72,0,1)',
        }}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Hedef: ${base?.name ?? 'Bilinmeyen'}`}
        className="absolute bottom-0 left-0 right-0"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(105%)',
          transition: 'transform 540ms cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Outer doppelrand shell */}
        <div
          className="mx-2 mb-2"
          style={{
            background: `rgba(${raceMeta.rgb},0.05)`,
            border: `1px solid rgba(${raceMeta.rgb},0.14)`,
            borderRadius: '1.5rem',
            padding: '2px',
            boxShadow: `0 -16px 60px rgba(0,0,0,0.75), 0 0 40px rgba(${raceMeta.rgb},0.10)`,
          }}
        >
          {/* Inner core */}
          <div
            className="relative overflow-hidden"
            style={{
              background: 'rgba(6,8,16,0.97)',
              borderRadius: 'calc(1.5rem - 2px)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.07)',
            }}
          >

            {/* ── Manga corner accents ──────────────────────────────────── */}
            {(['tl', 'tr'] as const).map(corner => (
              <div
                key={corner}
                className="absolute top-0 w-10 h-10 pointer-events-none"
                style={{
                  [corner === 'tl' ? 'left' : 'right']: 0,
                  transform: corner === 'tr' ? 'scaleX(-1)' : undefined,
                  zIndex: 2,
                }}
                aria-hidden
              >
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <path d="M0 0 L22 0" stroke={`rgba(${raceMeta.rgb},0.40)`} strokeWidth="2"/>
                  <path d="M0 0 L0 22" stroke={`rgba(${raceMeta.rgb},0.40)`} strokeWidth="2"/>
                  <circle cx="0" cy="0" r="3" fill={`rgba(${raceMeta.rgb},0.55)`}/>
                </svg>
              </div>
            ))}

            {/* ── Race tint strip ───────────────────────────────────────── */}
            <div
              className="absolute top-0 left-0 right-0 h-1 pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent, ${raceMeta.color}50, transparent)`,
              }}
              aria-hidden
            />

            {/* ── Header ────────────────────────────────────────────────── */}
            <div
              className="flex items-start gap-3 px-4 pt-4 pb-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              {/* Planet orb */}
              <div
                className="shrink-0"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'rgba(0,0,0,0.5)',
                  border: `1px solid rgba(${raceMeta.rgb},0.28)`,
                  boxShadow: `0 0 16px rgba(${raceMeta.rgb},0.22)`,
                }}
              >
                <PlasmaOrb color={raceMeta.color} size={52} />
              </div>

              {/* Title block */}
              <div className="flex-1 min-w-0">
                {/* Eyebrow: race + threat badge */}
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-display text-[9px] uppercase tracking-[0.16em] font-bold"
                    style={{
                      background: `rgba(${raceMeta.rgb},0.14)`,
                      border: `1px solid rgba(${raceMeta.rgb},0.30)`,
                      color: raceMeta.color,
                    }}
                  >
                    <span aria-hidden>{raceMeta.icon}</span>
                    {raceMeta.label}
                  </span>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full font-display text-[8px] uppercase tracking-[0.14em]"
                    style={{
                      background: `rgba(${hexToRgb(threat.color)},0.12)`,
                      border: `1px solid rgba(${hexToRgb(threat.color)},0.28)`,
                      color: threat.color,
                    }}
                  >
                    ⚠ {threat.level}
                  </span>
                </div>

                {/* Base name */}
                <h2
                  className="font-display text-[15px] font-black tracking-wide leading-tight truncate"
                  style={{
                    color: '#e8e8f0',
                    textShadow: `0 0 18px rgba(${raceMeta.rgb},0.30)`,
                  }}
                >
                  {base?.name ?? 'Bilinmeyen Üs'}
                </h2>

                {/* Meta row */}
                <div className="flex items-center gap-3 mt-0.5">
                  <span
                    className="font-body text-[11px]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Sv.{level}
                  </span>
                  {base && (
                    <span
                      className="font-display text-[9px] px-1.5 py-0.5 rounded tracking-widest"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      [{base.col},{base.row}]
                    </span>
                  )}
                </div>
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: 'var(--color-text-muted)',
                }}
                aria-label="Kapat"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* ── Body ──────────────────────────────────────────────────── */}
            <div className="px-4 py-3 flex flex-col gap-3.5">

              {/* Defense section */}
              <section>
                <div
                  className="flex items-center gap-1.5 mb-2"
                >
                  <span
                    className="inline-block w-1 h-3 rounded-full"
                    style={{ background: threat.color, boxShadow: `0 0 6px ${threat.color}` }}
                    aria-hidden
                  />
                  <span
                    className="font-display text-[9px] uppercase tracking-[0.2em]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Savunma Analizi
                  </span>
                </div>

                <div
                  className="rounded-xl p-3 flex flex-col gap-2.5"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <StatBar
                    label="Savunma Gücü"
                    pct={threat.pct}
                    color={threat.color}
                    value={power.toLocaleString('tr-TR')}
                  />

                  {/* Threat indicator text */}
                  <div
                    className="flex items-start gap-2 px-2.5 py-2 rounded-lg"
                    style={{
                      background: `rgba(${raceMeta.rgb},0.06)`,
                      border: `1px solid rgba(${raceMeta.rgb},0.14)`,
                    }}
                  >
                    <span
                      className="font-display text-[8px] uppercase tracking-[0.14em] font-bold shrink-0 mt-0.5"
                      style={{ color: raceMeta.color }}
                    >
                      {raceMeta.threatTag}
                    </span>
                    <span
                      className="font-body text-[11px] leading-snug"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {raceMeta.threatDesc}
                    </span>
                  </div>
                </div>
              </section>

              {/* Resource rewards section */}
              <section>
                <div className="flex items-center gap-1.5 mb-2">
                  <span
                    className="inline-block w-1 h-3 rounded-full"
                    style={{ background: '#ffc832', boxShadow: '0 0 6px #ffc83260' }}
                    aria-hidden
                  />
                  <span
                    className="font-display text-[9px] uppercase tracking-[0.2em]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Tahmini Kaynak Ödülü
                  </span>
                </div>

                <div className="flex gap-2">
                  <RewardCard icon="💎" label="Mineral" value={rewards.mineral} color="#4a9eff" />
                  <RewardCard icon="⚗️" label="Gaz"     value={rewards.gas}     color="#44ff88" />
                  <RewardCard icon="⚡" label="Enerji"  value={rewards.energy}  color="#ffc832" />
                </div>
              </section>
            </div>

            {/* ── CTA ───────────────────────────────────────────────────── */}
            <div
              className="px-4 pb-4 pt-1 flex gap-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              {/* Scout button */}
              <button
                onClick={() => base && onScout(base)}
                disabled={anyPending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full font-display text-[11px] font-bold tracking-[0.08em] uppercase transition-all duration-300 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(0,207,255,0.09)',
                  border: '1px solid rgba(0,207,255,0.25)',
                  color: '#00cfff',
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  if (anyPending) return;
                  e.currentTarget.style.background = 'rgba(0,207,255,0.18)';
                  e.currentTarget.style.boxShadow   = '0 0 18px rgba(0,207,255,0.25)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(0,207,255,0.09)';
                  e.currentTarget.style.boxShadow   = '';
                }}
                aria-busy={isScoutPending}
              >
                {isScoutPending ? (
                  <span className="inline-block w-3 h-3 rounded-full border-2 animate-spin" style={{ borderColor:'#00cfff', borderTopColor:'transparent' }} />
                ) : (
                  <span aria-hidden>🔭</span>
                )}
                <span>Keşfet</span>
                {/* Button-in-button hotkey badge */}
                <span
                  className="flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-bold"
                  style={{ background: 'rgba(0,207,255,0.15)', border: '1px solid rgba(0,207,255,0.25)' }}
                  aria-hidden
                >S</span>
              </button>

              {/* Attack CTA — primary */}
              <button
                onClick={() => base && onAttack(base)}
                disabled={anyPending}
                className="group flex-1 relative flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-full font-display text-[12px] font-black tracking-[0.10em] uppercase overflow-hidden transition-all duration-300 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(135deg, rgba(255,51,85,0.80) 0%, rgba(${raceMeta.rgb},0.70) 100%)`,
                  border: `1px solid rgba(255,51,85,0.55)`,
                  color: '#ffffff',
                  boxShadow: `0 4px 24px rgba(255,51,85,0.30), inset 0 1px 1px rgba(255,255,255,0.15)`,
                }}
                onMouseEnter={e => {
                  if (anyPending) return;
                  e.currentTarget.style.boxShadow = `0 6px 32px rgba(255,51,85,0.50), inset 0 1px 1px rgba(255,255,255,0.20)`;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = `0 4px 24px rgba(255,51,85,0.30), inset 0 1px 1px rgba(255,255,255,0.15)`;
                  e.currentTarget.style.transform = '';
                }}
                aria-busy={isAttackPending}
              >
                {/* Background shimmer */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
                    transform: 'skewX(-20deg) translateX(-100%)',
                    animation: 'none',
                  }}
                  aria-hidden
                />

                {isAttackPending ? (
                  <span className="inline-block w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor:'white', borderTopColor:'transparent' }} />
                ) : (
                  <span aria-hidden className="text-base leading-none">⚔️</span>
                )}
                <span>Saldırı Hazırlığı</span>
                {/* Button-in-button arrow */}
                <span
                  className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-all duration-300"
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.18)',
                  }}
                  aria-hidden
                >
                  →
                </span>
              </button>
            </div>

            {/* Race glow strip bottom */}
            <div
              className="h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${raceMeta.color}35, transparent)` }}
              aria-hidden
            />
          </div>
        </div>
      </div>
    </div>
  );
}
