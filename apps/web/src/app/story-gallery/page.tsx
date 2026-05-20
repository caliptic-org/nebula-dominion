'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Caption,
  Chip,
  Code,
  Eyebrow,
  H2,
  H3,
  ND,
  NDButton,
  NebulaBg,
  NotchPanel,
  Panel,
  RACES,
  Sigil,
  type NDRace,
  type NDRaceKey,
} from '@/components/handoff';

// ── Constants ─────────────────────────────────────────────────────────────────

const RACE_KEYS: NDRaceKey[] = ['insan', 'zerg', 'otomat', 'canavar', 'seytan'];
const TOTAL_SCENES = 5;

interface StoryScene {
  index: number;
  eyebrow: string;
  title: string;
  text: string;
  unlocked: boolean;
}

function buildScenes(race: NDRace, playerRaceKey: NDRaceKey): StoryScene[] {
  const isPlayer = race.key === playerRaceKey;
  const scenes: { eyebrow: string; title: string; text: string }[] = [
    {
      eyebrow: 'SAHNE I · UYANIŞ',
      title: 'Kökler',
      text: race.storyAct1,
    },
    {
      eyebrow: 'SAHNE II · DÖNÜŞÜM',
      title: 'Evrim',
      text: race.storyAct2,
    },
    {
      eyebrow: 'SAHNE III · YAZGI',
      title: 'İşaret',
      text: `"Beş ırk uyandı. Sen ${race.name} olarak yazılıyorsun. ${race.motto}."`,
    },
    {
      eyebrow: 'SAHNE IV · ÜSSÜN',
      title: 'Kalkan',
      text: `"İlk üssün: ${race.capitalBase}. ${race.capitalDescription}."`,
    },
    {
      eyebrow: 'SAHNE V · SEZON',
      title: 'Amaç',
      text: `"Sezonun hedefi: ${race.seasonGoal}. Galaksi seni bekliyor."`,
    },
  ];

  return scenes.map((s, i) => ({
    ...s,
    index: i,
    unlocked: isPlayer || i === 0,
  }));
}

function readPlayerRace(): NDRaceKey {
  if (typeof window === 'undefined') return 'insan';
  try {
    const raw = window.localStorage.getItem('nebula:race-commitment:v1');
    if (!raw) return 'insan';
    const p = JSON.parse(raw) as { race?: string };
    if (p?.race && RACE_KEYS.includes(p.race as NDRaceKey)) return p.race as NDRaceKey;
  } catch {
    // ignore
  }
  return 'insan';
}

// ── Scene Viewer Modal ────────────────────────────────────────────────────────

interface SceneViewerProps {
  race: NDRace;
  scene: StoryScene;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  total: number;
}

