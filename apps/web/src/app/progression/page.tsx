'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTierProgress } from '@/hooks/useTierProgress';
import { useNDRace } from '@/components/handoff/useNDRace';
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
} from '@/components/handoff';

export default function ProgressionPage() {
  const race = useNDRace();
  const { progress, requirements, levels, loading, error, xpPercent, levelUp } =
    useTierProgress();

  const levelNames = useMemo(() => {
    const map: Record<number, string> = {};
    for (const l of levels) map[l.level] = l.name;
    return map;
  }, [levels]);

  const currentLevel = progress?.currentLevel ?? 1;
  const currentAge = progress?.currentAge ?? 1;
  const ageMeta = AGES_54.find((a) => a.id === currentAge) ?? AGES_54[0];
  const tierName = progress?.raceSpecificTierName ?? progress?.currentTierName ?? 'Tohum';
  const nextDef = requirements?.nextTier;
  const canLevelUp =
    !!progress &&
    !!requirements?.required &&
    BigInt(progress.xp) >= BigInt(requirements.required.xp);

  return (
    <div
      data-race={race.key}
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: ND.bg,
        color: ND.text,
        fontFamily: ND.body,
      }}
    >
      <NebulaBg race={race} intensity={0.9} dim={0.7} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'rgba(8,10,16,0.92)',
            borderBottom: `1px solid ${ND.border}`,
            backdropFilter: 'blur(20px)',
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
            <Chip color={race.primary}>İLERLEME</Chip>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sigil race={race} size={20} />
            <span style={{ fontFamily: ND.display, fontSize: 11, color: ND.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              ÇAĞ {currentAge} · LV {currentLevel} / 54
            </span>
          </div>
        </header>

        <main style={{ padding: '20px 16px 64px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
          {/* Headline panel */}
          <Panel race={race} hi glow style={{ padding: 18, marginBottom: 18 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <Eyebrow color={race.primary}>{race.name.toUpperCase()} · TIER YOLU</Eyebrow>
                <H2 style={{ color: race.primary, marginTop: 4, textShadow: `0 0 18px ${race.glow}` }}>
                  {tierName}
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
                    textShadow: `0 0 20px ${race.glow}`,
                  }}
                >
                  {currentLevel}
                  <span style={{ fontSize: 18, color: ND.textDim, fontWeight: 500 }}> / 54</span>
                </div>
              </div>
            </div>

            {/* XP bar to next level */}
            {progress && !progress.isMaxLevel && (
              <div style={{ marginTop: 16 }}>
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
                  <span>{nextDef ? `SONRAKİ · ${nextDef.name.toUpperCase()}` : 'XP'}</span>
                  <span style={{ color: race.primary }}>
                    {progress.xp} / {progress.xpToNextLevel}
                  </span>
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
                      width: `${xpPercent}%`,
                      background: `linear-gradient(90deg, ${race.primary}88, ${race.primary})`,
                      boxShadow: `0 0 10px ${race.glow}`,
                      transition: 'width 600ms cubic-bezier(0.32, 0.72, 0, 1)',
                    }}
                  />
                </div>
                {nextDef && (
                  <Caption style={{ marginTop: 6 }}>
                    <Code>{nextDef.durationLabel}</Code>
                    {' · '}
                    {nextDef.description}
                  </Caption>
                )}
              </div>
            )}

            {progress?.isMaxLevel && (
              <Caption style={{ marginTop: 12, color: race.primary }}>
                ⚜ Maksimum seviyeye ulaştın. {race.title} unvanı alındı.
              </Caption>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <NDButton
                race={race}
                size="md"
                onClick={() => void levelUp()}
                disabled={!canLevelUp}
              >
                {canLevelUp ? 'SEVİYE YÜKSELT' : 'XP YETERSİZ'}
              </NDButton>
              <NDButton race={race} variant="ghost" size="md" onClick={() => location.reload()}>
                YENİLE
              </NDButton>
            </div>
          </Panel>

          {/* Loading / error / unauthenticated states */}
          {loading && !progress && (
            <Panel style={{ padding: 16, marginBottom: 18 }}>
              <Caption>Tier verisi yükleniyor...</Caption>
            </Panel>
          )}
          {error && !progress && (
            <Panel style={{ padding: 16, marginBottom: 18 }}>
              <Eyebrow color={ND.warn}>UYARI</Eyebrow>
              <Caption style={{ marginTop: 4 }}>{error}</Caption>
              <Caption style={{ marginTop: 4 }}>
                Demo yolu gösteriliyor — gerçek ilerleme için giriş yapın.
              </Caption>
            </Panel>
          )}

          {/* Serpentine path */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <H3 style={{ color: ND.text }}>54 SEVİYE · 6 ÇAĞ</H3>
              <Code>SERPENTİN YOL</Code>
            </div>
            <Panel style={{ padding: 12 }}>
              <RaceTierPath race={race} currentLevel={currentLevel} levelNames={levelNames} />
            </Panel>
          </div>

          {/* Age grid */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <H3 style={{ color: ND.text }}>ÇAĞLAR</H3>
              <Code>{currentAge} / 6 AKTİF</Code>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 10,
              }}
            >
              {AGES_54.map((age) => {
                const past = currentAge > age.id;
                const isCurrent = currentAge === age.id;
                return (
                  <Panel
                    key={age.id}
                    race={isCurrent ? race : undefined}
                    glow={isCurrent}
                    style={{ padding: 12, opacity: past || isCurrent ? 1 : 0.55 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Eyebrow color={age.color}>ÇAĞ {age.id}</Eyebrow>
                      {isCurrent && <Chip color={race.primary}>AKTİF</Chip>}
                      {past && <Chip color={ND.ok}>BİTTİ</Chip>}
                      {!isCurrent && !past && <Chip>KİLİT</Chip>}
                    </div>
                    <div style={{ marginTop: 4, fontFamily: ND.display, fontSize: 13, color: ND.text, letterSpacing: '0.04em' }}>
                      {age.label}
                    </div>
                    <Caption style={{ marginTop: 6 }}>
                      LV {age.range[0]}–{age.range[1]}
                      {isCurrent ? ` · şu an LV ${currentLevel}` : ''}
                    </Caption>
                  </Panel>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
