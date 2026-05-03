'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

interface PowerSegment {
  label: string;
  value: number;
  color: string;
  icon: string;
}

interface ActiveBuff {
  id: string;
  icon: string;
  name: string;
  effect: string;
  effectValue: number;
  effectType: 'attack' | 'defense' | 'speed' | 'production' | 'xp';
  remainingSec: number;
  totalSec: number;
}

interface BattleStat {
  label: string;
  value: string | number;
  delta?: number;
  icon: string;
}

interface ResourceRate {
  type: string;
  icon: string;
  perHour: number;
  delta: number;
  color: string;
}

// ── Demo Data ──────────────────────────────────────────────────────────────

const POWER_SEGMENTS: PowerSegment[] = [
  { label: 'Komutan Katkısı', value: 38, color: '#4a9eff', icon: '⚔️' },
  { label: 'Araştırma Katkısı', value: 27, color: '#cc00ff', icon: '🔬' },
  { label: 'Birim Katkısı', value: 35, color: '#44ff88', icon: '🤖' },
];

const ACTIVE_BUFFS: ActiveBuff[] = [
  {
    id: 'b1',
    icon: '⚔️',
    name: 'Savaş Frenezisi',
    effect: 'Saldırı',
    effectValue: +25,
    effectType: 'attack',
    remainingSec: 3240,
    totalSec: 7200,
  },
  {
    id: 'b2',
    icon: '🛡️',
    name: 'Zırh Protokolü',
    effect: 'Savunma',
    effectValue: +18,
    effectType: 'defense',
    remainingSec: 1800,
    totalSec: 3600,
  },
  {
    id: 'b3',
    icon: '⚡',
    name: 'Enerji Akışı',
    effect: 'Üretim Hızı',
    effectValue: +40,
    effectType: 'production',
    remainingSec: 540,
    totalSec: 3600,
  },
  {
    id: 'b4',
    icon: '🌀',
    name: 'XP Katalizörü',
    effect: 'XP Kazanımı',
    effectValue: +50,
    effectType: 'xp',
    remainingSec: 5400,
    totalSec: 14400,
  },
  {
    id: 'b5',
    icon: '💨',
    name: 'Hamle Ivmesi',
    effect: 'Hareket Hızı',
    effectValue: +15,
    effectType: 'speed',
    remainingSec: 900,
    totalSec: 1800,
  },
  {
    id: 'b6',
    icon: '🔬',
    name: 'Araştırma Hızlandırıcı',
    effect: 'Araştırma',
    effectValue: +30,
    effectType: 'production',
    remainingSec: 10800,
    totalSec: 10800,
  },
];

const BATTLE_STATS: BattleStat[] = [
  { label: 'Toplam Saldırı', value: '148,240', delta: +12, icon: '⚔️' },
  { label: 'Toplam Savunma', value: '92,580', delta: +5, icon: '🛡️' },
  { label: 'Kazanılan Savaş', value: 47, delta: +3, icon: '🏆' },
  { label: 'Kaybedilen Savaş', value: 11, delta: -2, icon: '💀' },
  { label: 'Kazanma Oranı', value: '81%', delta: +6, icon: '📊' },
  { label: 'Toplam Güç', value: '24,600', delta: +8, icon: '⚡' },
];

const RESOURCE_RATES: ResourceRate[] = [
  { type: 'Mineral', icon: '💎', perHour: 4800, delta: +12, color: '#44d9c8' },
  { type: 'Gaz', icon: '🔵', perHour: 2240, delta: -3, color: '#4a9eff' },
  { type: 'Enerji', icon: '⚡', perHour: 3120, delta: +24, color: '#ffc832' },
  { type: 'Nüfus', icon: '👥', perHour: 0, delta: 0, color: '#cc00ff' },
];

// ── Helper: format seconds to h:mm:ss ────────────────────────────────────

function formatTime(sec: number): string {
  if (sec <= 0) return '00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ── Donut Chart ────────────────────────────────────────────────────────────

function DonutChart({ segments, total }: { segments: PowerSegment[]; total: number }) {
  const size = 160;
  const radius = 62;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 4; // gap in degrees between segments

  let cumulative = 0;
  const slices = segments.map((seg) => {
    const fraction = seg.value / 100;
    const dashLen = fraction * circumference - (gap * circumference) / 360;
    const offset = circumference - cumulative * circumference;
    cumulative += fraction;
    return { ...seg, dashLen: Math.max(0, dashLen), offset };
  });

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="14"
        />
        {slices.map((slice, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth="14"
            strokeDasharray={`${slice.dashLen} ${circumference - slice.dashLen}`}
            strokeDashoffset={slice.offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{
              filter: `drop-shadow(0 0 6px ${slice.color}66)`,
              transition: 'stroke-dasharray 0.5s ease',
            }}
          />
        ))}
        {/* Inner glow ring */}
        <circle
          cx={cx}
          cy={cy}
          r={44}
          fill="rgba(8,10,16,0.85)"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1"
        />
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display text-2xl font-black leading-none"
          style={{ color: 'var(--color-race, #4a9eff)', textShadow: '0 0 12px var(--color-race-glow, rgba(74,158,255,0.5))' }}
        >
          {total.toLocaleString()}
        </span>
        <span className="font-display text-[10px] text-text-muted uppercase tracking-widest mt-1">
          Toplam Güç
        </span>
      </div>
    </div>
  );
}

