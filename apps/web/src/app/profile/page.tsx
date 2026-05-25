'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ND,
  Sigil,
  Screen,
  Panel,
  NotchPanel,
  Bar,
  Eyebrow,
  H2,
  H3,
  Caption,
  Chip,
  Code,
  BottomNav,
  useNDRace,
  type NDRace,
} from '@/components/handoff';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBaseState } from '@/hooks/useBaseState';
import { useGameResources } from '@/hooks/useGameResources';
import { useActiveBuffs } from '@/hooks/useActiveBuffs';
import { useBattleHistory, deriveBattleStats } from '@/hooks/useBattleHistory';

type Tab = 'stats' | 'achievements' | 'history';

interface Achievement {
  id: string;
  label: string;
  earned: boolean;
  legendary?: boolean;
  detail?: string;
}

interface HistoryEntry {
  id: string;
  result: 'win' | 'loss';
  mode: 'PvP' | 'PvE' | 'Kuşatma';
  opponent: string;
  delta: number;
  unit: string;
  when: string;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', label: 'İlk Zafer', earned: true },
  { id: 'a2', label: 'Şampiyon', earned: true },
  { id: 'a3', label: 'Elmas Sezon', earned: true, legendary: true },
  { id: 'a4', label: 'Nebula Kaşifi', earned: true, detail: 'Galaksi · %62' },
  { id: 'a5', label: 'Efsane', earned: false, legendary: true },
  { id: 'a6', label: 'Ateş Ustası', earned: true },
  { id: 'a7', label: 'Hız Tanrısı', earned: true },
  { id: 'a8', label: 'Kalkan Efendisi', earned: false },
  { id: 'a9', label: 'Sezon Sonu', earned: false },
  { id: 'a10', label: 'Sniper', earned: true },
  { id: 'a11', label: 'Lonca Kahramanı', earned: true },
  { id: 'a12', label: 'Demir Zafer', earned: false },
];

const HISTORY: HistoryEntry[] = [
  { id: 'h1', result: 'win',  mode: 'PvP',     opponent: 'Khorvash',     delta: 42,  unit: 'PvP', when: '12 dk' },
  { id: 'h2', result: 'win',  mode: 'Kuşatma', opponent: 'Iron Grid',    delta: 188, unit: 'GÜÇ', when: '1 sa' },
  { id: 'h3', result: 'loss', mode: 'PvP',     opponent: 'Malphas',      delta: -28, unit: 'PvP', when: '3 sa' },
  { id: 'h4', result: 'win',  mode: 'PvE',     opponent: 'Yıldız Yıkıcı', delta: 320, unit: 'XP',  when: '6 sa' },
  { id: 'h5', result: 'win',  mode: 'PvP',     opponent: 'Vex’thara',    delta: 35,  unit: 'PvP', when: 'Dün' },
  { id: 'h6', result: 'loss', mode: 'Kuşatma', opponent: 'Void Council', delta: -94, unit: 'GÜÇ', when: 'Dün' },
];

const POWER_BREAKDOWN = [
  { label: 'Komutan',    value: 38 },
  { label: 'Araştırma',  value: 27 },
  { label: 'Birim',      value: 35 },
];

/* Active buffs come from `GET /buffs/active` via useActiveBuffs(). When the
 * player isn't signed in (or has nothing applied), the buffs panel falls
 * back to its honest "no active buffs" state. */
interface BuffViewModel {
  id: string;
  label: string;
  effect: string;
  remainingSec: number;
  totalSec: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR').format(n);
}

