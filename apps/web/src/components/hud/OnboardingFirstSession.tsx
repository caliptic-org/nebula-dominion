'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { RACE_DESCRIPTIONS } from '@/types/units';

interface OnboardingFirstSessionProps {
  onSkip: () => void;
  /** Where the "Eğitim Savaşı" CTA navigates. */
  battleHref: string;
}

/**
 * First-session simplified HUD. Renders fullscreen on top of the home page
 * to enforce progressive disclosure: only two CTAs, hidden resource bars,
 * a guide character explaining what to do next.
 *
 * Why fullscreen vs. inline panels: the existing home page has dense HUD
 * elements (resource bar, multiple tabs, structures list) that bury new
 * players. Replacing the whole view for the first session matches the
 * Top War / Rise of Kingdoms approach referenced in CAL-189.
 */
export function OnboardingFirstSession({ onSkip, battleHref }: OnboardingFirstSessionProps) {
  const { race, raceColor, raceGlow } = useRaceTheme();
  const raceDesc = RACE_DESCRIPTIONS[race];
  const commander = raceDesc.commanders[0];
  const [step, setStep] = useState<'intro' | 'cta'>('intro');
  const [portraitErr, setPortraitErr] = useState(false);

  useEffect(() => {
    // Auto-advance from the cinematic intro to CTA after a moment so the
    // player isn't trapped on a loading-looking screen.
    const t = window.setTimeout(() => setStep('cta'), 2200);
    return () => window.clearTimeout(t);
  }, []);

  const headline =
    step === 'intro'
      ? `${raceDesc.name} İmparatorluğu uyanıyor…`
      : `Komutan, ilk hamlemizi yapalım.`;

  const body =
    step === 'intro'
      ? 'Üssünüz hazırlanıyor. Birinci sektör güvende.'
      : 'İlk savaşımız garantili kazanç. Sadece üç adım: birim seç, hareket et, saldır.';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-headline"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-end sm:justify-center p-4 sm:p-6 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(74,158,255,0.16) 0%, #050609 70%)',
      }}
    >
      {/* Speed lines decoration — manga panel feel */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute h-px"
            style={{
              top: `${10 + i * 11}%`,
              left: 0,
              right: 0,
              background: `linear-gradient(90deg, transparent 0%, ${raceColor}10 50%, transparent 100%)`,
            }}
          />
        ))}
      </div>

      {/* Skip — small, top-right, only after intro is done */}
      {step === 'cta' && (
        <button
          type="button"
          onClick={onSkip}
          className="absolute top-4 right-4 font-display text-[10px] uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors"
          aria-label="Onboarding'i atla"
        >
          ATLA →
        </button>
      )}

      {/* Commander guide */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
        <div
          className={clsx(
            'relative w-28 h-28 rounded-full overflow-hidden border-2 mb-4 transition-all duration-700',
            step === 'intro' ? 'scale-100 opacity-90' : 'scale-110 opacity-100',
          )}
          style={{
            borderColor: raceColor,
            boxShadow: `0 0 32px ${raceGlow}, 0 0 8px ${raceColor}66 inset`,
          }}
        >
          {!portraitErr ? (
            <Image
              src={commander.portrait}
              alt={commander.name}
              fill
              sizes="112px"
              className="object-cover object-top"
              onError={() => setPortraitErr(true)}
              priority
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-4xl"
              style={{ background: raceDesc.bgColor, color: raceColor }}
            >
              {raceDesc.icon}
            </div>
          )}
        </div>

        <span
          className="font-display text-[10px] uppercase tracking-widest mb-2"
          style={{ color: raceColor }}
        >
          ▸ {commander.name} · Komutan
        </span>

        <h1
          id="onboarding-headline"
          className="font-display text-2xl sm:text-3xl font-black mb-3 leading-tight"
          style={{ color: 'var(--color-text-primary)', textShadow: `0 0 18px ${raceGlow}` }}
        >
          {headline}
        </h1>

        <p className="font-body text-sm sm:text-base text-text-secondary mb-6 sm:mb-8 max-w-sm">
          {body}
        </p>

        {step === 'cta' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-sm" role="group" aria-label="Ana eylemler">
            <a
              href={battleHref}
              className="onboarding-cta onboarding-cta--primary"
              style={{
                background: raceColor,
                color: '#080a10',
                boxShadow: `0 0 24px ${raceGlow}`,
              }}
            >
              <span aria-hidden className="text-lg">⚔️</span>
              <span>Eğitim Savaşı</span>
              <span className="text-[10px] opacity-70">3 adım · ~2 dk</span>
            </a>
            <button
              type="button"
              onClick={onSkip}
              className="onboarding-cta onboarding-cta--secondary"
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--color-text-primary)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <span aria-hidden className="text-lg">🏰</span>
              <span>İnşa Et</span>
              <span className="text-[10px] opacity-60">Üssü genişlet</span>
            </button>
          </div>
        )}

        {step === 'intro' && (
          <div
            className="mt-2 flex items-center gap-2 font-display text-[10px] uppercase tracking-widest"
            style={{ color: raceColor }}
            aria-live="polite"
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: raceColor }} />
            Ana üs hazırlanıyor…
          </div>
        )}
      </div>

      <style jsx>{`
        .onboarding-cta {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 14px 16px;
          border-radius: 12px;
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          transition: transform 200ms ease, box-shadow 200ms ease, filter 200ms ease;
          min-height: 76px;
        }
        .onboarding-cta:hover,
        .onboarding-cta:focus-visible {
          transform: translateY(-2px);
          filter: brightness(1.05);
        }
        .onboarding-cta:focus-visible {
          outline: 2px solid var(--color-border-focus);
          outline-offset: 3px;
        }
      `}</style>
    </div>
  );
}
