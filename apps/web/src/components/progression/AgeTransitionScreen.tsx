'use client';

import '@/styles/progression.css';
import { useEffect, useRef, useState } from 'react';
import { ContentUnlock, UNLOCK_LABELS } from '@/types/progression';

/* ── Age metadata ─────────────────────────────────────────────────────────── */

export interface AgeTransitionPayload {
  toAge: number;
  race: string;
  raceColor: string;
  raceGlow: string;
  newUnlocks: ContentUnlock[];
  /** If provided, rendered as the scene visual (Image Generator output). */
  sceneImageSrc?: string;
  /** Auto-advance after this many ms (default 10 000). Set 0 to disable. */
  autoAdvanceMs?: number;
  onComplete: () => void;
}

interface AgeEntry {
  num: number;
  label: string;
  subtitle: string;
  lore: string;
  icon: string;
  sceneArt: string; // CSS class applied to the procedural art canvas
}

const AGES: AgeEntry[] = [
  {
    num: 1,
    label: 'Kuruluş Çağı',
    subtitle: 'The First Dawn',
    lore: 'Galaksinin uçlarında ilk kaleler yükseliyor. Her ırk kendi köşesinde toprağını kazıyor. Savaş henüz değil — ama sessizlik de değil.',
    icon: '◈',
    sceneArt: 'age-art--foundation',
  },
  {
    num: 2,
    label: 'Genişleme Çağı',
    subtitle: 'The Great Expansion',
    lore: 'Irk savaşları başladı, ittifaklar kuruldu. Nebula'nın kaynaklarına ilk el atanlar, tarihin ilk sayfalarını yazıyor.',
    icon: '◆',
    sceneArt: 'age-art--expansion',
  },
  {
    num: 3,
    label: 'Çatışma Çağı',
    subtitle: 'Age of Conflict',
    lore: 'Nebula'nın kalbinde dökülen kan kurumadı. Dört ırk aynı anda üç cepheye saldırıyor. Barış fikri ölü.',
    icon: '✶',
    sceneArt: 'age-art--conflict',
  },
  {
    num: 4,
    label: 'Yıkım Çağı',
    subtitle: 'The Sundering',
    lore: 'Dört ırk bir arada hayatta kalamaz. Yıldızlar söndü, gezegenler parçalandı. Yalnızca en güçlüler bu karanlıktan geçebilir.',
    icon: '⬡',
    sceneArt: 'age-art--ruin',
  },
  {
    num: 5,
    label: 'Yeniden Doğuş',
    subtitle: 'The Rebirth',
    lore: 'Küllerin altından efsaneler yükseliyor. Hayatta kalanlar efsane olacak. Nebula bir kez daha soluk alıyor.',
    icon: '✦',
    sceneArt: 'age-art--rebirth',
  },
  {
    num: 6,
    label: 'Nebula Hâkimi',
    subtitle: 'Master of the Nebula',
    lore: 'Yalnızca bir ırk evrenin efendisi olacak. Tüm yollar buraya çıkıyordu. Bu son çağ — ve senin çağın.',
    icon: '★',
    sceneArt: 'age-art--dominion',
  },
];

/* ── Unlock icon map ──────────────────────────────────────────────────────── */

const UNLOCK_ICONS: Partial<Record<ContentUnlock, string>> = {
  [ContentUnlock.RACE_ZERG]:            '🦠',
  [ContentUnlock.RACE_AUTOMATON]:       '◈',
  [ContentUnlock.RACE_MONSTER_PREVIEW]: '◆',
  [ContentUnlock.MODE_RANKED]:          '⚔',
  [ContentUnlock.CONSTRUCTION_BASICS]:  '🏗',
  [ContentUnlock.ADVANCED_ABILITIES]:   '⚡',
  [ContentUnlock.SPECIAL_MAPS]:         '🗺',
  [ContentUnlock.ADVANCED_TACTICS]:     '🎯',
  [ContentUnlock.AGE_2_PREVIEW]:        '◈',
};

/* ── Phase type ────────────────────────────────────────────────────────────── */

type Phase = 'flash' | 'reveal' | 'ready';

/* ── Component ─────────────────────────────────────────────────────────────── */

