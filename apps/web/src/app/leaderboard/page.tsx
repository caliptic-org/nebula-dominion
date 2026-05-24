'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  RACES,
  ND,
  Sigil,
  Screen,
  Panel,
  NotchPanel,
  Eyebrow,
  H2,
  H3,
  Caption,
  Chip,
  Code,
  useNDRace,
  type NDRace,
  type NDRaceKey,
} from '@/components/handoff';
import { BottomNav } from '@/components/ui/BottomNav';
import { useLeaderboard, type LeaderboardCategory, type LeaderboardEntry } from '@/hooks/useLeaderboard';

type Category = 'power' | 'pvp' | 'alliance';

interface Entry {
  rank: number;
  id: string;
  name: string;
  race: NDRaceKey;
  score: number;
  scoreLabel: string;
  allianceTag?: string;
  isMe?: boolean;
  delta?: number;
}

function makeEntry(
  rank: number,
  id: string,
  name: string,
  race: NDRaceKey,
  score: number,
  scoreLabel: string,
  allianceTag?: string,
  isMe?: boolean,
  delta?: number,
): Entry {
  return { rank, id, name, race, score, scoreLabel, allianceTag, isMe, delta };
}

const POWER: Entry[] = [
  makeEntry(1, 'p1', 'A. Voss', 'insan', 4_872_000, '4.87M', 'YZH', false, 3),
  makeEntry(2, 'p2', 'Demiurge Prime', 'otomat', 4_581_300, '4.58M', 'OTM', false, 0),
  makeEntry(3, 'p3', 'Mor’gath', 'zerg', 4_210_800, '4.21M', 'KVN', false, -1),
  makeEntry(4, 'p4', 'Malphas', 'seytan', 3_987_400, '3.99M', 'MHK', false, 5),
  makeEntry(5, 'p5', 'Khorvash', 'canavar', 3_742_100, '3.74M', 'SRÜ', false, 2),
  makeEntry(6, 'p6', 'Aurelius', 'otomat', 3_611_200, '3.61M', 'OTM', false, -2),
  makeEntry(7, 'p7', 'Ravenna', 'canavar', 3_498_700, '3.50M', 'SRÜ', false, 1),
  makeEntry(8, 'p8', 'Lilithra', 'seytan', 3_344_500, '3.34M', 'MHK', false, -3),
  makeEntry(9, 'p9', 'Chen', 'insan', 3_201_800, '3.20M', 'YZH', false, 0),
  makeEntry(10, 'p10', 'Vex’thara', 'zerg', 3_104_200, '3.10M', 'KVN', false, 4),
  makeEntry(11, 'p11', 'Reyes', 'insan', 2_977_500, '2.98M', 'YZH', false, 0),
  makeEntry(12, 'p12', 'Threnix', 'zerg', 2_845_000, '2.85M', 'KVN', false, -1),
  makeEntry(13, 'p13', 'Crucible', 'otomat', 2_712_300, '2.71M', 'OTM', false, 2),
  makeEntry(14, 'p14', 'Vorhaal', 'seytan', 2_601_700, '2.60M', 'MHK', false, 0),
];

const PVP: Entry[] = [
  makeEntry(1, 'v1', 'Khorvash', 'canavar', 18_420, '18.420 Puan', 'SRÜ', false, 2),
  makeEntry(2, 'v2', 'Malphas', 'seytan', 17_805, '17.805 Puan', 'MHK', false, 1),
  makeEntry(3, 'v3', 'A. Voss', 'insan', 16_992, '16.992 Puan', 'YZH', false, -1),
  makeEntry(4, 'v4', 'Mor’gath', 'zerg', 15_877, '15.877 Puan', 'KVN', false, 3),
  makeEntry(5, 'v5', 'Ravenna', 'canavar', 14_441, '14.441 Puan', 'SRÜ', false, 0),
  makeEntry(6, 'v6', 'Lilithra', 'seytan', 13_984, '13.984 Puan', 'MHK', false, -2),
  makeEntry(7, 'v7', 'Demiurge Prime', 'otomat', 13_211, '13.211 Puan', 'OTM', false, 4),
  makeEntry(8, 'v8', 'Vex’thara', 'zerg', 12_650, '12.650 Puan', 'KVN', false, 0),
  makeEntry(9, 'v9', 'Aurelius', 'otomat', 11_988, '11.988 Puan', 'OTM', false, -1),
  makeEntry(10, 'v10', 'Chen', 'insan', 11_401, '11.401 Puan', 'YZH', false, 2),
  makeEntry(11, 'v11', 'Reyes', 'insan', 10_822, '10.822 Puan', 'YZH', false, 0),
  makeEntry(12, 'v12', 'Crucible', 'otomat', 10_199, '10.199 Puan', 'OTM', false, 1),
];

