'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { useProgression } from '@/hooks/useProgression';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { MangaPanel } from '@/components/ui/MangaPanel';
import { AgeTransitionScreen } from '@/components/progression/AgeTransitionScreen';
import { ContentUnlock, LevelUpPayload, UNLOCK_LABELS, TIER_NAMES } from '@/types/progression';

const AGES = [
  { num: 1, label: 'Kuruluş Çağı', scene: 'Galaksinin uçlarında ilk kaleler yükseliyor…', unlocked: true },
  { num: 2, label: 'Genişleme Çağı', scene: 'Irk savaşları başladı, ittifaklar kuruldu.', unlocked: true },
  { num: 3, label: 'Çatışma Çağı', scene: 'Nebula\'nın kalbinde dökülen kan kurumadı.', unlocked: false },
  { num: 4, label: 'Yıkım Çağı', scene: 'Dört ırk bir arada hayatta kalamaz.', unlocked: false },
  { num: 5, label: 'Yeniden Doğuş', scene: 'Hayatta kalanlar efsane olacak.', unlocked: false },
  { num: 6, label: 'Nebula Hâkimi', scene: 'Yalnızca bir ırk evrenin efendisi olacak.', unlocked: false },
];

interface AgeTransitionState {
  toAge: number;
  newUnlocks: ContentUnlock[];
}

