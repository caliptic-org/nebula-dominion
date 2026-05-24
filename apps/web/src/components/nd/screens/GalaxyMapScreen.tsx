'use client';

import { useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  ND,
  RACES,
  Sigil,
  Eyebrow,
  H2,
  H3,
  Caption,
  Panel,
  ResPill,
  NDButton,
  toast,
  useNDRace,
  type NDRace,
  type NDRaceKey,
} from '@/components/handoff';
import { formatResource, useGameResources } from '@/hooks/useGameResources';
import {
  GALAXY_EDGES,
  GALAXY_NODES,
  type GalaxyNode,
  type NodeOwner,
} from './galaxy-data';

const NODE_KIND_LABEL: Record<GalaxyNode['kind'], string> = {
  capital: 'BAŞKENT',
  colony: 'KOLONİ',
  mine: 'KAYNAK',
  relay: 'RÖLE',
};

function ownerColor(owner: NodeOwner, race: NDRace, enemy: NDRace): string {
  if (owner === 'player') return race.primary;
  if (owner === 'enemy') return enemy.primary;
  if (owner === 'contested') return ND.warn;
  return ND.textMute;
}

function ownerGlow(owner: NodeOwner, race: NDRace, enemy: NDRace): string {
  if (owner === 'player') return race.glow;
  if (owner === 'enemy') return enemy.glow;
  if (owner === 'contested') return 'oklch(0.85 0.18 80)';
  return 'oklch(0.65 0.02 240)';
}

function nodeShape(kind: GalaxyNode['kind'], color: string) {
  if (kind === 'capital') {
    return (
      <g>
        <circle r={11} fill="rgba(8,10,16,0.85)" stroke={color} strokeWidth={1.8} />
        <polygon
          points="0,-6 5,3 -5,3"
          fill={color}
          opacity={0.85}
        />
        <circle r={2.4} fill={color} />
      </g>
    );
  }
  if (kind === 'colony') {
    return (
      <g>
        <circle r={8} fill="rgba(8,10,16,0.80)" stroke={color} strokeWidth={1.4} />
        <circle r={3} fill={color} />
      </g>
    );
  }
  if (kind === 'mine') {
    return (
      <g>
        <polygon points="0,-7 6,-2 4,6 -4,6 -6,-2" fill="rgba(8,10,16,0.80)" stroke={color} strokeWidth={1.3} />
        <polygon points="0,-3 3,-1 2,3 -2,3 -3,-1" fill={color} opacity={0.7} />
      </g>
    );
  }
  // relay
  return (
    <g>
      <polygon points="0,-7 7,0 0,7 -7,0" fill="rgba(8,10,16,0.80)" stroke={color} strokeWidth={1.3} />
      <circle r={2.2} fill={color} />
    </g>
  );
}

interface SelectionInfo {
  node: GalaxyNode;
  ownerColor: string;
  isEnemy: boolean;
}

interface Props {
  race?: NDRaceKey;
  /** Optional live player base summary from `/api/v1/map/state`. When passed,
   * the top-right HUD shows real level/power numbers instead of decorative
   * placeholders. */
  liveBase?: {
    name: string;
    level: number;
    power: number;
  };
}