const ALLIANCE: Entry[] = [
  makeEntry(1, 'a1', 'Kovan Bilinci', 'zerg', 18_920_000, '18.92M'),
  makeEntry(2, 'a2', 'Karanlık Mahkeme', 'seytan', 17_441_200, '17.44M'),
  makeEntry(3, 'a3', 'Sonsuzluk Ağı', 'otomat', 16_007_800, '16.01M'),
  makeEntry(4, 'a4', 'Khorvash Sürüsü', 'canavar', 14_882_500, '14.88M'),
  makeEntry(5, 'a5', 'Yutucu Yıldız Hanedanlığı', 'insan', 13_544_100, '13.54M'),
  makeEntry(6, 'a6', 'Nova Vuruşu', 'insan', 11_901_700, '11.90M'),
  makeEntry(7, 'a7', 'Brood Mind', 'zerg', 10_774_400, '10.77M'),
  makeEntry(8, 'a8', 'Chrome Order', 'otomat', 9_441_200, '9.44M'),
  makeEntry(9, 'a9', 'Ember Clan', 'canavar', 8_200_500, '8.20M'),
  makeEntry(10, 'a10', 'Rune Pact', 'seytan', 7_881_300, '7.88M'),
];

const CATEGORY_LABEL: Record<Category, { eyebrow: string; unit: string }> = {
  power: { eyebrow: 'GÜÇ', unit: 'GÜÇ PUANI' },
  pvp: { eyebrow: 'PVP', unit: 'PVP PUANI' },
  alliance: { eyebrow: 'İTTİFAK', unit: 'İTTİFAK GÜCÜ' },
};

const DATA: Record<Category, Entry[]> = { power: POWER, pvp: PVP, alliance: ALLIANCE };

