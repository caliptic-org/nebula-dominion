'use client';

import '@/styles/progression.css';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useProgression } from '@/hooks/useProgression';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { MangaPanel } from '@/components/ui/MangaPanel';
import { BottomNav } from '@/components/ui/BottomNav';
import { LevelUpModal } from '@/components/progression/LevelUpModal';
import { UnlockNotification } from '@/components/progression/UnlockNotification';
import {
  ContentUnlock,
  LevelUpPayload,
  PlayerProgress,
  TIER_NAMES,
  UNLOCK_LABELS,
} from '@/types/progression';

interface AgeChapter {
  num: number;
  label: string;
  scene: string;
  icon: string;
  unlockLevel: number;
}

const AGES: AgeChapter[] = [
  {
    num: 1,
    label: 'Kuruluş Çağı',
    scene: 'Galaksinin uçlarında ilk kaleler yükseliyor. Beş ırk birbirinden habersiz, kendi köklerini salıyor.',
    icon: '🌱',
    unlockLevel: 1,
  },
  {
    num: 2,
    label: 'Genişleme Çağı',
    scene: 'İttifaklar kuruldu, ilk savaşlar başladı. Komutanlar sektör sektör topraklarını büyütüyor.',
    icon: '🛰️',
    unlockLevel: 4,
  },
  {
    num: 3,
    label: 'Çatışma Çağı',
    scene: 'Nebula\'nın kalbinde dökülen kan kurumadı. Kovan, Otomat ve Şeytan, ilk kez aynı sahada.',
    icon: '⚔️',
    unlockLevel: 7,
  },
  {
    num: 4,
    label: 'Yıkım Çağı',
    scene: 'Dört ırk bir arada hayatta kalamaz. Yıldızlar söner, gezegenler tarihten silinir.',
    icon: '☄️',
    unlockLevel: 10,
  },
  {
    num: 5,
    label: 'Yeniden Doğuş',
    scene: 'Hayatta kalanlar efsane olacak. Küllerden yeni komutanlar, yeni komutalar, yeni umutlar doğuyor.',
    icon: '🔥',
    unlockLevel: 13,
  },
  {
    num: 6,
    label: 'Nebula Hâkimi',
    scene: 'Yalnızca bir ırk evrenin efendisi olacak. Son söz savaşta söylenecek.',
    icon: '👑',
    unlockLevel: 16,
  },
];

const UNLOCK_ICONS: Record<ContentUnlock, string> = {
  [ContentUnlock.RACE_ZERG]: '🧬',
  [ContentUnlock.RACE_AUTOMATON]: '⚡',
  [ContentUnlock.RACE_MONSTER_PREVIEW]: '🔥',
  [ContentUnlock.MODE_RANKED]: '🏆',
  [ContentUnlock.CONSTRUCTION_BASICS]: '🏗️',
  [ContentUnlock.ADVANCED_ABILITIES]: '✦',
  [ContentUnlock.SPECIAL_MAPS]: '🗺️',
  [ContentUnlock.ADVANCED_TACTICS]: '🎯',
  [ContentUnlock.AGE_2_PREVIEW]: '🌟',
};

type UnlockCategory = 'race' | 'mode' | 'building' | 'ability' | 'preview';

const UNLOCK_CATEGORY: Record<ContentUnlock, UnlockCategory> = {
  [ContentUnlock.RACE_ZERG]: 'race',
  [ContentUnlock.RACE_AUTOMATON]: 'race',
  [ContentUnlock.RACE_MONSTER_PREVIEW]: 'preview',
  [ContentUnlock.MODE_RANKED]: 'mode',
  [ContentUnlock.CONSTRUCTION_BASICS]: 'building',
  [ContentUnlock.ADVANCED_ABILITIES]: 'ability',
  [ContentUnlock.SPECIAL_MAPS]: 'mode',
  [ContentUnlock.ADVANCED_TACTICS]: 'ability',
  [ContentUnlock.AGE_2_PREVIEW]: 'preview',
};