export function GalaxyMapScreen({ race: forcedRace, liveBase }: Props) {
  const detectedRace = useNDRace();
  const race = forcedRace ? RACES[forcedRace] : detectedRace;
  const enemy = RACES[race.enemyRace];

  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>('co2');

  // Live wallet pipe — keeps the top resource pills accurate as the player
  // fights / builds in other tabs. Falls back to mock when unauthenticated.
  const { data: liveResources } = useGameResources();

  const selected = GALAXY_NODES.find((n) => n.id === selectedId) ?? null;
  const selectionInfo: SelectionInfo | null = selected
    ? {
        node: selected,
        ownerColor: ownerColor(selected.owner, race, enemy),
        isEnemy: selected.owner === 'enemy' || selected.owner === 'contested',
      }
    : null;

  const handleAttack = (node: GalaxyNode) => {
    router.push(`/target/${node.id}?race=${race.key}`);
  };

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
      }}
    >
      <BackgroundNebula race={race} />

      {/* Top HUD */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'linear-gradient(180deg, rgba(6,8,15,0.95), rgba(6,8,15,0.55))',
          borderBottom: `1px solid ${ND.border}`,
        }}
      >
        <a
          href="/base"
          aria-label="Geri"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            border: `1px solid ${ND.border}`,
            color: ND.textDim,
            fontFamily: ND.display,
            textDecoration: 'none',
            clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)',
          }}
        >
          ‹
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sigil race={race} size={26} glow />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Eyebrow>Screen 11 · Galaktik Harita</Eyebrow>
            <H3 style={{ color: race.primary }}>SEKTÖR-9 / KIYI YOLU</H3>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {liveBase && (
          /* Live player-base pill — real level + power from /api/v1/map/state.
           * Sits to the left of the resource pills as a confirmation that the
           * backend reflection of the map is reachable. */
          <div
            style={{
              padding: '4px 10px',
              border: `1px solid ${race.primary}77`,
              background: 'rgba(6,8,15,0.8)',
              fontFamily: ND.mono,
              fontSize: 10,
              letterSpacing: '0.10em',
              color: race.primary,
              textTransform: 'uppercase',
              clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
            }}
            aria-label="Üs durumu (canlı)"
          >
            ◆ {liveBase.name} · Sv.{liveBase.level} · {liveBase.power.toLocaleString('tr-TR')} GÜÇ
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <ResPill
            kind={race.resourceA.icon}
            value={liveResources ? formatResource(liveResources.mineral) : '12,480'}
            accent={race.primary}
          />
          <ResPill
            kind={race.resourceB.icon}
            value={liveResources ? formatResource(liveResources.gas) : '3,210'}
            accent={race.primary}
          />
        </div>
      </header>

      {/* Map viewport */}
      <main
        style={{
          position: 'relative',
          zIndex: 5,
          padding: 12,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4 / 3',
            background: 'rgba(4,6,12,0.7)',
            border: `1px solid ${ND.border}`,
            overflow: 'hidden',
            borderRadius: 6,
          }}
        >
          <GridBackdrop race={race} />
          <svg
            viewBox="0 0 100 75"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            role="img"
            aria-label="Galaktik harita: yıldız sistemi düğüm grafı"
          >
            {/* Edges */}
            {GALAXY_EDGES.map((e, i) => {
              const a = GALAXY_NODES.find((n) => n.id === e.from);
              const b = GALAXY_NODES.find((n) => n.id === e.to);
              if (!a || !b) return null;
              const aOwner = a.owner;
              const bOwner = b.owner;
              const isPlayerLink = aOwner === 'player' && bOwner === 'player';
              const isEnemyLink = aOwner === 'enemy' && bOwner === 'enemy';
              const color = isPlayerLink
                ? race.primary
                : isEnemyLink
                  ? enemy.primary
                  : ND.borderHi;
              const opacity = isPlayerLink || isEnemyLink ? 0.55 : 0.32;
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y * 0.75}
                  x2={b.x}
                  y2={b.y * 0.75}
                  stroke={color}
                  strokeWidth={0.18}
                  strokeDasharray={isPlayerLink || isEnemyLink ? undefined : '0.6 0.4'}
                  opacity={opacity}
                />
              );
            })}
            {/* Nodes */}
            {GALAXY_NODES.map((n) => {
              const c = ownerColor(n.owner, race, enemy);
              const g = ownerGlow(n.owner, race, enemy);
              const isSelected = n.id === selectedId;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y * 0.75}) scale(0.18)`}
                  style={{ cursor: 'pointer', filter: `drop-shadow(0 0 1.5px ${g})` }}
                  onClick={() => setSelectedId(n.id)}
                >
                  {isSelected && (
                    <circle r={16} fill="none" stroke={c} strokeWidth={1.5} opacity={0.85} />
                  )}
                  {nodeShape(n.kind, c)}
                  <text
                    y={n.kind === 'capital' ? 22 : 18}
                    textAnchor="middle"
                    fontFamily={ND.mono}
                    fontSize={6}
                    fill={c}
                    style={{ letterSpacing: '0.12em' }}
                  >
                    {n.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 2px 4px', flexWrap: 'wrap' }}>
          <LegendChip color={race.primary} label="Bizim" />
          <LegendChip color={enemy.primary} label={`Düşman (${enemy.short})`} />
          <LegendChip color={ND.warn} label="Çatışmalı" />
          <LegendChip color={ND.textMute} label="Tarafsız" />
        </div>

        {/* Selection panel */}
        {selectionInfo && (
          <Panel
            race={race}
            glow={selectionInfo.isEnemy}
            style={{ padding: 14, marginTop: 8 }}
          >
            <NodeDetailPanel
              info={selectionInfo}
              race={race}
              enemy={enemy}
              onAttack={() => handleAttack(selectionInfo.node)}
            />
          </Panel>
        )}
      </main>
    </div>
  );
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        background: 'rgba(8,12,26,0.7)',
        border: `1px solid ${color}55`,
        borderRadius: 999,
        fontFamily: ND.mono,
        fontSize: 10,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: color,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
      {label}
    </div>
  );
}

function NodeDetailPanel({
  info,
  race,
  enemy,
  onAttack,
}: {
  info: SelectionInfo;
  race: NDRace;
  enemy: NDRace;
  onAttack: () => void;
}) {
  const router = useRouter();
  const { node, ownerColor: c, isEnemy } = info;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${c}66`,
            background: `${c}14`,
            clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)',
          }}
        >
          <svg width={20} height={20} viewBox="-12 -12 24 24">
            {nodeShape(node.kind, c)}
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <Eyebrow color={c}>{NODE_KIND_LABEL[node.kind]} · Lv.{node.level}</Eyebrow>
          <H2 style={{ color: c, textShadow: `0 0 12px ${c}55` }}>{node.label}</H2>
        </div>
        <span
          style={{
            fontFamily: ND.mono,
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: '4px 8px',
            color: c,
            border: `1px solid ${c}55`,
            background: `${c}14`,
            borderRadius: 4,
          }}
        >
          {ownerLabel(node.owner)}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
        }}
      >
        <Stat label="Güç" value={node.power.toLocaleString('tr-TR')} accent={c} />
        <Stat label="Seviye" value={node.level} accent={c} />
        <Stat label="Sektör" value="S-9" accent={ND.textDim} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
        {isEnemy ? (
          <>
            <NDButton race={enemy} onClick={onAttack} variant="primary" size="md" full>
              SALDIR ⚔
            </NDButton>
            <NDButton
              race={race}
              variant="ghost"
              size="md"
              onClick={() => toast.info(`${node.label} keşfediliyor — yakında detay paneli açılacak`)}
            >
              KEŞFET
            </NDButton>
          </>
        ) : node.owner === 'neutral' ? (
          <>
            <NDButton race={race} variant="primary" size="md" full onClick={onAttack}>
              FETHET
            </NDButton>
            <NDButton
              race={race}
              variant="ghost"
              size="md"
              onClick={() => toast.info(`${node.label} taranıyor — yakında detay paneli açılacak`)}
            >
              KEŞFET
            </NDButton>
          </>
        ) : (
          <>
            <NDButton
              race={race}
              variant="primary"
              size="md"
              full
              onClick={() => {
                toast.success(`${node.label} savunma kuvvetleri pekiştirildi`);
              }}
            >
              SAVUN
            </NDButton>
            <NDButton
              race={race}
              variant="ghost"
              size="md"
              onClick={() => router.push('/base/build')}
            >
              GELİŞTİR
            </NDButton>
          </>
        )}
      </div>

      <Caption>
        {isEnemy
          ? `${enemy.allianceName} kontrolünde. Saldırı için savaş hazırlığına yönlendirileceksiniz.`
          : node.owner === 'neutral'
            ? 'Bu nokta henüz fethedilmedi. Üzerine güç gönder.'
            : 'Bu nokta filomuzun garnizonu altında.'}
      </Caption>
    </div>
  );
}

