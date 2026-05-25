'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
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

const RACE_KEYS: NDRaceKey[] = ['insan', 'zerg', 'otomat', 'canavar', 'seytan'];
const ACTS_PER_RACE = 2;

interface ActEntry {
  index: number;
  eyebrow: string;
  title: string;
  text: string;
  unlocked: boolean;
}

interface ScrStoryGalleryProps {
  playerRaceKey: NDRaceKey;
  /** Map of race → number of acts unlocked. Defaults to 2 (all unlocked) for player race, 0 for others. */
  unlocks?: Partial<Record<NDRaceKey, number>>;
}

function buildActs(race: NDRace, unlockedCount: number): ActEntry[] {
  const acts: Omit<ActEntry, 'unlocked'>[] = [
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
  return acts.map((a) => ({ ...a, unlocked: a.index < unlockedCount }));
}

function defaultUnlocksFor(playerRaceKey: NDRaceKey): Record<NDRaceKey, number> {
  return RACE_KEYS.reduce((acc, k) => {
    acc[k] = k === playerRaceKey ? ACTS_PER_RACE : 0;
    return acc;
  }, {} as Record<NDRaceKey, number>);
}

export function ScrStoryGallery({ playerRaceKey, unlocks }: ScrStoryGalleryProps) {
  const playerRace = RACES[playerRaceKey];
  const effectiveUnlocks = useMemo(() => {
    const base = defaultUnlocksFor(playerRaceKey);
    if (unlocks) {
      for (const k of RACE_KEYS) if (typeof unlocks[k] === 'number') base[k] = unlocks[k]!;
    }
    return base;
  }, [playerRaceKey, unlocks]);

  const raceActs = useMemo(
    () =>
      RACE_KEYS.reduce<Record<NDRaceKey, ActEntry[]>>((acc, key) => {
        acc[key] = buildActs(RACES[key], effectiveUnlocks[key] ?? 0);
        return acc;
      }, {} as Record<NDRaceKey, ActEntry[]>),
    [effectiveUnlocks],
  );

  const totalUnlocked = useMemo(
    () => RACE_KEYS.reduce((sum, k) => sum + raceActs[k].filter((a) => a.unlocked).length, 0),
    [raceActs],
  );
  const totalActs = RACE_KEYS.length * ACTS_PER_RACE;

  const [filter, setFilter] = useState<NDRaceKey | 'all'>('all');
  const [viewer, setViewer] = useState<{ race: NDRace; index: number } | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-race', playerRaceKey);
    }
  }, [playerRaceKey]);

  const visibleRaces = filter === 'all' ? RACE_KEYS : [filter];

  const handleViewerNav = (delta: number) => {
    if (!viewer) return;
    const acts = raceActs[viewer.race.key];
    const next = viewer.index + delta;
    if (next >= 0 && next < acts.length && acts[next].unlocked) {
      setViewer({ ...viewer, index: next });
    }
  };

  const viewerAct = viewer ? raceActs[viewer.race.key][viewer.index] : null;
  const viewerActs = viewer ? raceActs[viewer.race.key] : [];

  return (
    <div
      data-race={playerRaceKey}
      data-testid="scr-story-gallery"
      style={{
        position: 'relative',
        height: '100dvh',
        background: ND.bg,
        color: ND.text,
        fontFamily: ND.body,
      }}
    >
      <NebulaBg race={playerRace} intensity={0.75} dim={0.85} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
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
            background: 'rgba(6,8,15,0.92)',
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
              {totalUnlocked} / {totalActs} SAHNE
            </Code>
            <Sigil race={playerRace} size={20} />
          </div>
        </header>

        <main style={{ padding: '20px 16px 64px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
          {/* Hero */}
          <Panel race={playerRace} hi glow style={{ padding: '16px 18px', marginBottom: 22 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <Sigil race={playerRace} size={48} glow />
              <div style={{ flex: 1 }}>
                <Eyebrow color={playerRace.primary}>NEBULA DOMINION · ARŞİV</Eyebrow>
                <H2 style={{ color: playerRace.primary, marginTop: 4, textShadow: `0 0 18px ${playerRace.glow}` }}>
                  HİKAYE GALERİSİ
                </H2>
                <Caption style={{ marginTop: 4 }}>
                  5 ırk · {totalActs} sahne · galaksinin destanı
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
                  {Math.round((totalUnlocked / totalActs) * 100)}
                  <span style={{ fontSize: 16, color: ND.textDim, fontWeight: 500 }}>%</span>
                </div>
                <Code style={{ color: ND.textMute }}>
                  {totalUnlocked} / {totalActs}
                </Code>
              </div>
            </div>

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
                    width: `${(totalUnlocked / totalActs) * 100}%`,
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
            <FilterChip
              active={filter === 'all'}
              color={playerRace.primary}
              onClick={() => setFilter('all')}
              label="Tüm Irklar"
            />
            {RACE_KEYS.map((key) => {
              const r = RACES[key];
              const active = filter === key;
              return (
                <FilterChip
                  key={key}
                  active={active}
                  color={r.primary}
                  onClick={() => setFilter(active ? 'all' : key)}
                  label={`${r.short}${key === playerRaceKey ? ' ★' : ''}`}
                />
              );
            })}
          </div>

          {/* Per-race stats row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 6,
              marginBottom: 24,
            }}
          >
            {RACE_KEYS.map((key) => {
              const r = RACES[key];
              const count = raceActs[key].filter((a) => a.unlocked).length;
              const isActive = filter === key || filter === 'all';
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(filter === key ? 'all' : key)}
                  style={{
                    all: 'unset',
                    display: 'block',
                    cursor: 'pointer',
                    opacity: isActive ? 1 : 0.4,
                    transition: 'opacity 200ms cubic-bezier(0.32,0.72,0,1)',
                  }}
                  aria-label={`${r.name} sahneleri filtresi`}
                >
                  <NotchPanel race={key === playerRaceKey ? r : undefined} style={{ padding: '8px 10px' }}>
                    <Eyebrow color={r.primary} style={{ fontSize: 8 }}>
                      {r.short}
                    </Eyebrow>
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
                      <span style={{ fontSize: 11, color: ND.textMute, fontWeight: 400 }}>/{ACTS_PER_RACE}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 2, marginTop: 5 }}>
                      {Array.from({ length: ACTS_PER_RACE }).map((_, i) => (
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
          {visibleRaces.map((key) => (
            <RaceSection
              key={key}
              race={RACES[key]}
              acts={raceActs[key]}
              isPlayer={key === playerRaceKey}
              onOpen={(index) => setViewer({ race: RACES[key], index })}
            />
          ))}

          <Panel style={{ padding: '12px 14px', marginTop: 8 }}>
            <Caption style={{ textAlign: 'center', fontSize: 11, letterSpacing: '0.04em' }}>
              <Code style={{ color: playerRace.primary }}>◈ ARŞİV NOTU</Code> — Diğer ırkların sahnelerini açmak için savaşlarda
              zafer kazan. Her sahne galaksinin kayıp parçasıdır.
            </Caption>
          </Panel>
        </main>
      </div>

      {viewer && viewerAct && (
        <ActViewer
          race={viewer.race}
          act={viewerAct}
          total={ACTS_PER_RACE}
          onClose={() => setViewer(null)}
          onPrev={() => handleViewerNav(-1)}
          onNext={() => handleViewerNav(1)}
          hasPrev={viewer.index > 0 && viewerActs[viewer.index - 1]?.unlocked}
          hasNext={viewer.index < viewerActs.length - 1 && viewerActs[viewer.index + 1]?.unlocked}
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  color,
  onClick,
  label,
}: {
  active: boolean;
  color: string;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        all: 'unset',
        cursor: 'pointer',
        padding: '5px 12px',
        fontFamily: ND.display,
        fontSize: 11,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        border: `1px solid ${active ? color : ND.border}`,
        color: active ? color : ND.textDim,
        background: active ? `${color}12` : 'transparent',
        transition: 'all 200ms cubic-bezier(0.32,0.72,0,1)',
      }}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function RaceSection({
  race,
  acts,
  isPlayer,
  onOpen,
}: {
  race: NDRace;
  acts: ActEntry[];
  isPlayer: boolean;
  onOpen: (index: number) => void;
}) {
  const [expanded, setExpanded] = useState(isPlayer);
  const unlockedCount = acts.filter((a) => a.unlocked).length;

  return (
    <section style={{ marginBottom: 28 }} aria-label={`${race.name} hikaye aktları`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
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
        aria-expanded={expanded}
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
          <Code style={{ color: unlockedCount === ACTS_PER_RACE ? race.primary : ND.textMute }}>
            {unlockedCount}/{ACTS_PER_RACE}
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
              <path d="M1 1l4 4 4-4" stroke={ND.textDim} strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </button>

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
            width: `${(unlockedCount / ACTS_PER_RACE) * 100}%`,
            background: `linear-gradient(90deg, ${race.primaryDim}, ${race.primary})`,
            boxShadow: `0 0 8px ${race.glow}`,
            transition: 'width 600ms cubic-bezier(0.32,0.72,0,1)',
          }}
        />
      </div>

      {expanded && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {acts.map((act, i) => (
            <ActCard
              key={act.index}
              race={race}
              act={act}
              isPlayer={isPlayer}
              onClick={() => onOpen(act.index)}
              animDelay={i * 80}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ActCard({
  race,
  act,
  isPlayer,
  onClick,
  animDelay,
}: {
  race: NDRace;
  act: ActEntry;
  isPlayer: boolean;
  onClick: () => void;
  animDelay: number;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
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
        onClick={act.unlocked ? onClick : undefined}
        style={{
          all: 'unset',
          display: 'block',
          width: '100%',
          cursor: act.unlocked ? 'pointer' : 'default',
        }}
        aria-disabled={!act.unlocked}
        aria-label={act.unlocked ? `${act.eyebrow}: ${act.title}` : 'Kilitli sahne'}
      >
        <div
          style={{
            padding: 1.5,
            borderRadius: 10,
            background: act.unlocked
              ? `linear-gradient(135deg, ${race.primary}55 0%, transparent 60%)`
              : `linear-gradient(135deg, ${ND.border} 0%, transparent 60%)`,
            transition: 'box-shadow 300ms cubic-bezier(0.32,0.72,0,1)',
          }}
        >
          <div
            style={{
              borderRadius: 8.5,
              background: ND.surface,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/9',
                background: act.unlocked
                  ? `radial-gradient(ellipse 60% 70% at 50% 100%, ${race.glow}33 0%, transparent 70%), ${ND.bgDeep}`
                  : ND.bgDeep,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                filter: act.unlocked ? 'none' : 'grayscale(1) brightness(0.4)',
              }}
            >
              <Sigil race={race} size={56} glow={act.unlocked} />
              {!act.unlocked && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(3,5,11,0.55)',
                  }}
                >
                  <LockIcon color={ND.textMute} />
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
                  color: act.unlocked ? race.primary : ND.textMute,
                }}
              >
                {String(act.index + 1).padStart(2, '0')} · {race.short}
              </div>
            </div>

            <div style={{ padding: '10px 12px 12px' }}>
              <Eyebrow color={act.unlocked ? race.primary : ND.textMute} style={{ fontSize: 8, marginBottom: 4 }}>
                {act.eyebrow}
              </Eyebrow>
              <div
                style={{
                  fontFamily: ND.display,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: act.unlocked ? ND.text : ND.textMute,
                }}
              >
                {act.unlocked ? act.title : '• • • SİLUET'}
              </div>
              {act.unlocked && (
                <Caption
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {act.text.replace(/"/g, '')}
                </Caption>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

function LockIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="3" y="10" width="16" height="10" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
      <path d="M7 10V7a4 4 0 0 1 8 0v3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ActViewer({
  race,
  act,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  total,
}: {
  race: NDRace;
  act: ActEntry;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  total: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      else if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${race.name} — ${act.title}`}
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
    >
      <div
        style={{
          maxWidth: 520,
          width: '100%',
          animation: 'nd-slide-up 280ms cubic-bezier(0.32,0.72,0,1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: 2,
            borderRadius: 18,
            background: `linear-gradient(135deg, ${race.primary}55 0%, ${race.primaryDim}22 100%)`,
            boxShadow: `0 0 48px -12px ${race.glow}66`,
          }}
        >
          <div
            style={{
              borderRadius: 16,
              background: ND.surfaceSolid,
              overflow: 'hidden',
            }}
          >
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
                ◈ {race.short} · {String(act.index + 1).padStart(2, '0')}
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
                {act.index + 1} / {total}
              </div>
            </div>

            <div style={{ padding: '18px 20px 20px' }}>
              <Eyebrow color={race.primary} style={{ marginBottom: 6 }}>
                {act.eyebrow}
              </Eyebrow>
              <H2 style={{ color: ND.text, fontSize: 18, marginBottom: 12 }}>{act.title}</H2>
              <div
                style={{
                  fontFamily: ND.body,
                  fontSize: 14,
                  color: ND.text,
                  lineHeight: 1.65,
                  borderLeft: `2px solid ${race.primary}88`,
                  paddingLeft: 12,
                  marginBottom: 20,
                  fontStyle: 'italic',
                }}
              >
                {act.text}
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <NDButton race={race} variant="ghost" size="sm" onClick={onPrev} disabled={!hasPrev}>
                  ← ÖNCEKİ
                </NDButton>
                <div style={{ flex: 1 }} />
                <NDButton race={race} variant="ghost" size="sm" onClick={onClose}>
                  KAPAT
                </NDButton>
                <NDButton race={race} size="sm" onClick={onNext} disabled={!hasNext}>
                  SONRAKİ →
                </NDButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
