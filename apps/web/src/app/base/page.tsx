'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bar,
  BaseField,
  BaseFieldStatusChip,
  BaseVitalsWidget,
  BottomNav,
  Caption,
  Chip,
  Code,
  Eyebrow,
  H3,
  HUD,
  ND,
  NDButton,
  Panel,
  RaceQuickActions,
  Screen,
  Sigil,
  TierBanner,
  raceLex,
} from '@/components/handoff';
import { useNDRace } from '@/components/handoff/useNDRace';
import type { NDRace } from '@/components/handoff/nd-tokens';

const BOTTOM_NAV_ROUTES: Record<string, string> = {
  base: '/base',
  galaxy: '/map',
  cmd: '/commanders',
  story: '/story-gallery',
  more: '/settings',
};

export default function BaseHomePage() {
  const race = useNDRace();
  const router = useRouter();
  const lex = raceLex(race.key);
  const [focusedIdx, setFocusedIdx] = useState(1);
  const focusedBuilding = race.buildings[focusedIdx] ?? race.buildings[0];

  return (
    <div data-race={race.key} style={{ position: 'relative', minHeight: '100dvh' }}>
      <Screen race={race} dim={0.5} style={{ minHeight: '100dvh' }}>
        <HUD
          race={race}
          level={9}
          levelName="Metropol"
          resA="12,480"
          resB="3,210"
          crystal="42"
        />

        <TierBanner race={race} level={9} age={1} xpPercent={92} trailing="9 / 9 → ÇAĞ 2" />

        {/* Main field — race-themed iso silhouette + floating widgets */}
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          <BaseField race={race} focusedIdx={focusedIdx} />

          {/* status chip top-left */}
          <div style={{ position: 'absolute', top: 12, left: 12 }}>
            <BaseFieldStatusChip race={race} label={lex.statusOk} />
          </div>

          {/* vitals widget top-right */}
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            <BaseVitalsWidget race={race} />
          </div>

          {/* production-complete toast */}
          <Panel
            race={race}
            glow
            style={{
              position: 'absolute',
              top: 76,
              right: 12,
              padding: '8px 10px',
              maxWidth: 178,
            }}
          >
            <Code style={{ color: race.primary }}>{lex.productionVerb} TAMAM</Code>
            <div
              style={{
                fontFamily: ND.display,
                fontSize: 12,
                color: ND.text,
                marginTop: 2,
                letterSpacing: '0.04em',
              }}
            >
              ×4 {race.units[1]?.n ?? race.units[0].n}
            </div>
            <div style={{ marginTop: 6 }}>
              <Bar value={100} color={race.primary} height={2} />
            </div>
          </Panel>

          {/* quick actions mid-right */}
          <div style={{ position: 'absolute', right: 10, top: '36%' }}>
            <RaceQuickActions race={race} />
          </div>

          {/* selected building card bottom */}
          <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
            <Panel race={race} glow style={{ padding: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div
                  aria-hidden
                  style={{
                    width: 64,
                    height: 64,
                    flexShrink: 0,
                    background: `linear-gradient(180deg, ${race.primary}22, transparent)`,
                    border: `1px dashed ${race.primary}66`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sigil race={race} size={36} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <H3 style={{ color: ND.text, fontSize: 12 }}>
                      {focusedBuilding.n.toUpperCase()}
                    </H3>
                    <Chip color={race.primary}>
                      {focusedBuilding.locked ? 'KİLİTLİ' : 'AKTİF'}
                    </Chip>
                  </div>
                  <Caption style={{ fontSize: 11, marginTop: 2 }}>
                    {focusedBuilding.locked ? focusedBuilding.t : race.capitalDescription}
                  </Caption>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <Link href="/base/build" style={{ textDecoration: 'none' }}>
                      <NDButton race={race} variant="outline" size="sm">
                        {lex.actionVerb}
                      </NDButton>
                    </Link>
                    <NDButton race={race} variant="ghost" size="sm">
                      DETAY
                    </NDButton>
                  </div>
                </div>
              </div>
              {/* Building selector strip — bottom of card */}
              <BuildingSelector
                race={race}
                focusedIdx={focusedIdx}
                onSelect={setFocusedIdx}
              />
            </Panel>
          </div>
        </div>

        <BottomNav
          race={race}
          active="base"
          onChange={(key) => router.push(BOTTOM_NAV_ROUTES[key] ?? '/base')}
        />
      </Screen>
    </div>
  );
}

interface BuildingSelectorProps {
  race: NDRace;
  focusedIdx: number;
  onSelect: (idx: number) => void;
}

function BuildingSelector({ race, focusedIdx, onSelect }: BuildingSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Yapı seçici"
      style={{
        marginTop: 10,
        paddingTop: 8,
        borderTop: `1px dashed ${ND.border}`,
        display: 'flex',
        gap: 4,
        overflowX: 'auto',
      }}
    >
      {race.buildings.map((b, i) => {
        const on = i === focusedIdx;
        return (
          <button
            key={b.n}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(i)}
            disabled={b.locked}
            style={{
              all: 'unset',
              cursor: b.locked ? 'not-allowed' : 'pointer',
              flex: '1 1 0',
              minWidth: 44,
              padding: '4px 6px',
              textAlign: 'center',
              fontFamily: ND.mono,
              fontSize: 9,
              letterSpacing: '0.06em',
              color: b.locked ? ND.textMute : on ? '#0A0E1A' : ND.textDim,
              background: on ? race.primary : 'rgba(255,255,255,0.04)',
              border: `1px solid ${on ? race.primary : ND.border}`,
              opacity: b.locked ? 0.5 : 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {b.locked ? '🔒 ' : ''}{b.n}
          </button>
        );
      })}
    </div>
  );
}
