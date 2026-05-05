'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { MangaPanel } from '@/components/ui/MangaPanel';

// ── Types ─────────────────────────────────────────────────────────────────────

type MissionTab = 'ana' | 'gunluk' | 'haftalik' | 'basarim';
type MissionState = 'active' | 'completed' | 'locked';

interface Reward {
  icon: string;
  label: string;
  amount: number;
  color: string;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  state: MissionState;
  progress: number;
  progressLabel: string;
  timeLeft?: string;
  rewards: Reward[];
  category: MissionTab;
  difficulty?: 'kolay' | 'orta' | 'zor' | 'efsane';
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  legendary?: boolean;
  progress?: number;
  unlocksTitle?: string;
}

// ── Static Data ───────────────────────────────────────────────────────────────

const MISSIONS: Mission[] = [
  {
    id: 'story-1',
    title: "Nebula'nın Uyanışı",
    description: 'İlk üssünü kur ve komutanını seç. Galaksinin kaderine adım at.',
    state: 'completed',
    progress: 100,
    progressLabel: '1/1 Tamamlandı',
    rewards: [
      { icon: '💎', label: 'Mineral', amount: 5000, color: '#4a9eff' },
      { icon: '✨', label: 'XP', amount: 1200, color: '#ffc832' },
    ],
    category: 'ana',
    difficulty: 'kolay',
  },
  {
    id: 'story-2',
    title: 'İlk Kan',
    description: 'Yakındaki düşman üssüne saldır ve ilk savaş zaferini kazan.',
    state: 'active',
    progress: 60,
    progressLabel: '3/5 Düşman Üssü',
    rewards: [
      { icon: '⚗️', label: 'Gas', amount: 3000, color: '#44ff88' },
      { icon: '💎', label: 'Mineral', amount: 8000, color: '#4a9eff' },
      { icon: '✨', label: 'XP', amount: 2500, color: '#ffc832' },
    ],
    category: 'ana',
    difficulty: 'orta',
  },
  {
    id: 'story-3',
    title: 'İttifak ya da Kan',
    description: 'Başka bir ırkla diplomatik ilişki kur veya savaş ilan et.',
    state: 'locked',
    progress: 0,
    progressLabel: '0/1 Karar Verilmedi',
    rewards: [
      { icon: '⚡', label: 'Enerji', amount: 10000, color: '#ffc832' },
      { icon: '✨', label: 'XP', amount: 5000, color: '#ffc832' },
    ],
    category: 'ana',
    difficulty: 'zor',
  },
  {
    id: 'story-4',
    title: 'Nebula Hâkimi',
    description: "Tüm galaksiye hükmeden tek ırk ol. Bu, sonsuzluğun kapısı.",
    state: 'locked',
    progress: 0,
    progressLabel: '0/1 Galaksi Fethedilmedi',
    rewards: [
      { icon: '👑', label: 'Efsane Rozet', amount: 1, color: '#cc00ff' },
      { icon: '✨', label: 'XP', amount: 50000, color: '#ffc832' },
    ],
    category: 'ana',
    difficulty: 'efsane',
  },
  {
    id: 'daily-1',
    title: 'Kaynak Toplayıcı',
    description: 'Bugün 3 madeni tamamen topla.',
    state: 'completed',
    progress: 100,
    progressLabel: '3/3 Maden',
    timeLeft: 'Süresi doldu',
    rewards: [{ icon: '💎', label: 'Mineral', amount: 2000, color: '#4a9eff' }],
    category: 'gunluk',
    difficulty: 'kolay',
  },
  {
    id: 'daily-2',
    title: 'Savaşçı Ruhu',
    description: 'Bugün en az 2 PvP savaşı kazan.',
    state: 'active',
    progress: 50,
    progressLabel: '1/2 Zafer',
    timeLeft: '14s 23d',
    rewards: [
      { icon: '⚗️', label: 'Gas', amount: 1500, color: '#44ff88' },
      { icon: '✨', label: 'XP', amount: 800, color: '#ffc832' },
    ],
    category: 'gunluk',
    difficulty: 'orta',
  },
  {
    id: 'daily-3',
    title: 'Araştırmacı Zihni',
    description: '1 teknoloji araştırması tamamla.',
    state: 'active',
    progress: 0,
    progressLabel: '0/1 Araştırma',
    timeLeft: '14s 23d',
    rewards: [{ icon: '⚡', label: 'Enerji', amount: 1000, color: '#ffc832' }],
    category: 'gunluk',
    difficulty: 'kolay',
  },
  {
    id: 'weekly-1',
    title: 'Savaş Makinesi',
    description: 'Bu hafta toplamda 15 düşman birimi yok et.',
    state: 'active',
    progress: 47,
    progressLabel: '7/15 Birim',
    timeLeft: '4g 18s',
    rewards: [
      { icon: '💎', label: 'Mineral', amount: 15000, color: '#4a9eff' },
      { icon: '⚗️', label: 'Gas', amount: 8000, color: '#44ff88' },
      { icon: '✨', label: 'XP', amount: 10000, color: '#ffc832' },
    ],
    category: 'haftalik',
    difficulty: 'zor',
  },
  {
    id: 'weekly-2',
    title: 'İmparatorluk İnşacısı',
    description: 'Bu hafta 5 yeni yapı inşa et.',
    state: 'active',
    progress: 80,
    progressLabel: '4/5 Yapı',
    timeLeft: '4g 18s',
    rewards: [
      { icon: '⚡', label: 'Enerji', amount: 5000, color: '#ffc832' },
      { icon: '💎', label: 'Mineral', amount: 10000, color: '#4a9eff' },
    ],
    category: 'haftalik',
    difficulty: 'orta',
  },
];

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach-1',
    title: 'İlk Kan',
    description: 'İlk savaş zaferini kazan',
    icon: '⚔️',
    unlocked: true,
  },
  {
    id: 'ach-2',
    title: 'Kaynak Efendisi',
    description: '100.000 mineral topla',
    icon: '💎',
    unlocked: true,
    unlocksTitle: 'Madenci',
  },
  {
    id: 'ach-3',
    title: 'Savaş Tanrısı',
    description: '1000 düşman birimi yok et',
    icon: '🔥',
    unlocked: false,
    legendary: true,
    progress: 34,
    unlocksTitle: 'Savaş Tanrısı',
  },
  {
    id: 'ach-4',
    title: 'Kaşif',
    description: "Haritanın %50'sini keşfet",
    icon: '🗺️',
    unlocked: false,
    progress: 62,
  },
  {
    id: 'ach-5',
    title: 'Diplomat',
    description: '3 farklı ırkla ittifak kur',
    icon: '🤝',
    unlocked: false,
    progress: 33,
  },
  {
    id: 'ach-6',
    title: 'Teknoloji Dehası',
    description: "Tüm tech tree'yi tamamla",
    icon: '🔬',
    unlocked: false,
    legendary: true,
    progress: 0,
    unlocksTitle: 'Nebula Bilgesi',
  },
];