export default function ProgressionPage() {
  const { raceColor, raceGlow, meta } = useRaceTheme();
  const lastSeenAgeRef = useRef<number | null>(null);
  const [ageTransition, setAgeTransition] = useState<AgeTransitionState | null>(null);

  const handleLevelUp = useCallback((payload: LevelUpPayload) => {
    const previousAge = lastSeenAgeRef.current;
    if (previousAge !== null && payload.age > previousAge) {
      setAgeTransition({ toAge: payload.age, newUnlocks: payload.newUnlocks });
    }
    lastSeenAgeRef.current = payload.age;
  }, []);

  const { progress, loading } = useProgression({
    userId: 'demo-player-001',
    onLevelUp: handleLevelUp,
  });

  if (lastSeenAgeRef.current === null && progress) {
    lastSeenAgeRef.current = progress.age;
  }

  const handleTransitionComplete = useCallback(() => {
    setAgeTransition(null);
  }, []);

  return (
    <div
      className="h-dvh flex flex-col relative overflow-y-auto"
      style={{ background: 'var(--color-bg)' }}
    >
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-700"
        style={{ background: 'var(--gradient-nebula)', zIndex: 0 }}
        aria-hidden
      />
      <div className="fixed inset-0 halftone-bg pointer-events-none opacity-15" aria-hidden />

      {/* Header */}
      <header
        className="relative z-40 sticky top-0 flex items-center justify-between px-4 py-3"
        style={{
          background: 'rgba(8,10,16,0.9)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="font-display text-text-muted text-xs hover:text-text-primary transition-colors">
            ← Ana Üs
          </Link>
          <div className="h-3 w-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <span className="badge badge-race">İlerleme</span>
        </div>
        {progress && (
          <div className="flex items-center gap-2">
            <span className="font-display text-xs text-text-muted">
              Çağ {progress.age} · Seviye {progress.level} · {TIER_NAMES[progress.tier] ?? 'Bilinmiyor'}
            </span>
          </div>
        )}
      </header>

      <main className="relative z-10 flex-1 p-4 max-w-4xl mx-auto w-full pb-8">

        {/* XP / Level block */}
        {!loading && progress && (
          <MangaPanel className="p-6 mb-8 animate-manga-appear" glow>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
              <div>
                <div className="mb-2"><span className="badge badge-race">Oyuncu Profili</span></div>
                <h1 className="font-display text-2xl font-black text-text-primary">
                  Seviye <span style={{ color: raceColor, textShadow: `0 0 16px ${raceGlow}` }}>{progress.level}</span>
                  <span className="text-text-muted text-base ml-2">/ 9</span>
                </h1>
              </div>
              <div className="text-right">
                <div className="font-display text-[10px] uppercase tracking-widest text-text-muted mb-1">Tier</div>
                <div
                  className="font-display text-lg font-black"
                  style={{ color: raceColor }}
                >
                  {TIER_NAMES[progress.tier] ?? `Tier ${progress.tier}`}
                </div>
                <div className="font-display text-[10px] text-text-muted">
                  ×{progress.tierBonusMultiplier.toFixed(2)} XP bonusu
                </div>
              </div>
            </div>

            {/* XP Bar */}
            <div className="mb-2 flex justify-between">
              <span className="font-display text-[10px] uppercase tracking-widest text-text-muted">XP İlerlemesi</span>
              <span className="font-display text-xs" style={{ color: raceColor }}>
                {progress.currentXp.toLocaleString('tr-TR')} / {progress.xpToNextLevel?.toLocaleString('tr-TR') ?? '∞'}
              </span>
            </div>
            <div className="h-3 bg-white/06 rounded-full overflow-hidden mb-4">
              <div
                className="h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                style={{
                  width: `${progress.xpProgressPercent}%`,
                  background: `linear-gradient(90deg, ${raceColor}88, ${raceColor})`,
                  boxShadow: `0 0 12px ${raceGlow}`,
                }}
              />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Toplam XP', value: progress.totalXp.toLocaleString('tr-TR'), color: raceColor },
                { label: 'Çağ', value: `Çağ ${progress.age}`, color: '#ffc832' },
                { label: 'Tier Bonus', value: `×${progress.tierBonusMultiplier.toFixed(2)}`, color: '#44ff88' },
                { label: 'Max Seviye', value: progress.isMaxLevel ? 'Evet' : 'Hayır', color: '#cc00ff' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-3 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="font-display text-[9px] uppercase tracking-widest text-text-muted mb-1">{s.label}</div>
                  <div className="font-display text-base font-black" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </MangaPanel>
        )}

        {/* Age Timeline */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-5">
            <span className="badge badge-race">Çağ Zaman Çizelgesi</span>
            <div className="flex-1 h-px" style={{ background: `${raceColor}20` }} />
          </div>

          <div className="space-y-3">
            {AGES.map((age, i) => {
              const isCurrent = progress?.age === age.num;
              const isPast = progress ? progress.age > age.num : false;
              return (
                <MangaPanel
                  key={age.num}
                  className="p-4 overflow-hidden transition-all duration-300"
                  style={{
                    animationDelay: `${i * 80}ms`,
                    opacity: age.unlocked || isCurrent ? 1 : 0.4,
                    borderColor: isCurrent ? `${raceColor}40` : undefined,
                    boxShadow: isCurrent ? `0 0 20px ${raceGlow}` : undefined,
                  }}
                >
                  <div className="flex items-center gap-4">
                    {/* Age number */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-black text-xl shrink-0"
                      style={{
                        background: isCurrent
                          ? `${raceColor}20`
                          : isPast
                          ? 'rgba(68,255,136,0.08)'
                          : 'rgba(255,255,255,0.03)',
                        border: `2px solid ${isCurrent ? raceColor : isPast ? '#44ff88' : 'rgba(255,255,255,0.08)'}`,
                        color: isCurrent ? raceColor : isPast ? '#44ff88' : '#555',
                      }}
                    >
                      {isPast ? '✓' : age.num}
                    </div>

                    {/* Age info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3
                          className="font-display text-sm font-bold"
                          style={{ color: isCurrent ? raceColor : isPast ? '#44ff88' : 'var(--color-text-muted)' }}
                        >
                          {age.label}
                        </h3>
                        {isCurrent && (
                          <span
                            className="badge text-[8px]"
                            style={{ background: `${raceColor}20`, color: raceColor, border: `1px solid ${raceColor}40` }}
                          >
                            Aktif
                          </span>
                        )}
                        {isPast && (
                          <span className="badge text-[8px]" style={{ background: 'rgba(68,255,136,0.1)', color: '#44ff88', border: '1px solid rgba(68,255,136,0.3)' }}>
                            Tamamlandı
                          </span>
                        )}
                        {!age.unlocked && !isCurrent && !isPast && (
                          <span className="badge text-[8px]" style={{ background: 'rgba(255,255,255,0.04)', color: '#555', border: '1px solid rgba(255,255,255,0.1)' }}>
                            🔒 Kilitli
                          </span>
                        )}
                      </div>
                      <p className="text-text-muted text-xs italic leading-relaxed">&ldquo;{age.scene}&rdquo;</p>
                    </div>

                    {/* Progress bar for current age */}
                    {isCurrent && progress && (
                      <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                        <span className="font-display text-[9px] text-text-muted uppercase">Lv.{progress.level}/9</span>
                        <div className="w-24 h-1.5 bg-white/06 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(progress.level / 9) * 100}%`,
                              background: `linear-gradient(90deg, ${raceColor}88, ${raceColor})`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </MangaPanel>
              );
            })}
          </div>
        </div>

        {/* Unlocked Content */}
        {progress && progress.unlockedContent.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="badge badge-race">Açık İçerikler</span>
              <div className="flex-1 h-px" style={{ background: `${raceColor}20` }} />
            </div>
            <div className="flex flex-wrap gap-2">
              {progress.unlockedContent.map((key) => (
                <span key={key} className="badge badge-race">
                  ✓ {UNLOCK_LABELS[key] ?? key}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>

      {ageTransition && (
        <AgeTransitionScreen
          toAge={ageTransition.toAge}
          race={meta.dataRace}
          raceColor={raceColor}
          raceGlow={raceGlow}
          newUnlocks={ageTransition.newUnlocks}
          onComplete={handleTransitionComplete}
        />
      )}
    </div>
  );
}
