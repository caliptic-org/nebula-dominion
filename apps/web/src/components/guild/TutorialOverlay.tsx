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
    cta: 'Şimdi loncana katıl',
  },
  guild_chosen: {
    eyebrow: 'Adım 2 / 3',
    title: 'İlk bağışını yap.',
    body:
      'Lonca depoları, üyelerin günlük katkısıyla büyür. Şimdi minik bir mineral bağışı yaparak haftalık katkı puanını başlat.',
    cta: '50 Mineral bağışla',
  },
  first_donation: {
    eyebrow: 'Adım 3 / 3',
    title: 'İlk lonca görevini al.',
    body:
      'Lonca görevleri kovan zihninle paylaşılır — bireysel görevlerden daha hızlı ilerlersin ve hem sana hem loncana XP kazandırır.',
    cta: 'Görev panosunu aç',
  },
  first_quest: {
    eyebrow: 'Tamamlandı',
    title: 'Tutorial tamam!',
    body: 'Ödüllerini toplamak için bir saniyene ihtiyacımız var…',
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

export function TutorialOverlay() {
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
            {state.step === 'completed' ? (
              <GlowButton size="lg" onClick={closeOverlay}>
                {copy.cta}
              </GlowButton>
            ) : (
              <GlowButton
                size="lg"
                loading={isAdvancing}
                onClick={() => advance()}
                aria-label={copy.cta}
              >
                {copy.cta}
              </GlowButton>
            )}
            <span className="tutorial-card__copy" style={{ opacity: 0.6, fontSize: 12 }}>
              Tutorial atlanamaz · Çağ 3 unlock zorunlu adımı
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
