'use client';

import '@/styles/story-scene.css';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ── Types ──────────────────────────────────────────────────────────────────── */

export interface StoryScene {
  /** Background image (from Image Generator). Falls back to procedural art. */
  imageSrc?: string;
  /** Main dialogue line shown in the dialog box. */
  dialogue: string;
  /** Optional second paragraph for longer exchanges. */
  dialogueCont?: string;
  /** Speaker name shown above the dialogue. */
  speaker: string;
  /** Speaker portrait image. Falls back to sigil glyph. */
  portraitSrc?: string;
  /** Eyebrow label (e.g. "ACT 1 — ARRIVAL") */
  eyebrow?: string;
}

export interface StoryScenePayload {
  /** Race key for theming: 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan' */
  race: string;
  /** Hex or oklch race color (e.g. '#4a9eff') */
  raceColor: string;
  /** Race name displayed as story title */
  raceName: string;
  /** Story arc title */
  storyTitle: string;
  /** Sigil glyph character used as portrait fallback */
  sigilGlyph: string;
  /** Ordered list of scenes (3 recommended) */
  scenes: StoryScene[];
  /** Characters per second for typewriter (default 28) */
  typewriterCps?: number;
  onComplete: () => void;
}

/* ── Race sigil glyphs ───────────────────────────────────────────────────── */

const SIGIL_GLYPHS: Record<string, string> = {
  insan:   '⊹',
  zerg:    '⬡',
  otomat:  '◈',
  canavar: '◆',
  seytan:  '✦',
};

/* ── Scene state machine ─────────────────────────────────────────────────── */

type ScenePhase =
  | 'entering'     // fade in from black
  | 'typing'       // typewriter running
  | 'waiting'      // awaiting tap
  | 'transitioning'// fade between scenes
  | 'ending';      // final card visible

/* ── Component ───────────────────────────────────────────────────────────── */