const CATEGORY_LABELS: Record<UnlockCategory, string> = {
  race: 'Irklar',
  mode: 'Modlar & Haritalar',
  building: 'Yapılar',
  ability: 'Yetenekler',
  preview: 'Önizlemeler',
};

const DEMO_PROGRESS: PlayerProgress = {
  userId: 'demo-player-001',
  age: 2,
  level: 5,
  tier: 2,
  currentXp: 1250,
  totalXp: 6750,
  xpToNextLevel: 2200,
  xpProgressPercent: 56,
  unlockedContent: [
    ContentUnlock.RACE_ZERG,
    ContentUnlock.RACE_AUTOMATON,
    ContentUnlock.MODE_RANKED,
    ContentUnlock.CONSTRUCTION_BASICS,
    ContentUnlock.AGE_2_PREVIEW,
  ],
  tierBonusMultiplier: 1.1,
  isMaxLevel: false,
};

const MAX_LEVEL = 9;

function tierForLevel(level: number): number {
  if (level >= 7) return 3;
  if (level >= 4) return 2;
  return 1;
}

export default function ProgressionPage() {
  const { raceColor, raceGlow, raceDim } = useRaceTheme();
  const [levelUpEvent, setLevelUpEvent] = useState<LevelUpPayload | null>(null);
  const [recentUnlocks, setRecentUnlocks] = useState<ContentUnlock[]>([]);

  const { progress: liveProgress, loading } = useProgression({
    userId: 'demo-player-001',
    onLevelUp: (payload) => {
      setLevelUpEvent(payload);
      if (payload.newUnlocks.length) {
        setRecentUnlocks(payload.newUnlocks);
      }
    },
  });

  // Fall back to demo data so the screen has something to show pre-API.
  const progress: PlayerProgress = liveProgress ?? DEMO_PROGRESS;
  const tier = progress.tier || tierForLevel(progress.level);

  const unlocksByCategory = useMemo(() => {
    const groups: Record<UnlockCategory, ContentUnlock[]> = {
      race: [],
      mode: [],
      building: [],
      ability: [],
      preview: [],
    };
    for (const u of progress.unlockedContent) {
      groups[UNLOCK_CATEGORY[u]].push(u);
    }
    return groups;
  }, [progress.unlockedContent]);

  // Animate the XP fill on first paint.
  const [xpFill, setXpFill] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setXpFill(progress.xpProgressPercent));
    return () => cancelAnimationFrame(id);
  }, [progress.xpProgressPercent]);

  const tierName = TIER_NAMES[tier] ?? `Tier ${tier}`;

  return (
    <div
      className="min-h-[100dvh] flex flex-col relative pb-24"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Atmospheric backdrops */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-700"
        style={{ background: 'var(--gradient-nebula)', zIndex: 0 }}
        aria-hidden
      />
      <div
        className="fixed inset-0 halftone-bg pointer-events-none opacity-20"
        aria-hidden
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="top-bar relative z-40">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-display text-text-muted text-xs hover:text-text-primary transition-colors"
            aria-label="Ana üsse dön"
          >
            ← Ana Üs
          </Link>
          <div
            className="h-3 w-px"
            style={{ background: 'rgba(255,255,255,0.12)' }}
            aria-hidden
          />
          <span className="badge badge-race">İlerleme</span>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <span className="font-display text-[10px] text-text-muted uppercase tracking-widest">
            Çağ {progress.age}
          </span>
          <span
            className="font-display text-xs font-bold"
            style={{ color: raceColor, textShadow: `0 0 12px ${raceGlow}` }}
          >
            Lv. {progress.level}
          </span>
          <span
            className="badge"
            style={{
              background: raceDim,
              color: raceColor,
              border: `1px solid ${raceGlow}`,
            }}
          >
            {tierName}
          </span>
        </div>
      </header>

      <main className="relative z-10 flex-1 px-4 sm:px-6 max-w-4xl mx-auto w-full pt-6">
        {loading && !liveProgress && (
          <p
            className="text-center font-display text-[10px] uppercase tracking-widest text-text-muted mb-3"
            aria-live="polite"
          >
            İlerleme yükleniyor — demo veri gösteriliyor
          </p>
        )}

        {/* ── Player Profile Summary ──────────────────────────────────── */}
        <MangaPanel className="p-5 sm:p-6 mb-6 animate-manga-appear" glow>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-4">
              {/* Level avatar */}
              <div
                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-display font-black text-2xl sm:text-3xl shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${raceColor}33 0%, transparent 70%)`,
                  border: `2px solid ${raceColor}`,
                  color: raceColor,
                  boxShadow: `0 0 24px ${raceGlow}, inset 0 0 12px ${raceGlow}`,
                }}
                aria-hidden
              >
                {progress.level}
                <span
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 font-display text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{
                    background: 'var(--color-bg)',
                    border: `1px solid ${raceColor}`,
                    color: raceColor,
                  }}
                >
                  Lv {progress.level}/{MAX_LEVEL}
                </span>
              </div>

              <div>
                <span className="badge badge-race mb-2">Oyuncu Profili</span>
                <h1 className="font-display text-xl sm:text-2xl font-black text-text-primary leading-tight">
                  Komutan
                </h1>
                <p className="font-display text-[11px] text-text-muted uppercase tracking-widest mt-0.5">
                  Çağ {progress.age} · {tierName}
                </p>
              </div>
            </div>

            {/* Tier indicator */}
            <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:text-right">
              <span className="font-display text-[10px] uppercase tracking-widest text-text-muted">
                Tier
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((t) => (
                  <span
                    key={t}
                    className={clsx(
                      'tier-pip',
                      t <= tier ? 'tier-pip--active' : 'tier-pip--inactive',
                    )}
                    style={
                      t <= tier
                        ? { background: raceColor, boxShadow: `0 0 8px ${raceGlow}` }
                        : undefined
                    }
                    aria-hidden
                  />
                ))}
              </div>
              <div
                className="font-display text-base sm:text-lg font-black"
                style={{ color: raceColor }}
              >
                {tierName}
              </div>
              <div className="font-display text-[10px] text-text-muted">
                ×{progress.tierBonusMultiplier.toFixed(2)} XP bonusu
              </div>
            </div>
          </div>

          {/* XP Bar */}
          <div className="mb-2 flex justify-between items-baseline">
            <span className="font-display text-[10px] uppercase tracking-widest text-text-muted">
              XP İlerlemesi
            </span>
            <span
              className="font-display text-xs font-bold"
              style={{ color: raceColor }}
            >
              {progress.currentXp.toLocaleString('tr-TR')}
              <span className="text-text-muted font-normal">
                {' / '}
                {progress.xpToNextLevel?.toLocaleString('tr-TR') ?? '∞'} XP
              </span>
            </span>
          </div>

          <div
            className="relative h-3 rounded-full overflow-hidden mb-1"
            style={{ background: 'rgba(255,255,255,0.06)' }}
            role="progressbar"
            aria-valuenow={Math.round(progress.xpProgressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="XP İlerleme Çubuğu"
          >
            <div
              className="h-full rounded-full transition-all duration-1000 ease-spring"
              style={{
                width: `${progress.isMaxLevel ? 100 : xpFill}%`,
                background: `linear-gradient(90deg, ${raceColor}80, ${raceColor})`,
                boxShadow: `0 0 14px ${raceGlow}, inset 0 0 4px rgba(255,255,255,0.18)`,
              }}
            />
            {!progress.isMaxLevel && (
              <div
                className="absolute top-0 bottom-0 w-12 -translate-x-full xp-bar-shimmer"
                style={{ left: `${xpFill}%` }}
                aria-hidden
              />
            )}
          </div>

          {!progress.isMaxLevel && progress.xpToNextLevel != null && (
            <p className="font-display text-[10px] text-text-muted mb-4">
              Sonraki seviyeye{' '}
              <span style={{ color: raceColor }}>
                {(progress.xpToNextLevel - progress.currentXp).toLocaleString('tr-TR')}
              </span>{' '}
              XP
            </p>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4">
            {[
              {
                label: 'Toplam XP',
                value: progress.totalXp.toLocaleString('tr-TR'),
                color: raceColor,
              },
              { label: 'Çağ', value: `Çağ ${progress.age}`, color: 'var(--color-energy)' },
              {
                label: 'Tier Bonus',
                value: `×${progress.tierBonusMultiplier.toFixed(2)}`,
                color: 'var(--color-success)',
              },
              {
                label: 'Max Seviye',
                value: progress.isMaxLevel ? 'Evet' : 'Hayır',
                color: progress.isMaxLevel ? 'var(--color-energy)' : 'var(--color-text-secondary)',
              },
            ].map((s) => (
              <div
                key={s.label}
                className="p-3 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="font-display text-[9px] uppercase tracking-widest text-text-muted mb-1">
                  {s.label}
                </div>
                <div
                  className="font-display text-base font-black"
                  style={{ color: s.color }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </MangaPanel>

        {/* ── Çağ Timeline ──────────────────────────────────────────── */}
        <section className="mb-8" aria-labelledby="age-timeline-heading">
          <div className="flex items-center gap-2 mb-4">
            <span id="age-timeline-heading" className="badge badge-race">
              Çağ Zaman Çizelgesi
            </span>
            <div
              className="flex-1 h-px"
              style={{ background: `${raceColor}30` }}
              aria-hidden
            />
            <span className="font-display text-[9px] text-text-muted uppercase tracking-widest">
              {AGES.filter((a) => progress.age >= a.num).length}/{AGES.length}
            </span>
          </div>

          <ol className="age-timeline" role="list">
            {AGES.map((age, i) => {
              const isCurrent = progress.age === age.num;
              const isPast = progress.age > age.num;
              const isFuture = progress.age < age.num;
              const status = isCurrent ? 'current' : isPast ? 'past' : 'future';

              return (
                <li
                  key={age.num}
                  className="age-timeline__row"
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  {/* Connecting rail */}
                  <div className="age-timeline__rail" aria-hidden>
                    <div
                      className={clsx(
                        'age-timeline__node',
                        `age-timeline__node--${status}`,
                      )}
                      style={
                        isCurrent
                          ? {
                              borderColor: raceColor,
                              background: `${raceColor}22`,
                              color: raceColor,
                              boxShadow: `0 0 14px ${raceGlow}, inset 0 0 6px ${raceGlow}`,
                            }
                          : undefined
                      }
                    >
                      {isPast ? '✓' : isFuture ? '🔒' : age.icon}
                    </div>
                    {i < AGES.length - 1 && (
                      <div
                        className={clsx(
                          'age-timeline__line',
                          isPast ? 'age-timeline__line--done' : 'age-timeline__line--pending',
                        )}
                      />
                    )}
                  </div>

                  {/* Card */}
                  <MangaPanel
                    className={clsx(
                      'age-timeline__card p-4 sm:p-5 transition-all duration-500',
                      isCurrent && 'age-timeline__card--current',
                      isFuture && 'age-timeline__card--locked',
                    )}
                    style={
                      isCurrent
                        ? {
                            borderColor: raceColor,
                            boxShadow: `0 0 24px ${raceGlow}, inset 0 0 8px ${raceColor}10`,
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-start gap-3 mb-2 flex-wrap">
                      <h3
                        className="font-display text-sm sm:text-base font-bold"
                        style={{
                          color: isCurrent
                            ? raceColor
                            : isPast
                            ? 'var(--color-success)'
                            : 'var(--color-text-muted)',
                        }}
                      >
                        Çağ {age.num} · {age.label}
                      </h3>
                      {isCurrent && (
                        <span
                          className="badge animate-pulse-slow"
                          style={{
                            background: raceDim,
                            color: raceColor,
                            border: `1px solid ${raceGlow}`,
                          }}
                        >
                          ● Aktif
                        </span>
                      )}
                      {isPast && (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(68,255,136,0.10)',
                            color: 'var(--color-success)',
                            border: '1px solid rgba(68,255,136,0.30)',
                          }}
                        >
                          ✓ Tamamlandı
                        </span>
                      )}
                      {isFuture && (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            color: 'var(--color-text-muted)',
                            border: '1px solid rgba(255,255,255,0.10)',
                          }}
                        >
                          🔒 Lv {age.unlockLevel}
                        </span>
                      )}
                    </div>

                    <p
                      className={clsx(
                        'text-xs sm:text-sm italic leading-relaxed',
                        isFuture ? 'text-text-muted' : 'text-text-secondary',
                      )}
                    >
                      &ldquo;{age.scene}&rdquo;
                    </p>

                    {/* In-age progress for current */}
                    {isCurrent && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="font-display text-[9px] text-text-muted uppercase tracking-widest">
                          Lv {progress.level}/{MAX_LEVEL}
                        </span>
                        <div
                          className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden"
                          aria-hidden
                        >
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-spring"
                            style={{
                              width: `${(progress.level / MAX_LEVEL) * 100}%`,
                              background: `linear-gradient(90deg, ${raceColor}80, ${raceColor})`,
                              boxShadow: `0 0 8px ${raceGlow}`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </MangaPanel>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ── Unlocked Content ──────────────────────────────────────── */}
        <section aria-labelledby="unlocks-heading" className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span id="unlocks-heading" className="badge badge-race">
              Kazanılan İçerikler
            </span>
            <div
              className="flex-1 h-px"
              style={{ background: `${raceColor}30` }}
              aria-hidden
            />
            <span className="font-display text-[9px] text-text-muted uppercase tracking-widest">
              {progress.unlockedContent.length} adet
            </span>
          </div>

          {progress.unlockedContent.length === 0 ? (
            <MangaPanel className="p-8 text-center">
              <p className="text-text-muted text-sm">
                Henüz açılmış içerik yok. Savaşa katıl, XP kazan, sırlarını çöz.
              </p>
            </MangaPanel>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.entries(unlocksByCategory) as Array<[
                UnlockCategory,
                ContentUnlock[],
              ]>)
                .filter(([, list]) => list.length > 0)
                .map(([cat, list]) => (
                  <MangaPanel key={cat} className="p-4 animate-manga-appear">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-display text-[11px] font-bold uppercase tracking-widest text-text-secondary">
                        {CATEGORY_LABELS[cat]}
                      </h3>
                      <span
                        className="font-display text-[10px] font-bold"
                        style={{ color: raceColor }}
                      >
                        {list.length}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-2" role="list">
                      {list.map((u) => (
                        <li
                          key={u}
                          className="unlock-row"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <span
                            className="unlock-row__icon"
                            style={{
                              background: raceDim,
                              color: raceColor,
                              border: `1px solid ${raceGlow}`,
                            }}
                            aria-hidden
                          >
                            {UNLOCK_ICONS[u] ?? '✦'}
                          </span>
                          <span className="unlock-row__label">
                            {UNLOCK_LABELS[u] ?? u}
                          </span>
                          <span
                            className="unlock-row__check"
                            style={{ color: 'var(--color-success)' }}
                            aria-label="Açıldı"
                          >
                            ✓
                          </span>
                        </li>
                      ))}
                    </ul>
                  </MangaPanel>
                ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Modals & Toasts ─────────────────────────────────────────── */}
      {levelUpEvent && (
        <LevelUpModal
          payload={levelUpEvent}
          onClose={() => setLevelUpEvent(null)}
        />
      )}
      <UnlockNotification newUnlocks={recentUnlocks} />

      <BottomNav />
    </div>
  );
}
