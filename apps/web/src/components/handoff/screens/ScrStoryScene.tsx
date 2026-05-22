'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Caption,
  Code,
  Eyebrow,
  H2,
  ND,
  NDButton,
  NebulaBg,
  Sigil,
  type NDRace,
} from '@/components/handoff';

interface StoryAct {
  index: number;
  eyebrow: string;
  title: string;
  text: string;
}

interface ScrStorySceneProps {
  race: NDRace;
  /** Override the act list. Defaults to acts derived from RACES[race].storyAct1/2. */
  acts?: StoryAct[];
  /** Characters per second for typewriter. Default 32. */
  cps?: number;
  onComplete?: () => void;
  onExit?: () => void;
}

function buildActs(race: NDRace): StoryAct[] {
  return [
    {
      index: 0,
      eyebrow: 'SAHNE I · UYANIŞ',
      title: race.storyTitle,
      text: race.storyAct1,
    },
    {
      index: 1,
      eyebrow: 'SAHNE II · DÖNÜŞÜM',
      title: 'Evrim',
      text: race.storyAct2,
    },
  ];
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function animOff(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-nd-anim') === 'off';
}

export function ScrStoryScene({
  race,
  acts: actsProp,
  cps = 32,
  onComplete,
  onExit,
}: ScrStorySceneProps) {
  const acts = useMemo(() => actsProp ?? buildActs(race), [actsProp, race]);
  const [actIdx, setActIdx] = useState(0);
  const [typed, setTyped] = useState(0);
  const [entered, setEntered] = useState(false);
  const skipRef = useRef(false);

  const act = acts[actIdx] ?? acts[0];
  const fullText = act.text;
  const isDone = typed >= fullText.length;

  // Skip animation when reduced motion / data-nd-anim is off — show full text immediately
  useEffect(() => {
    if (prefersReducedMotion() || animOff()) {
      setTyped(fullText.length);
      setEntered(true);
    }
  }, [fullText]);

  // Entry fade
  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 80);
    return () => window.clearTimeout(t);
  }, []);

  // Typewriter
  useEffect(() => {
    if (!entered) return;
    setTyped(0);
    skipRef.current = false;
    if (prefersReducedMotion() || animOff()) {
      setTyped(fullText.length);
      return;
    }
    const interval = Math.max(8, Math.round(1000 / cps));
    const id = window.setInterval(() => {
      if (skipRef.current) {
        setTyped(fullText.length);
        window.clearInterval(id);
        return;
      }
      setTyped((prev) => {
        if (prev >= fullText.length) {
          window.clearInterval(id);
          return prev;
        }
        return prev + 1;
      });
    }, interval);
    return () => window.clearInterval(id);
  }, [actIdx, fullText, cps, entered]);

  const skip = useCallback(() => {
    if (!isDone) {
      skipRef.current = true;
      setTyped(fullText.length);
      return;
    }
    if (actIdx < acts.length - 1) {
      setActIdx((i) => i + 1);
    } else {
      onComplete?.();
    }
  }, [isDone, actIdx, acts.length, fullText.length, onComplete]);

  const previous = useCallback(() => {
    if (actIdx > 0) setActIdx((i) => i - 1);
  }, [actIdx]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit?.();
      else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        skip();
      } else if (e.key === 'ArrowLeft') previous();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skip, previous, onExit]);

  const commander = race.commanders.find((c) => c.lv > 0) ?? race.commanders[0];

  return (
    <div
      data-race={race.key}
      data-testid="scr-story-scene"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        overflow: 'hidden',
        background: ND.bgDeep,
        color: ND.text,
        fontFamily: ND.body,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        opacity: entered ? 1 : 0,
        transition: 'opacity 700ms cubic-bezier(0.32,0.72,0,1)',
      }}
      onClick={skip}
      role="dialog"
      aria-label={`${race.name} — ${act.title}`}
    >
      <NebulaBg race={race} intensity={1.1} dim={0.55} />

      {/* Cinematic letterbox bars */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(3,5,11,0.92) 0%, rgba(3,5,11,0.0) 14%, rgba(3,5,11,0.0) 70%, rgba(3,5,11,0.95) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top bar — exit / act counter */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px',
          zIndex: 3,
          background:
            'linear-gradient(180deg, rgba(3,5,11,0.65) 0%, rgba(3,5,11,0) 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onExit?.()}
          style={{
            all: 'unset',
            cursor: 'pointer',
            fontFamily: ND.display,
            fontSize: 11,
            letterSpacing: '0.10em',
            color: ND.textDim,
            textTransform: 'uppercase',
          }}
          aria-label="Hikayeden çık"
        >
          ✕ ÇIK
        </button>
        <Code style={{ color: race.primary, letterSpacing: '0.18em' }}>
          {String(actIdx + 1).padStart(2, '0')} / {String(acts.length).padStart(2, '0')}
        </Code>
      </div>

      {/* Center sigil + race title — fades during typewriter */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '14%',
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          opacity: 0.85,
          pointerEvents: 'none',
        }}
      >
        <Sigil race={race} size={88} glow />
        <Eyebrow color={race.primary} style={{ letterSpacing: '0.32em' }}>
          {race.name.toUpperCase()}
        </Eyebrow>
      </div>

      {/* Narration card */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 24,
          maxWidth: 720,
          margin: '0 auto',
          padding: 2,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${race.primary}66 0%, ${race.primaryDim}22 100%)`,
          boxShadow: `0 0 48px -12px ${race.glow}88`,
          zIndex: 4,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            borderRadius: 12,
            background: ND.surfaceSolid,
            border: `1px solid ${race.primary}22`,
            padding: '14px 16px 16px',
          }}
        >
          {/* Narrator chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${race.primary}33 0%, ${race.primaryDim}11 100%)`,
                border: `1px solid ${race.primary}66`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 12px ${race.glow}55`,
              }}
              aria-hidden
            >
              <Sigil race={race} size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Eyebrow color={race.primary} style={{ fontSize: 9, letterSpacing: '0.22em' }}>
                {act.eyebrow}
              </Eyebrow>
              <div
                style={{
                  fontFamily: ND.display,
                  fontSize: 13,
                  color: ND.text,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}
              >
                {commander.n}
              </div>
            </div>
            <Code style={{ color: ND.textMute }}>
              {commander.t}
            </Code>
          </div>

          {/* Title */}
          <H2
            style={{
              color: race.primary,
              textShadow: `0 0 18px ${race.glow}`,
              marginBottom: 10,
              fontSize: 20,
            }}
          >
            {act.title}
          </H2>

          {/* Narration text with typewriter */}
          <div
            style={{
              fontFamily: ND.body,
              fontSize: 15,
              color: ND.text,
              lineHeight: 1.6,
              borderLeft: `2px solid ${race.primary}88`,
              paddingLeft: 14,
              minHeight: 96,
              fontStyle: 'italic',
            }}
            aria-live="polite"
          >
            {fullText.slice(0, typed)}
            {!isDone && (
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: '1em',
                  marginLeft: 2,
                  verticalAlign: '-2px',
                  background: race.primary,
                  animation: 'nd-blink 1s steps(2, end) infinite',
                  boxShadow: `0 0 6px ${race.glow}`,
                }}
                aria-hidden
              />
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
            <NDButton
              race={race}
              variant="ghost"
              size="sm"
              onClick={previous}
              disabled={actIdx === 0}
            >
              ← ÖNCEKİ
            </NDButton>
            <Caption style={{ flex: 1, textAlign: 'center', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {isDone ? 'DOKUN · DEVAM ET' : 'DOKUN · ATLA'}
            </Caption>
            <NDButton race={race} size="sm" onClick={skip}>
              {isDone
                ? actIdx < acts.length - 1
                  ? 'SONRAKİ →'
                  : 'BİTİR →'
                : 'ATLA →'}
            </NDButton>
          </div>
        </div>
      </div>
    </div>
  );
}
