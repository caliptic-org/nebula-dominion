'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { RACE_QUIZ_QUESTIONS, scoreQuiz } from './raceQuizData';
import { emitRaceSelectionEvent } from './telemetry';

interface RaceQuizProps {
  onPick: (race: Race) => void;
  onShowAll: () => void;
}

export function RaceQuiz({ onPick, onShowAll }: RaceQuizProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const startedAtRef = useRef<number>(Date.now());
  const completedRef = useRef(false);

  useEffect(() => {
    emitRaceSelectionEvent({ type: 'quiz_started' });
    startedAtRef.current = Date.now();
  }, []);

  const total = RACE_QUIZ_QUESTIONS.length;
  const isComplete = stepIndex >= total;
  const result = useMemo(() => (isComplete ? scoreQuiz(answers) : null), [isComplete, answers]);

  useEffect(() => {
    if (result && !completedRef.current) {
      completedRef.current = true;
      emitRaceSelectionEvent({
        type: 'quiz_completed',
        recommended: result.recommended,
        alternative: result.alternative,
        durationMs: Date.now() - startedAtRef.current,
      });
    }
  }, [result]);

  if (!isComplete) {
    const question = RACE_QUIZ_QUESTIONS[stepIndex];
    const progress = ((stepIndex + 1) / total) * 100;

    return (
      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '32px 28px',
          background: 'rgba(20, 24, 44, 0.7)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
        }}
      >
        {/* Progress */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Soru {stepIndex + 1} / {total}
          </span>
          <button
            type="button"
            onClick={onShowAll}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: 11,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Hepsini göster
          </button>
        </div>
        <div
          style={{
            height: 4,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 2,
            overflow: 'hidden',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--color-brand)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <h3
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            marginBottom: 20,
          }}
        >
          {question.prompt}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {question.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setAnswers((prev) => ({ ...prev, [question.id]: option.id }));
                setStepIndex((s) => s + 1);
              }}
              style={{
                textAlign: 'left',
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                color: 'var(--color-text-primary)',
                fontSize: 14,
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(123,140,222,0.08)';
                e.currentTarget.style.borderColor = 'var(--color-brand)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {stepIndex > 0 && (
          <button
            type="button"
            onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
            style={{
              marginTop: 20,
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ← Geri
          </button>
        )}
      </div>
    );
  }

  if (!result) return null;

  const recommendedDesc = RACE_DESCRIPTIONS[result.recommended];
  const alternativeDesc = RACE_DESCRIPTIONS[result.alternative];

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '32px 28px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <p
          style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            marginBottom: 8,
          }}
        >
          Senin için seçimimiz
        </p>
        <h3
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Sana uygun ırk{' '}
          <span style={{ color: recommendedDesc.color }}>{recommendedDesc.name}</span> görünüyor.
        </h3>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <RecommendationCard
          label="Önerilen"
          desc={recommendedDesc}
          score={result.scores[result.recommended]}
          onPick={() => onPick(result.recommended)}
          highlight
        />
        <RecommendationCard
          label="Alternatif"
          desc={alternativeDesc}
          score={result.scores[result.alternative]}
          onPick={() => onPick(result.alternative)}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          type="button"
          onClick={onShowAll}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            fontSize: 13,
            padding: '10px 20px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Hepsini görmek istiyorum
        </button>
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  label: string;
  desc: (typeof RACE_DESCRIPTIONS)[Race];
  score: number;
  onPick: () => void;
  highlight?: boolean;
}

function RecommendationCard({ label, desc, score, onPick, highlight }: RecommendationCardProps) {
  return (
    <div
      style={{
        position: 'relative',
        padding: '24px 20px',
        borderRadius: 14,
        background: highlight ? desc.bgColor : 'rgba(255,255,255,0.03)',
        border: `2px solid ${highlight ? desc.color : 'var(--color-border)'}`,
        boxShadow: highlight ? `0 0 24px ${desc.color}30` : 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: highlight ? '#000' : 'var(--color-text-muted)',
          background: highlight ? desc.color : 'transparent',
          padding: highlight ? '3px 8px' : 0,
          borderRadius: 10,
        }}
      >
        {label}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 32, lineHeight: 1 }}>{desc.icon}</span>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: desc.color }}>{desc.name}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{desc.subtitle}</div>
        </div>
      </div>

      <p
        style={{
          fontSize: 12,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
          marginBottom: 16,
          minHeight: 54,
        }}
      >
        {desc.description}
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Uyumluluk</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: desc.color }}>{score} puan</span>
      </div>

      <button
        type="button"
        onClick={onPick}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 8,
          border: 'none',
          background: desc.color,
          color: '#000',
          fontSize: 13,
          fontWeight: 800,
          cursor: 'pointer',
          letterSpacing: 0.3,
        }}
      >
        {desc.name} ile devam et
      </button>
    </div>
  );
}
