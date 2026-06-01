'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  NDButton,
  BottomNav,
  useNDRace,
  type NDRace,
} from '@/components/handoff';
import { useMissionClaims, useMissions, type Quest } from '@/hooks/useMissions';
import { useUserProfile } from '@/hooks/useUserProfile';
import { refreshGameResources } from '@/hooks/useGameResources';
import { toast } from '@/components/handoff/Toaster';
import { api, FetchError } from '@/lib/api';

type Tab = 'story' | 'daily' | 'weekly' | 'achievement';
type State = 'active' | 'completed' | 'locked';
type Difficulty = 'kolay' | 'orta' | 'zor' | 'efsane';

interface Reward {
  label: string;
  amount: number;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  state: State;
  progress: number;
  progressLabel: string;
  timeLeft?: string;
  rewards: Reward[];
  category: Tab;
  difficulty?: Difficulty;
  chapter?: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  legendary?: boolean;
  progress?: number;
}

const MISSIONS: Mission[] = [
  { id: 'story-1', title: "Nebula'nın Uyanışı", description: 'İlk üssünü kur ve komutanını seç.', state: 'completed', progress: 100, progressLabel: '1/1', rewards: [{ label: 'Kaynak', amount: 5000 }, { label: 'XP', amount: 1200 }], category: 'story', difficulty: 'kolay', chapter: 1 },
  { id: 'story-2', title: 'İlk Kan', description: 'Yakındaki düşman üssüne saldır ve ilk savaş zaferini kazan.', state: 'active', progress: 60, progressLabel: '3/5', rewards: [{ label: 'Kaynak', amount: 8000 }, { label: 'XP', amount: 2500 }], category: 'story', difficulty: 'orta', chapter: 1 },
  { id: 'story-3', title: 'İttifak ya da Kan', description: 'Başka bir ırkla diplomatik ilişki kur veya savaş ilan et.', state: 'locked', progress: 0, progressLabel: '0/1', rewards: [{ label: 'Enerji', amount: 10000 }, { label: 'XP', amount: 5000 }], category: 'story', difficulty: 'zor', chapter: 2 },
  { id: 'story-4', title: 'Nebula Hâkimi', description: 'Tüm galaksiye hükmeden tek ırk ol.', state: 'locked', progress: 0, progressLabel: '0/1', rewards: [{ label: 'Rozet', amount: 1 }, { label: 'XP', amount: 50000 }], category: 'story', difficulty: 'efsane', chapter: 3 },
  { id: 'daily-1', title: 'Kaynak Toplayıcı', description: '3 madeni tamamen topla.', state: 'completed', progress: 100, progressLabel: '3/3', timeLeft: '—', rewards: [{ label: 'Kaynak', amount: 2000 }], category: 'daily', difficulty: 'kolay' },
  { id: 'daily-2', title: 'Savaşçı Ruhu', description: 'En az 2 PvP savaşı kazan.', state: 'active', progress: 50, progressLabel: '1/2', timeLeft: '14s 23d', rewards: [{ label: 'XP', amount: 800 }], category: 'daily', difficulty: 'orta' },
  { id: 'daily-3', title: 'Araştırmacı Zihni', description: '1 teknoloji araştırması tamamla.', state: 'active', progress: 0, progressLabel: '0/1', timeLeft: '14s 23d', rewards: [{ label: 'Enerji', amount: 1000 }], category: 'daily', difficulty: 'kolay' },
  { id: 'weekly-1', title: 'Savaş Makinesi', description: 'Bu hafta 15 düşman birimi yok et.', state: 'active', progress: 47, progressLabel: '7/15', timeLeft: '4g 18s', rewards: [{ label: 'Kaynak', amount: 15000 }, { label: 'XP', amount: 10000 }], category: 'weekly', difficulty: 'zor' },
  { id: 'weekly-2', title: 'İmparatorluk İnşacısı', description: 'Bu hafta 5 yeni yapı inşa et.', state: 'active', progress: 80, progressLabel: '4/5', timeLeft: '4g 18s', rewards: [{ label: 'Kaynak', amount: 10000 }, { label: 'XP', amount: 6000 }], category: 'weekly', difficulty: 'orta' },
];

