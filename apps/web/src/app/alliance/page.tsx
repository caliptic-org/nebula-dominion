'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAlliances } from '@/hooks/useAlliances';
import {
  RACES,
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
  NDButton,
  BottomNav,
  toast,
  useNDRace,
  type NDRace,
  type NDRaceKey,
} from '@/components/handoff';
import { api, FetchError } from '@/lib/api';

type Tab = 'genel' | 'savas' | 'uyeler' | 'haberler';

interface AllianceMember {
  id: string;
  name: string;
  role: 'Lider' | 'Subay' | 'Üye';
  race: NDRaceKey;
  power: number;
  contribution: number;
  online: boolean;
}

interface WarEntry {
  id: string;
  opponent: string;
  opponentTag: string;
  opponentRace: NDRaceKey;
  ours: number;
  theirs: number;
  endsIn: string;
  status: 'preparing' | 'active' | 'won' | 'lost';
  slots: { filled: number; total: number };
}

interface Objective {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  contributors: number;
  reward: string;
}

const MEMBERS: AllianceMember[] = [
  { id: 'm1', name: 'A. Voss',         role: 'Lider',  race: 'insan',   power: 142_800, contribution: 18_420, online: true  },
  { id: 'm2', name: 'Chen',            role: 'Subay',  race: 'insan',   power: 118_400, contribution: 14_120, online: true  },
  { id: 'm3', name: 'Reyes',           role: 'Subay',  race: 'insan',   power: 102_800, contribution: 11_400, online: false },
  { id: 'm4', name: 'Phantom',         role: 'Üye',    race: 'insan',   power:  88_100, contribution:  9_220, online: true  },
  { id: 'm5', name: 'Wolfe',           role: 'Üye',    race: 'otomat',  power:  74_500, contribution:  7_100, online: false },
  { id: 'm6', name: 'Stride',          role: 'Üye',    race: 'canavar', power:  68_900, contribution:  6_840, online: true  },
  { id: 'm7', name: 'Lyra',            role: 'Üye',    race: 'zerg',    power:  55_200, contribution:  4_980, online: false },
];

const WARS: WarEntry[] = [
  {
    id: 'w1',
    opponent: 'Kovan Bilinci',
    opponentTag: 'KVN',
    opponentRace: 'zerg',
    ours: 4_220,
    theirs: 3_980,
    endsIn: '2g 4s',
    status: 'active',
    slots: { filled: 18, total: 24 },
  },
  {
    id: 'w2',
    opponent: 'Karanlık Mahkeme',
    opponentTag: 'MHK',
    opponentRace: 'seytan',
    ours: 0,
    theirs: 0,
    endsIn: '6s',
    status: 'preparing',
    slots: { filled: 6, total: 24 },
  },
];

const OBJECTIVES: Objective[] = [
  { id: 'o1', title: 'Sektör Fethi',       current: 9,  target: 12, unit: 'sektör',   contributors: 11, reward: '+25 İttifak Tier Puanı' },
  { id: 'o2', title: 'Haftalık Bağış',     current: 184_000, target: 250_000, unit: 'mineral', contributors: 18, reward: '+10% Kaynak Buff' },
  { id: 'o3', title: 'Raid Boss',          current: 3,  target: 5,  unit: 'kill',     contributors: 14, reward: 'Sandık × 5' },
];

const ALLIANCE_LOG = [
  { id: 'l1', when: '12 dk', text: 'Phantom 1.200 mineral bağışladı.' },
  { id: 'l2', when: '38 dk', text: 'KVN ittifakıyla aktif savaş başladı.' },
  { id: 'l3', when: '2 sa',  text: 'Voss yeni sektör fethetti: NEBULA-7.' },
  { id: 'l4', when: '4 sa',  text: 'Yeni üye Stride loncaya katıldı.' },
  { id: 'l5', when: 'Dün',   text: 'Haftalık raid başarıyla bitirildi (zorluk: zor).' },
];

function fmt(n: number) {
  return new Intl.NumberFormat().format(n);
}

