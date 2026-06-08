'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAlliances } from '@/hooks/useAlliances';
import { useAllianceWars, type AllianceWarDto } from '@/hooks/useAllianceWars';
import { useAllianceMembers } from '@/hooks/useAllianceMembers';
import { toFrontendRace, type BackendRace } from '@/lib/race-api';
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
  GatedButton,
  NDButton,
  NDModal,
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

// AllianceMember roster comes from the live GET /alliance/members endpoint
// (useAllianceMembers) — see the mapping inside the component. The old
// hardcoded 7-member demo array was removed (cycle-27 ALLIANCE-MEMBERS-STUB).

// Maps the backend AllianceRole enum to the FE's 3-tier label.
function roleLabel(role: string): AllianceMember['role'] {
  if (role === 'leader') return 'Lider';
  if (role === 'officer') return 'Subay';
  return 'Üye';
}

// Race fallback used when projecting backend wars into the WarCard shape.
// The /alliance-wars/:id endpoint only knows the opponent's id+tag+name —
// race ownership lives on the user, not the alliance, so for MVP we
// stamp every backend-projected opponent with 'insan' (neutral). Once the
// alliance entity gains a "primary race" column the projector picks that
// up instead.
const FALLBACK_RACE: NDRaceKey = 'insan';

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
  // Auth gate — without this guests landed here, the data hooks all
  // 401'd, and the page rendered with placeholder copy ("İTTİFAK YOK")
  // that looked like real empty state. Bounce to /login first.
  const ready = useRequireAuth();
  const race = useNDRace();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('genel');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [warModalOpen, setWarModalOpen] = useState(false);
  const [declaringWarOn, setDeclaringWarOn] = useState<string | null>(null);
  // Cycle 10 / CHAIN-09-A1: leave-flow state. The BE leave endpoint
  // (DELETE /api/v1/alliances/leave → alliance.controller.ts L83) has been
  // shipped since at least cycle 5, but no FE caller existed — players who
  // joined a guild had no way back out without a DB hit. `leaveModalOpen`
  // gates the NDModal confirm dialog; `leaving` blocks double-submits and
  // shows the inflight state in the modal's confirm button.
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  /**
   * Cycle 10 / CHAIN-09-A1: leave the player's current alliance.
   *
   * Closes the join → leave gameplay loop. Hits DELETE /alliances/leave
   * (alliance.controller.ts L83-89 → allianceService.leave(req.user.id)),
   * which removes the alliance_member row + clears profile.allianceTag.
   *
   * Post-success refresh chain mirrors handleJoin:
   *   1. refreshProfile()  → flips `hasAlliance` to false on next render so
   *                          the "İttifak Yok" empty state + discovery list
   *                          show up immediately (otherwise the player
   *                          stays staring at stale roster numbers).
   *   2. refreshWars()     → clears the Savaş tab list. Without this the
   *                          old projection still renders one render tick.
   *   3. setTab('genel')   → if the player triggered leave from the Genel
   *                          tab we just stay there, but normalising
   *                          ensures the post-leave empty-state banner is
   *                          visible regardless of where they were.
   *
   * Error surface: FetchError.message is the Turkish backend translation
   * from translateBackendError (lib/api.ts L90) — toast it verbatim so
   * "ittifak lideri ayrılamaz, devredilmeli" etc. surface to the player.
   */
  async function handleLeave() {
    if (leaving) return;
    setLeaving(true);
    try {
      await api.delete('/alliances/leave');
      toast.success('İttifaktan ayrıldın');
      setLeaveModalOpen(false);
      refreshProfile();
      refreshWars();
      setTab('genel');
    } catch (err) {
      const msg = err instanceof FetchError ? err.message : 'İttifaktan ayrılamadı';
      toast.error(msg);
    } finally {
      setLeaving(false);
    }
  }

  async function handleJoin(a: { id: string; name: string }) {
    if (joiningId) return;
    setJoiningId(a.id);
    try {
      await api.post('/alliances/join', { allianceId: a.id });
      toast.success(`${a.name} ittifakına katıldın`);
      // Cycle 8 / DRIFT-2: re-fetch /users/profile so `hasAlliance` flips
      // to true and the summary header/panels render the freshly-joined
      // guild on the next render. `useUserProfile` previously only fetched
      // on mount (deps: []), so without `refreshProfile()` the page stayed
      // wedged in the "İttifak Yok" empty state until the player reloaded
      // manually. `router.refresh()` alone doesn't help here — the data is
      // read client-side, not by a server component.
      refreshProfile();
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
  // `refresh` re-runs GET /users/profile so the next render reflects the
  // post-join guild context — see useUserProfile.ts JSDoc for the contract.
  // handleJoin below calls it on success so `hasAlliance` flips immediately
  // instead of waiting for a full reload. Any future leave/kick mutation
  // must invoke refreshProfile() the same way.
  const { profile, refresh: refreshProfile } = useUserProfile();
  const hasAlliance = Boolean(profile?.allianceTag);
  // Public alliance list — surfaces under "Henüz bir ittifaka katılmadın"
  // empty state so the player can scroll real options instead of clicking
  // a "yakında" button that goes nowhere.
  const { alliances: discoverableAlliances, loading: alliancesLoading } = useAlliances();

  // Resolve the player's own alliance id directly from the profile. After
  // the BLOCKER CHAIN-PROFILE-ALLIANCETAG-MISSING fix, GET /users/profile
  // LEFT JOINs alliance_members → alliances, so profile.allianceId is
  // authoritative whenever the player is in a guild. We fall back to a
  // tag-match against the public /alliances list only if the backend
  // somehow returned the tag without an id (defence-in-depth for older
  // cached responses or a partial join failure) — this keeps the page
  // from breaking during a rolling deploy.
  const myAllianceId = useMemo(() => {
    if (profile?.allianceId) return profile.allianceId;
    if (!profile?.allianceTag) return null;
    const own = discoverableAlliances.find((a) => a.tag === profile.allianceTag);
    return own?.id ?? null;
  }, [profile?.allianceId, profile?.allianceTag, discoverableAlliances]);

  // Real roster (cycle-27 ALLIANCE-MEMBERS-STUB). The member-scoped endpoint
  // derives the alliance from the JWT, so we only need to gate on membership.
  const { members: liveMembers } = useAllianceMembers(hasAlliance);
  const members: AllianceMember[] = useMemo(
    () =>
      liveMembers.map((m) => ({
        id: m.id,
        name: m.name,
        role: roleLabel(m.role),
        race: m.race ? (toFrontendRace(m.race as BackendRace) ?? 'insan') : 'insan',
        power: m.power,
        contribution: m.contribution,
      })),
    [liveMembers],
  );

  // Real wars list for the player's alliance. Falls back to [] for guests
  // and guildless players; the empty-state banner already handles those.
  const { wars: backendWars, loading: warsLoading, refresh: refreshWars } = useAllianceWars(myAllianceId);
  // Project backend AllianceWarDto rows into the WarEntry shape WarCard
  // expects. Status mapping: declared→preparing, active→active,
  // ended+winner-mine→won, ended+winner-other→lost. Scores come straight
  // from the DB columns. Per-war participation slots were removed (cycle-27
  // ALLIANCE-WARS-SLOT) — alliance_wars has no participant tracking, so the
  // old hardcoded 0/24 bar + the fake "Katıl" join were phantom UI.
  const projectedWars: WarEntry[] = useMemo(() => {
    return backendWars.map((w) => {
      const iAmAttacker = w.attackerId === myAllianceId;
      const opp = iAmAttacker ? w.defender : w.attacker;
      const ours = iAmAttacker ? w.attackerScore : w.defenderScore;
      const theirs = iAmAttacker ? w.defenderScore : w.attackerScore;
      let status: WarEntry['status'];
      if (w.status === 'declared' || w.status === 'truce') status = 'preparing';
      else if (w.status === 'active') status = 'active';
      else if (w.winnerId && w.winnerId === myAllianceId) status = 'won';
      else status = 'lost';
      return {
        id: w.id,
        opponent: opp?.name ?? 'Bilinmeyen',
        opponentTag: opp?.tag ?? '???',
        opponentRace: FALLBACK_RACE,
        ours,
        theirs,
        endsIn: w.endsAt ? '—' : (w.status === 'declared' ? 'Hazırlık' : '—'),
        status,
      };
    });
  }, [backendWars, myAllianceId]);

  // Eligible declaration targets — every public alliance that isn't the
  // player's own and isn't already in an active/declared war with them.
  const warTargets = useMemo(() => {
    if (!myAllianceId) return [];
    const blocked = new Set(
      backendWars
        .filter((w) => w.status === 'declared' || w.status === 'active')
        .map((w) => (w.attackerId === myAllianceId ? w.defenderId : w.attackerId)),
    );
    return discoverableAlliances.filter(
      (a) => a.id !== myAllianceId && !blocked.has(a.id),
    );
  }, [discoverableAlliances, myAllianceId, backendWars]);

  async function handleDeclareWar(target: { id: string; name: string; tag: string }) {
    if (declaringWarOn) return;
    setDeclaringWarOn(target.id);
    try {
      await api.post('/alliance-wars', { targetAllianceId: target.id });
      toast.success(`[${target.tag}] ${target.name} ittifakına savaş ilan edildi`);
      setWarModalOpen(false);
      refreshWars();
    } catch (err) {
      const msg = err instanceof FetchError ? err.message : 'Savaş ilan edilemedi';
      toast.error(msg);
    } finally {
      setDeclaringWarOn(null);
    }
  }

  // Cycle 8 / DRIFT-1: the player's actual guild name/tag live on the
  // profile (LEFT JOIN alliance_members → alliances). `race.allianceName`
  // is a cosmetic lore string from the race catalog and must not be used
  // as a substitute when the player has actually joined a guild.
  const summary = {
    name: profile?.allianceName ?? 'İttifak Yok',
    tag: profile?.allianceTag ?? '—',
    tier: hasAlliance ? 'BÜYÜK İTTİFAK' : '—',
    tierScore: hasAlliance ? 24_120 : 0,
    memberCount: hasAlliance ? members.length : 0,
    capacity: 50,
    weeklyRank: hasAlliance ? 5 : 0,
    weeklyDonations: hasAlliance ? 184_000 : 0,
    raidAttendance: hasAlliance ? 14 : 0,
    controlledSectors: hasAlliance ? 9 : 0,
    totalSectors: 12,
    researchName: hasAlliance ? 'Genom Optimizasyonu' : '—',
    researchPct: hasAlliance ? 62 : 0,
  };

  if (!ready) return null;

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
          {/* Cycle 8 / DRIFT-1: read from profile, not race. The race
              catalog's allianceTag/Name are cosmetic lore — they would
              otherwise show "INS · İTTİFAK / Insan Konseyi" to a guildless
              player and look like real membership. */}
          <Eyebrow color={race.primary}>{profile?.allianceTag ?? '—'} · İTTİFAK</Eyebrow>
          <H2 style={{ marginTop: 2 }}>{profile?.allianceName ?? 'İttifak Yok'}</H2>
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
                    {/* Joining an alliance is Çağ 3+ gameplay per the
                       story bible. Pre-age-3 players see the row but the
                       chip exposes "Çağ 3 gerekli" inline + a tap modal,
                       instead of letting them tap and bounce off the
                       backend guard. */}
                    <GatedButton
                      race={race}
                      variant="outline"
                      gateId="guild.join"
                      forceDisabled={joiningId === a.id}
                      onClick={() => handleJoin({ id: a.id, name: a.name })}
                    >
                      {joiningId === a.id ? 'Katılıyor…' : 'Katıl'}
                    </GatedButton>
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
              {/* Cycle 10 / CHAIN-09-A1: Leave-alliance action. Only
               *  rendered when `hasAlliance` is true so guildless players
               *  don't see a disabled "ayrıl" button on the discovery
               *  view. Sits inside the summary NotchPanel because Genel
               *  is the canonical alliance hub — surfacing it elsewhere
               *  (e.g. Üyeler tab) duplicates a destructive control. The
               *  confirm step uses NDModal (see leaveModalOpen render
               *  below) — destructive verbs must never one-tap-fire. */}
              {hasAlliance && (
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <NDButton
                    race={race}
                    variant="danger"
                    size="sm"
                    onClick={() => setLeaveModalOpen(true)}
                  >
                    İttifaktan Ayrıl
                  </NDButton>
                </div>
              )}
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
            {warsLoading && projectedWars.length === 0 && (
              <Caption style={{ padding: 12, textAlign: 'center' }}>
                Savaş geçmişi yükleniyor…
              </Caption>
            )}
            {!warsLoading && projectedWars.length === 0 && (
              <NotchPanel race={race}>
                <Eyebrow color={race.primary}>SAVAŞ YOK</Eyebrow>
                <H3 style={{ marginTop: 6, color: ND.text }}>
                  Henüz savaş ilan edilmedi
                </H3>
                <Caption style={{ marginTop: 6 }}>
                  Bir hedef ittifak seçerek ilk savaşı başlatabilirsin.
                </Caption>
              </NotchPanel>
            )}
            {projectedWars.map((w) => (
              <WarCard key={w.id} war={w} myRace={race} />
            ))}
            <GatedButton
              race={race}
              full
              variant="primary"
              gateId="alliance.war.declare"
              onClick={() => setWarModalOpen(true)}
            >
              İttifak Savaşı Bildir
            </GatedButton>
          </>
        )}

        {warModalOpen && (
          <DeclareWarModal
            race={race}
            targets={warTargets}
            busyId={declaringWarOn}
            onCancel={() => setWarModalOpen(false)}
            onPick={handleDeclareWar}
          />
        )}

        {/* Cycle 10 / CHAIN-09-A1: leave-alliance confirm. NDModal already
         *  handles ESC + backdrop dismissal + body scroll lock, so we only
         *  need to provide the two CTAs. While leaving=true both buttons
         *  stay mounted but the confirm button label flips and the cancel
         *  button is disabled so a mid-flight cancel can't leave the modal
         *  in an inconsistent state (request still resolves, profile then
         *  refreshes, hasAlliance flips, and the modal would close on its
         *  own — but disallowing the cancel button keeps the UX honest). */}
        <NDModal
          race={race}
          open={leaveModalOpen}
          onClose={() => {
            if (leaving) return;
            setLeaveModalOpen(false);
          }}
          eyebrow="İTTİFAK"
          title="Ayrılma Onayı"
          actions={
            <>
              <NDButton
                race={race}
                variant="ghost"
                full
                onClick={() => setLeaveModalOpen(false)}
                disabled={leaving}
              >
                Vazgeç
              </NDButton>
              <NDButton
                race={race}
                variant="danger"
                full
                onClick={handleLeave}
                disabled={leaving}
              >
                {leaving ? 'Ayrılıyor…' : 'Ayrıl'}
              </NDButton>
            </>
          }
        >
          <Caption>
            <strong style={{ color: ND.text }}>{summary.name}</strong>{' '}
            ittifakından ayrılmak istediğine emin misin? Ayrıldıktan sonra
            ortak araştırma, depo ve aktif savaş katkıların kaybolur. Tekrar
            katılmak için ittifak listesinden başvurman gerekir.
          </Caption>
        </NDModal>

        {tab === 'uyeler' && hasAlliance && (
          <Panel race={race}>
            <div style={panelHeader()}>
              <Eyebrow color={race.primary}>ÜYELER</Eyebrow>
              <Code>{members.length}</Code>
            </div>
            <div>
              {members.length === 0 ? (
                <Caption style={{ display: 'block', padding: '14px 12px', textAlign: 'center' }}>
                  Üye listesi yükleniyor…
                </Caption>
              ) : (
                members.map(m => <MemberRow key={m.id} member={m} />)
              )}
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
        {war.status === 'preparing' && (
          <Caption>Henüz başlamadı</Caption>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <NDButton
            race={myRace}
            variant="primary"
            full
            onClick={() => toast.info('Savaşa katılma yakında geliyor')}
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
      {/* No presence dot — the game has no online/presence tracking, so a
          green/grey status would be fabricated (cycle-27 ALLIANCE-MEMBERS-STUB). */}
      <Sigil race={r} size={28} />
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

/* Declare-war modal — fixed overlay that lists eligible target alliances
 * pulled from the public /alliances endpoint, filtered by the parent to
 * exclude the player's own alliance and any pairs already in an
 * active/declared war. Clicking a row fires POST /alliance-wars and the
 * parent handles the toast + tab refresh on success. */
function DeclareWarModal({
  race,
  targets,
  busyId,
  onCancel,
  onPick,
}: {
  race: NDRace;
  targets: Array<{ id: string; name: string; tag: string; memberCount?: number }>;
  busyId: string | null;
  onCancel: () => void;
  onPick: (target: { id: string; name: string; tag: string }) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2,4,8,0.78)',
        backdropFilter: 'blur(4px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '78dvh',
          display: 'flex',
          flexDirection: 'column',
          background: ND.surface,
          border: `1px solid ${race.primary}`,
          boxShadow: `0 0 32px -8px ${race.glow}`,
          borderRadius: 4,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 14px',
            borderBottom: `1px solid ${ND.border}`,
          }}
        >
          <div>
            <Eyebrow color={race.primary}>İLAN HEDEFİ</Eyebrow>
            <H3 style={{ marginTop: 2, color: ND.text }}>
              Savaş Bildir
            </H3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Kapat"
            style={{
              ...iconBtn(),
              cursor: 'pointer',
              background: 'transparent',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {targets.length === 0 && (
            <Caption style={{ padding: 16, textAlign: 'center' }}>
              Şu anda savaş ilan edilebilecek ittifak yok.
            </Caption>
          )}
          {targets.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={busyId === t.id}
              onClick={() => onPick({ id: t.id, name: t.name, tag: t.tag })}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 8,
                alignItems: 'center',
                width: '100%',
                padding: '12px 14px',
                borderBottom: `1px solid ${ND.border}`,
                background: 'transparent',
                cursor: busyId === t.id ? 'wait' : 'pointer',
                textAlign: 'left',
                color: ND.text,
                fontFamily: ND.display,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13 }}>{t.name}</div>
                <Caption style={{ fontSize: 10 }}>[{t.tag}]</Caption>
              </div>
              <Code style={{ color: busyId === t.id ? ND.textDim : race.primary }}>
                {busyId === t.id ? 'İlan ediliyor…' : 'BİLDİR'}
              </Code>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
