'use client';

/**
 * /dev/gates — Strategy Gate Inspector
 *
 * Lists every gateId defined in the backend gates.config.ts × the live
 * player's resolved state. Useful for:
 *   - Balance tuning the Hikaye Kitabı progression curve (which buttons
 *     should open at which age?).
 *   - Spotting unmet rules at a glance (one row, hard-locks in red, soft
 *     in amber).
 *   - QA during /base playthroughs — "should this be unlocked at level X?"
 *
 * Not linked from BottomNav — accessible via direct URL only. /dev/* are
 * dev-only routes by convention.
 */

import { useMemo } from 'react';
import { Screen, H3, Caption, Panel, Chip, NDButton, useNDRace } from '@/components/handoff';
import { useGates, refreshGates, type GateEvalResult } from '@/lib/gates';

export default function DevGatesPage() {
  const race = useNDRace();
  const { data, loading, error } = useGates();

  // Group gates by their dotted prefix (base.build.* / pvp.* / guild.* etc.)
  // so the panel reads as a category tree rather than a 50-row alphabet soup.
  const grouped = useMemo(() => {
    if (!data) return [] as { group: string; entries: [string, GateEvalResult][] }[];
    const map = new Map<string, [string, GateEvalResult][]>();
    for (const [id, res] of Object.entries(data)) {
      const group = id.split('.')[0];
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push([id, res]);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([group, entries]) => ({
        group,
        entries: entries.sort(([a], [b]) => a.localeCompare(b)),
      }));
  }, [data]);

  const totalUnlocked = data ? Object.values(data).filter((g) => g.unlocked).length : 0;
  const totalGates = data ? Object.keys(data).length : 0;

  return (
    <Screen race={race}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Caption>DEBUG · Strategy Gates</Caption>
            <H3>Gate Inspector</H3>
          </div>
          <NDButton race={race} size="sm" variant="ghost" onClick={() => refreshGates()}>
            ↻ Yenile
          </NDButton>
        </header>

        <Panel race={race}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <StatBlock label="AÇIK" value={totalUnlocked} accent="#00ffaa" />
            <StatBlock label="TOPLAM" value={totalGates} />
            <StatBlock label="KİLİTLİ" value={totalGates - totalUnlocked} accent="#ff7777" />
          </div>
          <Caption style={{ marginTop: 8 }}>
            Bu sayfa <code>GET /api/gates</code>'in dönüşünü gösterir. Backend
            <code> apps/game-server/src/progression/gates.config.ts</code>'te
            kuralı değiştirip yeniden başlatınca burada anında yansır.
          </Caption>
        </Panel>

        {loading && !data ? <Caption>Yükleniyor…</Caption> : null}
        {error ? (
          <Panel race={race}>
            <Caption style={{ color: '#ff7777' }}>HATA: {error}</Caption>
          </Panel>
        ) : null}

        {grouped.map(({ group, entries }) => (
          <Panel race={race} key={group}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <H3 style={{ fontSize: 14, opacity: 0.85 }}>{group}</H3>
              <Caption>{entries.filter(([, g]) => g.unlocked).length}/{entries.length} açık</Caption>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {entries.map(([gateId, gate]) => (
                <GateRow key={gateId} gateId={gateId} gate={gate} />
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </Screen>
  );
}

function GateRow({ gateId, gate }: { gateId: string; gate: GateEvalResult }) {
  const hardUnmet = gate.requirements.filter((r) => r.severity === 'hard' && !r.met);
  const softUnmet = gate.requirements.filter((r) => r.severity === 'soft' && !r.met);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 1fr auto',
        gap: 10,
        alignItems: 'center',
        padding: '6px 8px',
        background: gate.unlocked ? 'rgba(0,255,170,0.04)' : 'rgba(255,80,80,0.04)',
        borderLeft: `3px solid ${gate.unlocked ? '#00ffaa' : '#ff7777'}`,
        borderRadius: 4,
      }}
    >
      <span style={{ fontSize: 14 }}>{gate.unlocked ? '✓' : '🔒'}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <code style={{ fontSize: 12 }}>{gateId}</code>
        {gate.unlocked ? null : (
          <span style={{ fontSize: 11, opacity: 0.7 }}>
            {hardUnmet.map((r) => `${r.long} (${r.current} / ${r.required})`).join(' · ')}
            {hardUnmet.length > 0 && softUnmet.length > 0 ? ' · ' : ''}
            {softUnmet.map((r) => `${r.long} (${r.current} / ${r.required})`).join(' · ')}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {hardUnmet.length > 0 ? <Chip color="#ff7777">{hardUnmet.length} hard</Chip> : null}
        {softUnmet.length > 0 ? <Chip color="#ffb84d">{softUnmet.length} soft</Chip> : null}
      </div>
    </div>
  );
}

function StatBlock({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, opacity: 0.55, letterSpacing: 0.4 }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 600, color: accent ?? 'inherit' }}>{value}</span>
    </div>
  );
}