export function StorySceneScreen({
  race,
  raceColor,
  raceName,
  storyTitle,
  sigilGlyph,
  scenes,
  typewriterCps = 28,
  onComplete,
}: StoryScenePayload) {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [phase, setPhase] = useState<ScenePhase>('entering');
  const [typedLength, setTypedLength] = useState(0);
  const [hudsVisible, setHudsVisible] = useState(false);
  const [fadeIn, setFadeIn]   = useState(true);   // overlay opacity
  const [fadeOut, setFadeOut] = useState(false);

  const typeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const glyphRef     = useRef(sigilGlyph || SIGIL_GLYPHS[race] || '✦');

  const currentScene  = scenes[sceneIdx] ?? scenes[0];
  const fullDialogue  = currentScene.dialogue + (currentScene.dialogueCont ? '\n\n' + currentScene.dialogueCont : '');
  const typedText     = fullDialogue.slice(0, typedLength);
  const isTypingDone  = typedLength >= fullDialogue.length;

  /* ── Entry sequence ─────────────────────────────────────────────────────── */
  useEffect(() => {
    // Remove the black overlay on mount
    const t1 = window.setTimeout(() => setFadeIn(false), 80);
    const t2 = window.setTimeout(() => {
      setPhase('typing');
      setHudsVisible(true);
    }, 700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  /* ── Typewriter ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (phase !== 'typing') return;
    setTypedLength(0);
    const msPerChar = 1000 / typewriterCps;
    typeTimerRef.current = setInterval(() => {
      setTypedLength((prev) => {
        const next = prev + 1;
        if (next >= fullDialogue.length) {
          clearInterval(typeTimerRef.current!);
          setPhase('waiting');
        }
        return next;
      });
    }, msPerChar);
    return () => { if (typeTimerRef.current) clearInterval(typeTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sceneIdx]);

  /* ── Advance handler ─────────────────────────────────────────────────────── */
  const advance = useCallback(() => {
    if (phase === 'typing') {
      // Skip typewriter — show full text immediately
      if (typeTimerRef.current) clearInterval(typeTimerRef.current);
      setTypedLength(fullDialogue.length);
      setPhase('waiting');
      return;
    }

    if (phase !== 'waiting') return;

    const isLast = sceneIdx >= scenes.length - 1;

    if (isLast) {
      setPhase('ending');
      return;
    }

    // Transition to next scene
    setPhase('transitioning');
    setFadeOut(true);

    window.setTimeout(() => {
      setSceneIdx((i) => i + 1);
      setTypedLength(0);
      setFadeOut(false);
      window.setTimeout(() => setPhase('typing'), 100);
    }, 500);
  }, [phase, sceneIdx, scenes.length, fullDialogue.length]);

  /* ── Skip handler ───────────────────────────────────────────────────────── */
  const skip = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setFadeOut(true);
    window.setTimeout(() => onComplete(), 500);
  }, [onComplete]);

  /* ── Handle root click ──────────────────────────────────────────────────── */
  const handleRootClick = () => {
    if (phase === 'ending') return; // ending has its own buttons
    advance();
  };

  /* ── Derive hex from oklch for inline styles ────────────────────────────── */
  const rc = raceColor;
  // Alpha helpers
  const rc18 = `${rc}2e`; // ~18% opacity
  const rc30 = `${rc}4d`;
  const rc40 = `${rc}66`;

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div
      className="ss-root"
      role="dialog"
      aria-modal="true"
      aria-label={`${storyTitle} — Sahne ${sceneIdx + 1} / ${scenes.length}`}
      style={{ '--ss-race': rc } as React.CSSProperties}
      onClick={handleRootClick}
    >
      {/* ── Background ─────────────────────────────────────────────────────── */}
      <div className="ss-bg">
        {currentScene.imageSrc ? (
          <img
            src={currentScene.imageSrc}
            alt={`Sahne ${sceneIdx + 1}`}
            className={`ss-bg-img ${phase !== 'entering' ? 'ss-bg-img--visible' : 'ss-bg-img--hidden'}`}
            draggable={false}
          />
        ) : (
          /* Procedural art fallback */
          <div className="ss-bg-art" style={{ background: `radial-gradient(ellipse 60% 60% at 50% 40%, ${rc18} 0%, #03050b 70%)` }}>
            <div className="ss-bg-art-ring ss-bg-art-ring--1" style={{ borderColor: `${rc}22` }} />
            <div className="ss-bg-art-ring ss-bg-art-ring--2" style={{ borderColor: `${rc}18` }} />
            <div className="ss-bg-art-ring ss-bg-art-ring--3" style={{ borderColor: `${rc}14` }} />
            <div
              className="ss-bg-art-glyph"
              style={{ color: rc, filter: `drop-shadow(0 0 40px ${rc40})` }}
            >
              {glyphRef.current}
            </div>
          </div>
        )}
      </div>

      {/* ── Vignette ──────────────────────────────────────────────────────── */}
      <div className="ss-vignette" aria-hidden />

      {/* ── Race atmosphere glow ──────────────────────────────────────────── */}
      <div
        className="ss-atmosphere"
        aria-hidden
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 30%, ${rc} 0%, transparent 70%)`,
          opacity: currentScene.imageSrc ? 0.10 : 0.18,
        }}
      />

      {/* ── Scan line ─────────────────────────────────────────────────────── */}
      <div className="ss-scanline" aria-hidden />

      {/* ── Film grain (fixed) ────────────────────────────────────────────── */}
      <div className="ss-grain" aria-hidden />

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="ss-topbar" onClick={(e) => e.stopPropagation()}>
        {/* Scene counter */}
        <div className={`ss-scene-counter ${hudsVisible ? 'ss-scene-counter--visible' : ''}`}>
          <div className="ss-counter-pill" style={{ borderColor: `${rc}30` }}>
            <div className="ss-counter-dot" style={{ background: rc, boxShadow: `0 0 6px ${rc}` }} />
            <span className="ss-counter-text">
              {sceneIdx + 1}&thinsp;/&thinsp;{scenes.length}&nbsp;SAHNE
            </span>
          </div>
          {currentScene.eyebrow && (
            <span
              className="ss-story-title ss-story-title--visible"
              style={{ color: rc }}
            >
              {currentScene.eyebrow}
            </span>
          )}
        </div>

        {/* Story title (center) */}
        {!currentScene.eyebrow && (
          <span
            className={`ss-story-title ${hudsVisible ? 'ss-story-title--visible' : ''}`}
            style={{ color: rc }}
          >
            {storyTitle}
          </span>
        )}

        {/* Skip button */}
        <button
          type="button"
          className={`ss-skip-btn ${hudsVisible ? 'ss-skip-btn--visible' : ''}`}
          onClick={skip}
          aria-label="Sahneyi Atla"
        >
          ATLA
          <span className="ss-skip-arrow">⟫</span>
        </button>
      </div>

      {/* ── Scene pagination dots ──────────────────────────────────────────── */}
      <div className={`ss-dots ${hudsVisible && phase !== 'ending' ? 'ss-dots--visible' : ''}`} aria-hidden>
        {scenes.map((_, i) => (
          <div
            key={i}
            className={`ss-dot ${i === sceneIdx ? 'ss-dot--active' : i < sceneIdx ? 'ss-dot--done' : ''}`}
            style={i === sceneIdx ? { background: rc, borderColor: 'transparent', boxShadow: `0 0 8px ${rc}` } : undefined}
          />
        ))}
      </div>

      {/* ── Dialog box ────────────────────────────────────────────────────── */}
      <div
        className={`ss-dialog-shell ${hudsVisible && phase !== 'ending' ? 'ss-dialog-shell--visible' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onClickCapture={() => advance()}
      >
        {/* Outer bezel */}
        <div
          className="ss-dialog-outer"
          style={{ borderColor: `${rc}28`, boxShadow: `0 0 60px rgba(0,0,0,0.7), 0 0 30px ${rc}12` }}
        >
          {/* Inner core */}
          <div className="ss-dialog-inner">

            {/* Portrait panel */}
            <div className="ss-portrait-panel">
              <div
                className="ss-portrait-outer"
                style={{
                  borderColor: `${rc}35`,
                  boxShadow: `0 0 20px ${rc}22`,
                }}
              >
                <div className="ss-portrait-inner">
                  {currentScene.portraitSrc ? (
                    <img
                      src={currentScene.portraitSrc}
                      alt={currentScene.speaker}
                      className="ss-portrait-img"
                      draggable={false}
                    />
                  ) : (
                    <span
                      className="ss-portrait-glyph"
                      style={{ color: rc, filter: `drop-shadow(0 0 10px ${rc})` }}
                    >
                      {glyphRef.current}
                    </span>
                  )}
                </div>
              </div>

              <span
                className="ss-char-name"
                style={{ color: rc }}
              >
                {currentScene.speaker}
              </span>
            </div>

            {/* Vertical divider */}
            <div
              className="ss-dialog-divider"
              style={{ background: `linear-gradient(to bottom, transparent, ${rc}60, transparent)` }}
            />

            {/* Text area */}
            <div className="ss-text-area">
              {/* Speaker label */}
              <div className="ss-speaker" style={{ color: rc }}>
                {currentScene.speaker.toUpperCase()}
                <span
                  className="ss-speaker-dash"
                  style={{ background: `linear-gradient(90deg, ${rc}60, transparent)` }}
                />
              </div>

              {/* Typewriter text */}
              <p className="ss-dialog-text">
                {typedText.split('\n\n').map((para, pi) => (
                  <span key={pi}>
                    {pi > 0 && <><br /><br /></>}
                    {para}
                  </span>
                ))}
                {/* Blinking cursor while typing */}
                {!isTypingDone && (
                  <span
                    className="ss-cursor"
                    style={{ background: rc }}
                    aria-hidden
                  />
                )}
              </p>

              {/* Continue indicator */}
              <div
                className={`ss-continue ${isTypingDone && phase === 'waiting' ? 'ss-continue--visible' : ''}`}
                style={{ color: rc }}
                aria-hidden
              >
                {sceneIdx >= scenes.length - 1 ? 'TAMAMLA' : 'DEVAM ET'}
                <span className="ss-continue-arrow">›</span>
              </div>
            </div>

          </div>{/* /inner core */}
        </div>{/* /outer bezel */}
      </div>

      {/* ── Ending overlay ────────────────────────────────────────────────── */}
      <div
        className={`ss-ending ${phase === 'ending' ? 'ss-ending--visible' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Race sigil */}
        <div
          style={{
            fontSize: 52,
            marginBottom: 16,
            color: rc,
            filter: `drop-shadow(0 0 24px ${rc})`,
            animation: 'ss-glyph-float 6s ease-in-out infinite',
          }}
          aria-hidden
        >
          {glyphRef.current}
        </div>

        <p
          className="ss-ending-title"
          style={{ color: rc, textShadow: `0 0 30px ${rc40}` }}
        >
          {storyTitle}
        </p>
        <p className="ss-ending-sub">{raceName} · Hikaye Bölümü Tamamlandı</p>

        <button
          type="button"
          className="ss-cta-btn"
          style={{
            background: `linear-gradient(135deg, ${rc18} 0%, ${rc}0a 100%)`,
            borderColor: `${rc}50`,
            color: rc,
            boxShadow: `0 0 28px ${rc}22`,
          }}
          onClick={onComplete}
        >
          <span>DEVAM ET</span>
          <span
            className="ss-cta-arrow-wrap"
            style={{ background: `${rc}1a` }}
          >
            →
          </span>
        </button>
      </div>

      {/* ── Fade overlay ──────────────────────────────────────────────────── */}
      <div
        className={`ss-fade-overlay ${fadeIn || fadeOut ? 'ss-fade-overlay--in' : 'ss-fade-overlay--out'}`}
        aria-hidden
      />
    </div>
  );
}

/* ── Helper: build scenes from nd-tokens race data ──────────────────────── */

export interface StorySceneRaceData {
  race: string;
  raceColor: string;
  raceName: string;
  storyTitle: string;
  storyAct1: string;
  storyAct2: string;
  avatar: string;
  capitalBase: string;
  motto: string;
  seasonGoal: string;
  /** scene image URLs from Image Generator (CAL-490 output, 3 per race) */
  sceneImages?: [string?, string?, string?];
  portraitSrc?: string;
}

export function buildScenesFromRaceData(data: StorySceneRaceData): StoryScene[] {
  const {
    avatar,
    capitalBase,
    motto,
    storyTitle,
    storyAct1,
    storyAct2,
    seasonGoal,
    sceneImages,
    portraitSrc,
  } = data;

  return [
    {
      imageSrc:  sceneImages?.[0],
      eyebrow:   'BÖLÜM I · KÖKEN',
      speaker:   avatar,
      portraitSrc,
      dialogue:  `${storyTitle}.`,
      dialogueCont: motto,
    },
    {
      imageSrc:  sceneImages?.[1],
      eyebrow:   'BÖLÜM II · YÜKSELEN',
      speaker:   avatar,
      portraitSrc,
      dialogue:  storyAct1,
    },
    {
      imageSrc:  sceneImages?.[2],
      eyebrow:   'BÖLÜM III · HEDEF',
      speaker:   capitalBase,
      dialogue:  storyAct2,
      dialogueCont: `Hedefimiz: ${seasonGoal}.`,
    },
  ];
}
