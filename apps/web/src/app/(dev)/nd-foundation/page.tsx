/* Dev preview — Phase 1 ND foundation atoms × every race.
 *
 * Open `/nd-foundation` in dev to verify each race renders with the right
 * sigil, glow, typography, and resource badge palette. This page is dev-only
 * scaffolding for Creative Director sign-off; no production user navigates
 * here, so we keep it client-side and unauthenticated.
 */

import type { Metadata } from 'next';
import {
  Caption,
  Eyebrow,
  Frame,
  H1,
  H2,
  H3,
  Mono,
  NeonBorder,
  Panel,
  RACES,
  RACE_KEYS,
  RaceChip,
  RaceThemeProvider,
  ResourceBadge,
  Screen,
  Sigil,
  Stat,
  type RaceKey,
} from '@/components/nd';

export const metadata: Metadata = {
  title: 'ND Foundation Preview',
  robots: { index: false, follow: false },
};

const SECTIONS: { id: RaceKey; title: string }[] = RACE_KEYS.map((k) => ({
  id: k,
  title: RACES[k].name,
}));

export default function NDFoundationPreview() {
  return (
    <main className="min-h-screen bg-nd-bg-deep text-nd-text font-nd-body py-10 px-6">
      <header className="max-w-5xl mx-auto mb-10">
        <Eyebrow>Nebula Dominion · Phase 1</Eyebrow>
        <H1 className="mt-2">Foundation atoms × 5 races</H1>
        <Caption className="mt-3 max-w-xl">
          Static preview of the shared design layer: race themes, sigils,
          typography ranks, panels with race-tinted glow, and resource badges.
          Every section reads its colours from <Mono>RaceThemeProvider</Mono>{' '}
          CSS variables — no hardcoded hex in the components.
        </Caption>
        <div className="mt-5 flex flex-wrap gap-2">
          {RACE_KEYS.map((k) => (
            <a key={k} href={`#${k}`} className="contents">
              <RaceChip race={RACES[k]} label={RACES[k].name} />
            </a>
          ))}
        </div>
      </header>

      <div className="max-w-5xl mx-auto space-y-12">
        {SECTIONS.map(({ id, title }) => (
          <RaceSection key={id} raceKey={id} title={title} />
        ))}
      </div>
    </main>
  );
}

function RaceSection({ raceKey, title }: { raceKey: RaceKey; title: string }) {
  const race = RACES[raceKey];
  return (
    <RaceThemeProvider race={raceKey} as="section" id={raceKey}>
      <div className="flex items-center gap-3 mb-4">
        <Sigil race={race} size={36} glow />
        <div className="flex flex-col">
          <Eyebrow color="var(--nd-primary)">{race.short} · sigil {race.sigil}</Eyebrow>
          <H2 className="mt-1">{title}</H2>
          <Caption className="mt-0.5">{race.motto}</Caption>
        </div>
        <div className="ml-auto flex gap-2">
          <RaceChip race={race} active />
          <RaceChip race={race} label="ENEMY" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sigil + typography ranks */}
        <Panel hi className="p-5">
          <Eyebrow>Sigil &amp; Typography</Eyebrow>
          <div className="mt-3 flex items-end gap-6">
            <Sigil race={race} size={72} glow className="animate-nd-glow" />
            <div className="flex-1 flex flex-col gap-2">
              <H1>H1 · {race.short}</H1>
              <H2>H2 · {race.allianceName}</H2>
              <H3>H3 · {race.capitalBase}</H3>
              <Caption>{race.capitalDescription}</Caption>
              <Mono>{race.handle} · {race.seasonGoal}</Mono>
            </div>
          </div>
        </Panel>

        {/* Race-tinted neon panel */}
        <Panel race={race} glow className="p-5">
          <Eyebrow color="var(--nd-primary)">Neon panel · race={race.key}</Eyebrow>
          <H3 className="mt-2">{race.title}</H3>
          <Caption className="mt-2">{race.storyAct1}</Caption>
          <NeonBorder race={race} pulse className="mt-4 p-3">
            <Mono>NeonBorder · animate-nd-glow</Mono>
          </NeonBorder>
        </Panel>

        {/* Resource badges */}
        <Panel className="p-5">
          <Eyebrow>Resource badges</Eyebrow>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ResourceBadge
              kind={race.resourceA.icon}
              value="12,480"
              label={race.resourceA.name}
              accent={race.primary}
            />
            <ResourceBadge
              kind={race.resourceB.icon}
              value="3,210"
              label={race.resourceB.name}
              accent={race.primary}
            />
            <ResourceBadge kind="crystal" value="42" label="krl" accent="oklch(0.82 0.16 80)" />
            <ResourceBadge kind="energy" value="1.2k" size="sm" accent={race.primary} />
            <ResourceBadge kind="pop" value="180/240" size="sm" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat label="Güç" value="1,248" trailing="+12%" race={race} />
            <Stat label="Tier" value={race.commanders[0].tier} race={race} align="center" />
            <Stat label="Komutan" value={race.commanders[0].n} align="right" />
          </div>
        </Panel>

        {/* Screen preview */}
        <Panel className="p-5 overflow-hidden">
          <Eyebrow>Screen · 390×844</Eyebrow>
          <div className="mt-3 flex justify-center">
            <Screen race={race} framed>
              <Frame pad="lg" className="h-full">
                <Eyebrow color="var(--nd-primary)">{race.short} · {race.capitalBase}</Eyebrow>
                <H1 className="mt-1">{race.title}</H1>
                <Caption className="mt-2">{race.storyAct2}</Caption>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ResourceBadge
                    kind={race.resourceA.icon}
                    value="12,480"
                    label={race.resourceA.name}
                    accent={race.primary}
                    size="sm"
                  />
                  <ResourceBadge
                    kind={race.resourceB.icon}
                    value="3,210"
                    label={race.resourceB.name}
                    accent={race.primary}
                    size="sm"
                  />
                </div>
                <NeonBorder race={race} className="mt-auto p-3 flex items-center justify-between">
                  <span className="font-nd-mono text-[11px] tracking-[0.10em] uppercase" style={{ color: race.primary }}>
                    {race.seasonGoal}
                  </span>
                  <Sigil race={race} size={20} />
                </NeonBorder>
              </Frame>
            </Screen>
          </div>
        </Panel>
      </div>
    </RaceThemeProvider>
  );
}