const ACHIEVEMENTS: Achievement[] = [
  { id: 'ach-1', title: 'İlk Kan', description: 'İlk savaş zaferini kazan', unlocked: true },
  { id: 'ach-2', title: 'Kaynak Efendisi', description: '100.000 mineral topla', unlocked: true },
  { id: 'ach-3', title: 'Savaş Tanrısı', description: '1000 düşman birimi yok et', unlocked: false, legendary: true, progress: 34 },
  { id: 'ach-4', title: 'Kaşif', description: "Haritanın %50'sini keşfet", unlocked: false, progress: 62 },
  { id: 'ach-5', title: 'Diplomat', description: '3 farklı ırkla ittifak kur', unlocked: false, progress: 33 },
  { id: 'ach-6', title: 'Teknoloji Dehası', description: "Tüm tech tree'yi tamamla", unlocked: false, legendary: true, progress: 0 },
];

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  kolay: ND.ok,
  orta: ND.warn,
  zor: ND.danger,
  efsane: 'oklch(0.72 0.26 340)',
};

const DAILY_STREAK = 7;

function useDailyCountdown(): string {
  const [t, setT] = useState({ h: 14, m: 23, s: 0 });
  useEffect(() => {
    const id = setInterval(() => {
      setT(prev => {
        const total = prev.h * 3600 + prev.m * 60 + prev.s - 1;
        const safe = total < 0 ? 23 * 3600 + 59 * 60 + 59 : total;
        return { h: Math.floor(safe / 3600), m: Math.floor((safe % 3600) / 60), s: safe % 60 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return `${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}:${String(t.s).padStart(2, '0')}`;
}

/* Map a backend Quest (from /daily/quests) onto the Mission shape that the
 * existing UI was already wired to render. The backend doesn't carry
 * difficulty / chapter / timeLeft, so we synthesise reasonable defaults so
 * the visual grammar stays consistent with the mock-driven tabs. */
function questToMission(q: Quest): Mission {
  const pct = q.target > 0 ? Math.min(100, Math.round((q.progress / q.target) * 100)) : 0;
  const state: State = q.claimed
    ? 'completed'
    : q.progress >= q.target
      ? 'completed'
      : q.progress > 0
        ? 'active'
        : 'active';
  const rewards: Reward[] = [];
  if (q.reward.gold) rewards.push({ label: 'Kaynak', amount: q.reward.gold });
  if (q.reward.gems) rewards.push({ label: 'Kristal', amount: q.reward.gems });
  if (q.reward.xp) rewards.push({ label: 'XP', amount: q.reward.xp });
  return {
    id: `daily-${q.id}`,
    title: q.title,
    description: q.description,
    state,
    progress: pct,
    progressLabel: `${q.progress}/${q.target}`,
    timeLeft: '24s',
    rewards,
    category: 'daily',
    difficulty: q.kind === 'pvp' ? 'zor' : q.kind === 'pve' ? 'orta' : 'kolay',
  };
}

const BOTTOM_NAV_ROUTES: Record<string, string> = {
  base:     '/base',
  map:      '/map',
  settings: '/settings',
  alliance: '/alliance',
  shop:     '/shop',
};

export default function MissionsPage() {
  const race = useNDRace();
  const router = useRouter();
  const tMissions = useTranslations('missions');
  const [tab, setTab] = useState<Tab>('story');
  const resetCountdown = useDailyCountdown();

  // Live daily quests from the backend stub. Falls back to the local mock
  // 'daily-*' entries when the player isn't signed in or the fetch fails.
  const { profile } = useUserProfile();
  const { data: liveDaily } = useMissions(profile?.id ?? null);
  // Persisted claims set for story / weekly / achievement / daily — the
  // canonical "have I already claimed this?" check that survives reload
  // and is enforced server-side. Falls back to {} for guests / older
  // deploys without the DailyEngagementModule mounted.
  const { claimed: persistedClaims, markClaimedLocally } = useMissionClaims();
  const dailyMissions: Mission[] =
    liveDaily && liveDaily.quests.length > 0
      ? liveDaily.quests.map(questToMission)
      : MISSIONS.filter((m) => m.category === 'daily');

  const allMissions: Mission[] = useMemo(
    () => [...MISSIONS.filter((m) => m.category !== 'daily'), ...dailyMissions],
    [dailyMissions],
  );

  const visible = allMissions.filter(m => m.category === tab);
  const completed = visible.filter(m => m.state === 'completed').length;
  const claimable = allMissions.filter(m => m.state === 'completed').length;
  const unlockedAch = ACHIEVEMENTS.filter(a => a.unlocked).length;

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
        <Link href="/dashboard" aria-label="Geri" style={iconBtn()}>‹</Link>
        <Sigil race={race} size={28} glow />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow color={race.primary}>GÖREVLER</Eyebrow>
          <H2 style={{ marginTop: 2 }}>HEDEFLER</H2>
        </div>
        {claimable > 0 && (
          <Chip color={ND.ok}>{claimable} ÖDÜL</Chip>
        )}
      </header>

      {/* Tabs */}
      <div role="tablist" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: '12px 16px 0' }}>
        {(['story', 'daily', 'weekly', 'achievement'] as Tab[]).map(t => {
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
              {t === 'story' ? 'Hikaye' : t === 'daily' ? 'Günlük' : t === 'weekly' ? 'Haftalık' : 'Başarım'}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tab !== 'achievement' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <H3 style={{ color: ND.text }}>{tab === 'story' ? 'Ana Hikaye' : tab === 'daily' ? 'Günlük' : 'Haftalık'}</H3>
              <Caption>{completed}/{visible.length} tamamlandı</Caption>
            </div>
            <Code style={{ color: race.primary }}>
              {visible.length > 0 ? `%${Math.round((completed / visible.length) * 100)}` : '%0'}
            </Code>
          </div>
        )}

        {/* Banners */}
        {tab === 'story' && <StoryBanner race={race} />}
        {tab === 'daily' && <DailyBanner race={race} streak={DAILY_STREAK} countdown={resetCountdown} />}
        {tab === 'weekly' && <WeeklyBanner race={race} missions={visible} />}
        {tab === 'achievement' && (
          <div>
            <H3 style={{ color: ND.text }}>BAŞARIMLAR</H3>
            <Caption>{unlockedAch}/{ACHIEVEMENTS.length} açıldı</Caption>
          </div>
        )}

        {/* Mission list / achievements grid */}
        {tab !== 'achievement' &&
          visible.map(m => (
            <MissionCard
              key={m.id}
              mission={m}
              race={race}
              persistedClaims={persistedClaims}
              onClaimed={markClaimedLocally}
            />
          ))}
        {tab === 'achievement' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {ACHIEVEMENTS.map(a => (
              <AchievementCard
                key={a.id}
                achievement={a}
                race={race}
                persistedClaims={persistedClaims}
                onClaimed={markClaimedLocally}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav
        race={race}
        active={null}
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

function MissionCard({
  mission,
  race,
  persistedClaims,
  onClaimed,
}: {
  mission: Mission;
  race: NDRace;
  persistedClaims: Set<string>;
  onClaimed: (missionId: string) => void;
}) {
  const locked = mission.state === 'locked';
  const serverClaimed = persistedClaims.has(mission.id);
  const completed = mission.state === 'completed' || serverClaimed;
  const diffColor = mission.difficulty ? DIFFICULTY_COLOR[mission.difficulty] : ND.textDim;
  const router = useRouter();
  const tMissions = useTranslations('missions');

  // "Devam" button routes to the screen the player needs to use to progress
  // this mission. We pick a sensible destination by mission category since
  // backend mission targeting isn't wired yet.
  const continueTarget = (() => {
    if (mission.category === 'story') return '/story';
    if (mission.category === 'daily') return '/base/build';
    if (mission.category === 'weekly') return '/missions';
    return '/base';
  })();

  async function handleClaim() {
    const KEY = 'nebula:missions:claimed:v1';

    // Local cache mirror so the visual claimed state survives reload even
    // when the backend POST 4xx's (e.g. guest mode); the server is the
    // authoritative source via `alreadyClaimed: true` when authed.
    const writeCache = () => {
      try {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null;
        const claimed = raw ? (JSON.parse(raw) as string[]) : [];
        if (!claimed.includes(mission.id)) {
          claimed.push(mission.id);
          window.localStorage.setItem(KEY, JSON.stringify(claimed));
        }
      } catch {
        /* private mode — best effort */
      }
    };

    const totalReward = mission.rewards
      .map((r) => `${r.amount.toLocaleString()} ${r.label}`)
      .join(' · ');

    // Map the UI's free-form reward labels (Turkish: "Kaynak", "Kristal",
    // "XP", "Enerji", "Rozet") onto the api's canonical { gold, gems, xp }
    // shape.  "Kaynak" / "Enerji" → gold (mineral on game-server),
    // "Kristal" / "Rozet" → gems (science on game-server), "XP" → xp.
    // Anything we don't recognise is dropped so the validator doesn't
    // see surprise fields.
    const rewardPayload: { gold?: number; gems?: number; xp?: number } = {};
    for (const r of mission.rewards) {
      const label = r.label.trim().toLowerCase();
      if (label === 'kaynak' || label === 'enerji' || label === 'gold' || label === 'mineral') {
        rewardPayload.gold = (rewardPayload.gold ?? 0) + r.amount;
      } else if (label === 'kristal' || label === 'rozet' || label === 'gems' || label === 'kristaller') {
        rewardPayload.gems = (rewardPayload.gems ?? 0) + r.amount;
      } else if (label === 'xp') {
        rewardPayload.xp = (rewardPayload.xp ?? 0) + r.amount;
      }
    }

    // Backend daily mission ids come through questToMission as `daily-q1`,
    // `daily-q2`, … (q-prefixed). Static placeholder mission ids in this
    // file are `daily-1`, `daily-2`, … (digit-prefixed) and route through
    // the canonical /daily-engagement endpoint like every other category.
    // The q-prefixed variant ALSO touches /daily/quests so the daily-quest
    // progress tracker (the per-day stub) stays in sync.
    const isDaily = mission.category === 'daily';
    const backendQuestId =
      isDaily && /^daily-q[0-9]+$/.test(mission.id)
        ? mission.id.slice('daily-'.length)
        : null;

    try {
      // Canonical persistence + wallet fan-out for story / weekly /
      // achievement / daily.  The /daily-engagement endpoint INSERTs a
      // (userId, missionId) row (idempotent via UNIQUE) and forwards the
      // reward to game-server's battle-reward so the HUD wallet updates
      // in the same round-trip.  Older deploys without the module
      // mounted return 404, which we let bubble down to the toast.
      const res = await api.post<{
        claimed: boolean;
        alreadyClaimed: boolean;
        rewards: { gold?: number; gems?: number; xp?: number };
        walletCredited: boolean;
      }>('/daily-engagement/claim', {
        missionId: mission.id,
        missionType: mission.category,
        reward: rewardPayload,
      });

      // If this is also a stub daily quest, mirror the claim into the
      // legacy /daily/quests tracker so its `claimed` flag matches.
      if (backendQuestId) {
        try {
          await api.post(`/daily/quests/${backendQuestId}/claim`);
        } catch {
          /* swallow — the canonical claim already succeeded. */
        }
      }

      writeCache();
      onClaimed(mission.id);

      if (res.alreadyClaimed) {
        toast.info(tMissions('alreadyClaimed'));
        return;
      }

      // Wallet was already credited inside the api during the POST
      // (api → game-server fan-out). Just broadcast a HUD refresh so
      // the pill repolls without waiting for its 5s tick.
      refreshGameResources();
      if (res.claimed) {
        toast.success(`Ödül alındı: ${totalReward}`);
        return;
      }
      // Defensive: server didn't ack either way → treat as success with
      // the local reward summary so the UX doesn't stall.
      toast.success(`Ödül alındı: ${totalReward}`);
    } catch (err) {
      const msg = err instanceof FetchError ? err.message : 'Ödül alınamadı';
      toast.error(msg);
    }
  }
  return (
    <Panel
      race={race}
      style={{
        padding: 12,
        opacity: locked ? 0.5 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div
          style={{
            width: 4,
            alignSelf: 'stretch',
            minHeight: 36,
            background: completed ? ND.ok : locked ? ND.border : race.primary,
            boxShadow: completed ? `0 0 8px ${ND.ok}` : locked ? 'none' : `0 0 8px ${race.glow}`,
            borderRadius: 2,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {completed && <Code style={{ color: ND.ok }}>✓</Code>}
              {locked && <Code>🔒</Code>}
              {mission.chapter !== undefined && !locked && <Chip color={race.primary}>B{mission.chapter}</Chip>}
              <H3 style={{ color: completed ? ND.ok : ND.text }}>{mission.title}</H3>
            </div>
            {mission.difficulty && !locked && <Chip color={diffColor}>{mission.difficulty.toUpperCase()}</Chip>}
          </div>
          <Caption style={{ marginTop: 4 }}>{mission.description}</Caption>
          {!locked && (
            <div style={{ marginTop: 8 }}>
              <Bar
                value={mission.progress}
                color={completed ? ND.ok : race.primary}
                label={mission.progressLabel}
                trailing={mission.timeLeft ? `⏱ ${mission.timeLeft}` : undefined}
              />
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {mission.rewards.map(r => (
                <Chip key={r.label} color={race.primary}>+{r.amount.toLocaleString()} {r.label}</Chip>
              ))}
            </div>
            {completed && !serverClaimed && (
              <NDButton race={race} size="sm" onClick={handleClaim}>
                Ödülü Al
              </NDButton>
            )}
            {serverClaimed && (
              <Chip color={ND.ok}>ÖDÜL ALINDI</Chip>
            )}
            {mission.state === 'active' && (
              <NDButton
                race={race}
                variant="outline"
                size="sm"
                onClick={() => router.push(continueTarget)}
              >
                Devam
              </NDButton>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function AchievementCard({
  achievement,
  race,
  persistedClaims,
  onClaimed,
}: {
  achievement: Achievement;
  race: NDRace;
  persistedClaims: Set<string>;
  onClaimed: (missionId: string) => void;
}) {
  const a = achievement;
  const [claiming, setClaiming] = useState(false);
  const alreadyClaimed = persistedClaims.has(a.id);
  const canClaim = a.unlocked && !alreadyClaimed && !claiming;

  async function handleClaimAchievement() {
    if (!canClaim) return;
    setClaiming(true);
    try {
      // Re-use the canonical /daily-engagement/claim endpoint — missionType
      // 'achievement' maps to XpSource.ACHIEVEMENT (500 XP) server-side
      // (see DailyEngagementService.MISSION_TYPE_TO_XP_SOURCE).
      const res = await api.post<{
        claimed: boolean;
        alreadyClaimed: boolean;
        rewards: { gold?: number; gems?: number; xp?: number };
        walletCredited: boolean;
        xpGranted: boolean;
      }>('/daily-engagement/claim', {
        missionId: a.id,
        missionType: 'achievement',
        // No reward payload — achievement XP is granted on the server
        // via the XpSource.ACHIEVEMENT base amount, no wallet credit.
        reward: {},
      });
      onClaimed(a.id);
      refreshGameResources();
      if (res.alreadyClaimed) {
        toast.info('Bu başarım zaten alındı');
        return;
      }
      toast.success(`Başarım kazanıldı: ${a.title} (+500 XP)`);
    } catch (err) {
      const msg = err instanceof FetchError ? err.message : 'Ödül alınamadı';
      toast.error(msg);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <Panel
      race={race}
      style={{
        padding: 10,
        opacity: a.unlocked ? 1 : 0.55,
        borderColor: a.unlocked ? (a.legendary ? race.primary : ND.borderHi) : ND.border,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Code>{alreadyClaimed ? '✓' : a.unlocked ? (a.legendary ? '★' : '◆') : '🔒'}</Code>
        <div style={{ fontFamily: ND.display, fontSize: 12, color: a.legendary && a.unlocked ? race.primary : ND.text }}>
          {a.title}
        </div>
      </div>
      <Caption style={{ fontSize: 10 }}>{a.description}</Caption>
      {!a.unlocked && a.progress !== undefined && a.progress > 0 && (
        <Bar value={a.progress} color={race.primary} height={4} />
      )}
      {a.unlocked && (
        <NDButton
          race={race}
          size="sm"
          variant={alreadyClaimed ? 'ghost' : 'primary'}
          disabled={!canClaim}
          onClick={handleClaimAchievement}
          style={{ marginTop: 4, alignSelf: 'flex-start' }}
        >
          {alreadyClaimed ? 'Alındı' : claiming ? 'Alınıyor...' : '+500 XP Al'}
        </NDButton>
      )}
    </Panel>
  );
}

function StoryBanner({ race }: { race: NDRace }) {
  const chapters = [
    { num: 1, title: 'Uyanış', completed: true },
    { num: 2, title: 'İttifak', completed: false },
    { num: 3, title: 'Hâkimiyet', completed: false },
  ];
  return (
    <NotchPanel race={race}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Eyebrow color={race.primary}>BÖLÜM 1</Eyebrow>
          <H3 style={{ marginTop: 2, color: ND.text }}>Uyanış</H3>
        </div>
        <Code style={{ color: race.primary, fontSize: 14 }}>%50</Code>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
        {chapters.map((c, i) => (
          <div key={c.num} style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                border: `2px solid ${c.completed ? race.primary : ND.border}`,
                background: c.completed ? `${race.primary}22` : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: c.completed ? race.primary : ND.textDim,
                fontFamily: ND.display,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {c.completed ? '✓' : c.num}
            </div>
            {i < chapters.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  margin: '0 6px',
                  background: c.completed ? `linear-gradient(90deg, ${race.primary}, ${race.primary}33)` : ND.border,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </NotchPanel>
  );
}

function DailyBanner({ race, streak, countdown }: { race: NDRace; streak: number; countdown: string }) {
  const days = [1, 2, 3, 4, 5, 6, 7];
  return (
    <NotchPanel race={race}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Eyebrow color={race.primary}>🔥 SERİ</Eyebrow>
          <H3 style={{ marginTop: 2, color: ND.text }}>{streak} GÜN</H3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Eyebrow>SIFIRLANMA</Eyebrow>
          <Code style={{ color: ND.warn }}>{countdown}</Code>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
        {days.map(d => {
          const done = d <= streak;
          return (
            <div
              key={d}
              style={{
                flex: 1,
                height: 28,
                border: `1px solid ${done ? race.primary : ND.border}`,
                background: done ? `${race.primary}22` : 'transparent',
                color: done ? race.primary : ND.textDim,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: ND.display,
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 3,
              }}
            >
              {done ? '✓' : d}
            </div>
          );
        })}
      </div>
    </NotchPanel>
  );
}

function WeeklyBanner({ race, missions }: { race: NDRace; missions: Mission[] }) {
  const completed = missions.filter(m => m.state === 'completed').length;
  return (
    <NotchPanel race={race}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Eyebrow color={race.primary}>HAFTA 21</Eyebrow>
          <H3 style={{ marginTop: 2, color: ND.text }}>
            {completed}/{missions.length} TAMAMLANDI
          </H3>
        </div>
        <Code style={{ color: ND.warn }}>⏱ 4g 18s</Code>
      </div>
      <div style={{ marginTop: 10 }}>
        <Bar
          value={missions.length > 0 ? (completed / missions.length) * 100 : 0}
          color={race.primary}
        />
      </div>
    </NotchPanel>
  );
}
