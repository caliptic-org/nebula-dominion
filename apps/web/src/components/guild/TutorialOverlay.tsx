'use client';

import { useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { GlowButton } from '@/components/ui/GlowButton';
import { useGuildTutorial, TUTORIAL_STEP_INDEX } from '@/hooks/useGuildTutorial';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { TutorialStep } from '@/types/guild';
import { GuildCrest } from './GuildCrest';

interface StepCopy {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
}

const STEP_COPY: Record<TutorialStep, StepCopy> = {
  not_started: {
    eyebrow: 'Çağ 3 Açılışı',
    title: 'Loncana ihtiyacın var, Komutan.',
    body:
      'Yalnız çağı geride kaldı. Çağ 3 ve sonrası, lonca içi raid, kaynak yardımlaşma ve haftalık tech araştırması üzerine kuruludur. Devam etmek için bir loncaya katıl ya da kendi loncanı kur.',
    cta: 'Loncayı seç',
  },
  guild_chosen: {
    eyebrow: 'Adım 2 / 4',
    title: 'İlk bağışını yap.',
    body:
      'Lonca depoları, üyelerin günlük katkısıyla büyür. Şimdi minik bir mineral bağışı yaparak haftalık katkı puanını başlat.',
    cta: '50 Mineral bağışla',
  },
  first_donation: {
    eyebrow: 'Adım 3 / 4',
    title: 'İlk lonca görevini al.',
    body:
      'Lonca görevleri kovan zihninle paylaşılır — bireysel görevlerden daha hızlı ilerlersin ve hem sana hem loncana XP kazandırır.',
    cta: 'Görev panosunu aç',
  },
  first_quest: {
    eyebrow: 'Adım 4 / 4',
    title: 'Tutorial tamam!',
    body: 'Ödüllerini toplamak için son bir adım kaldı.',
    cta: 'Ödülü topla',
  },
  completed: {
    eyebrow: 'Lonca Yolculuğu',
    title: 'Hoş geldin, Komutan.',
    body:
      'Lonca tutorialını tamamladın. +500 Energy ve lonca arması hesabına işlendi. Lonca panosundan haftalık raid ve tech ağacına ulaşabilirsin.',
    cta: 'Devam et',
  },
};

interface TutorialOverlayProps {
  /**
   * Optional handler invoked when the user clicks the primary CTA. When
   * provided, it overrides the default advance() call. This is how the
   * dashboard wires step-specific actions (e.g. donate vs manual advance)
   * into the overlay without the overlay knowing about backend internals.
   */
  onPrimaryAction?: () => void | Promise<void>;
  primaryActionLoading?: boolean;
}

export function TutorialOverlay({ onPrimaryAction, primaryActionLoading }: TutorialOverlayProps = {}) {
  const { state, isOverlayOpen, isAdvancing, advance, closeOverlay } = useGuildTutorial();
  const { race } = useRaceTheme();
  const copy = STEP_COPY[state.step];
  const stepIndex = TUTORIAL_STEP_INDEX[state.step];
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOverlayOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOverlayOpen]);

  useFocusTrap(cardRef, isOverlayOpen);

  const stepNodes = useMemo(
    () => [0, 1, 2, 3].map((i) => {
      const status = i < stepIndex ? 'is-done' : i === stepIndex ? 'is-active' : '';
      return <span key={i} className={clsx('tutorial-card__step', status)} />;
    }),
    [stepIndex],
  );

  if (!isOverlayOpen) return null;

  const showRewardScene = state.step === 'completed' && state.rewardClaimed;
  const showRewardPreview = state.step === 'first_quest';

  // For `not_started` the user must physically pick a guild from the
  // search/create panels behind the overlay, so the CTA simply closes the
  // overlay and lets that interaction happen. closeOverlay is unconditional
  // (see useGuildTutorial); non-skippability is enforced by the auto-reopen
  // on next page load.
  const isNotStarted = state.step === 'not_started';

  const handlePrimary = async () => {
    if (state.step === 'completed' || isNotStarted) {
      closeOverlay();
      return;
    }
    if (onPrimaryAction) {
      await onPrimaryAction();
      return;
    }
    await advance();
  };

  return (
    <div
      className="tutorial-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <div className="tutorial-card" ref={cardRef}>
        <div className="tutorial-card__progress" aria-hidden>
          {stepNodes}
        </div>

        <div className="tutorial-card__body">
          <span className="tutorial-card__eyebrow">{copy.eyebrow}</span>
          <h2 id="tutorial-title" className="tutorial-card__title">
            {copy.title}
          </h2>

          {(showRewardScene || showRewardPreview) && (
            <div className="tutorial-reward">
              <div className="tutorial-reward__crest-wrap">
                <span className="tutorial-reward__halo" aria-hidden />
                <GuildCrest race={race} size="xl" animated key={state.step} />
              </div>
              <div className="tutorial-reward__rewards">
                <span className="tutorial-reward__chip">
                  <span aria-hidden>⚡</span> +500 Energy
                </span>
                <span className="tutorial-reward__chip tutorial-reward__chip--cosmetic">
                  <span aria-hidden>🛡️</span> Lonca Arması
                </span>
              </div>
            </div>
          )}

          {!showRewardScene && !showRewardPreview && (
            <p className="tutorial-card__copy">{copy.body}</p>
          )}

          <div className="tutorial-card__actions">
            <GlowButton
              size="lg"
              loading={primaryActionLoading || (isAdvancing && !isNotStarted)}
              onClick={handlePrimary}
              aria-label={copy.cta}
            >
              {copy.cta}
            </GlowButton>
            {state.step !== 'completed' && (
              <span className="tutorial-card__copy" style={{ opacity: 0.6, fontSize: 12 }}>
                Tutorial atlanamaz · Çağ 3 unlock zorunlu adımı
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