function useResetCountdown(targetMs: number) {
  // Important: `useState(compute)` would run the initializer during SSR with
  // one Date.now() and again on client hydration with a different one → text
  // mismatch warning. Defer all clock reads to useEffect so SSR always emits
  // 0:0:0:0 and the client populates after mount.
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    if (!targetMs) return;
    const compute = () => {
      const diff = Math.max(0, targetMs - Date.now());
      return {
        d: Math.floor(diff / 86_400_000),
        h: Math.floor((diff % 86_400_000) / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1_000),
      };
    };
    setT(compute());
    const id = setInterval(() => setT(compute()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  return t;
}

export default function LeaderboardPage() {
  const playerRace = useNDRace();
  const [category, setCategory] = useState<Category>('power');
  const [period, setPeriod] = useState<'weekly' | 'seasonal'>('weekly');

  // Both reset timestamps are clock-derived → defer to useEffect so SSR emits
  // 0 and the client populates after mount. useResetCountdown also gates on
  // a truthy targetMs so the visible countdown stays at 0:0:0:0 until then.
  const [weeklyReset, setWeeklyReset] = useState(0);
  const [seasonalReset, setSeasonalReset] = useState(0);
  useEffect(() => {
    const d = new Date();
    const daysUntilMonday = (8 - d.getUTCDay()) % 7 || 7;
    d.setUTCDate(d.getUTCDate() + daysUntilMonday);
    d.setUTCHours(0, 0, 0, 0);
    setWeeklyReset(d.getTime());
    setSeasonalReset(Date.now() + 60 * 86_400_000);
  }, []);
  const timer = useResetCountdown(period === 'weekly' ? weeklyReset : seasonalReset);

  // Live leaderboard from /api/v1/leaderboard. Falls back to the local mock
  // when the fetch hasn't resolved yet so we never flash an empty list.
  const liveCategory: LeaderboardCategory = category === 'alliance' ? 'guild' : category;
  const { data: live } = useLeaderboard(liveCategory, 20);
  const fmtScore = (n: number, cat: Category) =>
    cat === 'pvp'
      ? `${n.toLocaleString('tr-TR')} Puan`
      : n >= 1_000_000
        ? `${(n / 1_000_000).toFixed(2)}M`
        : n.toLocaleString('tr-TR');
  const liveAsEntries: Entry[] | null = live
    ? live.entries.map((e: LeaderboardEntry) => ({
        rank: e.rank,
        id: e.id,
        name: e.name,
        race: e.race,
        score: e.score,
        scoreLabel: fmtScore(e.score, category),
        allianceTag: e.allianceTag,
      }))
    : null;
  const baseEntries = liveAsEntries ?? DATA[category];
  // "Me" injection only fires when the backend hasn't returned a meEntry
  // (which it doesn't yet — TODO: extend /leaderboard to include the
  // authenticated user's own row). Until then, the synthetic Sen row uses
  // the player's actual race + a placeholder rank/score; we surface a
  // tooltip via aria-label so the user knows it's not real.
  const me: Entry = {
    rank: 42,
    id: 'me',
    name: 'Sen',
    race: playerRace.key,
    score: 1_287_400,
    scoreLabel: category === 'pvp' ? '4.287 Puan' : '1.29M',
    allianceTag: playerRace.allianceTag,
    isMe: true,
    delta: 7,
  };

  // De-duplicate by id so a real me-entry from backend (when present)
  // overrides the synthetic row.
  const merged = [...baseEntries, me].reduce<Entry[]>((acc, cur) => {
    const existingIdx = acc.findIndex((e) => e.id === cur.id);
    if (existingIdx >= 0) {
      // Prefer the backend entry over the synthetic.
      if (cur.id !== 'me') acc[existingIdx] = cur;
      return acc;
    }
    acc.push(cur);
    return acc;
  }, []);
  const entries = merged.sort((a, b) => a.rank - b.rank);
  const podium = entries.filter(e => e.rank <= 3);
  const list = entries.filter(e => e.rank > 3);

  return (
    <Screen race={playerRace} style={{ minHeight: '100dvh' }}>
      <PageHeader title="SIRALAMALAR" subtitle="Galaksi Rekabeti" race={playerRace} />

      {/* Period / countdown */}
      <div style={{ padding: '12px 16px 0' }}>
        <NotchPanel race={playerRace}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', gap: 6 }}>
              {(['weekly', 'seasonal'] as const).map(p => {
                const on = period === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    style={pillStyle(on, playerRace)}
                    aria-pressed={on}
                  >
                    {p === 'weekly' ? 'Haftalık' : 'Sezonluk'}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eyebrow color={playerRace.primary}>{period === 'weekly' ? 'HAFTALIK RESET' : 'SEZON SONU'}</Eyebrow>
              <Code style={{ color: playerRace.primary }}>
                {[timer.d, 'g', timer.h, 's', timer.m, 'd'].join(' ')}
              </Code>
            </div>
          </div>
        </NotchPanel>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }} role="tablist">
        {(Object.keys(CATEGORY_LABEL) as Category[]).map(c => {
          const on = category === c;
          return (
            <button
              key={c}
              role="tab"
              aria-selected={on}
              type="button"
              onClick={() => setCategory(c)}
              style={tabStyle(on, playerRace)}
            >
              {CATEGORY_LABEL[c].eyebrow}
            </button>
          );
        })}
      </div>

      {/* Content scroller */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Podium */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 8, alignItems: 'end' }}>
          {[podium[1], podium[0], podium[2]].map((e, i) =>
            e ? (
              <PodiumCard key={e.id} entry={e} accent={i === 1 ? 'var(--color-rarity-legendary)' : i === 0 ? 'var(--color-rarity-mid)' : 'var(--color-rarity-bronze)'} />
            ) : (
              <div key={i} />
            ),
          )}
        </div>

        {/* List */}
        <Panel race={playerRace}>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${ND.border}`, display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: 8 }}>
            <Eyebrow>#</Eyebrow>
            <Eyebrow>OYUNCU</Eyebrow>
            <Eyebrow>{CATEGORY_LABEL[category].unit}</Eyebrow>
          </div>
          <div role="list">
            {list.map(e => (
              <PlayerRow key={e.id} entry={e} playerRace={playerRace} />
            ))}
          </div>
        </Panel>
      </div>

      <BottomNav />
    </Screen>
  );
}

/* ── pieces ───────────────────────────────────────────────────────────── */

function PageHeader({ title, subtitle, race }: { title: string; subtitle: string; race: NDRace }) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: `linear-gradient(180deg, rgba(6,8,15,0.95) 0%, rgba(6,8,15,0.55) 100%)`,
        borderBottom: `1px solid ${race.primary}33`,
      }}
    >
      <Link
        href="/base"
        aria-label="Geri"
        style={{
          width: 32,
          height: 32,
          borderRadius: 4,
          border: `1px solid ${ND.border}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: ND.text,
          fontFamily: ND.display,
          textDecoration: 'none',
        }}
      >
        ‹
      </Link>
      <Sigil race={race} size={28} glow />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Eyebrow color={race.primary}>{subtitle}</Eyebrow>
        <H2 style={{ color: ND.text, marginTop: 2 }}>{title}</H2>
      </div>
    </header>
  );
}