const BOTTOM_NAV_ROUTES: Record<string, string> = {
  base:     '/base',
  map:      '/map',
  settings: '/settings',
  alliance: '/alliance',
  shop:     '/shop',
};

export default function AlliancePage() {
  const race = useNDRace();
  const router = useRouter();
  const tAlliance = useTranslations('alliance');
  const [tab, setTab] = useState<Tab>('genel');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  async function handleJoin(a: { id: string; name: string }) {
    if (joiningId) return;
    setJoiningId(a.id);
    try {
      await api.post('/alliances/join', { allianceId: a.id });
      toast.success(`${a.name} ittifakına katıldın`);
      // Refresh profile-derived "hasAlliance" so the empty state disappears
      // and the summary panels render with the new allianceTag on the very
      // next render — router.refresh() re-runs server components which
      // useUserProfile reads from. (No-op for client-only renders.)
      router.refresh();
    } catch (err) {
      const msg = err instanceof FetchError ? err.message : 'İttifağa katılamadı';
      toast.error(msg);
    } finally {
      setJoiningId(null);
    }
  }
  // Live profile — drives the "henüz bir ittifaka katılmadın" empty state
  // when the player has no allianceTag, and pulls the player's actual
  // guild tag/name into the header when they do. Member roster, wars,
  // and ortak objectives are still demo data — backend guild endpoints
  // for those are next, but at minimum the page should stop pretending
  // every player is in a 7-member alliance from day 1.
  const { profile } = useUserProfile();
  const hasAlliance = Boolean(profile?.allianceTag);
  // Public alliance list — surfaces under "Henüz bir ittifaka katılmadın"
  // empty state so the player can scroll real options instead of clicking
  // a "yakında" button that goes nowhere.
  const { alliances: discoverableAlliances, loading: alliancesLoading } = useAlliances();

  const summary = {
    name: profile?.allianceTag ? race.allianceName : 'İttifak Yok',
    tag: profile?.allianceTag ?? '—',
    tier: hasAlliance ? 'BÜYÜK İTTİFAK' : '—',
    tierScore: hasAlliance ? 24_120 : 0,
    memberCount: hasAlliance ? MEMBERS.length : 0,
    capacity: 50,
    weeklyRank: hasAlliance ? 5 : 0,
    weeklyDonations: hasAlliance ? 184_000 : 0,
    raidAttendance: hasAlliance ? 14 : 0,
    controlledSectors: hasAlliance ? 9 : 0,
    totalSectors: 12,
    researchName: hasAlliance ? 'Genom Optimizasyonu' : '—',
    researchPct: hasAlliance ? 62 : 0,
  };

  return (
    <Screen race={race} style={{ height: '100dvh' }}>
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
        <Link href="/base" aria-label="Geri" style={iconBtn()}>‹</Link>
        <Sigil race={race} size={28} glow />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow color={race.primary}>{race.allianceTag} · İTTİFAK</Eyebrow>
          <H2 style={{ marginTop: 2 }}>{race.allianceName}</H2>
        </div>
        <Link href="/chat?tab=guild" aria-label="Lonca Salonu" style={iconBtn()}>💬</Link>
      </header>

      <div role="tablist" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: '12px 16px 0' }}>
        {(['genel', 'savas', 'uyeler', 'haberler'] as Tab[]).map(t => {
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
              {t === 'genel' ? 'Genel' : t === 'savas' ? 'Savaş' : t === 'uyeler' ? 'Üyeler' : 'Haberler'}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* No-alliance empty state — shown above tab content so the
         *  player understands the numbers below are placeholder until
         *  they actually join a guild. Honest > "fake 7 members" */}
        {!hasAlliance && (
          <>
            <NotchPanel race={race}>
              <Eyebrow color={race.primary}>İTTİFAK YOK</Eyebrow>
              <H3 style={{ marginTop: 6, color: ND.text }}>Henüz bir ittifaka katılmadın</H3>
              <Caption style={{ marginTop: 6 }}>
                İttifak haftalık raid, ortak araştırma ve savaş katılımı
                sağlar. Aşağıdaki sayfa içeriği <strong>örnek görünüm</strong>
                — gerçek üye, savaş ve hedef verileri ittifaka katılınca
                gelir.
              </Caption>
            </NotchPanel>
            {/* Live discovery — pulls public /alliances. Render up to 5
              * so the panel doesn't dominate the page; player can scroll
              * to "Daha fazla" once an alliance directory route lands. */}
            <Panel race={race}>
              <div style={panelHeader()}>
                <Eyebrow color={race.primary}>KEŞFET</Eyebrow>
                <Code>
                  {alliancesLoading
                    ? '…'
                    : `${discoverableAlliances.length} ittifak`}
                </Code>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {alliancesLoading && (
                  <Caption style={{ padding: 12, textAlign: 'center' }}>
                    Yükleniyor…
                  </Caption>
                )}
                {!alliancesLoading && discoverableAlliances.length === 0 && (
                  <Caption style={{ padding: 12, textAlign: 'center' }}>
                    Henüz keşfedilebilir ittifak yok. İlk ittifakı kuran sen ol.
                  </Caption>
                )}
                {discoverableAlliances.slice(0, 5).map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: 8,
                      padding: '10px 12px',
                      borderBottom: `1px solid ${ND.border}`,
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: ND.display, fontSize: 12, color: ND.text }}>
                        {a.name}
                      </div>
                      <Caption style={{ fontSize: 10 }}>[{a.tag}]</Caption>
                    </div>
                    <Code style={{ color: ND.textDim }}>
                      {a.memberCount ?? '?'} üye
                    </Code>
                    <NDButton
                      race={race}
                      variant="outline"
                      disabled={joiningId === a.id}
                      onClick={() => handleJoin({ id: a.id, name: a.name })}
                    >
                      {joiningId === a.id ? 'Katılıyor…' : 'Katıl'}
                    </NDButton>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}
        {tab === 'genel' && (
          <>
            <NotchPanel race={race}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 6,
                    background: `linear-gradient(180deg, ${race.primary}33, transparent)`,
                    border: `2px solid ${race.primary}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 18px -4px ${race.glow}`,
                  }}
                >
                  <Sigil race={race} size={32} glow />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <H3 style={{ color: ND.text }}>{summary.name}</H3>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <Chip color={race.primary}>[{summary.tag}]</Chip>
                    <Chip color={race.primary}>{summary.tier}</Chip>
                  </div>
                  <Caption style={{ marginTop: 6 }}>
                    {race.motto} · Sezon hedefi <span style={{ color: race.primary }}>{race.seasonGoal}</span>
                  </Caption>
                </div>
              </div>
            </NotchPanel>

            {/* Stat row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <StatTile label="HAFTA SIRA" value={`#${summary.weeklyRank}`} race={race} />
              <StatTile label="TIER PUAN" value={fmt(summary.tierScore)} race={race} />
              <StatTile label="ÜYE" value={`${summary.memberCount}/${summary.capacity}`} race={race} />
              <StatTile label="SEKTÖR" value={`${summary.controlledSectors}/${summary.totalSectors}`} race={race} />
            </div>

            {/* Capacity */}
            <Panel race={race}>
              <div style={panelHeader()}>
                <Eyebrow color={race.primary}>ÜYE KAPASİTESİ</Eyebrow>
                <Code>{summary.memberCount}/{summary.capacity}</Code>
              </div>
              <div style={{ padding: 12 }}>
                <Bar value={Math.round((summary.memberCount / summary.capacity) * 100)} color={race.primary} />
              </div>
            </Panel>

            {/* Research */}
            <Panel race={race}>
              <div style={panelHeader()}>
                <Eyebrow color={race.primary}>AKTİF ARAŞTIRMA</Eyebrow>
                <Code>%{summary.researchPct}</Code>
              </div>
              <div style={{ padding: 12 }}>
                <H3 style={{ color: race.primary }}>{summary.researchName}</H3>
                <Bar value={summary.researchPct} color={race.primary} />
                <Caption style={{ marginTop: 6 }}>
                  Tamamlanınca ittifaka <strong>kalıcı buff</strong> aktif olur.
                </Caption>
              </div>
            </Panel>

            {/* Shared objectives */}
            <Panel race={race}>
              <div style={panelHeader()}>
                <Eyebrow color={race.primary}>ORTAK HEDEFLER</Eyebrow>
                <Code>{OBJECTIVES.length}</Code>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
                {OBJECTIVES.map(o => (
                  <ObjectiveRow key={o.id} objective={o} race={race} />
                ))}
              </div>
            </Panel>
          </>
        )}

        {/* War / member / news tabs only render when the player actually has
         *  an alliance — otherwise we'd show the fake 7-member roster + the
         *  KVN war as if they were the player's. The Genel tab is safe
         *  because `summary` zeros out fields when hasAlliance is false. */}
        {tab === 'savas' && hasAlliance && (
          <>
            {WARS.map(w => (
              <WarCard key={w.id} war={w} myRace={race} />
            ))}
            <NDButton
              race={race}
              full
              onClick={() => toast.info(tAlliance('warSoonHint'))}
            >
              İttifak Savaşı Bildir
            </NDButton>
          </>
        )}

        {tab === 'uyeler' && hasAlliance && (
          <Panel race={race}>
            <div style={panelHeader()}>
              <Eyebrow color={race.primary}>ÜYELER</Eyebrow>
              <Code>{MEMBERS.length}</Code>
            </div>
            <div>
              {MEMBERS.map(m => (
                <MemberRow key={m.id} member={m} />
              ))}
            </div>
          </Panel>
        )}

        {/* Guildless empty states for the non-Genel tabs. The Genel tab gets
         *  its own banner above + the discovery list. These three tabs
         *  silently fall back to a single-line nudge so the player isn't
         *  staring at a blank screen. */}
        {!hasAlliance && tab !== 'genel' && (
          <NotchPanel race={race}>
            <Eyebrow color={race.primary}>İTTİFAK YOK</Eyebrow>
            <H3 style={{ marginTop: 6, color: ND.text }}>
              {tab === 'savas' ? 'Savaş geçmişi yok' :
                tab === 'uyeler' ? 'Üye listesi yok' :
                'Olay günlüğü yok'}
            </H3>
            <Caption style={{ marginTop: 6 }}>
              Bu içerik bir ittifaka katıldıktan sonra gelir. <strong>Genel</strong>
              {' '}sekmesindeki keşif listesinden katılabilirsin.
            </Caption>
          </NotchPanel>
        )}

        {tab === 'haberler' && (
          <Panel race={race}>
            <div style={panelHeader()}>
              <Eyebrow color={race.primary}>OLAY GÜNLÜĞÜ</Eyebrow>
            </div>
            <div>
              {ALLIANCE_LOG.map(l => (
                <div
                  key={l.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '64px 1fr',
                    gap: 10,
                    padding: '10px 12px',
                    borderBottom: `1px solid ${ND.border}`,
                  }}
                >
                  <Code style={{ color: ND.textDim }}>{l.when}</Code>
                  <Caption style={{ color: ND.text }}>{l.text}</Caption>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>

      <BottomNav
        race={race}
        active="alliance"
        onChange={(key) => router.push(BOTTOM_NAV_ROUTES[key] ?? '/base')}
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
    padding: '10px 6px',
    fontFamily: ND.display,
    fontSize: 10,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    background: on ? `linear-gradient(180deg, ${race.primary}28, ${race.primary}10)` : 'transparent',
    border: `1px solid ${on ? race.primary : ND.border}`,
    color: on ? race.primary : ND.textDim,
    borderRadius: 3,
    cursor: 'pointer',
  };
}

function StatTile({ label, value, race }: { label: string; value: string; race: NDRace }) {
  return (
    <div
      style={{
        padding: 12,
        background: ND.surface,
        border: `1px solid ${race.primary}33`,
        borderRadius: 4,
        backdropFilter: 'blur(8px)',
      }}
    >
      <Eyebrow>{label}</Eyebrow>
      <div style={{ fontFamily: ND.display, fontSize: 20, color: race.primary, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function ObjectiveRow({ objective, race }: { objective: Objective; race: NDRace }) {
  const pct = Math.min(100, Math.round((objective.current / objective.target) * 100));
  return (
    <div style={{ padding: 8, border: `1px solid ${ND.border}`, borderRadius: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: ND.display, fontSize: 12, color: ND.text }}>{objective.title}</div>
        <Code style={{ color: race.primary }}>{pct}%</Code>
      </div>
      <div style={{ marginTop: 6 }}>
        <Bar
          value={pct}
          color={race.primary}
          label={`${fmt(objective.current)} / ${fmt(objective.target)} ${objective.unit}`}
          trailing={`${objective.contributors} katılımcı`}
        />
      </div>
      <Caption style={{ marginTop: 4, fontSize: 10 }}>Ödül: {objective.reward}</Caption>
    </div>
  );
}

function WarCard({ war, myRace }: { war: WarEntry; myRace: NDRace }) {
  const tAlliance = useTranslations('alliance');
  const opp = RACES[war.opponentRace];
  const statusColor =
    war.status === 'active' ? ND.warn :
    war.status === 'preparing' ? myRace.primary :
    war.status === 'won' ? ND.ok : ND.danger;
  const statusLabel =
    war.status === 'active' ? 'AKTİF' :
    war.status === 'preparing' ? 'HAZIRLIK' :
    war.status === 'won' ? 'KAZANILDI' : 'KAYBEDİLDİ';
  const total = war.ours + war.theirs;
  const oursPct = total > 0 ? (war.ours / total) * 100 : 50;
  return (
    <Panel race={myRace}>
      <div style={panelHeader()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Chip color={statusColor}>{statusLabel}</Chip>
          <H3 style={{ color: ND.text }}>vs {war.opponent}</H3>
        </div>
        <Code style={{ color: ND.warn }}>⏱ {war.endsIn}</Code>
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sigil race={myRace} size={28} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: ND.textDim, marginBottom: 4, fontFamily: ND.mono }}>
              <span style={{ color: myRace.primary }}>{fmt(war.ours)} BİZ</span>
              <span style={{ color: opp.primary }}>{fmt(war.theirs)} {war.opponentTag}</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', border: `1px solid ${ND.border}`, position: 'relative', overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${oursPct}%`,
                  background: `linear-gradient(90deg, ${myRace.primary}88, ${myRace.primary})`,
                  boxShadow: `0 0 8px ${myRace.glow}99`,
                }}
              />
            </div>
          </div>
          <Sigil race={opp} size={28} />
        </div>
        <Caption>
          Slot: <strong style={{ color: myRace.primary }}>{war.slots.filled}/{war.slots.total}</strong>
          {war.status === 'preparing' && ' · Henüz başlamadı'}
        </Caption>
        <div style={{ display: 'flex', gap: 8 }}>
          <NDButton
            race={myRace}
            variant="primary"
            full
            onClick={() => toast.success(`${war.opponentTag} savaşına katıldın — slot ${war.slots.filled + 1}/${war.slots.total}`)}
          >
            Katıl
          </NDButton>
          <NDButton
            race={myRace}
            variant="outline"
            onClick={() => toast.info(tAlliance('strategyRoomSoon', { tag: war.opponentTag }))}
          >
            Strateji
          </NDButton>
        </div>
      </div>
    </Panel>
  );
}

function MemberRow({ member }: { member: AllianceMember }) {
  const r = RACES[member.race];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr auto auto',
        gap: 8,
        padding: '10px 12px',
        borderBottom: `1px solid ${ND.border}`,
        alignItems: 'center',
      }}
    >
      <div style={{ position: 'relative' }}>
        <Sigil race={r} size={28} />
        <div
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: member.online ? ND.ok : ND.textMute,
            border: `1px solid ${ND.bg}`,
          }}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: ND.display, fontSize: 12, color: ND.text }}>{member.name}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10, color: ND.textDim }}>
          <span style={{ color: r.primary }}>{r.short}</span>
          <span>·</span>
          <span>{member.role}</span>
        </div>
      </div>
      <Code style={{ color: r.primary }}>{member.power.toLocaleString()}</Code>
      <Code style={{ color: ND.textDim }}>+{member.contribution.toLocaleString()}</Code>
    </div>
  );
}