function fmtDuration(sec: number) {
  if (sec <= 0) return '00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}sa ${String(m).padStart(2, '0')}dk`;
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const BOTTOM_NAV_ROUTES: Record<string, string> = {
  base: '/base',
  galaxy: '/map',
  cmd: '/commanders',
  story: '/story-gallery',
  more: '/settings',
};

export default function ProfilePage() {
  const race = useNDRace();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('stats');
  // Backend profile. When signed-in: handle/level/xp/alliance come from the API;
  // race-derived placeholders fill in cosmetic fields (title/avatar/capitalBase)
  // that the backend profile DTO doesn't currently expose. Guests see the full
  // race-derived placeholder as before.
  const { profile: live } = useUserProfile();
  const { data: liveTier } = useBaseState();
  const { data: liveResources } = useGameResources();
  // /buffs/active drives the active buffs panel; null while guest / loading.
  const { data: liveBuffs } = useActiveBuffs();
  // /battles/history → wins / losses / battles / bestStreak — derived once
  // per fetch via deriveBattleStats. Zeros are honest defaults when no
  // history exists yet.
  const { data: liveHistory } = useBattleHistory();
  const battleStats = useMemo(
    () => deriveBattleStats(liveHistory?.entries ?? []),
    [liveHistory],
  );

  // Map server buffs (label / effect / expiresAt) to the view-model the
  // existing BuffRow expects. `remainingSec` is derived from the wall clock
  // — the existing BuffRow recomputes the bar each render, so we don't
  // need to tick a timer here.
  const activeBuffs: BuffViewModel[] = useMemo(() => {
    if (!liveBuffs) return [];
    const now = Date.now();
    return liveBuffs.map((b) => {
      const remainingSec = Math.max(
        0,
        Math.floor((new Date(b.expiresAt).getTime() - now) / 1000),
      );
      return {
        id: b.id,
        label: b.label,
        effect: b.effect,
        remainingSec,
        totalSec: b.totalSec,
      };
    });
  }, [liveBuffs]);

  // Power is derived from live data when available: each resource tier
  // contributes a coarse weighted sum so the number reacts to gameplay
  // rather than being a flat literal. Falls back to the mock when the
  // hooks haven't resolved yet so the screen never flashes empty.
  const livePower = liveResources
    ? Math.round(
        liveResources.mineral * 1.2 +
          liveResources.gas * 2.5 +
          liveResources.energy * 1.8 +
          liveResources.population * 30,
      ) + (liveTier?.tier?.currentLevel ?? 1) * 4_200
    : null;

  const profile = useMemo(
    () => ({
      handle: live?.username ?? race.handle,
      title: race.title,
      avatar: race.avatar,
      allianceTag: live?.allianceTag ?? race.allianceTag,
      allianceName: race.allianceName,
      capitalBase: race.capitalBase,
      level: liveTier?.tier?.currentLevel ?? live?.level ?? 1,
      power: livePower ?? 0,
      // PvP ranking + guild contribution still lack backend endpoints
      // (/pvp/stats, /guild/contributions). Until those land, default to
      // zeros — the UI handles 0/0 via the winRate guard and the empty
      // detail panels render naturally.
      globalRank: 0,
      pvpScore: 0,
      pvpRank: 0,
      // Wins / losses / battles / bestStreak now come from /battles/history.
      wins: battleStats.wins,
      losses: battleStats.losses,
      battles: battleStats.battles,
      bestStreak: battleStats.bestStreak,
      guildContrib: 0,
      xp: liveTier?.tier ? Number(liveTier.tier.xp) : live?.xp ?? 0,
      xpNext: liveTier?.tier ? Number(liveTier.tier.xpToNextLevel) : 1000,
      seasonPass: 0,
    }),
    [race, live, liveTier, livePower, battleStats],
  );

  // Guard against div-by-zero when the player has no battles yet —
  // returns 0 instead of NaN so the bar renders empty cleanly.
  const winRate = profile.battles > 0
    ? Math.round((profile.wins / profile.battles) * 100)
    : 0;
  const xpPct = profile.xpNext > 0
    ? Math.round((profile.xp / profile.xpNext) * 100)
    : 0;
  const earned = ACHIEVEMENTS.filter(a => a.earned).length;
  const totalPower = profile.power;

  return (
    <Screen race={race} style={{ height: '100dvh' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          background: 'linear-gradient(180deg, rgba(6,8,15,0.95), rgba(6,8,15,0.55))',
          borderBottom: `1px solid ${race.primary}33`,
        }}
      >
        <Link href="/base" aria-label="Geri" style={iconBtn()}>
          ‹
        </Link>
        <Sigil race={race} size={28} glow />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow color={race.primary}>KOMUTAN DOSYASI</Eyebrow>
          <H2 style={{ marginTop: 2 }}>PROFİL</H2>
        </div>
        <Link href="/settings" aria-label="Ayarlar" style={iconBtn()}>
          ⚙
        </Link>
      </header>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Hero panel */}
        <NotchPanel race={race}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                border: `2px solid ${race.primary}`,
                background: `linear-gradient(180deg, ${race.primary}33, transparent)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 16px -4px ${race.glow}`,
              }}
            >
              <Sigil race={race} size={36} glow />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Eyebrow color={race.primary}>{profile.title}</Eyebrow>
              <H2 style={{ marginTop: 2, color: ND.text }}>{profile.avatar}</H2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                <Code>@{profile.handle}</Code>
                <Chip color={race.primary}>Sv.{profile.level}</Chip>
                <Chip color={race.primary}>[{profile.allianceTag}]</Chip>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <Bar value={xpPct} color={race.primary} label="DENEYIM" trailing={`${fmt(profile.xp)} / ${fmt(profile.xpNext)} XP`} />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: ND.textDim }}>
            {profile.allianceName} · Küresel Sıra <span style={{ color: race.primary }}>#{fmt(profile.globalRank)}</span>
          </div>
        </NotchPanel>

        {/* Quick stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          <QuickStat label="GÜÇ" value={fmt(profile.power)} race={race} />
          <QuickStat label="PVP" value={fmt(profile.pvpScore)} race={race} />
          <QuickStat label="WIN" value={`%${winRate}`} race={race} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8 }} role="tablist">
          {(['stats', 'achievements', 'history'] as Tab[]).map(t => {
            const on = tab === t;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={on}
                type="button"
                onClick={() => setTab(t)}
                style={tabStyle(on, race)}
              >
                {t === 'stats' ? 'İstatistik' : t === 'achievements' ? `Başarım ${earned}/${ACHIEVEMENTS.length}` : 'Geçmiş'}
              </button>
            );
          })}
        </div>

        {tab === 'stats' && (
          <>
            {/* Battle record */}
            <Panel race={race}>
              <div style={panelHeader()}>
                <Eyebrow color={race.primary}>SAVAŞ KAYDI</Eyebrow>
                <Code>{fmt(profile.battles)}</Code>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, padding: 12 }}>
                <RecordCell label="Toplam" value={profile.battles} accent={ND.text} />
                <RecordCell label="Kazandı" value={profile.wins} accent={ND.ok} />
                <RecordCell label="Kaybetti" value={profile.losses} accent={ND.danger} />
              </div>
              <div style={{ padding: '0 12px 12px' }}>
                <Bar value={winRate} color={ND.ok} label="KAZANMA ORANI" trailing={`%${winRate}`} />
              </div>
            </Panel>

            {/* Power breakdown — was /stats */}
            <Panel race={race}>
              <div style={panelHeader()}>
                <Eyebrow color={race.primary}>GÜÇ DAĞILIMI</Eyebrow>
                <Code>{fmt(totalPower)} TOPLAM</Code>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
                {POWER_BREAKDOWN.map(seg => (
                  <Bar
                    key={seg.label}
                    value={seg.value}
                    color={race.primary}
                    label={seg.label.toUpperCase()}
                    trailing={`${seg.value}% · ${fmt(Math.round((seg.value / 100) * totalPower))}`}
                  />
                ))}
              </div>
            </Panel>

            {/* Detail */}
            <Panel race={race}>
              <div style={panelHeader()}>
                <Eyebrow color={race.primary}>KOMUTAN DETAYI</Eyebrow>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, padding: 12 }}>
                <DetailCell label="PvP Sıralaması" value={`#${fmt(profile.pvpRank)}`} sub={`${fmt(profile.pvpScore)} puan`} race={race} />
                <DetailCell label="En İyi Seri" value={`${profile.bestStreak} zafer`} sub="Üst üste" race={race} />
                <DetailCell label="Lonca Katkısı" value={fmt(profile.guildContrib)} sub="Sezon toplamı" race={race} />
                <DetailCell label="Üs" value={profile.capitalBase} sub={race.capitalDescription} race={race} />
              </div>
            </Panel>

            {/* Active buffs */}
            <Panel race={race}>
              <div style={panelHeader()}>
                <Eyebrow color={race.primary}>AKTİF BUFFLAR</Eyebrow>
                <Code>{activeBuffs.length}</Code>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
                {activeBuffs.length === 0 ? (
                  <Caption style={{ textAlign: 'center', padding: '12px 8px', color: ND.textMute }}>
                    Aktif buff yok. Mağazadan{' '}
                    <Link href="/shop" style={{ color: race.primary, textDecoration: 'none' }}>
                      Savaş Kalkanı veya XP Katalizörü
                    </Link>{' '}
                    al, savaşta aktive et.
                  </Caption>
                ) : (
                  activeBuffs.map(b => <BuffRow key={b.id} buff={b} race={race} />)
                )}
              </div>
            </Panel>

            {/* Season pass */}
            <Panel race={race}>
              <div style={panelHeader()}>
                <Eyebrow color={race.primary}>SEZON GEÇİŞİ</Eyebrow>
                <Code>{profile.seasonPass}/100</Code>
              </div>
              <div style={{ padding: 12 }}>
                <Bar value={profile.seasonPass} color={race.primary} />
                <Caption style={{ marginTop: 6 }}>
                  Sonraki ödüle <strong style={{ color: race.primary }}>{100 - profile.seasonPass}</strong> seviye
                </Caption>
              </div>
            </Panel>
          </>
        )}

        {tab === 'achievements' && (
          <Panel race={race}>
            <div style={panelHeader()}>
              <Eyebrow color={race.primary}>BAŞARIMLAR</Eyebrow>
              <Code>{earned}/{ACHIEVEMENTS.length}</Code>
            </div>
            <div style={{ padding: 12 }}>
              <Bar value={Math.round((earned / ACHIEVEMENTS.length) * 100)} color={race.primary} label="TAMAMLAMA" trailing={`%${Math.round((earned / ACHIEVEMENTS.length) * 100)}`} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 12 }}>
                {ACHIEVEMENTS.map(a => (
                  <div
                    key={a.id}
                    style={{
                      padding: 10,
                      border: `1px solid ${a.earned ? (a.legendary ? race.primary : ND.borderHi) : ND.border}`,
                      borderRadius: 4,
                      background: a.earned ? (a.legendary ? `${race.primary}10` : 'transparent') : 'rgba(255,255,255,0.02)',
                      opacity: a.earned ? 1 : 0.55,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Code>{a.earned ? (a.legendary ? '★' : '◆') : '🔒'}</Code>
                      <div style={{ fontFamily: ND.display, fontSize: 12, color: a.legendary ? race.primary : ND.text }}>{a.label}</div>
                    </div>
                    {a.detail && <Caption style={{ fontSize: 10, marginTop: 4 }}>{a.detail}</Caption>}
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        )}

        {tab === 'history' && (() => {
          // /battles/history → entries[] with shape:
          //   { id, outcome: 'won'|'lost'|'in-progress'|'pending',
          //     opponent, score, mvp, when }
          // Maps to the existing HistoryRow view-model. When the player
          // hasn't fought yet, render an honest empty state instead of the
          // fake "Khorvash / Malphas / Iron Grid" mock — that contradicts
          // the 0/0/0 counters above and confuses new players.
          //
          // Pending / in-progress entries are filtered out so the row count
          // matches the W/L counters in the stats tab (which only count
          // 'won' + 'lost').
          const rows: HistoryEntry[] = (liveHistory?.entries ?? [])
            .filter((e) => e.outcome === 'won' || e.outcome === 'lost')
            .map((e) => ({
              id: e.id,
              result: e.outcome === 'won' ? ('win' as const) : ('loss' as const),
              mode: 'PvP' as const,
              opponent: e.opponent,
              delta: e.score,
              unit: 'PUAN',
              when: e.when,
            }));
          return (
            <Panel race={race}>
              <div style={panelHeader()}>
                <Eyebrow color={race.primary}>SON SAVAŞLAR</Eyebrow>
                <Code>{rows.length}</Code>
              </div>
              {rows.length > 0 ? (
                <div>
                  {rows.map(h => (
                    <HistoryRow key={h.id} entry={h} race={race} />
                  ))}
                </div>
              ) : (
                <div style={{ padding: 16, textAlign: 'center' }}>
                  <Caption>
                    Henüz savaş kaydın yok. <Link href="/battle-prep" style={{ color: race.primary, textDecoration: 'underline' }}>İlk savaşa başla</Link> ve geçmişin burada belirsin.
                  </Caption>
                </div>
              )}
            </Panel>
          );
        })()}
      </div>

      <BottomNav
        race={race}
        active="more"
        onChange={(key) => router.push(BOTTOM_NAV_ROUTES[key] ?? '/settings')}
      />
    </Screen>
  );
}

/* ── pieces ───────────────────────────────────────────────────────────── */

function iconBtn(): React.CSSProperties {
  return {
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
  };
}

function panelHeader(): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderBottom: `1px solid ${ND.border}`,
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
  };
}

