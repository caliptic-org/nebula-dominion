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
  /** True when player has hit max level of current age and another age
   *  exists. Drives the "Çağ N'ye Geç" CTA. */
  canAdvanceAge?: boolean;
  /** Click handler — calls game-server's POST /progression/:id/advance-age.
   *  Backend enforces command_center Lv >= ageMax; on failure the rejection
   *  message is surfaced through `advanceError`. */
  onAdvanceAge?: () => Promise<void> | void;
  advancing?: boolean;
  advanceError?: string | null;
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
  canAdvanceAge = false,
  onAdvanceAge,
  advancing = false,
  advanceError = null,
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
        height: '100dvh',
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
              {/* ÇAĞ GEÇ button takes priority over SEVİYE YÜKSELT when both
                  are possible — at max-level-of-age, level-up is a no-op
                  (api's /tier/level-up bumps a vestigial mirror table) while
                  advance-age is the real gameplay transition with new
                  unlocks + era catch-up package. The button surface stays
                  consistent (race-coloured solid) so the player doesn't
                  have to learn two affordances. */}
              {canAdvanceAge && onAdvanceAge && (
                <NDButton
                  race={race}
                  size="md"
                  onClick={() => {
                    void onAdvanceAge();
                  }}
                  disabled={advancing}
                >
                  {advancing ? 'ÇAĞ GEÇİLİYOR…' : `ÇAĞ ${currentLevel >= 9 ? Math.floor((currentLevel - 1) / 9) + 2 : 2}'YE GEÇ`}
                </NDButton>
              )}
              {!isMaxLevel && onLevelUp && !canAdvanceAge && (
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
            {advanceError && (
              <Caption style={{ marginTop: 10, color: ND.warn }}>
                ⚠ {advanceError}
              </Caption>
            )}
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
          <AgeLadder
            race={race}
            currentAge={currentAge}
            currentLevel={currentLevel}
            xpPercent={xpPercent}
            xpLabel={xpLabel}
          />

          {/* XP sources panel — "hangi aksiyon ne kadar XP veriyor" — pulled
             from game-server XP_BASE_AMOUNTS verbatim so the table never
             drifts from the actual reward economy. Hidden when player is
             already at max level since there's nothing left to earn. */}
          {!isMaxLevel && <XpSourcesPanel race={race} currentAge={currentAge} />}

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
  xpPercent = 0,
  xpLabel,
}: {
  race: NDRace;
  currentAge: number;
  currentLevel: number;
  xpPercent?: number;
  xpLabel?: string;
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
              {/* XP progress bar — only the current age card shows actual XP
                  toward the next level. Replaces the old decorative 2px
                  gradient stripe at bottom which looked like an empty XP
                  bar to players and caused "neden boş görünüyor" reports.
                  Past ages show a full bar (chip already says BİTTİ);
                  locked ages show no bar (KİLİT chip is enough). */}
              {isCurrent && (
                <div style={{ marginTop: 10 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                      fontFamily: ND.mono,
                      fontSize: 9,
                      color: ND.textDim,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <span>Sonraki Lv</span>
                    {xpLabel && <span style={{ color: race.primary }}>{xpLabel}</span>}
                  </div>
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
                        width: `${Math.max(0, Math.min(100, xpPercent))}%`,
                        background: `linear-gradient(90deg, ${race.primary}88, ${race.primary})`,
                        boxShadow: `0 0 8px ${race.glow}`,
                        transition: 'width 600ms cubic-bezier(0.32, 0.72, 0, 1)',
                      }}
                    />
                  </div>
                </div>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

/**
 * XP source table — pulled from game-server XP_BASE_AMOUNTS in
 * apps/game-server/src/progression/config/level-config.ts. Lists every action
 * the player can take + the base XP it grants, with a note when a source is
 * still locked behind a higher age (PvP, guild activity start at Çağ 3).
 *
 * NOT a backend fetch on purpose — these are economy constants that change
 * via the progression config in source code, not at runtime. Keeping them
 * in a static table here means the modal is instant and works offline.
 */
function XpSourcesPanel({ race, currentAge }: { race: NDRace; currentAge: number }) {
  const sources: { key: string; label: string; xp: number; minAge?: number; note?: string }[] = [
    { key: 'achievement',   label: 'Başarım kazan',         xp: 500 },
    { key: 'event',         label: 'Etkinlik tamamla',      xp: 300 },
    { key: 'daily_mission', label: 'Günlük görev',          xp: 200 },
    { key: 'pvp_win',       label: 'PvP zaferi',            xp: 200, minAge: 3 },
    { key: 'pve_win',       label: 'PvE zaferi',            xp: 150 },
    { key: 'guild_activity',label: 'Lonca aktivitesi',      xp: 100, minAge: 3 },
    { key: 'construction',  label: 'Bina inşa et / yükselt',xp: 80 },
    { key: 'pvp_loss',      label: 'PvP yenilgisi',         xp: 50,  minAge: 3 },
    { key: 'pve_loss',      label: 'PvE yenilgisi',         xp: 30 },
  ];
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <H3 style={{ color: ND.text }}>XP KAYNAKLARI</H3>
        <Code>BİR AKSİYON</Code>
      </div>
      <Panel style={{ padding: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sources.map((s) => {
            const locked = s.minAge !== undefined && currentAge < s.minAge;
            return (
              <div
                key={s.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  padding: '6px 8px',
                  background: locked ? 'rgba(255,80,80,0.04)' : 'rgba(255,255,255,0.04)',
                  borderLeft: `3px solid ${locked ? '#ff7777' : race.primary}`,
                  borderRadius: 4,
                  opacity: locked ? 0.55 : 1,
                }}
              >
                <span style={{ fontFamily: ND.display, fontSize: 12, color: ND.text }}>
                  {locked ? '🔒 ' : ''}{s.label}
                  {locked && s.minAge ? (
                    <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 6 }}>Çağ {s.minAge}+</span>
                  ) : null}
                </span>
                <span
                  style={{
                    fontFamily: ND.mono,
                    fontSize: 12,
                    color: race.primary,
                    fontWeight: 600,
                  }}
                >
                  +{s.xp} XP
                </span>
              </div>
            );
          })}
        </div>
        <Caption style={{ marginTop: 8, fontSize: 10 }}>
          Komutan + tier bonusları taban değeri çarpar. Lv 3 için 900 XP, Lv 10
          (Çağ 2) için 10.000 XP gerek — kademe büyüdükçe aksiyon başına
          oranı korunur.
        </Caption>
      </Panel>
    </div>
  );
}
