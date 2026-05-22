'use client';

import Link from 'next/link';
import {
  Bar,
  BottomNav,
  Caption,
  Chip,
  Code,
  Eyebrow,
  H2,
  H3,
  HUD,
  ND,
  NDButton,
  NebulaBg,
  NotchPanel,
  Panel,
  ResIcon,
  ResPill,
  Sigil,
} from '@/components/handoff';
import { useNDRace } from '@/components/handoff/useNDRace';
import type { NDRace } from '@/components/handoff/nd-tokens';

const SCREEN_NAMES: Record<string, string> = {
  insan:   'Komuta Üssü',
  zerg:    'Kovan Çekirdeği',
  otomat:  'Sonsuzluk Çekirdeği',
  canavar: 'Alfa Tahtı',
  seytan:  'Karanlık Taht',
};

const PRODUCTION_HEADLINE: Record<string, string> = {
  insan:   'Üretim Kuyruğu',
  zerg:    'Mutasyon Çukuru',
  otomat:  'Montaj Hattı',
  canavar: 'Av Çukuru',
  seytan:  'Çağırım Sembolü',
};

const POP_USED = 180;
const POP_MAX = 240;

export default function BaseHomePage() {
  const race = useNDRace();
  const builtCount = race.buildings.filter((b) => !b.locked).length;
  const lockedCount = race.buildings.length - builtCount;
  const popRatio = (POP_USED / POP_MAX) * 100;

  return (
    <div
      data-race={race.key}
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: ND.bg,
        color: ND.text,
        fontFamily: ND.body,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <NebulaBg race={race} intensity={0.85} dim={0.7} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
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
            overflowY: 'auto',
            padding: 'var(--nd-density-pad-y) var(--nd-density-pad-x) calc(var(--nd-density-pad-y) + 8px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--nd-density-gap)',
          }}
        >
          {/* Capital identity */}
          <NotchPanel race={race}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  background: `${race.primary}1A`,
                  border: `1px solid ${race.primary}66`,
                }}
              >
                <Sigil race={race} size={22} glow />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Eyebrow color={race.primary}>
                  {race.allianceTag} · {race.allianceName}
                </Eyebrow>
                <H2 style={{ marginTop: 4, color: race.primary }}>
                  {SCREEN_NAMES[race.key] ?? 'Ana Üs'} · {race.capitalBase}
                </H2>
              </div>
            </div>
            <Caption style={{ marginTop: 8 }}>{race.capitalDescription}</Caption>
          </NotchPanel>

          {/* Season goal + progress */}
          <Panel race={race} glow style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Eyebrow color={race.primary}>SEZON HEDEFİ</Eyebrow>
              <Code>62 / 100</Code>
            </div>
            <H3 style={{ marginTop: 4, color: ND.text }}>{race.seasonGoal}</H3>
            <div style={{ marginTop: 10 }}>
              <Bar value={62} color={race.primary} label="İLERLEME" trailing="62%" />
            </div>
          </Panel>

          {/* Resource summary */}
          <Panel race={race} style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Eyebrow>KAYNAKLAR</Eyebrow>
              <Chip color={race.primary}>{race.resourceA.name}</Chip>
              <Chip color={race.primary}>{race.resourceB.name}</Chip>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <ResPill kind={race.resourceA.icon} value="12,480" accent={race.primary} />
              <ResPill kind={race.resourceB.icon} value="3,210" accent={race.primary} />
              <ResPill kind="crystal" value="42" accent="oklch(0.82 0.16 80)" />
              <ResPill kind="pop" value={`${POP_USED}/${POP_MAX}`} accent={popRatio > 85 ? ND.warn : ND.textDim} />
            </div>
          </Panel>

          {/* Buildings */}
          <Panel race={race} style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Eyebrow color={race.primary}>YAPILAR</Eyebrow>
              <div style={{ display: 'flex', gap: 6 }}>
                <Chip color={race.primary}>{builtCount} aktif</Chip>
                {lockedCount > 0 && <Chip color={ND.textDim}>{lockedCount} kilitli</Chip>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {race.buildings.map((b) => (
                <BuildingTile key={b.n} race={race} name={b.n} desc={b.t} locked={b.locked} />
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <Link href="/base/build" style={{ textDecoration: 'none' }}>
                <NDButton race={race} variant="primary" size="md" full>
                  İnşa Menüsünü Aç
                </NDButton>
              </Link>
            </div>
          </Panel>

          {/* Production + Roster snapshot */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Link href="/base/production" style={{ textDecoration: 'none' }}>
              <Panel race={race} style={{ padding: 12, height: '100%' }}>
                <Eyebrow color={race.primary}>{PRODUCTION_HEADLINE[race.key] ?? 'Üretim'}</Eyebrow>
                <H3 style={{ marginTop: 6, color: ND.text }}>3 / 5 SLOT</H3>
                <div style={{ marginTop: 6 }}>
                  <Bar value={48} color={race.primary} label="HEAD" trailing="00:34" height={4} />
                </div>
                <Caption style={{ marginTop: 8 }}>
                  Sıradaki: <span style={{ color: race.primary }}>{race.units[1]?.n ?? race.units[0].n}</span>
                </Caption>
              </Panel>
            </Link>
            <Link href="/inventory" style={{ textDecoration: 'none' }}>
              <Panel race={race} style={{ padding: 12, height: '100%' }}>
                <Eyebrow color={race.primary}>BİRİM ENVANTERİ</Eyebrow>
                <H3 style={{ marginTop: 6, color: ND.text }}>{POP_USED} / {POP_MAX}</H3>
                <div style={{ marginTop: 6 }}>
                  <Bar value={popRatio} color={popRatio > 85 ? ND.warn : race.primary} label="POP" trailing={`${Math.round(popRatio)}%`} height={4} />
                </div>
                <Caption style={{ marginTop: 8 }}>
                  Hazır filo: <span style={{ color: race.primary }}>4 birim</span>
                </Caption>
              </Panel>
            </Link>
          </div>

          {/* Commanders strip */}
          <Panel race={race} style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Eyebrow color={race.primary}>KOMUTANLAR</Eyebrow>
              <Code>{race.commanders.length} kayıt</Code>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {race.commanders.map((c) => (
                <div
                  key={c.n}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 8px',
                    border: `1px solid ${c.lv === 0 ? ND.border : `${race.primary}33`}`,
                    background: c.lv === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    borderRadius: 3,
                    opacity: c.lv === 0 ? 0.55 : 1,
                  }}
                >
                  <Sigil race={race} size={20} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: ND.display,
                        fontSize: 12,
                        color: ND.text,
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c.lv === 0 ? '🔒 ' : ''}{c.n}
                    </div>
                    <div style={{ fontSize: 10, color: ND.textDim, marginTop: 1 }}>{c.skill}</div>
                  </div>
                  <Chip color={c.lv === 0 ? ND.textDim : race.primary}>{c.tier}</Chip>
                  <Code style={{ minWidth: 28, textAlign: 'right' }}>Lv {c.lv}</Code>
                </div>
              ))}
            </div>
          </Panel>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/map" style={{ textDecoration: 'none', flex: 1 }}>
              <NDButton race={race} variant="outline" size="md" full>
                Galaksiye Git
              </NDButton>
            </Link>
            <Link href="/battle-prep" style={{ textDecoration: 'none', flex: 1 }}>
              <NDButton race={race} size="md" full>
                Savaşa Hazırla
              </NDButton>
            </Link>
          </div>
        </div>

        <BottomNav race={race} active="base" />
      </div>
    </div>
  );
}

interface BuildingTileProps {
  race: NDRace;
  name: string;
  desc: string;
  locked: boolean;
}

function BuildingTile({ race, name, desc, locked }: BuildingTileProps) {
  return (
    <div
      style={{
        padding: 8,
        border: `1px solid ${locked ? ND.border : `${race.primary}55`}`,
        background: locked ? 'rgba(255,255,255,0.02)' : `${race.primary}0F`,
        borderRadius: 3,
        opacity: locked ? 0.55 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minHeight: 56,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: ND.mono,
          fontSize: 11,
          color: locked ? ND.textDim : race.primary,
          letterSpacing: '0.04em',
        }}
      >
        <span aria-hidden>{locked ? '🔒' : '◆'}</span>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
      </div>
      <div style={{ fontSize: 10, color: ND.textMute, lineHeight: 1.3 }}>{desc}</div>
    </div>
  );
}
