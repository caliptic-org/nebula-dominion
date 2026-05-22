'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BaseField,
  BottomNav,
  Caption,
  Chip,
  Code,
  H3,
  HUD,
  ND,
  NDButton,
  Panel,
  RaceTabs,
  ResIcon,
  Screen,
  Sigil,
  raceLex,
} from '@/components/handoff';
import { useNDRace } from '@/components/handoff/useNDRace';
import type { NDRace } from '@/components/handoff/nd-tokens';

interface BuildEntry {
  name: string;
  desc: string;
  locked: boolean;
  costA: number;
  costB: number;
  durationSec: number;
  level: number;
}

export default function BuildMenuPage() {
  const race = useNDRace();
  const lex = raceLex(race.key);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const catalog = useMemo<BuildEntry[]>(() => buildCatalog(race), [race]);
  const lockedCount = catalog.filter((c) => c.locked).length;
  const selected = catalog.find((c) => c.name === selectedName) ?? catalog[0];

  return (
    <div data-race={race.key} style={{ position: 'relative', minHeight: '100dvh' }}>
      <Screen race={race} dim={0.55} style={{ minHeight: '100dvh' }}>
        <HUD
          race={race}
          level={9}
          levelName="Metropol"
          resA="12,480"
          resB="3,210"
          crystal="42"
        />

        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {/* Dimmed field behind */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.22,
              pointerEvents: 'none',
            }}
          >
            <BaseField race={race} focusedIdx={-1} />
          </div>

          {/* Back strip floating over the dimmed field */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              background: 'rgba(8,10,16,0.55)',
              borderBottom: `1px solid ${ND.border}`,
              backdropFilter: 'blur(6px)',
            }}
          >
            <Link
              href="/base"
              style={{
                fontFamily: ND.display,
                fontSize: 11,
                letterSpacing: '0.08em',
                color: ND.textDim,
                textDecoration: 'none',
                textTransform: 'uppercase',
              }}
            >
              ← Ana Üs
            </Link>
            <div style={{ width: 1, height: 14, background: ND.border }} aria-hidden />
            <Sigil race={race} size={16} />
            <Code style={{ color: race.primary }}>{lex.fieldName}</Code>
          </div>

          {/* Bottom sheet */}
          <div
            style={{
              marginTop: 'auto',
              position: 'relative',
              background:
                race.key === 'seytan'
                  ? 'linear-gradient(180deg, rgba(20,2,6,0.96), rgba(8,1,3,0.98))'
                  : 'rgba(6,10,24,0.96)',
              borderTop: `1px solid ${race.primary}66`,
              padding: '14px 14px 18px',
              boxShadow: `0 -12px 40px ${race.glow}22`,
              maxHeight: '78%',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <div
                aria-hidden
                style={{
                  width: 40,
                  height: 3,
                  background: race.primary,
                  borderRadius: 2,
                  boxShadow: `0 0 6px ${race.glow}`,
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
                gap: 8,
              }}
            >
              <H3 style={{ color: ND.text }}>{lex.catalogName}</H3>
              <Code>{lex.morphHint} · {lockedCount} KİLİT</Code>
            </div>

            <div style={{ marginBottom: 12 }}>
              <RaceTabs race={race} items={lex.buildTabs} active={activeTab} onChange={setActiveTab} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {catalog.map((entry) => (
                <BuildingCard
                  key={entry.name}
                  race={race}
                  entry={entry}
                  selected={selected?.name === entry.name}
                  onSelect={() => setSelectedName(entry.name)}
                />
              ))}
            </div>

            {/* CTAs */}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <NDButton race={race} variant="ghost" size="md" style={{ flex: 1 }}>
                FİLTRE
              </NDButton>
              <NDButton
                race={race}
                size="md"
                style={{ flex: 2 }}
                disabled={selected?.locked ?? false}
              >
                {selected ? `${lex.actionVerb} BAŞLAT · ${selected.name}` : `${lex.actionVerb} BAŞLAT`}
              </NDButton>
            </div>
          </div>
        </div>

        <BottomNav race={race} active="base" />
      </Screen>
    </div>
  );
}

/* ─── Building card ────────────────────────────────────────────────────── */

interface BuildingCardProps {
  race: NDRace;
  entry: BuildEntry;
  selected: boolean;
  onSelect: () => void;
}

function BuildingCard({ race, entry, selected, onSelect }: BuildingCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      disabled={entry.locked}
      style={{ all: 'unset', cursor: entry.locked ? 'not-allowed' : 'pointer', display: 'block' }}
    >
      <Panel
        race={race}
        glow={selected && !entry.locked}
        style={{
          padding: 8,
          border:
            selected && !entry.locked
              ? `1px solid ${race.primary}`
              : `1px solid ${ND.border}`,
          opacity: entry.locked ? 0.55 : 1,
        }}
      >
        <div
          aria-hidden
          style={{
            height: 64,
            position: 'relative',
            background: `linear-gradient(180deg, ${race.primary}11, transparent)`,
            border: `1px dashed ${race.primary}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="48" height="40" viewBox="0 0 48 40" aria-hidden="true">
            <path
              d="M 4 28 L 24 14 L 44 28 L 24 36 Z"
              fill="rgba(40,52,76,0.85)"
              stroke={race.primary}
              strokeWidth="0.8"
            />
            <path
              d="M 4 28 L 4 32 L 24 40 L 24 36 Z"
              fill="#0C1224"
              stroke={`${race.primary}aa`}
              strokeWidth="0.5"
            />
            <path
              d="M 44 28 L 44 32 L 24 40 L 24 36 Z"
              fill="#070B17"
              stroke={`${race.primary}88`}
              strokeWidth="0.5"
            />
          </svg>
        </div>

        <div
          style={{
            marginTop: 6,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <H3 style={{ color: ND.text, fontSize: 10 }}>{entry.name}</H3>
          {entry.locked ? <Chip>KİLİT</Chip> : <Chip color={race.primary}>Lv {entry.level}</Chip>}
        </div>

        <Caption style={{ fontSize: 10, marginTop: 2 }}>{entry.desc}</Caption>

        <div
          style={{
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: ND.mono,
            fontSize: 10,
            color: race.primary,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <ResIcon kind={race.resourceA.icon} size={11} color={race.primary} />
            {entry.costA}
          </span>
          <span aria-hidden style={{ color: ND.textMute }}>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <ResIcon kind={race.resourceB.icon} size={11} color={race.primary} />
            {entry.costB}
          </span>
        </div>
      </Panel>
    </button>
  );
}

/* ─── Catalog builder ──────────────────────────────────────────────────── */

function buildCatalog(race: NDRace): BuildEntry[] {
  return race.buildings.map((b, i) => {
    const base = (i + 1) * 220;
    return {
      name: b.n,
      desc: b.t,
      locked: b.locked,
      costA: base,
      costB: Math.round(base * 0.35),
      durationSec: 90 + i * 60,
      level: b.locked ? 0 : Math.max(1, 5 - i),
    };
  });
}
