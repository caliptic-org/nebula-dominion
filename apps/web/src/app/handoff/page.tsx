'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RACES,
  ND,
  type NDRaceKey,
  Sigil,
  Screen,
  HUD,
  BottomNav,
  Panel,
  NotchPanel,
  NDButton,
  Bar,
  Eyebrow,
  Chip,
  ResPill,
  H1,
  H2,
  H3,
  Caption,
  Code,
  ImgSlot,
} from '@/components/handoff';

const RACE_KEYS: NDRaceKey[] = ['insan', 'zerg', 'otomat', 'canavar', 'seytan'];

export default function HandoffShowcasePage() {
  const router = useRouter();
  // Internal design-system reference page. Production deploys redirect
  // to /base so end-users don't land on a wall of design tokens. Dev
  // builds keep the showcase rendered so designers + QA can inspect
  // every component variant.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      router.replace('/base');
    }
  }, [router]);

  const [raceKey, setRaceKey] = useState<NDRaceKey>('insan');
  const race = RACES[raceKey];

  return (
    <div
      data-race={raceKey}
      style={{
        minHeight: '100dvh',
        background: ND.bgDeep,
        color: ND.text,
        fontFamily: ND.body,
        padding: '24px 16px 80px',
        overflow: 'auto',
      }}
    >
      <header
        style={{
          maxWidth: 1100,
          margin: '0 auto 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Sigil race={race} size={36} glow />
          <div>
            <Eyebrow color={race.primary}>HANDOFF · FOUNDATION</Eyebrow>
            <H2 style={{ color: ND.text, marginTop: 2 }}>{race.name} — {race.motto}</H2>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '6px 8px',
            background: 'rgba(6,8,15,0.92)',
            border: `1px solid ${race.primary}66`,
            borderRadius: 6,
            backdropFilter: 'blur(12px)',
          }}
        >
          <Eyebrow style={{ alignSelf: 'center', paddingRight: 6, borderRight: `1px solid ${ND.border}` }}>IRK</Eyebrow>
          {RACE_KEYS.map(k => {
            const r = RACES[k];
            const on = k === raceKey;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setRaceKey(k)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px 6px 6px',
                  background: on
                    ? `linear-gradient(180deg, ${r.primary}33, ${r.primary}11)`
                    : 'transparent',
                  border: `1px solid ${on ? r.primary : ND.border}`,
                  borderRadius: 4,
                  color: on ? r.primary : ND.textDim,
                  fontFamily: ND.display,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: on ? `0 0 16px -4px ${r.glow}99` : 'none',
                  transition: 'all 0.15s',
                }}
                aria-pressed={on}
              >
                <Sigil race={r} size={18} glow={on}/>
                <span>{r.short}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 16,
        }}
      >
        {/* Live screen preview */}
        <Panel race={race} glow style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: `1px solid ${ND.border}` }}>
            <Eyebrow color={race.primary}>SCREEN · LIVE PREVIEW</Eyebrow>
          </div>
          <div style={{ position: 'relative', width: '100%', height: 560 }}>
            <Screen race={race}>
              <HUD race={race} level={9} levelName="Metropol" resA="12,480" resB="3,210" crystal="42" />
              <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
                <NotchPanel race={race}>
                  <Eyebrow color={race.primary}>{race.allianceTag} · {race.allianceName}</Eyebrow>
                  <H2 style={{ marginTop: 6, color: race.primary }}>{race.capitalBase}</H2>
                  <Caption style={{ marginTop: 6 }}>{race.capitalDescription}</Caption>
                </NotchPanel>

                <Panel style={{ padding: 12 }}>
                  <Eyebrow>SEZON HEDEFİ</Eyebrow>
                  <H3 style={{ marginTop: 4, color: ND.text }}>{race.seasonGoal}</H3>
                  <div style={{ marginTop: 10 }}>
                    <Bar value={62} max={100} color={race.primary} label="İLERLEME" trailing="62 / 100" />
                  </div>
                </Panel>

                <Panel style={{ padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Eyebrow>KAYNAKLAR</Eyebrow>
                    <Chip color={race.primary}>{race.resourceA.name}</Chip>
                    <Chip color={race.primary}>{race.resourceB.name}</Chip>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <ResPill kind={race.resourceA.icon} value="12,480" accent={race.primary} />
                    <ResPill kind={race.resourceB.icon} value="3,210" accent={race.primary} />
                    <ResPill kind="crystal" value="42" accent="oklch(0.82 0.16 80)" />
                    <ResPill kind="energy" value="180/240" accent={ND.warn} />
                  </div>
                </Panel>

                <Panel style={{ padding: 12 }}>
                  <Eyebrow>YAPILAR</Eyebrow>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                    {race.buildings.map(b => (
                      <div
                        key={b.n}
                        style={{
                          padding: 8,
                          border: `1px solid ${b.locked ? ND.border : race.primary + '55'}`,
                          background: b.locked ? 'rgba(255,255,255,0.02)' : 'transparent',
                          borderRadius: 3,
                          opacity: b.locked ? 0.5 : 1,
                        }}
                      >
                        <Code>{b.locked ? '🔒' : '◆'} {b.n}</Code>
                        <div style={{ fontSize: 10, color: ND.textMute, marginTop: 2 }}>{b.t}</div>
                      </div>
                    ))}
                  </div>
                </Panel>

                <div style={{ display: 'flex', gap: 8 }}>
                  <NDButton race={race} variant="primary" full>İnşa Et</NDButton>
                  <NDButton race={race} variant="outline">Detay</NDButton>
                </div>
              </div>
              <BottomNav race={race} active="base" />
            </Screen>
          </div>
        </Panel>

        {/* Atom showcase */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel race={race} style={{ padding: 16 }}>
            <Eyebrow color={race.primary}>TYPOGRAPHY</Eyebrow>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <H1>Nebula Dominion</H1>
              <H2>Display · {race.short}</H2>
              <H3>Subhead · uppercase</H3>
              <Caption>Body — Inter · {race.motto}</Caption>
              <Code>monospace · {race.handle} · t-08:32</Code>
            </div>
          </Panel>

          <Panel race={race} style={{ padding: 16 }}>
            <Eyebrow color={race.primary}>BUTTONS</Eyebrow>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NDButton race={race}>Primary</NDButton>
              <NDButton race={race} variant="ghost">Ghost</NDButton>
              <NDButton race={race} variant="outline">Outline</NDButton>
              <NDButton race={race} variant="danger">Danger</NDButton>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NDButton race={race} size="sm">Small</NDButton>
              <NDButton race={race} size="md">Medium</NDButton>
              <NDButton race={race} size="lg">Large</NDButton>
              <NDButton race={race} disabled>Disabled</NDButton>
            </div>
          </Panel>

          <Panel race={race} style={{ padding: 16 }}>
            <Eyebrow color={race.primary}>BARS · PROGRESS</Eyebrow>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Bar value={82} color={race.primary} label="ENERJİ" trailing="82%" />
              <Bar value={48} color={ND.warn}    label="POPÜLASYON" trailing="180/240" />
              <Bar value={24} color={ND.danger}  label="ZIRH" trailing="24%" />
              <Bar value={92} color={ND.ok}      label="MORAL" trailing="92%" />
            </div>
          </Panel>

          <Panel race={race} style={{ padding: 16 }}>
            <Eyebrow color={race.primary}>IMAGE SLOTS</Eyebrow>
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <ImgSlot label="Komutan portresi" ratio="3 / 4" color={race.primary} />
              <ImgSlot label="Çevre · base"     ratio="3 / 4" color={race.primary} />
            </div>
          </Panel>

          <Panel race={race} style={{ padding: 16 }}>
            <Eyebrow color={race.primary}>KOMUTANLAR</Eyebrow>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {race.commanders.map(c => (
                <div key={c.n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, border: `1px solid ${ND.border}`, borderRadius: 4 }}>
                  <Sigil race={race} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: ND.display, fontSize: 13, color: ND.text, letterSpacing: '0.04em' }}>{c.n}</div>
                    <div style={{ fontSize: 11, color: ND.textDim }}>{c.t}</div>
                  </div>
                  <Chip color={race.primary}>{c.tier}</Chip>
                  <Code>Lv {c.lv}</Code>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <footer
        style={{
          maxWidth: 1100,
          margin: '24px auto 0',
          padding: '12px 16px',
          borderTop: `1px solid ${ND.border}`,
          fontFamily: ND.mono,
          fontSize: 10,
          color: ND.textMute,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        Handoff · Phase 0 Foundation · oklch palette · Chakra Petch + Inter + JetBrains Mono
      </footer>
    </div>
  );
}