export function AgeTransitionScreen({
  toAge,
  raceColor,
  raceGlow,
  newUnlocks,
  sceneImageSrc,
  autoAdvanceMs = 10_000,
  onComplete,
}: AgeTransitionPayload) {
  const age = AGES.find((a) => a.num === toAge) ?? AGES[0];
  const [phase, setPhase] = useState<Phase>('flash');
  const [revealedUnlocks, setRevealedUnlocks] = useState(0);
  const [autoProgress, setAutoProgress] = useState(0);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStartRef = useRef<number>(0);

  /* Phase transitions */
  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase('reveal'), 1200);
    const t2 = window.setTimeout(() => setPhase('ready'),  2800);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);

  /* Stagger unlock reveals once in reveal phase */
  useEffect(() => {
    if (phase !== 'reveal' || newUnlocks.length === 0) return;
    let i = 0;
    const tick = () => {
      i += 1;
      setRevealedUnlocks(i);
      if (i < newUnlocks.length) window.setTimeout(tick, 320);
    };
    const t = window.setTimeout(tick, 600);
    return () => window.clearTimeout(t);
  }, [phase, newUnlocks.length]);

  /* Auto-advance progress bar */
  useEffect(() => {
    if (phase !== 'ready' || autoAdvanceMs <= 0) return;
    autoStartRef.current = Date.now();
    autoTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - autoStartRef.current;
      const pct = Math.min((elapsed / autoAdvanceMs) * 100, 100);
      setAutoProgress(pct);
      if (pct >= 100) {
        clearInterval(autoTimerRef.current!);
        onComplete();
      }
    }, 50);
    return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current); };
  }, [phase, autoAdvanceMs, onComplete]);

  const handleContinue = () => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    onComplete();
  };

  /* Stars */
  const stars = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 4,
    }))
  ).current;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${age.label} başlıyor`}
      className="age-transition-root"
      style={{ '--race-color': raceColor, '--race-glow': raceGlow } as React.CSSProperties}
    >
      {/* ── Layer 0: deep space background ─────────────────────────────── */}
      <div className="age-transition-bg" aria-hidden>
        <div
          className="age-transition-nebula"
          style={{
            background: `radial-gradient(ellipse 70% 55% at 50% 42%,
              ${raceColor}1a 0%, ${raceColor}08 30%, transparent 65%),
              radial-gradient(ellipse 40% 30% at 20% 80%, #cc00ff0d 0%, transparent 50%),
              #080a10`,
          }}
        />
        {/* Halftone grain */}
        <div className="age-transition-grain" />
      </div>

      {/* ── Layer 1: ambient stars ──────────────────────────────────────── */}
      <div className="age-transition-stars" aria-hidden>
        {stars.map((s) => (
          <span
            key={s.id}
            className="age-star"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* ── Layer 2: scan line ──────────────────────────────────────────── */}
      <div
        className="age-scan-line"
        aria-hidden
        style={{ background: `linear-gradient(180deg, transparent 0%, ${raceColor}18 50%, transparent 100%)` }}
      />

      {/* ── Layer 3: shockwave ring (flash phase) ──────────────────────── */}
      {phase === 'flash' && (
        <div
          className="age-shockwave"
          aria-hidden
          style={{
            borderColor: raceColor,
            boxShadow: `0 0 40px ${raceGlow}, inset 0 0 40px ${raceGlow}`,
          }}
        />
      )}

      {/* ── Layer 4: age number stamp (flash → reveal) ─────────────────── */}
      <div
        className={`age-number-stamp ${phase === 'flash' ? 'age-number-stamp--enter' : 'age-number-stamp--recede'}`}
        aria-hidden
        style={{ color: raceColor, textShadow: `0 0 80px ${raceGlow}, 0 0 160px ${raceGlow}` }}
      >
        {age.num}
      </div>

      {/* ── Layer 5: content card (reveal + ready) ─────────────────────── */}
      <div className={`age-card-shell ${phase !== 'flash' ? 'age-card-shell--visible' : ''}`}>
        {/* Outer bezel */}
        <div
          className="age-card-outer"
          style={{ borderColor: `${raceColor}20` }}
        >
          {/* Inner core */}
          <div className="age-card-inner">

            {/* ── Eyebrow tag ─────────────────────────────────────────── */}
            <div className="age-card-eyebrow">
              <span
                className="age-eyebrow-pill"
                style={{ color: raceColor, borderColor: `${raceColor}40`, background: `${raceColor}12` }}
              >
                ▸ ÇAĞ {age.num} BAŞLIYOR
              </span>
            </div>

            {/* ── Scene visual + title block ───────────────────────────── */}
            <div className="age-card-hero">

              {/* Scene visual (left/top) */}
              <div className="age-scene-frame">
                <div className="age-scene-outer" style={{ borderColor: `${raceColor}25` }}>
                  <div className="age-scene-inner">
                    {sceneImageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sceneImageSrc}
                        alt={age.label}
                        className="age-scene-img"
                      />
                    ) : (
                      <div className={`age-scene-art ${age.sceneArt}`} style={{ '--race': raceColor } as React.CSSProperties}>
                        {/* Procedural art: concentric neon rings + icon */}
                        <div className="age-art-ring age-art-ring--1" style={{ borderColor: `${raceColor}40` }} />
                        <div className="age-art-ring age-art-ring--2" style={{ borderColor: `${raceColor}20` }} />
                        <div className="age-art-ring age-art-ring--3" style={{ borderColor: `${raceColor}10` }} />
                        <div className="age-art-icon" style={{ color: raceColor, textShadow: `0 0 32px ${raceGlow}` }}>
                          {age.icon}
                        </div>
                        <div className="age-art-glow" style={{ background: `radial-gradient(circle, ${raceColor}22 0%, transparent 65%)` }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Title block (right/bottom) */}
              <div className="age-title-block">
                <p className="age-subtitle-text" style={{ color: `${raceColor}99` }}>
                  {age.subtitle}
                </p>
                <h1 className="age-title-text" style={{ color: raceColor, textShadow: `0 0 40px ${raceGlow}` }}>
                  {age.label}
                </h1>
                <p className="age-lore-text">{age.lore}</p>
              </div>
            </div>

            {/* ── Divider ─────────────────────────────────────────────── */}
            {newUnlocks.length > 0 && (
              <div
                className="age-divider"
                style={{ background: `linear-gradient(90deg, transparent, ${raceColor}30, transparent)` }}
              />
            )}

            {/* ── Unlocks list ─────────────────────────────────────────── */}
            {newUnlocks.length > 0 && (
              <div className="age-unlocks">
                <p className="age-unlocks-heading" style={{ color: `${raceColor}88` }}>
                  YENİ İÇERİKLER AÇILDI
                </p>
                <ul className="age-unlocks-list" role="list">
                  {newUnlocks.map((key, i) => (
                    <li
                      key={key}
                      className={`age-unlock-item ${i < revealedUnlocks ? 'age-unlock-item--visible' : ''}`}
                      style={{ '--delay': `${i * 60}ms` } as React.CSSProperties}
                    >
                      <span
                        className="age-unlock-icon"
                        style={{ background: `${raceColor}15`, color: raceColor }}
                      >
                        {UNLOCK_ICONS[key] ?? '✦'}
                      </span>
                      <span className="age-unlock-label">{UNLOCK_LABELS[key] ?? key}</span>
                      <span className="age-unlock-check" style={{ color: raceColor }}>✓</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── CTA ──────────────────────────────────────────────────── */}
            <div className={`age-cta-row ${phase === 'ready' ? 'age-cta-row--visible' : ''}`}>
              {/* Auto-advance bar */}
              {autoAdvanceMs > 0 && phase === 'ready' && (
                <div className="age-auto-bar">
                  <div
                    className="age-auto-fill"
                    style={{
                      width: `${autoProgress}%`,
                      background: `linear-gradient(90deg, ${raceColor}60, ${raceColor})`,
                    }}
                  />
                </div>
              )}

              {/* Button-in-button pattern */}
              <button
                type="button"
                onClick={handleContinue}
                className="age-cta-btn group"
                style={{
                  background: `linear-gradient(135deg, ${raceColor}22 0%, ${raceColor}0d 100%)`,
                  border: `1px solid ${raceColor}50`,
                  color: raceColor,
                  boxShadow: `0 0 24px ${raceGlow}`,
                }}
              >
                <span className="age-cta-label">{age.num === 6 ? 'Efsaneye Ulaş' : 'Çağa Gir'}</span>
                <span
                  className="age-cta-arrow"
                  style={{ background: `${raceColor}20`, color: raceColor }}
                >
                  →
                </span>
              </button>
            </div>

          </div>{/* /inner core */}
        </div>{/* /outer bezel */}
      </div>{/* /card shell */}

      {/* ── Speed lines (flash phase only) ─────────────────────────────── */}
      {phase === 'flash' && (
        <div className="age-speed-lines" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="age-speed-line"
              style={{
                top: `${8 + i * 8.5}%`,
                background: `linear-gradient(90deg, transparent 0%, ${raceColor}14 50%, transparent 100%)`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