const DIFFICULTY_CONFIG = {
  kolay:  { label: 'KOLAY',  color: '#44ff88' },
  orta:   { label: 'ORTA',   color: '#ffc832' },
  zor:    { label: 'ZOR',    color: '#ff6600' },
  efsane: { label: 'EFSANE', color: '#cc00ff' },
} as const;

const TABS: { id: MissionTab; label: string; icon: string }[] = [
  { id: 'ana',      label: 'Ana Görev', icon: '📖' },
  { id: 'gunluk',   label: 'Günlük',    icon: '☀️' },
  { id: 'haftalik', label: 'Haftalık',  icon: '📅' },
  { id: 'basarim',  label: 'Başarım',   icon: '🏆' },
];

// ── Segmented Progress Bar ────────────────────────────────────────────────────

function SegmentedProgressBar({
  progress,
  color,
  segments = 10,
}: {
  progress: number;
  color: string;
  segments?: number;
}) {
  const filled = Math.floor((progress / 100) * segments);
  const partial = (progress / 100) * segments - filled;

  return (
    <div
      className="flex gap-[2px] items-center"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {Array.from({ length: segments }).map((_, i) => {
        const isFilled = i < filled;
        const isPartial = i === filled && partial > 0;
        const fillWidth = isPartial ? `${partial * 100}%` : isFilled ? '100%' : '0%';

        return (
          <div
            key={i}
            className="relative h-[7px] flex-1 overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.07)',
              clipPath:
                i === 0
                  ? 'polygon(0 0, calc(100% - 3px) 0, 100% 50%, calc(100% - 3px) 100%, 0 100%)'
                  : i === segments - 1
                  ? 'polygon(3px 0, 100% 0, 100% 100%, 3px 100%, 0 50%)'
                  : 'polygon(3px 0, calc(100% - 3px) 0, 100% 50%, calc(100% - 3px) 100%, 3px 100%, 0 50%)',
            }}
          >
            <div
              className="absolute inset-0 transition-all duration-500"
              style={{
                width: fillWidth,
                background: `linear-gradient(90deg, ${color}88, ${color})`,
                boxShadow: (isFilled || isPartial) ? `0 0 6px ${color}80` : 'none',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Reward Chip ───────────────────────────────────────────────────────────────

function RewardChip({ reward }: { reward: Reward }) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{
        background: `${reward.color}12`,
        border: `1px solid ${reward.color}30`,
      }}
    >
      <span className="text-xs" aria-hidden>{reward.icon}</span>
      <span
        className="font-display text-[10px] font-bold"
        style={{ color: reward.color }}
      >
        +{reward.amount.toLocaleString('tr-TR')}
      </span>
    </div>
  );
}

// ── Mission Card ──────────────────────────────────────────────────────────────

function MissionCard({
  mission,
  raceColor,
  raceGlow,
  onClaim,
}: {
  mission: Mission;
  raceColor: string;
  raceGlow: string;
  onClaim: (m: Mission) => void;
}) {
  const isCompleted = mission.state === 'completed';
  const isLocked    = mission.state === 'locked';
  const difficulty  = mission.difficulty ? DIFFICULTY_CONFIG[mission.difficulty] : null;

  return (
    <div
      className={`doppelrand transition-all duration-500 ${isLocked ? 'opacity-45' : ''}`}
      style={{
        borderColor: isCompleted
          ? 'rgba(68,255,136,0.30)'
          : isLocked
          ? 'rgba(255,255,255,0.04)'
          : `${raceColor}28`,
        boxShadow: isCompleted
          ? '0 0 20px rgba(68,255,136,0.10)'
          : isLocked
          ? 'none'
          : `0 0 16px ${raceGlow}18`,
      }}
    >
      <div className="doppelrand-inner p-4">
        <div className="flex gap-3">
          {/* Left accent bar */}
          <div
            className="w-[3px] rounded-full shrink-0 self-stretch min-h-[3rem]"
            style={{
              background: isCompleted
                ? 'linear-gradient(180deg, #44ff88, #44ff8844)'
                : isLocked
                ? 'rgba(255,255,255,0.08)'
                : `linear-gradient(180deg, ${raceColor}, ${raceColor}44)`,
              boxShadow: isCompleted
                ? '0 0 8px rgba(68,255,136,0.6)'
                : isLocked
                ? 'none'
                : `0 0 8px ${raceGlow}`,
            }}
          />

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                {isCompleted && (
                  <span
                    className="text-sm leading-none shrink-0"
                    aria-label="Tamamlandı"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(68,255,136,0.7))' }}
                  >
                    ✓
                  </span>
                )}
                {isLocked && (
                  <span className="text-sm leading-none shrink-0" aria-label="Kilitli">🔒</span>
                )}
                <h3
                  className="font-display text-sm font-bold leading-tight"
                  style={{
                    color: isCompleted
                      ? '#44ff88'
                      : isLocked
                      ? 'var(--color-text-muted)'
                      : 'var(--color-text-primary)',
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    textDecorationColor: 'rgba(68,255,136,0.45)',
                  }}
                >
                  {mission.title}
                </h3>
              </div>
              {difficulty && !isLocked && (
                <span
                  className="font-display text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    color: difficulty.color,
                    background: `${difficulty.color}15`,
                    border: `1px solid ${difficulty.color}30`,
                  }}
                >
                  {difficulty.label}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-text-muted text-xs leading-relaxed mb-3">
              {mission.description}
            </p>

            {/* Progress bar */}
            {!isLocked && (
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-display text-[9px] uppercase tracking-widest text-text-muted">
                    {mission.progressLabel}
                  </span>
                  {mission.timeLeft && (
                    <span
                      className="font-display text-[9px] uppercase tracking-widest"
                      style={{
                        color: mission.state === 'completed'
                          ? 'var(--color-text-muted)'
                          : '#ffc832',
                      }}
                    >
                      ⏱ {mission.timeLeft}
                    </span>
                  )}
                </div>
                <SegmentedProgressBar
                  progress={mission.progress}
                  color={isCompleted ? '#44ff88' : raceColor}
                  segments={10}
                />
              </div>
            )}

            {/* Rewards + CTA */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-1.5 flex-wrap">
                {mission.rewards.map((r) => (
                  <RewardChip key={r.label} reward={r} />
                ))}
              </div>

              {isCompleted && (
                <button
                  onClick={() => onClaim(mission)}
                  className="mission-claim-btn"
                  aria-label={`${mission.title} ödülünü al`}
                >
                  ÖDÜL AL ✓
                </button>
              )}
              {mission.state === 'active' && (
                <button
                  className="mission-continue-btn"
                  style={{ borderColor: `${raceColor}50`, color: raceColor, background: `${raceColor}08` }}
                >
                  DEVAM ET →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Achievement Badge ─────────────────────────────────────────────────────────

function AchievementBadge({
  ach,
  raceColor,
  raceGlow,
}: {
  ach: Achievement;
  raceColor: string;
  raceGlow: string;
}) {
  return (
    <div
      className={`doppelrand transition-all duration-500 ${ach.unlocked ? '' : 'opacity-55'}`}
      style={{
        borderColor: ach.unlocked
          ? ach.legendary
            ? `${raceColor}45`
            : 'rgba(68,255,136,0.28)'
          : 'rgba(255,255,255,0.05)',
        boxShadow:
          ach.unlocked && ach.legendary
            ? `0 0 24px ${raceGlow}60`
            : 'none',
        animation:
          ach.unlocked && ach.legendary
            ? 'glow-pulse 2.5s ease-in-out infinite'
            : 'none',
      }}
    >
      <div className="doppelrand-inner p-3 text-center">
        {/* Icon frame */}
        <div className="relative mx-auto mb-2 w-14 h-14 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: ach.unlocked
                ? ach.legendary
                  ? `linear-gradient(135deg, ${raceColor}28, ${raceColor}10)`
                  : 'rgba(68,255,136,0.10)'
                : 'rgba(255,255,255,0.04)',
              border: `2px solid ${
                ach.unlocked
                  ? ach.legendary
                    ? raceColor
                    : 'rgba(68,255,136,0.55)'
                  : 'rgba(255,255,255,0.08)'
              }`,
              boxShadow: ach.unlocked
                ? ach.legendary
                  ? `0 0 20px ${raceGlow}, inset 0 1px 1px rgba(255,255,255,0.15)`
                  : '0 0 12px rgba(68,255,136,0.28)'
                : 'none',
            }}
          />
          <span
            className="relative text-2xl"
            style={{
              filter: ach.unlocked
                ? ach.legendary
                  ? `drop-shadow(0 0 8px ${raceGlow})`
                  : 'drop-shadow(0 0 4px rgba(68,255,136,0.5))'
                : 'grayscale(1) brightness(0.4)',
            }}
          >
            {ach.unlocked ? ach.icon : '🔒'}
          </span>
          {ach.legendary && ach.unlocked && (
            <div
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${raceColor}, ${raceColor}cc)`,
                boxShadow: `0 0 10px ${raceGlow}`,
              }}
            >
              <span className="text-[9px] font-black" style={{ color: '#050505' }}>★</span>
            </div>
          )}
        </div>

        {/* Title */}
        <div
          className="font-display text-[10px] font-black tracking-wide leading-tight mb-0.5"
          style={{
            color: ach.unlocked
              ? ach.legendary
                ? raceColor
                : '#44ff88'
              : 'var(--color-text-muted)',
          }}
        >
          {ach.title}
        </div>
        <div className="text-text-muted text-[9px] leading-snug mb-2">
          {ach.description}
        </div>

        {/* Progress bar for locked with partial progress */}
        {!ach.unlocked && ach.progress !== undefined && ach.progress > 0 && (
          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${ach.progress}%`,
                background: `linear-gradient(90deg, ${raceColor}50, ${raceColor})`,
              }}
            />
          </div>
        )}

        {/* Unlocks title */}
        {ach.unlocksTitle && (
          <div
            className="font-display text-[8px] tracking-widest uppercase"
            style={{ color: ach.unlocked ? '#ffc832' : 'rgba(255,255,255,0.15)' }}
          >
            🏷 {ach.unlocksTitle}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reward Popup ──────────────────────────────────────────────────────────────

function RewardPopup({
  mission,
  onClose,
  raceColor,
  raceGlow,
}: {
  mission: Mission;
  onClose: () => void;
  raceColor: string;
  raceGlow: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5,8,16,0.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal
      aria-label="Ödül Popup"
    >
      {/* Radial burst particles */}
      <div className="reward-particles" aria-hidden>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="reward-particle"
            style={{
              '--angle': `${i * 30}deg`,
              '--pcolor': i % 3 === 0 ? raceColor : i % 3 === 1 ? '#ffc832' : '#44ff88',
              animationDelay: `${i * 0.04}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div
        className="relative w-full max-w-sm animate-manga-appear"
        style={{ animationDuration: '0.45s', animationFillMode: 'both' }}
      >
        {/* Speed lines SVG behind popup */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" aria-hidden>
          <svg className="absolute inset-0 w-full h-full opacity-[0.08]" viewBox="0 0 360 480" preserveAspectRatio="none">
            {Array.from({ length: 20 }).map((_, i) => {
              const angle = (i / 20) * 360;
              const rad = (angle * Math.PI) / 180;
              return (
                <line
                  key={i}
                  x1="180" y1="240"
                  x2={180 + Math.cos(rad) * 600}
                  y2={240 + Math.sin(rad) * 600}
                  stroke="white"
                  strokeWidth="0.8"
                />
              );
            })}
          </svg>
        </div>

        {/* Double-bezel popup shell */}
        <div
          className="doppelrand"
          style={{
            borderColor: `${raceColor}45`,
            boxShadow: `0 0 60px ${raceGlow}80, 0 0 120px ${raceGlow}30, 0 40px 80px rgba(0,0,0,0.7)`,
          }}
        >
          <div className="doppelrand-inner p-6 text-center">
            {/* Eyebrow badge */}
            <div className="flex justify-center mb-4">
              <span
                className="font-display text-[9px] font-black tracking-[0.28em] uppercase px-4 py-1.5 rounded-full"
                style={{
                  background: `${raceColor}15`,
                  border: `1px solid ${raceColor}45`,
                  color: raceColor,
                }}
              >
                GÖREV TAMAMLANDI
              </span>
            </div>

            {/* Main reward icon */}
            <div
              className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center relative"
              style={{
                background: `${raceColor}15`,
                border: `2px solid ${raceColor}55`,
                boxShadow: `0 0 40px ${raceGlow}, inset 0 1px 1px rgba(255,255,255,0.15)`,
                animation: 'glow-pulse 2s ease-in-out infinite',
              }}
            >
              <span
                className="text-4xl"
                style={{ filter: `drop-shadow(0 0 14px ${raceGlow})` }}
              >
                {mission.rewards[0]?.icon ?? '🎁'}
              </span>
            </div>

            {/* Mission name */}
            <h2 className="font-display text-xl font-black mb-1 text-gradient-race">
              {mission.title}
            </h2>
            <p className="text-text-muted text-xs mb-5 leading-relaxed">
              Görev başarıyla tamamlandı! Ödüllerin hesabına yatırıldı.
            </p>

            {/* Reward list */}
            <div className="space-y-2 mb-6">
              {mission.rewards.map((r, i) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                  style={{
                    background: `${r.color}08`,
                    border: `1px solid ${r.color}20`,
                    animation: `slide-up 0.45s cubic-bezier(0.32,0.72,0,1) both`,
                    animationDelay: `${i * 0.1 + 0.25}s`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base" aria-hidden>{r.icon}</span>
                    <span className="font-body text-sm text-text-secondary">{r.label}</span>
                  </div>
                  <span
                    className="font-display text-sm font-black"
                    style={{ color: r.color, textShadow: `0 0 12px ${r.color}60` }}
                  >
                    +{r.amount.toLocaleString('tr-TR')}
                  </span>
                </div>
              ))}
            </div>

            {/* Close CTA */}
            <button
              onClick={onClose}
              className="group w-full font-display text-sm font-black tracking-widest uppercase py-3 rounded-full
                         flex items-center justify-center gap-2
                         transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                         hover:scale-[1.02] active:scale-[0.97]"
              style={{
                background: `linear-gradient(135deg, ${raceColor}, ${raceColor}cc)`,
                color: '#050a10',
                boxShadow: `0 0 28px ${raceGlow}80, 0 6px 20px rgba(0,0,0,0.5)`,
              }}
            >
              <span>Harika!</span>
              <span
                className="w-6 h-6 rounded-full bg-black/15 flex items-center justify-center
                           transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                           group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-110"
                aria-hidden
              >
                ✓
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MissionsPage() {
  const { raceColor, raceGlow } = useRaceTheme();
  const [activeTab, setActiveTab] = useState<MissionTab>('ana');
  const [claimedMission, setClaimedMission] = useState<Mission | null>(null);

  const visibleMissions = MISSIONS.filter((m) => m.category === activeTab);
  const completedCount  = visibleMissions.filter((m) => m.state === 'completed').length;
  const unlockedAch     = ACHIEVEMENTS.filter((a) => a.unlocked).length;

  const handleClaim = useCallback((m: Mission) => setClaimedMission(m), []);
  const handleClose = useCallback(() => setClaimedMission(null), []);

  return (
    <div
      className="h-dvh flex flex-col relative overflow-y-auto"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Background */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-700"
        style={{ background: 'var(--gradient-nebula)', zIndex: 0 }}
        aria-hidden
      />
      <div className="fixed inset-0 pointer-events-none opacity-[0.14]" aria-hidden />

      {/* ── Header ── */}
      <header
        className="relative z-40 sticky top-0 flex items-center justify-between px-4 py-3"
        style={{
          background: 'rgba(8,10,16,0.92)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-display text-text-muted text-xs hover:text-text-primary transition-colors duration-200"
          >
            ← Ana Üs
          </Link>
          <div className="h-3 w-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <span
            className="font-display text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full"
            style={{
              background: `${raceColor}15`,
              border: `1px solid ${raceColor}40`,
              color: raceColor,
            }}
          >
            Görevler
          </span>
        </div>
        <span className="font-display text-[10px] text-text-muted">
          {unlockedAch}/{ACHIEVEMENTS.length} Başarım
        </span>
      </header>

      {/* ── Tab Bar ── */}
      <div
        role="tablist"
        aria-label="Görev kategorileri"
        className="sticky z-30 px-2 pt-1"
        style={{
          top: '49px',
          background: 'rgba(8,10,16,0.90)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex">
          {TABS.map((tab) => {
            const isActive   = activeTab === tab.id;
            const tabMissions = MISSIONS.filter((m) => m.category === tab.id);
            const hasClaimable = tabMissions.some((m) => m.state === 'completed');

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex-1 flex items-center justify-center gap-1.5 py-2.5 px-1
                           font-display text-[9px] sm:text-[10px] font-black tracking-wider uppercase
                           transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                style={{
                  color: isActive ? raceColor : 'var(--color-text-muted)',
                  background: isActive ? `${raceColor}08` : 'transparent',
                }}
              >
                <span aria-hidden>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>

                {/* Active underline */}
                {isActive && (
                  <div
                    className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${raceColor}, transparent)`,
                      boxShadow: `0 0 8px ${raceGlow}`,
                    }}
                  />
                )}

                {/* "Has claimable" dot */}
                {hasClaimable && !isActive && tab.id !== 'basarim' && (
                  <div
                    className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full"
                    style={{ background: '#44ff88', boxShadow: '0 0 6px rgba(68,255,136,0.8)' }}
                    aria-label="Tamamlanmış görev mevcut"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <main className="relative z-10 flex-1 p-4 max-w-2xl mx-auto w-full pb-24">

        {/* Tab summary bar */}
        {activeTab !== 'basarim' && (
          <div
            className="flex items-center justify-between mb-5"
            style={{ animation: 'slide-up 0.4s cubic-bezier(0.32,0.72,0,1) both' }}
          >
            <div>
              <h1 className="font-display text-lg font-black text-text-primary">
                {TABS.find((t) => t.id === activeTab)?.label}
              </h1>
              <p className="text-text-muted text-xs">
                {completedCount}/{visibleMissions.length} tamamlandı
              </p>
            </div>

            {/* Circular progress ring */}
            <div className="relative w-12 h-12 shrink-0">
              <svg
                className="w-full h-full"
                viewBox="0 0 48 48"
                style={{ transform: 'rotate(-90deg)' }}
              >
                <circle
                  cx="24" cy="24" r="20"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="4"
                />
                <circle
                  cx="24" cy="24" r="20"
                  fill="none"
                  stroke={raceColor}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${visibleMissions.length > 0 ? (completedCount / visibleMissions.length) * 125.66 : 0} 125.66`}
                  style={{
                    filter: `drop-shadow(0 0 4px ${raceGlow})`,
                    transition: 'stroke-dasharray 0.7s cubic-bezier(0.32,0.72,0,1)',
                  }}
                />
              </svg>
              <span
                className="absolute inset-0 flex items-center justify-center font-display text-[10px] font-black"
                style={{ color: raceColor }}
              >
                {visibleMissions.length > 0
                  ? Math.round((completedCount / visibleMissions.length) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        )}

        {/* Achievement header */}
        {activeTab === 'basarim' && (
          <div
            className="mb-5"
            style={{ animation: 'slide-up 0.4s cubic-bezier(0.32,0.72,0,1) both' }}
          >
            <h1 className="font-display text-lg font-black text-text-primary mb-0.5">Başarımlar</h1>
            <p className="text-text-muted text-xs">
              {unlockedAch}/{ACHIEVEMENTS.length} başarım açıldı
            </p>
          </div>
        )}

        {/* Mission list */}
        {activeTab !== 'basarim' && (
          <div className="space-y-3" role="list" aria-label={`${activeTab} görevleri`}>
            {visibleMissions.map((mission, i) => (
              <div
                key={mission.id}
                role="listitem"
                style={{
                  animation: 'manga-appear 0.5s cubic-bezier(0.32,0.72,0,1) both',
                  animationDelay: `${i * 75}ms`,
                }}
              >
                <MissionCard
                  mission={mission}
                  raceColor={raceColor}
                  raceGlow={raceGlow}
                  onClaim={handleClaim}
                />
              </div>
            ))}

            {visibleMissions.length === 0 && (
              <MangaPanel className="p-10 text-center">
                <div className="text-4xl mb-3" aria-hidden>📭</div>
                <p className="font-display text-sm text-text-muted">Bu kategoride görev yok</p>
              </MangaPanel>
            )}
          </div>
        )}

        {/* Achievement grid */}
        {activeTab === 'basarim' && (
          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            role="list"
            aria-label="Başarımlar"
          >
            {ACHIEVEMENTS.map((ach, i) => (
              <div
                key={ach.id}
                role="listitem"
                style={{
                  animation: 'manga-appear 0.5s cubic-bezier(0.32,0.72,0,1) both',
                  animationDelay: `${i * 75}ms`,
                }}
              >
                <AchievementBadge ach={ach} raceColor={raceColor} raceGlow={raceGlow} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reward popup overlay */}
      {claimedMission && (
        <RewardPopup
          mission={claimedMission}
          onClose={handleClose}
          raceColor={raceColor}
          raceGlow={raceGlow}
        />
      )}
    </div>
  );
}
