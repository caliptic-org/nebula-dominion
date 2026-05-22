'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  AGES_54,
  Caption,
  Chip,
  Code,
  Eyebrow,
  H2,
  H3,
  ND,
  NDButton,
  NebulaBg,
  Panel,
  RaceTierPath,
  Sigil,
  type NDRace,
} from '@/components/handoff';

interface ScrTierUpProps {
  race: NDRace;
  currentLevel: number;
  xpPercent?: number;
  xpLabel?: string;
  tierName?: string;
  nextTierName?: string;
  nextTierDescription?: string;
  isMaxLevel?: boolean;
  canLevelUp?: boolean;
  onLevelUp?: () => void;
  onRefresh?: () => void;
  levelNames?: Record<number, string>;
  notice?: string;
  noticeKind?: 'info' | 'warn';
}

const AGE_PEAK_AT = 0.32;

export function ScrTierUp({
  race,
  currentLevel,
  xpPercent = 0,
  xpLabel,
  tierName,
  nextTierName,
  nextTierDescription,
  isMaxLevel = false,
  canLevelUp = false,
  onLevelUp,
  onRefresh,
  levelNames,
  notice,
  noticeKind = 'info',
}: ScrTierUpProps) {
  const currentAge = useMemo(() => {
    const found = AGES_54.find((a) => currentLevel >= a.range[0] && currentLevel <= a.range[1]);
    return found?.id ?? 1;
  }, [currentLevel]);
  const ageMeta = AGES_54.find((a) => a.id === currentAge) ?? AGES_54[0];

  return (
    <div
      data-race={race.key}
      data-testid="scr-tier-up"
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: ND.bg,
        color: ND.text,
        fontFamily: ND.body,
      }}
    >
      <NebulaBg race={race} intensity={1} dim={0.85} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 80% 50% at 50% ${AGE_PEAK_AT * 100}%, ${race.glow}33 0%, transparent 65%)`,
          opacity: 0.85,
        }}
        aria-hidden
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header race={race} currentAge={currentAge} currentLevel={currentLevel} />

        <main style={{ padding: '24px 16px 64px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
          {/* Cinematic hero: sigil reveal + race motto */}
          <SigilReveal race={race} />

          {/* Hero stats panel */}
          <Panel race={race} hi glow style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <Eyebrow color={race.primary}>{race.name.toUpperCase()} · TIER YOLU</Eyebrow>
                <H2 style={{ color: race.primary, marginTop: 4, textShadow: `0 0 18px ${race.glow}` }}>
                  {tierName ?? race.title}
                </H2>
                <Caption style={{ marginTop: 4 }}>
                  ÇAĞ {currentAge} · {ageMeta.label} · LV {ageMeta.range[0]}–{ageMeta.range[1]}
                </Caption>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Eyebrow>SEVİYE</Eyebrow>
                <div
                  style={{
                    fontFamily: ND.display,
                    fontSize: 44,
                    fontWeight: 800,
                    color: race.primary,
                    lineHeight: 1,
                    textShadow: `0 0 22px ${race.glow}`,
                  }}
                >
                  {currentLevel}
                  <span style={{ fontSize: 18, color: ND.textDim, fontWeight: 500 }}> / 54</span>
                </div>
              </div>
            </div>

            {!isMaxLevel && (
              <div style={{ marginTop: 18 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                    fontFamily: ND.mono,
                    fontSize: 10,
                    color: ND.textDim,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  <span>{nextTierName ? `SONRAKİ · ${nextTierName.toUpperCase()}` : 'XP İLERLEMESİ'}</span>
                  {xpLabel && <span style={{ color: race.primary }}>{xpLabel}</span>}
                </div>
                <div
                  style={{
                    height: 8,
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
                      width: `${Math.max(0, Math.min(100, xpPercent))}%`,
                      background: `linear-gradient(90deg, ${race.primary}88, ${race.primary})`,
                      boxShadow: `0 0 12px ${race.glow}`,
                      transition: 'width 600ms cubic-bezier(0.32, 0.72, 0, 1)',
                    }}
                  />
                </div>
                {nextTierDescription && (
                  <Caption style={{ marginTop: 6 }}>
                    {nextTierDescription}
                  </Caption>
                )}
              </div>
            )}

            {isMaxLevel && (
              <Caption style={{ marginTop: 14, color: race.primary, fontStyle: 'italic' }}>
                ⚜ Maksimum seviyeye ulaştın. {race.title} unvanı kazanıldı.
              </Caption>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {!isMaxLevel && onLevelUp && (
                <NDButton
                  race={race}
                  size="md"
                  onClick={onLevelUp}
                  disabled={!canLevelUp}
                >
                  {canLevelUp ? 'SEVİYE YÜKSELT' : 'XP YETERSİZ'}
                </NDButton>
              )}
              {onRefresh && (
                <NDButton race={race} variant="ghost" size="md" onClick={onRefresh}>
                  YENİLE
                </NDButton>
              )}
            </div>
          </Panel>

          {notice && (
            <Panel style={{ padding: 14, marginBottom: 18 }}>
              <Eyebrow color={noticeKind === 'warn' ? ND.warn : race.primary}>
                {noticeKind === 'warn' ? 'UYARI' : 'BİLGİ'}
              </Eyebrow>
              <Caption style={{ marginTop: 4 }}>{notice}</Caption>
            </Panel>
          )}

          {/* Animated age ladder — race-tinted with cascading reveal */}
          <AgeLadder race={race} currentAge={currentAge} currentLevel={currentLevel} />

          {/* 54-level serpentine path */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <H3 style={{ color: ND.text }}>54 SEVİYE · SERPENTİN YOL</H3>
              <Code>{currentLevel} / 54</Code>
            </div>
            <Panel style={{ padding: 12 }}>
              <RaceTierPath race={race} currentLevel={currentLevel} levelNames={levelNames} />
            </Panel>
          </div>
        </main>
      </div>
    </div>
  );
}

function Header({ race, currentAge, currentLevel }: { race: NDRace; currentAge: number; currentLevel: number }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        <Chip color={race.primary}>TIER YÜKSELİŞ</Chip>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Sigil race={race} size={20} />
        <span
          style={{
            fontFamily: ND.display,
            fontSize: 11,
            color: ND.textDim,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          ÇAĞ {currentAge} · LV {currentLevel} / 54
        </span>
      </div>
    </header>
  );
}

function SigilReveal({ race }: { race: NDRace }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  const wrapper: CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    padding: '32px 0 24px',
    marginBottom: 18,
    textAlign: 'center',
  };

  return (
    <div style={wrapper} aria-hidden={false}>
      <div
        data-anim-target
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.92)',
          filter: mounted ? `drop-shadow(0 0 28px ${race.glow})` : 'none',
          transition:
            'opacity 700ms cubic-bezier(0.32,0.72,0,1), transform 800ms cubic-bezier(0.32,0.72,0,1), filter 900ms cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <Sigil race={race} size={96} glow />
      </div>

      <div
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 700ms cubic-bezier(0.32,0.72,0,1) 220ms, transform 700ms cubic-bezier(0.32,0.72,0,1) 220ms',
        }}
      >
        <Eyebrow color={race.primary} style={{ marginBottom: 4 }}>
          {race.allianceTag} · {race.allianceName.toUpperCase()}
        </Eyebrow>
        <H2 style={{ color: race.primary, textShadow: `0 0 20px ${race.glow}`, fontSize: 24, marginBottom: 6 }}>
          {race.name.toUpperCase()}
        </H2>
        <Caption style={{ color: ND.textDim, letterSpacing: '0.08em' }}>{race.motto}</Caption>
      </div>
    </div>
  );
}

function AgeLadder({
  race,
  currentAge,
  currentLevel,
}: {
  race: NDRace;
  currentAge: number;
  currentLevel: number;
}) {
  const [reveal, setReveal] = useState(0);

  useEffect(() => {
    setReveal(0);
    const id = window.setInterval(() => {
      setReveal((r) => {
        if (r >= AGES_54.length) {
          window.clearInterval(id);
          return r;
        }
        return r + 1;
      });
    }, 110);
    return () => window.clearInterval(id);
  }, [race.key]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <H3 style={{ color: ND.text }}>ÇAĞ MERDİVENİ</H3>
        <Code>{currentAge} / 6 AKTİF</Code>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 10,
        }}
      >
        {AGES_54.map((age, i) => {
          const past = currentAge > age.id;
          const isCurrent = currentAge === age.id;
          const revealed = i < reveal;
          return (
            <Panel
              key={age.id}
              race={isCurrent ? race : undefined}
              glow={isCurrent}
              style={{
                padding: 12,
                opacity: revealed ? (past || isCurrent ? 1 : 0.55) : 0,
                transform: revealed ? 'translateY(0)' : 'translateY(8px)',
                transition: `opacity 500ms cubic-bezier(0.32,0.72,0,1) ${i * 50}ms, transform 500ms cubic-bezier(0.32,0.72,0,1) ${i * 50}ms`,
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Eyebrow color={age.color}>ÇAĞ {age.id}</Eyebrow>
                {isCurrent && <Chip color={race.primary}>AKTİF</Chip>}
                {past && <Chip color={ND.ok}>BİTTİ</Chip>}
                {!isCurrent && !past && <Chip>KİLİT</Chip>}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontFamily: ND.display,
                  fontSize: 13,
                  color: ND.text,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {age.label}
              </div>
              <Caption style={{ marginTop: 6 }}>
                LV {age.range[0]}–{age.range[1]}
                {isCurrent ? ` · şu an LV ${currentLevel}` : ''}
              </Caption>
              {isCurrent && (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: -1,
                    height: 2,
                    background: `linear-gradient(90deg, transparent, ${race.primary}, transparent)`,
                    boxShadow: `0 0 10px ${race.glow}`,
                  }}
                />
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