// ── Buff Countdown Ring ────────────────────────────────────────────────────

function BuffRing({ remainingSec, totalSec, color }: { remainingSec: number; totalSec: number; color: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const progress = totalSec > 0 ? remainingSec / totalSec : 0;
  const dashLen = progress * c;
  const urgency = progress < 0.2;

  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden>
      <circle cx="28" cy="28" r={r} fill="rgba(8,10,16,0.6)" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke={urgency ? '#ff3355' : color}
        strokeWidth="4"
        strokeDasharray={`${dashLen} ${c - dashLen}`}
        strokeDashoffset={c / 4}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
        style={{
          filter: `drop-shadow(0 0 4px ${urgency ? '#ff335566' : `${color}66`})`,
          transition: 'stroke-dasharray 0.3s ease',
        }}
      />
    </svg>
  );
}

const BUFF_TYPE_COLORS: Record<ActiveBuff['effectType'], string> = {
  attack:     '#ff6644',
  defense:    '#4a9eff',
  speed:      '#44ff88',
  production: '#ffc832',
  xp:         '#cc00ff',
};

// ── Metric Delta ───────────────────────────────────────────────────────────

function Delta({ value }: { value: number }) {
  if (value === 0) return <span className="font-display text-[11px] text-text-muted">—</span>;
  const positive = value > 0;
  return (
    <span
      className="font-display text-[11px] font-bold"
      style={{
        color: positive ? '#44ff88' : '#ff3355',
        textShadow: positive ? '0 0 8px rgba(68,255,136,0.4)' : '0 0 8px rgba(255,51,85,0.4)',
      }}
    >
      {positive ? '▲' : '▼'} {Math.abs(value)}%
    </span>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const [buffTimes, setBuffTimes] = useState<Record<string, number>>(() =>
    Object.fromEntries(ACTIVE_BUFFS.map((b) => [b.id, b.remainingSec]))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setBuffTimes((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (next[key] > 0) next[key] -= 1;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalPower = 24600;
  const powerBreakdownTotal = POWER_SEGMENTS.reduce((s, p) => s + p.value, 0);

  return (
    <div
      className="h-dvh relative overflow-y-auto"
      style={{ background: 'var(--color-bg, #080a10)' }}
    >
      {/* Background nebula */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--gradient-nebula)', zIndex: 0 }}
        aria-hidden
      />
      {/* Halftone overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          zIndex: 0,
        }}
        aria-hidden
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3"
        style={{
          background: 'rgba(8,10,16,0.92)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="font-display text-[11px] text-text-muted uppercase tracking-widest hover:text-text-primary transition-colors"
          >
            ← Geri
          </Link>
          <div className="w-px h-4 bg-border" />
          <div>
            <span
              className="font-display text-[10px] uppercase tracking-[0.2em] block"
              style={{ color: 'var(--color-race, #4a9eff)' }}
            >
              ◆ Analitik Merkezi
            </span>
            <h1 className="font-display text-base font-black text-text-primary leading-tight">
              İstatistik Detayları
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="px-3 py-1.5 rounded-lg font-display text-sm font-black"
            style={{
              background: 'var(--color-brand-dim, rgba(74,158,255,0.12))',
              color: 'var(--color-race, #4a9eff)',
              border: '1px solid var(--color-race, #4a9eff)',
              boxShadow: '0 0 12px var(--color-race-glow, rgba(74,158,255,0.3))',
            }}
          >
            ⚡ {totalPower.toLocaleString()} GÜÇ
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="relative z-10 px-4 py-6 max-w-5xl mx-auto space-y-6">

        {/* ── Row 1: Power Breakdown ─────────────────────────────────── */}
        <section aria-labelledby="power-heading">
          <h2
            id="power-heading"
            className="font-display text-[11px] font-bold uppercase tracking-[0.2em] mb-3"
            style={{ color: 'var(--color-text-muted, #555d7a)' }}
          >
            ◈ Güç Dağılımı
          </h2>

          <div
            className="manga-panel manga-panel-thick p-6"
            style={{ borderColor: 'var(--color-race, #4a9eff)', boxShadow: '0 0 24px var(--color-race-glow, rgba(74,158,255,0.2))' }}
          >
            {/* Corner accent SVGs handled by manga-panel, add extra race-color accent */}
            <div className="flex flex-col sm:flex-row items-center gap-8">
              {/* Donut chart */}
              <div className="shrink-0">
                <DonutChart segments={POWER_SEGMENTS} total={totalPower} />
              </div>

              {/* Bar breakdown */}
              <div className="flex-1 w-full space-y-4">
                {POWER_SEGMENTS.map((seg) => (
                  <div key={seg.label} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: seg.color, boxShadow: `0 0 6px ${seg.color}88` }}
                        />
                        <span className="font-display text-xs font-bold text-text-secondary uppercase tracking-wide">
                          {seg.icon} {seg.label}
                        </span>
                      </div>
                      <span
                        className="font-display text-sm font-black"
                        style={{ color: seg.color }}
                      >
                        {seg.value}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${seg.value}%`,
                          background: `linear-gradient(90deg, ${seg.color}aa, ${seg.color})`,
                          boxShadow: `0 0 8px ${seg.color}66`,
                        }}
                      />
                    </div>
                    {/* Value breakdown */}
                    <div className="flex gap-3">
                      <span className="font-display text-[10px] text-text-muted">
                        {Math.round((seg.value / 100) * totalPower).toLocaleString()} puan
                      </span>
                    </div>
                  </div>
                ))}

                {/* Total bar */}
                <div
                  className="mt-4 pt-4 flex items-center justify-between"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <span className="font-display text-[11px] text-text-muted uppercase tracking-widest">
                    Toplam Dağılım
                  </span>
                  <span
                    className="font-display text-xs font-black"
                    style={{ color: powerBreakdownTotal === 100 ? '#44ff88' : '#ffc832' }}
                  >
                    {powerBreakdownTotal}% / 100%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Row 2: Battle Stats ────────────────────────────────────── */}
        <section aria-labelledby="battle-heading">
          <h2
            id="battle-heading"
            className="font-display text-[11px] font-bold uppercase tracking-[0.2em] mb-3"
            style={{ color: 'var(--color-text-muted, #555d7a)' }}
          >
            ◈ Savaş İstatistikleri
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BATTLE_STATS.map((stat) => (
              <div
                key={stat.label}
                className="manga-panel p-4 group"
                style={{ transition: 'border-color 0.2s, box-shadow 0.2s' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg leading-none" aria-hidden>{stat.icon}</span>
                  <span className="font-display text-[10px] text-text-muted uppercase tracking-wide">
                    {stat.label}
                  </span>
                </div>
                <div
                  className="font-display text-2xl font-black leading-none mb-1"
                  style={{ color: 'var(--color-text-primary, #e8e8f0)' }}
                >
                  {stat.value}
                </div>
                {stat.delta !== undefined && (
                  <div className="flex items-center gap-1">
                    <Delta value={stat.delta} />
                    <span className="font-display text-[10px] text-text-muted">bu hafta</span>
                  </div>
                )}
                {/* Bottom accent line */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b"
                  style={{
                    background: (stat.delta ?? 0) > 0
                      ? 'linear-gradient(90deg, transparent, #44ff8866, transparent)'
                      : (stat.delta ?? 0) < 0
                        ? 'linear-gradient(90deg, transparent, #ff335566, transparent)'
                        : 'transparent',
                  }}
                  aria-hidden
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── Row 3: Active Buffs ────────────────────────────────────── */}
        <section aria-labelledby="buff-heading">
          <div className="flex items-center justify-between mb-3">
            <h2
              id="buff-heading"
              className="font-display text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: 'var(--color-text-muted, #555d7a)' }}
            >
              ◈ Aktif Buff'lar
            </h2>
            <span
              className="font-display text-[11px] px-2 py-0.5 rounded"
              style={{
                background: 'var(--color-brand-dim, rgba(74,158,255,0.12))',
                color: 'var(--color-race, #4a9eff)',
                border: '1px solid var(--color-race, #4a9eff)44',
              }}
            >
              {ACTIVE_BUFFS.length} aktif
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ACTIVE_BUFFS.map((buff) => {
              const remaining = buffTimes[buff.id] ?? buff.remainingSec;
              const urgency = remaining / buff.totalSec < 0.2;
              const buffColor = BUFF_TYPE_COLORS[buff.effectType];

              return (
                <div
                  key={buff.id}
                  className="manga-panel p-4 flex items-center gap-4"
                  style={{
                    borderColor: urgency ? 'rgba(255,51,85,0.3)' : `${buffColor}33`,
                    boxShadow: urgency
                      ? '0 0 12px rgba(255,51,85,0.15)'
                      : `0 0 12px ${buffColor}22`,
                  }}
                >
                  {/* Countdown ring + icon */}
                  <div className="relative shrink-0 flex items-center justify-center">
                    <BuffRing
                      remainingSec={remaining}
                      totalSec={buff.totalSec}
                      color={buffColor}
                    />
                    <span
                      className="absolute text-xl leading-none"
                      style={{ filter: `drop-shadow(0 0 4px ${buffColor}88)` }}
                      aria-hidden
                    >
                      {buff.icon}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-xs font-black text-text-primary truncate">
                      {buff.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className="font-display text-sm font-black"
                        style={{
                          color: buffColor,
                          textShadow: `0 0 8px ${buffColor}66`,
                        }}
                      >
                        +{buff.effectValue}%
                      </span>
                      <span className="font-display text-[10px] text-text-muted">
                        {buff.effect}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span
                        className="font-display text-[11px] font-bold"
                        style={{ color: urgency ? '#ff3355' : 'var(--color-text-muted, #555d7a)' }}
                      >
                        ⏱ {formatTime(remaining)}
                      </span>
                      {urgency && (
                        <span className="font-display text-[9px] text-danger uppercase tracking-wider animate-pulse">
                          bitiyor
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Row 4: Resource Production ────────────────────────────── */}
        <section aria-labelledby="resource-heading">
          <h2
            id="resource-heading"
            className="font-display text-[11px] font-bold uppercase tracking-[0.2em] mb-3"
            style={{ color: 'var(--color-text-muted, #555d7a)' }}
          >
            ◈ Kaynak Üretim Hızları
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {RESOURCE_RATES.map((res) => (
              <div
                key={res.type}
                className="manga-panel p-5"
                style={{
                  borderColor: `${res.color}33`,
                  background: `linear-gradient(160deg, ${res.color}08 0%, rgba(13,17,23,0.85) 60%)`,
                }}
              >
                {/* Resource icon + name */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-2xl leading-none"
                    style={{ filter: `drop-shadow(0 0 6px ${res.color}88)` }}
                    aria-hidden
                  >
                    {res.icon}
                  </span>
                  <span className="font-display text-[11px] font-bold text-text-secondary uppercase tracking-wide">
                    {res.type}
                  </span>
                </div>

                {/* Rate */}
                <div
                  className="font-display text-3xl font-black leading-none mb-1"
                  style={{
                    color: res.color,
                    textShadow: `0 0 16px ${res.color}55`,
                  }}
                >
                  {res.type === 'Nüfus'
                    ? '12 / 50'
                    : res.perHour.toLocaleString()}
                </div>
                {res.type !== 'Nüfus' && (
                  <div className="font-display text-[10px] text-text-muted mb-2">/saat</div>
                )}

                {/* Delta */}
                <div className="flex items-center gap-1.5">
                  <Delta value={res.delta} />
                  {res.delta !== 0 && (
                    <span className="font-display text-[10px] text-text-muted">son 24s</span>
                  )}
                  {res.type === 'Nüfus' && (
                    <span className="font-display text-[10px] text-text-muted">kapasite</span>
                  )}
                </div>

                {/* Mini spark bar */}
                {res.type !== 'Nüfus' && (
                  <div
                    className="mt-3 h-1 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (res.perHour / 6000) * 100)}%`,
                        background: `linear-gradient(90deg, ${res.color}66, ${res.color})`,
                        boxShadow: `0 0 6px ${res.color}44`,
                      }}
                    />
                  </div>
                )}
                {res.type === 'Nüfus' && (
                  <div
                    className="mt-3 h-1 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: '24%',
                        background: `linear-gradient(90deg, ${res.color}66, ${res.color})`,
                        boxShadow: `0 0 6px ${res.color}44`,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer navigation ──────────────────────────────────────── */}
        <nav
          className="flex flex-wrap gap-2 pt-2 pb-4"
          aria-label="İlgili ekranlar"
        >
          {[
            { href: '/dashboard', label: '← Dashboard', icon: '🏠' },
            { href: '/commanders', label: 'Komutanlar', icon: '⚔️' },
            { href: '/progression', label: 'İlerleme', icon: '📈' },
            { href: '/battle?mode=pve', label: 'Savaş', icon: '🎯' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-display text-[11px] font-bold text-text-secondary uppercase tracking-wide transition-all hover:text-text-primary"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <span aria-hidden>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