function QuickStat({ label, value, race }: { label: string; value: string; race: NDRace }) {
  return (
    <div
      style={{
        padding: 10,
        background: ND.surface,
        border: `1px solid ${ND.border}`,
        borderRadius: 4,
        textAlign: 'center',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Eyebrow>{label}</Eyebrow>
      <div style={{ fontFamily: ND.display, fontSize: 18, color: race.primary, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function RecordCell({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div
      style={{
        padding: 8,
        border: `1px solid ${ND.border}`,
        borderRadius: 4,
        textAlign: 'center',
      }}
    >
      <div style={{ fontFamily: ND.display, fontSize: 18, color: accent }}>{fmt(value)}</div>
      <Eyebrow>{label}</Eyebrow>
    </div>
  );
}

function DetailCell({ label, value, sub, race }: { label: string; value: string; sub: string; race: NDRace }) {
  return (
    <div
      style={{
        padding: 8,
        border: `1px solid ${ND.border}`,
        borderRadius: 4,
      }}
    >
      <Eyebrow>{label}</Eyebrow>
      <div style={{ fontFamily: ND.display, fontSize: 14, color: race.primary, marginTop: 4 }}>{value}</div>
      <Caption style={{ fontSize: 10 }}>{sub}</Caption>
    </div>
  );
}

function BuffRow({ buff, race }: { buff: BuffViewModel; race: NDRace }) {
  const pct = Math.max(0, Math.min(100, (buff.remainingSec / buff.totalSec) * 100));
  const urgent = pct < 20;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        border: `1px solid ${urgent ? ND.danger : ND.border}`,
        borderRadius: 4,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: ND.display, fontSize: 12, color: ND.text }}>{buff.label}</div>
        <div style={{ fontFamily: ND.mono, fontSize: 11, color: race.primary }}>{buff.effect}</div>
      </div>
      <Code style={{ color: urgent ? ND.danger : ND.textDim }}>⏱ {fmtDuration(buff.remainingSec)}</Code>
    </div>
  );
}

function HistoryRow({ entry, race }: { entry: HistoryEntry; race: NDRace }) {
  const color = entry.result === 'win' ? ND.ok : ND.danger;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '64px 1fr auto',
        gap: 8,
        padding: '10px 12px',
        borderBottom: `1px solid ${ND.border}`,
        alignItems: 'center',
      }}
    >
      <div>
        <Chip color={color}>{entry.result === 'win' ? 'ZAFER' : 'YENİLGİ'}</Chip>
        <Caption style={{ fontSize: 9, marginTop: 2 }}>{entry.mode}</Caption>
      </div>
      <div>
        <div style={{ fontFamily: ND.display, fontSize: 12, color: ND.text }}>
          vs {entry.opponent}
        </div>
        <Caption style={{ fontSize: 10 }}>{entry.when}</Caption>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: ND.mono, fontSize: 12, color }}>
          {entry.delta > 0 ? '+' : ''}
          {fmt(entry.delta)}
        </div>
        <Caption style={{ fontSize: 9 }}>{entry.unit}</Caption>
      </div>
    </div>
  );
}