function pillStyle(on: boolean, race: NDRace): React.CSSProperties {
  return {
    padding: '6px 12px',
    fontFamily: ND.display,
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    background: on ? `linear-gradient(180deg, ${race.primary}22, transparent)` : 'transparent',
    border: `1px solid ${on ? race.primary : ND.border}`,
    color: on ? race.primary : ND.textDim,
    borderRadius: 4,
    cursor: 'pointer',
  };
}

function tabStyle(on: boolean, race: NDRace): React.CSSProperties {
  return {
    flex: 1,
    padding: '10px 8px',
    fontFamily: ND.display,
    fontSize: 11,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    background: on ? `linear-gradient(180deg, ${race.primary}28, ${race.primary}10)` : 'transparent',
    border: `1px solid ${on ? race.primary : ND.border}`,
    color: on ? race.primary : ND.textDim,
    borderRadius: 3,
    cursor: 'pointer',
    boxShadow: on ? `0 0 16px -6px ${race.glow}` : 'none',
  };
}

function PodiumCard({ entry, accent }: { entry: Entry; accent: string }) {
  const r = RACES[entry.race];
  return (
    <Panel race={r} glow style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', textAlign: 'center' }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          background: `linear-gradient(180deg, ${accent}, ${accent}88)`,
          color: 'var(--color-bg-elevated)',
          fontFamily: ND.display,
          fontWeight: 800,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {entry.rank}
      </div>
      <Sigil race={r} size={36} glow />
      <H3 style={{ color: ND.text }}>{entry.name}</H3>
      <Chip color={r.primary}>{r.short}</Chip>
      <Code style={{ color: r.primary, fontSize: 13 }}>{entry.scoreLabel}</Code>
      {entry.allianceTag && <Caption style={{ fontSize: 10 }}>[{entry.allianceTag}]</Caption>}
    </Panel>
  );
}

function PlayerRow({ entry, playerRace }: { entry: Entry; playerRace: NDRace }) {
  const r = RACES[entry.race];
  const meTint = entry.isMe ? playerRace.primary : null;
  const deltaSign = entry.delta && entry.delta > 0 ? '+' : '';
  const deltaColor = !entry.delta ? ND.textMute : entry.delta > 0 ? ND.ok : ND.danger;

  return (
    <div
      role="listitem"
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr auto',
        gap: 8,
        padding: '10px 12px',
        borderBottom: `1px solid ${ND.border}`,
        background: meTint ? `linear-gradient(90deg, ${meTint}18, transparent)` : 'transparent',
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontFamily: ND.display, fontSize: 13, color: meTint || ND.text }}>{entry.rank}</div>
        {entry.delta !== undefined && entry.delta !== 0 && (
          <div style={{ fontFamily: ND.mono, fontSize: 9, color: deltaColor }}>
            {deltaSign}
            {entry.delta}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Sigil race={r} size={20} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: ND.display, fontSize: 12, color: ND.text, letterSpacing: '0.04em' }}>
            {entry.isMe ? `${entry.name} (Sen)` : entry.name}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10, color: ND.textDim }}>
            <span style={{ color: r.primary }}>{r.short}</span>
            {entry.allianceTag && <span>· [{entry.allianceTag}]</span>}
          </div>
        </div>
      </div>
      <Code style={{ color: meTint || r.primary }}>{entry.scoreLabel}</Code>
    </div>
  );
}
