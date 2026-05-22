'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ND,
  RACES,
  Sigil,
  Eyebrow,
  H1,
  H2,
  H3,
  Caption,
  Panel,
  ResPill,
  NDButton,
  Bar,
  useNDRace,
  type NDRace,
  type NDRaceKey,
} from '@/components/handoff';

export type BattleOutcome = 'victory' | 'defeat';

export interface BattleResultStats {
  unitsKilled: number;
  unitsLost: number;
  damageDealt: number;
  damageTaken: number;
  durationSeconds: number;
  score: number;
}

export interface BattleResultRewards {
  resourceA: number;
  resourceB: number;
  crystal: number;
  xpGained: number;
  xpBefore: number;
  xpAfter: number;
  xpMax: number;
  level: number;
  levelUp: boolean;
  newLevel?: number;
}

export interface BattleResultMVP {
  name: string;
  tier: number;
  kills: number;
  damageDealt: number;
}

export interface BattleResultData {
  outcome: BattleOutcome;
  stats: BattleResultStats;
  rewards: BattleResultRewards;
  mvp?: BattleResultMVP;
}

interface Props {
  data: BattleResultData;
  forcedRace?: NDRaceKey;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function duration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function BattleResultScreen({ data, forcedRace }: Props) {
  const detected = useNDRace();
  const race = forcedRace ? RACES[forcedRace] : detected;
  const enemy = RACES[race.enemyRace];
  const router = useRouter();

  const isVictory = data.outcome === 'victory';
  const outcomeColor = isVictory ? race.primary : ND.danger;

  // Animate XP bar after mount.
  const [xpFill, setXpFill] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const pct = (data.rewards.xpAfter / data.rewards.xpMax) * 100;
      setXpFill(pct);
    }, 80);
    return () => window.clearTimeout(t);
  }, [data.rewards.xpAfter, data.rewards.xpMax]);

  const xpBeforePct = (data.rewards.xpBefore / data.rewards.xpMax) * 100;

  return (
    <div
      data-race={race.key}
      style={{
        minHeight: '100dvh',
        background: ND.bgDeep,
        color: ND.text,
        fontFamily: ND.body,
        position: 'relative',
        overflow: 'hidden',
        paddingBottom: 120,
      }}
    >
      <Backdrop race={race} outcome={data.outcome} />

      <main
        style={{
          position: 'relative',
          zIndex: 5,
          maxWidth: 520,
          margin: '0 auto',
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Hero block */}
        <Panel race={race} glow={isVictory} style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1 / 1',
              background: ND.bgDeep,
            }}
          >
            <img
              src={`/assets/battle-result/${race.key}-${data.outcome}.png`}
              alt={`${race.name} — ${isVictory ? 'Zafer' : 'Yenilgi'}`}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(3,5,11,0.55) 70%, rgba(3,5,11,0.95) 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 14,
                right: 14,
                bottom: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sigil race={race} size={24} glow />
                <Eyebrow color={outcomeColor}>
                  {race.short} · {duration(data.stats.durationSeconds)}
                </Eyebrow>
              </div>
              <H1
                style={{
                  color: outcomeColor,
                  fontSize: 32,
                  textShadow: `0 0 24px ${outcomeColor}77`,
                }}
              >
                {isVictory ? 'ZAFERİMİZ' : 'YENİLGİ'}
              </H1>
              <Caption style={{ color: ND.textDim }}>
                {isVictory
                  ? `${enemy.allianceName} filosu dağıldı.`
                  : 'Güçlenin ve geri dönün.'}
              </Caption>
            </div>
          </div>
        </Panel>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
          <StatTile label="Yok edilen" value={data.stats.unitsKilled} accent={ND.ok} />
          <StatTile label="Kaybedilen" value={data.stats.unitsLost} accent={ND.danger} />
          <StatTile label="Verilen hasar" value={fmt(data.stats.damageDealt)} accent={race.primary} />
          <StatTile label="Alınan hasar" value={fmt(data.stats.damageTaken)} accent={enemy.primary} />
        </div>

        {/* Score */}
        <Panel race={race} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: `${race.primary}1c`,
              border: `1px solid ${race.primary}55`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              clipPath: 'polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)',
              color: race.primary,
              fontFamily: ND.display,
              fontWeight: 700,
            }}
          >
            ★
          </div>
          <div style={{ flex: 1 }}>
            <Eyebrow>Puan</Eyebrow>
            <div
              style={{
                fontFamily: ND.display,
                fontSize: 22,
                fontWeight: 700,
                color: race.primary,
                letterSpacing: '0.04em',
              }}
            >
              {data.stats.score.toLocaleString('tr-TR')}
            </div>
          </div>
        </Panel>

        {/* Resources earned */}
        <Panel style={{ padding: 14 }}>
          <H3 style={{ color: ND.text, marginBottom: 8 }}>Kaynak Kazanımı</H3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <ResPill kind={race.resourceA.icon} value={`+${fmt(data.rewards.resourceA)}`} accent={race.primary} />
            <ResPill kind={race.resourceB.icon} value={`+${fmt(data.rewards.resourceB)}`} accent={race.primary} />
            <ResPill kind="crystal" value={`+${data.rewards.crystal}`} accent="oklch(0.82 0.16 80)" />
          </div>
        </Panel>

        {/* MVP */}
        {data.mvp && (
          <Panel race={race} glow={isVictory} style={{ padding: 14 }}>
            <H3 style={{ color: ND.text, marginBottom: 6 }}>
              {isVictory ? 'MVP Birim' : 'En İyi Performans'}
            </H3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: race.primary,
                  color: '#0A0E1A',
                  fontFamily: ND.display,
                  fontWeight: 700,
                  fontSize: 14,
                  clipPath: 'polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)',
                }}
              >
                T{data.mvp.tier}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: ND.display, fontSize: 14, color: race.primary }}>
                  {data.mvp.name}
                </div>
                <div
                  style={{
                    fontFamily: ND.mono,
                    fontSize: 11,
                    color: ND.textDim,
                    letterSpacing: '0.10em',
                  }}
                >
                  {data.mvp.kills} öldürme · {fmt(data.mvp.damageDealt)} hasar
                </div>
              </div>
            </div>
          </Panel>
        )}

        {/* XP */}
        <Panel style={{ padding: 14 }}>
          <H3 style={{ color: ND.text, marginBottom: 6 }}>Deneyim</H3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div
              style={{
                width: 38,
                height: 38,
                background: race.primary,
                color: '#0A0E1A',
                fontFamily: ND.display,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                clipPath: 'polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)',
              }}
            >
              {data.rewards.levelUp ? data.rewards.newLevel ?? data.rewards.level + 1 : data.rewards.level}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: ND.display, fontSize: 16, color: ND.text }}>
                +{fmt(data.rewards.xpGained)} XP
              </div>
              <Eyebrow>Bu savaştan</Eyebrow>
            </div>
            {data.rewards.levelUp && (
              <span
                role="status"
                style={{
                  fontFamily: ND.mono,
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  color: ND.ok,
                  border: `1px solid ${ND.ok}66`,
                  padding: '4px 8px',
                  borderRadius: 999,
                }}
              >
                LV+
              </span>
            )}
          </div>
          <div
            style={{
              position: 'relative',
              height: 8,
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${ND.border}`,
              overflow: 'hidden',
              borderRadius: 2,
            }}
            role="progressbar"
            aria-valuenow={data.rewards.xpAfter}
            aria-valuemax={data.rewards.xpMax}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: `${xpFill}%`,
                background: `linear-gradient(90deg, ${race.primary}88, ${race.primary})`,
                transition: 'width 800ms cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: `${xpBeforePct}%`,
                width: 1,
                height: '100%',
                background: ND.textMute,
                opacity: 0.6,
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: ND.mono,
              fontSize: 10,
              color: ND.textDim,
              marginTop: 4,
              letterSpacing: '0.08em',
            }}
          >
            <span>{fmt(data.rewards.xpAfter)}</span>
            <span>{fmt(data.rewards.xpMax)} XP</span>
          </div>
        </Panel>
      </main>

      <footer
        style={{
          position: 'fixed',
          insetInline: 0,
          bottom: 0,
          zIndex: 20,
          padding: 12,
          background: 'linear-gradient(0deg, rgba(6,8,15,0.96), rgba(6,8,15,0.55))',
          borderTop: `1px solid ${ND.border}`,
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', gap: 8, maxWidth: 520, margin: '0 auto' }}>
          <NDButton race={race} variant="primary" size="lg" full onClick={() => router.push(`/battle?race=${race.key}`)}>
            TEKRAR ⚔
          </NDButton>
          <NDButton race={race} variant="ghost" size="lg" onClick={() => router.push('/')}>
            ANA ÜS
          </NDButton>
        </div>
      </footer>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div
      style={{
        padding: 10,
        background: 'rgba(6,8,15,0.55)',
        border: `1px solid ${ND.border}`,
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <span
        style={{
          fontFamily: ND.mono,
          fontSize: 9,
          color: ND.textMute,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: ND.display,
          fontSize: 18,
          fontWeight: 600,
          color: accent,
          letterSpacing: '0.04em',
        }}
      >
        {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
      </span>
    </div>
  );
}

function Backdrop({ race, outcome }: { race: NDRace; outcome: BattleOutcome }) {
  const c1 = outcome === 'victory' ? race.primary : ND.danger;
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(60% 40% at 50% 0%, ${c1}22 0%, transparent 60%),
                     radial-gradient(80% 80% at 50% 100%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 100%),
                     ${ND.bgDeep}`,
      }}
    />
  );
}