function ownerLabel(o: NodeOwner): string {
  switch (o) {
    case 'player':
      return 'BİZİM';
    case 'enemy':
      return 'DÜŞMAN';
    case 'contested':
      return 'ÇATIŞMA';
    default:
      return 'TARAFSIZ';
  }
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  const style: CSSProperties = {
    padding: '8px 10px',
    border: `1px solid ${ND.border}`,
    background: 'rgba(6,8,15,0.55)',
    borderRadius: 4,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  };
  return (
    <div style={style}>
      <span
        style={{
          fontFamily: ND.mono,
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: ND.textMute,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: ND.display,
          fontSize: 16,
          fontWeight: 600,
          color: accent,
          letterSpacing: '0.04em',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function GridBackdrop({ race }: { race: NDRace }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `linear-gradient(${race.primary}22 1px, transparent 1px),
                          linear-gradient(90deg, ${race.primary}22 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        opacity: 0.22,
        maskImage: 'radial-gradient(ellipse at 50% 50%, #000 50%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, #000 50%, transparent 100%)',
      }}
    />
  );
}

function BackgroundNebula({ race }: { race: NDRace }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(60% 40% at 18% 18%, ${race.primary}25 0%, transparent 65%),
                     radial-gradient(45% 35% at 82% 82%, ${RACES[race.enemyRace].primary}22 0%, transparent 65%),
                     radial-gradient(80% 70% at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%),
                     ${ND.bgDeep}`,
      }}
    />
  );
}