function SceneViewer({ race, scene, onClose, onPrev, onNext, hasPrev, hasNext, total }: SceneViewerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(3,5,11,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${race.name} — ${scene.title}`}
    >
      <div
        style={{ maxWidth: 520, width: '100%', animation: 'nd-slide-up 280ms cubic-bezier(0.32,0.72,0,1) both' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Double-bezel outer shell */}
        <div
          style={{
            padding: 2,
            borderRadius: 18,
            background: `linear-gradient(135deg, ${race.primary}55 0%, ${race.primaryDim}22 100%)`,
            boxShadow: `0 0 48px -12px ${race.glow}66`,
          }}
        >
          {/* Inner core */}
          <div
            style={{
              borderRadius: 16,
              background: ND.surfaceSolid,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}
          >
            {/* Scene illustration area */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/7',
                background: `radial-gradient(ellipse 80% 70% at 50% 100%, ${race.glow}33 0%, transparent 70%), ${ND.bgDeep}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: `1px solid ${race.primary}22`,
              }}
            >
              <Sigil race={race} size={96} glow />
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 14,
                  fontFamily: ND.mono,
                  fontSize: 9,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: race.primary,
                }}
              >
                ◈ {race.short} · {String(scene.index + 1).padStart(2, '0')}
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: 10,
                  right: 14,
                  fontFamily: ND.mono,
                  fontSize: 9,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: ND.textMute,
                }}
              >
                {scene.index + 1} / {total}
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '18px 20px 20px' }}>
              <Eyebrow color={race.primary} style={{ marginBottom: 6 }}>{scene.eyebrow}</Eyebrow>
              <H2 style={{ color: ND.text, fontSize: 18, marginBottom: 12 }}>{scene.title}</H2>
              <div
                style={{
                  fontFamily: ND.body,
                  fontSize: 14,
                  color: ND.text,
                  lineHeight: 1.65,
                  borderLeft: `2px solid ${race.primary}77`,
                  paddingLeft: 12,
                  marginBottom: 20,
                  fontStyle: 'italic',
                }}
              >
                {scene.text}
              </div>

              {/* Nav row */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <NDButton race={race} variant="ghost" size="sm" onClick={onPrev} disabled={!hasPrev}>← ÖNCEKİ</NDButton>
                <div style={{ flex: 1 }} />
                <NDButton race={race} variant="ghost" size="sm" onClick={onClose}>KAPAT</NDButton>
                <NDButton race={race} size="sm" onClick={onNext} disabled={!hasNext}>SONRAKİ →</NDButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Scene Card ────────────────────────────────────────────────────────────────

interface SceneCardProps {
  race: NDRace;
  scene: StoryScene;
  isPlayer: boolean;
  onClick: () => void;
  animDelay: number;
}

function SceneCard({ race, scene, isPlayer, onClick, animDelay }: SceneCardProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 500ms cubic-bezier(0.32,0.72,0,1) ${animDelay}ms, transform 500ms cubic-bezier(0.32,0.72,0,1) ${animDelay}ms`,
      }}
    >
      <button
        type="button"
        onClick={scene.unlocked ? onClick : undefined}
        style={{
          all: 'unset',
          display: 'block',
          width: '100%',
          cursor: scene.unlocked ? 'pointer' : 'default',
        }}
        aria-disabled={!scene.unlocked}
        aria-label={scene.unlocked ? `${scene.eyebrow}: ${scene.title}` : 'Kilitli sahne'}
      >
        {/* Double-bezel outer shell */}
        <div
          style={{
            padding: 1.5,
            borderRadius: 10,
            background: scene.unlocked
              ? `linear-gradient(135deg, ${race.primary}44 0%, transparent 60%)`
              : `linear-gradient(135deg, ${ND.border} 0%, transparent 60%)`,
            transition: 'box-shadow 300ms cubic-bezier(0.32,0.72,0,1)',
            boxShadow: scene.unlocked && isPlayer
              ? `0 0 0 0px ${race.glow}00`
              : 'none',
          }}
          className={scene.unlocked ? 'scene-card-hover' : ''}
        >
          {/* Inner core */}
          <div
            style={{
              borderRadius: 8.5,
              background: ND.surface,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Thumbnail */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/9',
                background: scene.unlocked
                  ? `radial-gradient(ellipse 60% 70% at 50% 100%, ${race.glow}20 0%, transparent 70%), ${ND.bgDeep}`
                  : ND.bgDeep,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                filter: scene.unlocked ? 'none' : 'grayscale(1) brightness(0.4)',
              }}
            >
              <Sigil race={race} size={44} glow={scene.unlocked} />
              {!scene.unlocked && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(3,5,11,0.5)',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
                    <rect x="3" y="10" width="16" height="10" rx="2" stroke={ND.textMute} strokeWidth="1.5" fill="none"/>
                    <path d="M7 10V7a4 4 0 0 1 8 0v3" stroke={ND.textMute} strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 8,
                  fontFamily: ND.mono,
                  fontSize: 8,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: scene.unlocked ? race.primary : ND.textMute,
                }}
              >
                {String(scene.index + 1).padStart(2, '0')}
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: '10px 12px 12px' }}>
              <Eyebrow color={scene.unlocked ? race.primary : ND.textMute} style={{ fontSize: 8, marginBottom: 4 }}>
                {scene.eyebrow}
              </Eyebrow>
              <div
                style={{
                  fontFamily: ND.display,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: scene.unlocked ? ND.text : ND.textMute,
                }}
              >
                {scene.unlocked ? scene.title : '• • •'}
              </div>
              {scene.unlocked && (
                <Caption style={{ marginTop: 4, fontSize: 11, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {scene.text.replace(/"/g, '')}
                </Caption>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

// ── Race Section ──────────────────────────────────────────────────────────────

interface RaceSectionProps {
  race: NDRace;
  scenes: StoryScene[];
  isPlayer: boolean;
  onOpenScene: (race: NDRace, index: number) => void;
}

function RaceSection({ race, scenes, isPlayer, onOpenScene }: RaceSectionProps) {
  const [expanded, setExpanded] = useState(isPlayer);
  const unlockedCount = scenes.filter(s => s.unlocked).length;

  return (
    <section
      style={{ marginBottom: 28 }}
      aria-label={`${race.name} hikaye sahneleri`}
    >
      {/* Section header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        style={{
          all: 'unset',
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          gap: 12,
          padding: '10px 0',
          cursor: 'pointer',
          marginBottom: 10,
          borderBottom: `1px solid ${expanded ? race.primary + '44' : ND.border}`,
          transition: 'border-color 250ms cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <Sigil race={race} size={26} glow={isPlayer} />
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <H3 style={{ color: isPlayer ? race.primary : ND.text }}>{race.name}</H3>
            {isPlayer && <Chip color={race.primary}>SENİN IRKIN</Chip>}
          </div>
          <Caption style={{ marginTop: 2, fontSize: 11 }}>{race.storyTitle}</Caption>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Code style={{ color: unlockedCount === TOTAL_SCENES ? race.primary : ND.textMute }}>
            {unlockedCount}/{TOTAL_SCENES}
          </Code>
          <div
            style={{
              width: 18,
              height: 18,
              border: `1px solid ${ND.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 250ms cubic-bezier(0.32,0.72,0,1)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
            aria-hidden
          >
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1l4 4 4-4" stroke={ND.textDim} strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </button>

      {/* Progress bar */}
      <div
        style={{
          height: 2,
          background: ND.border,
          marginBottom: 14,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${(unlockedCount / TOTAL_SCENES) * 100}%`,
            background: `linear-gradient(90deg, ${race.primaryDim}, ${race.primary})`,
            boxShadow: `0 0 8px ${race.glow}`,
            transition: 'width 600ms cubic-bezier(0.32,0.72,0,1)',
          }}
        />
      </div>

      {/* Scene grid */}
      {expanded && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 10,
          }}
        >
          {scenes.map((scene, i) => (
            <SceneCard
              key={scene.index}
              race={race}
              scene={scene}
              isPlayer={isPlayer}
              onClick={() => onOpenScene(race, scene.index)}
              animDelay={i * 60}
            />
          ))}
        </div>
      )}

      {/* Commander list (collapsed view) */}
      {!expanded && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {race.commanders.map(cmdr => (
            <Chip
              key={cmdr.n}
              color={cmdr.lv === 0 ? undefined : race.primary}
              style={{ opacity: cmdr.lv === 0 ? 0.45 : 1 }}
            >
              {cmdr.lv === 0 ? '🔒' : '◆'} {cmdr.n.split(' ').slice(-1)[0]}
            </Chip>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StoryGalleryPage() {
  const [playerRaceKey, setPlayerRaceKey] = useState<NDRaceKey>('insan');
  const [filterKey, setFilterKey] = useState<NDRaceKey | 'all'>('all');
  const [viewer, setViewer] = useState<{ race: NDRace; index: number } | null>(null);

  useEffect(() => {
    setPlayerRaceKey(readPlayerRace());
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-race', playerRaceKey);
    }
  }, [playerRaceKey]);

  const playerRace = RACES[playerRaceKey];

  const raceScenes = useMemo(
    () =>
      RACE_KEYS.reduce<Record<NDRaceKey, StoryScene[]>>(
        (acc, key) => ({ ...acc, [key]: buildScenes(RACES[key], playerRaceKey) }),
        {} as Record<NDRaceKey, StoryScene[]>,
      ),
    [playerRaceKey],
  );

  const totalUnlocked = useMemo(
    () => RACE_KEYS.reduce((sum, key) => sum + raceScenes[key].filter(s => s.unlocked).length, 0),
    [raceScenes],
  );

  const visibleRaces = filterKey === 'all' ? RACE_KEYS : [filterKey];

  const handleOpenScene = (race: NDRace, index: number) => {
    setViewer({ race, index });
  };

  const handleViewerNav = (delta: number) => {
    if (!viewer) return;
    const scenes = raceScenes[viewer.race.key];
    const next = viewer.index + delta;
    if (next >= 0 && next < scenes.length && scenes[next].unlocked) {
      setViewer({ ...viewer, index: next });
    }
  };

  const viewerScene = viewer ? raceScenes[viewer.race.key][viewer.index] : null;
  const viewerScenes = viewer ? raceScenes[viewer.race.key] : [];

  return (
    <div
      data-race={playerRaceKey}
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: ND.bg,
        color: ND.text,
        fontFamily: ND.body,
      }}
    >
      <NebulaBg race={playerRace} intensity={0.7} dim={0.8} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        {/* ── Sticky header ── */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            padding: '12px 16px',
            background: 'rgba(6,8,15,0.90)',
            borderBottom: `1px solid ${ND.border}`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              href="/"
              style={{
                fontFamily: ND.display,
                fontSize: 11,
                letterSpacing: '0.08em',
                color: ND.textDim,
                textDecoration: 'none',
              }}
            >
              ← ANA ÜS
            </Link>
            <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.12)' }} />
            <Chip color={playerRace.primary}>HİKAYE GALERİSİ</Chip>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Code style={{ color: playerRace.primary }}>
              {totalUnlocked}/{RACE_KEYS.length * TOTAL_SCENES} SAHNE
            </Code>
            <Sigil race={playerRace} size={20} />
          </div>
        </header>

        <main style={{ padding: '20px 16px 64px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
          {/* Hero banner */}
          <Panel
            race={playerRace}
            hi
            glow
            style={{ padding: '16px 18px', marginBottom: 22 }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <Sigil race={playerRace} size={48} glow />
              <div style={{ flex: 1 }}>
                <Eyebrow color={playerRace.primary}>NEBULA DOMINION · ARŞİV</Eyebrow>
                <H2 style={{ color: playerRace.primary, marginTop: 4, textShadow: `0 0 18px ${playerRace.glow}` }}>
                  HİKAYE GALERİSİ
                </H2>
                <Caption style={{ marginTop: 4 }}>
                  5 ırk · {RACE_KEYS.length * TOTAL_SCENES} sahne · galaksinin destanı
                </Caption>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <Eyebrow>TAMAMLAMA</Eyebrow>
                <div
                  style={{
                    fontFamily: ND.display,
                    fontSize: 36,
                    fontWeight: 800,
                    color: playerRace.primary,
                    lineHeight: 1,
                    textShadow: `0 0 20px ${playerRace.glow}`,
                  }}
                >
                  {Math.round((totalUnlocked / (RACE_KEYS.length * TOTAL_SCENES)) * 100)}
                  <span style={{ fontSize: 16, color: ND.textDim, fontWeight: 500 }}>%</span>
                </div>
                <Code style={{ color: ND.textMute }}>{totalUnlocked} / {RACE_KEYS.length * TOTAL_SCENES}</Code>
              </div>
            </div>

            {/* Global progress bar */}
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  height: 6,
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${ND.border}`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${(totalUnlocked / (RACE_KEYS.length * TOTAL_SCENES)) * 100}%`,
                    background: `linear-gradient(90deg, ${playerRace.primary}88, ${playerRace.primary})`,
                    boxShadow: `0 0 10px ${playerRace.glow}`,
                    transition: 'width 600ms cubic-bezier(0.32,0.72,0,1)',
                  }}
                />
              </div>
            </div>
          </Panel>

          {/* Race filter */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            <button
              type="button"
              onClick={() => setFilterKey('all')}
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '5px 12px',
                fontFamily: ND.display,
                fontSize: 11,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                border: `1px solid ${filterKey === 'all' ? playerRace.primary : ND.border}`,
                color: filterKey === 'all' ? playerRace.primary : ND.textDim,
                background: filterKey === 'all' ? `${playerRace.primary}12` : 'transparent',
                transition: 'all 200ms cubic-bezier(0.32,0.72,0,1)',
              }}
            >
              Tüm Irklar
            </button>
            {RACE_KEYS.map(key => {
              const r = RACES[key];
              const active = filterKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterKey(active ? 'all' : key)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    padding: '5px 12px',
                    fontFamily: ND.display,
                    fontSize: 11,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    border: `1px solid ${active ? r.primary : ND.border}`,
                    color: active ? r.primary : ND.textDim,
                    background: active ? `${r.primary}12` : 'transparent',
                    transition: 'all 200ms cubic-bezier(0.32,0.72,0,1)',
                  }}
                >
                  {r.short}
                  {key === playerRaceKey && (
                    <span style={{ marginLeft: 4, opacity: 0.7 }}>★</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Per-race section stats row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 6,
              marginBottom: 24,
            }}
          >
            {RACE_KEYS.map(key => {
              const r = RACES[key];
              const count = raceScenes[key].filter(s => s.unlocked).length;
              const isActive = filterKey === key || filterKey === 'all';
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterKey(filterKey === key ? 'all' : key)}
                  style={{ all: 'unset', display: 'block', cursor: 'pointer', opacity: isActive ? 1 : 0.4, transition: 'opacity 200ms cubic-bezier(0.32,0.72,0,1)' }}
                >
                <NotchPanel
                  race={key === playerRaceKey ? r : undefined}
                  style={{
                    padding: '8px 10px',
                  }}
                >
                  <Eyebrow color={r.primary} style={{ fontSize: 8 }}>{r.short}</Eyebrow>
                  <div
                    style={{
                      fontFamily: ND.display,
                      fontSize: 20,
                      fontWeight: 700,
                      color: r.primary,
                      lineHeight: 1.1,
                      marginTop: 2,
                      textShadow: key === playerRaceKey ? `0 0 12px ${r.glow}` : 'none',
                    }}
                  >
                    {count}
                    <span style={{ fontSize: 11, color: ND.textMute, fontWeight: 400 }}>/{TOTAL_SCENES}</span>
                  </div>
                  {/* Mini progress */}
                  <div style={{ display: 'flex', gap: 2, marginTop: 5 }}>
                    {Array.from({ length: TOTAL_SCENES }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 2,
                          background: i < count ? r.primary : ND.border,
                          boxShadow: i < count && key === playerRaceKey ? `0 0 4px ${r.glow}` : 'none',
                          transition: 'background 300ms',
                        }}
                      />
                    ))}
                  </div>
                </NotchPanel>
                </button>
              );
            })}
          </div>

          {/* Race sections */}
          {visibleRaces.map(key => (
            <RaceSection
              key={key}
              race={RACES[key]}
              scenes={raceScenes[key]}
              isPlayer={key === playerRaceKey}
              onOpenScene={handleOpenScene}
            />
          ))}

          {/* Bottom lore caption */}
          <Panel style={{ padding: '12px 14px', marginTop: 8 }}>
            <Caption style={{ textAlign: 'center', fontSize: 11, letterSpacing: '0.04em' }}>
              <Code style={{ color: playerRace.primary }}>◈ ARŞİV NOTU</Code>
              {' '}— Diğer ırkların sahnelerini keşfetmek için savaşlarda zafer kazan ve galaksiyi fethelle.
              Her yeni ırk bilgisi bir avantajdır.
            </Caption>
          </Panel>
        </main>
      </div>

      {/* Scene viewer modal */}
      {viewer && viewerScene && (
        <SceneViewer
          race={viewer.race}
          scene={viewerScene}
          onClose={() => setViewer(null)}
          onPrev={() => handleViewerNav(-1)}
          onNext={() => handleViewerNav(1)}
          hasPrev={viewer.index > 0 && viewerScenes[viewer.index - 1]?.unlocked}
          hasNext={viewer.index < viewerScenes.length - 1 && viewerScenes[viewer.index + 1]?.unlocked}
          total={viewerScenes.filter(s => s.unlocked).length}
        />
      )}
    </div>
  );
}
