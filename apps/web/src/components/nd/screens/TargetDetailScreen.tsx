'use client';

import { useMemo } from 'react';
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
  NDButton,
  Bar,
  useNDRace,
  type NDRace,
  type NDRaceKey,
} from '@/components/handoff';
import { GALAXY_NODES } from './galaxy-data';

interface DefenderUnit {
  name: string;
  tier: number;
  count: number;
}

interface Props {
  nodeId: string;
  forcedRace?: NDRaceKey;
}

function defenderRoster(enemy: NDRace, level: number): DefenderUnit[] {
  return enemy.units.slice(0, 4).map((u, i) => ({
    name: u.n,
    tier: u.t,
    count: Math.max(2, Math.round(level * (1.6 - i * 0.32))),
  }));
}

function totalPower(units: DefenderUnit[]): number {
  return units.reduce((sum, u) => sum + u.count * (40 + u.tier * 18), 0);
}

export function TargetDetailScreen({ nodeId, forcedRace }: Props) {
  const detected = useNDRace();
  const race = forcedRace ? RACES[forcedRace] : detected;
  const enemy = RACES[race.enemyRace];
  const router = useRouter();

  const node = useMemo(
    () => GALAXY_NODES.find((n) => n.id === nodeId) ?? GALAXY_NODES[0],
    [nodeId],
  );

  const defenders = useMemo(() => defenderRoster(enemy, node.level), [enemy, node.level]);
  const defendingPower = useMemo(() => totalPower(defenders), [defenders]);
  const playerPower = 4180;
  const advantage = playerPower - defendingPower;
  const winProbability = Math.max(
    8,
    Math.min(92, 50 + (advantage / Math.max(1, defendingPower)) * 60),
  );

  const projectedOutcome: 'victory' | 'defeat' = winProbability >= 50 ? 'victory' : 'defeat';

  return (
    <div
      data-race={race.key}
      style={{
        minHeight: '100dvh',
        background: ND.bgDeep,
        color: ND.text,
        fontFamily: ND.body,
        paddingBottom: 120,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Backdrop race={race} enemy={enemy} />

      {/* Header */}
      <header
        style={{
          position: 'relative',
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          borderBottom: `1px solid ${ND.border}`,
          background: 'linear-gradient(180deg, rgba(6,8,15,0.92), rgba(6,8,15,0.40))',
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Geri"
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 32,
            height: 32,
            border: `1px solid ${ND.border}`,
            color: ND.textDim,
            fontFamily: ND.display,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)',
          }}
        >
          ‹
        </button>
        <div>
          <Eyebrow>{race.allianceTag} İSTİHBARAT · HEDEF DOSYASI</Eyebrow>
          <H3 style={{ color: enemy.primary, textShadow: `0 0 12px ${enemy.glow}55` }}>
            {node.label}
          </H3>
        </div>
      </header>

      <main
        style={{
          position: 'relative',
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 14,
          maxWidth: 520,
          margin: '0 auto',
        }}
      >
        {/* Enemy faction card */}
        <Panel race={enemy} glow style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Sigil race={enemy} size={72} glow />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Eyebrow color={enemy.primary}>{enemy.allianceTag} · {enemy.short}</Eyebrow>
              <H1 style={{ color: enemy.primary, textShadow: `0 0 14px ${enemy.glow}55` }}>
                {enemy.name.toUpperCase()}
              </H1>
              <Caption style={{ color: ND.textDim }}>{enemy.motto}</Caption>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 10,
              border: `1px solid ${enemy.primary}33`,
              background: `${enemy.primary}10`,
              borderRadius: 4,
            }}
          >
            <Caption style={{ color: ND.text }}>{enemy.storyAct1}</Caption>
          </div>
        </Panel>

        {/* Garrison composition */}
        <Panel style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <H3 style={{ color: ND.text }}>Savunma Birlikleri</H3>
            <Eyebrow>{defenders.length} sınıf</Eyebrow>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {defenders.map((u) => (
              <div
                key={u.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  background: 'rgba(6,8,15,0.55)',
                  border: `1px solid ${ND.border}`,
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${enemy.primary}1c`,
                    border: `1px solid ${enemy.primary}55`,
                    fontFamily: ND.display,
                    fontWeight: 700,
                    color: enemy.primary,
                  }}
                >
                  T{u.tier}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: ND.display, fontSize: 13, color: ND.text }}>{u.name}</div>
                  <div style={{ fontFamily: ND.mono, fontSize: 10, color: ND.textMute, letterSpacing: '0.10em' }}>
                    TIER {u.tier} · BİRİM
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: ND.display,
                    fontSize: 18,
                    fontWeight: 600,
                    color: enemy.primary,
                  }}
                >
                  ×{u.count}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Projected outcome */}
        <Panel race={race} glow={projectedOutcome === 'victory'} style={{ padding: 16 }}>
          <H3 style={{ color: ND.text, marginBottom: 8 }}>Tahmini Sonuç</H3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 10,
            }}
          >
            <PowerStat label="Bizim Güç" value={playerPower} color={race.primary} />
            <PowerStat label="Düşman Güç" value={defendingPower} color={enemy.primary} />
          </div>

          <Bar
            label="ZAFER OLASILIĞI"
            trailing={`%${Math.round(winProbability)}`}
            value={winProbability}
            color={projectedOutcome === 'victory' ? ND.ok : ND.danger}
            height={8}
          />

          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 4,
              background:
                projectedOutcome === 'victory'
                  ? `linear-gradient(90deg, ${ND.ok}1a, transparent)`
                  : `linear-gradient(90deg, ${ND.danger}1a, transparent)`,
              border: `1px solid ${projectedOutcome === 'victory' ? ND.ok : ND.danger}55`,
            }}
          >
            <Eyebrow color={projectedOutcome === 'victory' ? ND.ok : ND.danger}>
              {projectedOutcome === 'victory' ? 'AVANTAJ' : 'RİSK'}
            </Eyebrow>
            <div style={{ fontFamily: ND.display, fontSize: 14, color: ND.text, marginTop: 2 }}>
              {projectedOutcome === 'victory'
                ? `+${advantage.toLocaleString('tr-TR')} güç avantajı`
                : `−${Math.abs(advantage).toLocaleString('tr-TR')} güç dezavantajı`}
            </div>
          </div>
        </Panel>
      </main>

      {/* Sticky action bar */}
      <footer
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          padding: 14,
          background: 'linear-gradient(0deg, rgba(6,8,15,0.96), rgba(6,8,15,0.55))',
          borderTop: `1px solid ${ND.border}`,
          backdropFilter: `blur(${'10px'})`,
        }}
      >
        <div style={{ display: 'flex', gap: 8, maxWidth: 520, margin: '0 auto' }}>
          <NDButton
            race={race}
            variant="primary"
            size="lg"
            full
            onClick={() =>
              router.push(`/battle-prep?target=${node.id}&race=${race.key}&outcome=${projectedOutcome}`)
            }
          >
            SAVAŞA HAZIRLAN
          </NDButton>
          <NDButton race={race} variant="ghost" size="lg" onClick={() => router.push(`/map?race=${race.key}`)}>
            HARİTA
          </NDButton>
        </div>
      </footer>
    </div>
  );
}

function PowerStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        padding: 10,
        border: `1px solid ${color}55`,
        background: `${color}10`,
        borderRadius: 4,
      }}
    >
      <div style={{ fontFamily: ND.mono, fontSize: 10, letterSpacing: '0.18em', color: ND.textMute, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontFamily: ND.display, fontSize: 22, color, fontWeight: 700, marginTop: 2 }}>
        {value.toLocaleString('tr-TR')}
      </div>
    </div>
  );
}

function Backdrop({ race, enemy }: { race: NDRace; enemy: NDRace }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(40% 30% at 80% 20%, ${enemy.primary}35 0%, transparent 65%),
                     radial-gradient(50% 40% at 20% 80%, ${race.primary}15 0%, transparent 65%),
                     ${ND.bgDeep}`,
      }}
    />
  );
}
