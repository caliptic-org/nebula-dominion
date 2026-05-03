import { Race } from '@/types/units';
import {
  GuildCreateInput,
  GuildMember,
  GuildProfile,
  GuildSearchFilters,
  GuildSummary,
  GuildTier,
  TIER_CAPACITY,
  TutorialStep,
} from '@/types/guild';
import { fetcher, FetchError } from './fetcher';
import { getCurrentUserId } from './currentUser';

const FAKE_DELAY = 320;

const wait = <T>(value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), FAKE_DELAY));

const tierFromMembers = (count: number): GuildTier => {
  if (count >= 50) return 4;
  if (count >= 35) return 3;
  if (count >= 25) return 2;
  return 1;
};

export const tierFromMemberCount = tierFromMembers;

// ── Backend gating ──────────────────────────────────────────────────────────
//
// Set NEXT_PUBLIC_GUILD_BACKEND_READY=true to hit the real /guilds REST API
// (CAL-235 ships this). When unset or any other value, the stub data below
// powers the UI so local dev without the game-server stays functional.
const isBackendReady = (): boolean =>
  process.env.NEXT_PUBLIC_GUILD_BACKEND_READY === 'true';

// ── Local metadata layer ────────────────────────────────────────────────────
//
// The backend `guilds` row only stores id/name/tag/leaderId/tierScore/
// memberCount. UI surface needs language/race/description/champion flags etc.
// We keep that metadata client-side keyed by guildId until the backend grows
// dedicated columns. A localStorage cache means freshly-created guilds keep
// their race theme on reload.
const META_KEY = 'nebula:guildMeta';

interface GuildMeta {
  language: string;
  race: Race;
  description: string;
  isChampion: boolean;
  weeklyRank: number | null;
}

const DEFAULT_META: GuildMeta = {
  language: 'tr',
  race: Race.INSAN,
  description: '',
  isChampion: false,
  weeklyRank: null,
};

const loadMetaCache = (): Record<string, GuildMeta> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as Record<string, GuildMeta>) : {};
  } catch {
    return {};
  }
};

const persistMetaCache = (cache: Record<string, GuildMeta>) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable — silently ignore, metadata is non-critical
  }
};

const getMeta = (guildId: string): GuildMeta => {
  const cache = loadMetaCache();
  return cache[guildId] ?? DEFAULT_META;
};

const saveMeta = (guildId: string, meta: Partial<GuildMeta>) => {
  const cache = loadMetaCache();
  cache[guildId] = { ...DEFAULT_META, ...cache[guildId], ...meta };
  persistMetaCache(cache);
};

// ── Backend response shapes (mirror apps/game-server/src/guilds/README.md) ──

interface BackendGuild {
  id: string;
  name: string;
  tag: string;
  leaderId: string;
  ageUnlockedAt: string | null;
  tierScore: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

interface BackendMember {
  guildId: string;
  userId: string;
  role: 'leader' | 'officer' | 'member';
  joinedAt: string;
  contributionPts: number;
  lastActiveAt: string;
}

interface BackendTutorialState {
  id: string;
  userId: string;
  tutorialRequired: boolean;
  state: TutorialStep;
  rewardGranted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const toGuildSummary = (g: BackendGuild): GuildSummary => {
  const meta = getMeta(g.id);
  const tier = tierFromMembers(g.memberCount);
  return {
    id: g.id,
    name: g.name,
    tag: g.tag,
    language: meta.language,
    memberCount: g.memberCount,
    capacity: TIER_CAPACITY[tier],
    tier,
    tierScore: g.tierScore,
    weeklyRank: meta.weeklyRank,
    race: meta.race,
    description: meta.description,
    isChampion: meta.isChampion,
  };
};

const toGuildMember = (m: BackendMember, name?: string): GuildMember => {
  const meta = getMeta(m.guildId);
  const isOnline = Date.now() - new Date(m.lastActiveAt).getTime() < 5 * 60 * 1000;
  return {
    userId: m.userId,
    guildId: m.guildId,
    name: name ?? m.userId.replace(/^demo-/, '').slice(0, 8),
    role: m.role,
    race: meta.race,
    joinedAt: m.joinedAt,
    contributionPts: m.contributionPts,
    weeklyContribution: 0,
    lastActiveAt: m.lastActiveAt,
    isOnline,
    online: isOnline,
  };
};

// ── Stub data (used when NEXT_PUBLIC_GUILD_BACKEND_READY !== 'true') ────────

const SEED_GUILDS: GuildSummary[] = [
  {
    id: 'g_nova_guard',
    name: 'Nova Muhafızları',
    tag: 'NOVA',
    language: 'tr',
    memberCount: 48,
    capacity: TIER_CAPACITY[3],
    tier: 3,
    tierScore: 8420,
    weeklyRank: 2,
    race: Race.INSAN,
    description: 'Çağ 3+ aktif Türk loncası — haftalık raid + tech ağacı düzenli.',
    isChampion: false,
  },
  {
    id: 'g_swarm_pact',
    name: 'Swarm Pact',
    tag: 'SWRM',
    language: 'en',
    memberCount: 67,
    capacity: TIER_CAPACITY[4],
    tier: 4,
    tierScore: 12850,
    weeklyRank: 1,
    race: Race.ZERG,
    description: 'Top-1 weekly rank guild. Hardcore raid roster, EU/NA timezones.',
    isChampion: true,
  },
  {
    id: 'g_iron_circuit',
    name: 'Iron Circuit',
    tag: 'IRC',
    language: 'en',
    memberCount: 32,
    capacity: TIER_CAPACITY[2],
    tier: 2,
    tierScore: 5610,
    weeklyRank: 8,
    race: Race.OTOMAT,
    description: 'Friendly mid-core guild for Çağ 3 newcomers. Daily donations expected.',
    isChampion: false,
  },
  {
    id: 'g_zindan_klani',
    name: 'Zindan Klanı',
    tag: 'ZND',
    language: 'tr',
    memberCount: 21,
    capacity: TIER_CAPACITY[1],
    tier: 1,
    tierScore: 2310,
    weeklyRank: 24,
    race: Race.CANAVAR,
    description: 'Yeni kurulan Türk loncası — kuruluş bonusu aktif. Aktif üyelere açık.',
    isChampion: false,
  },
  {
    id: 'g_blutmond',
    name: 'Blutmond Orden',
    tag: 'BLT',
    language: 'de',
    memberCount: 41,
    capacity: TIER_CAPACITY[3],
    tier: 3,
    tierScore: 7220,
    weeklyRank: 5,
    race: Race.SEYTAN,
    description: 'DACH community, raid-fokus, freundliche Atmosphäre.',
    isChampion: false,
  },
];

const FAKE_MEMBERS: GuildMember[] = [
  { userId: 'u_voss',     guildId: 'g_nova_guard', name: 'Voss',     role: 'leader',  race: Race.INSAN,   joinedAt: '2026-04-01T10:00:00Z', contributionPts: 9820, weeklyContribution: 1240, lastActiveAt: '2026-05-03T01:55:00Z', isOnline: true,  online: true  },
  { userId: 'u_chen',     guildId: 'g_nova_guard', name: 'Chen',     role: 'officer', race: Race.INSAN,   joinedAt: '2026-04-02T08:00:00Z', contributionPts: 7440, weeklyContribution: 980,  lastActiveAt: '2026-05-03T00:30:00Z', isOnline: true,  online: true  },
  { userId: 'u_kovacs',   guildId: 'g_nova_guard', name: 'Kovacs',   role: 'officer', race: Race.INSAN,   joinedAt: '2026-04-03T12:00:00Z', contributionPts: 6210, weeklyContribution: 740,  lastActiveAt: '2026-05-02T22:10:00Z', isOnline: false, online: false },
  { userId: 'u_aurelius', guildId: 'g_nova_guard', name: 'Aurelius', role: 'member',  race: Race.OTOMAT,  joinedAt: '2026-04-08T14:00:00Z', contributionPts: 4480, weeklyContribution: 620,  lastActiveAt: '2026-05-03T01:30:00Z', isOnline: true,  online: true  },
  { userId: 'u_morgath',  guildId: 'g_nova_guard', name: 'Morgath',  role: 'member',  race: Race.ZERG,    joinedAt: '2026-04-10T09:00:00Z', contributionPts: 3870, weeklyContribution: 510,  lastActiveAt: '2026-05-02T19:00:00Z', isOnline: false, online: false },
  { userId: 'u_lilithra', guildId: 'g_nova_guard', name: 'Lilithra', role: 'member',  race: Race.SEYTAN,  joinedAt: '2026-04-11T11:00:00Z', contributionPts: 3110, weeklyContribution: 390,  lastActiveAt: '2026-05-02T21:30:00Z', isOnline: true,  online: true  },
  { userId: 'u_ravenna',  guildId: 'g_nova_guard', name: 'Ravenna',  role: 'member',  race: Race.CANAVAR, joinedAt: '2026-04-15T17:00:00Z', contributionPts: 2540, weeklyContribution: 270,  lastActiveAt: '2026-05-02T12:00:00Z', isOnline: false, online: false },
  { userId: 'u_threnix',  guildId: 'g_nova_guard', name: 'Threnix',  role: 'member',  race: Race.ZERG,    joinedAt: '2026-04-18T16:30:00Z', contributionPts: 1820, weeklyContribution: 180,  lastActiveAt: '2026-05-01T20:00:00Z', isOnline: false, online: false },
  { userId: 'u_reyes',    guildId: 'g_nova_guard', name: 'Reyes',    role: 'member',  race: Race.INSAN,   joinedAt: '2026-04-22T13:00:00Z', contributionPts: 980,  weeklyContribution: 90,   lastActiveAt: '2026-05-01T08:00:00Z', isOnline: false, online: false },
  { userId: 'u_vorhaal',  guildId: 'g_nova_guard', name: 'Vorhaal',  role: 'member',  race: Race.SEYTAN,  joinedAt: '2026-05-01T18:00:00Z', contributionPts: 120,  weeklyContribution: 120,  lastActiveAt: '2026-05-03T01:00:00Z', isOnline: true,  online: true  },
];

const STUB_TUTORIAL_TRANSITIONS: Record<TutorialStep, TutorialStep> = {
  not_started: 'guild_chosen',
  guild_chosen: 'first_donation',
  first_donation: 'first_quest',
  first_quest: 'completed',
  completed: 'completed',
};

// ── Public API ──────────────────────────────────────────────────────────────

export interface JoinGuildResult {
  guildId: string;
  userId: string;
}

export interface DonateResult {
  guildId: string;
  userId: string;
  amount: number;
  contributionPts: number;
}

export interface TutorialReward {
  energy: number;
  cosmetic: string;
}

export interface TutorialStateView {
  step: TutorialStep;
  tutorialRequired: boolean;
  rewardGranted: boolean;
  completedAt: string | null;
}

export const guildApi = {
  // Search: real backend has no filters — fetch a page and filter client-side.
  search: async (filters: Partial<GuildSearchFilters>): Promise<GuildSummary[]> => {
    const tag = filters.tag?.trim().toLowerCase() ?? '';
    const language = filters.language ?? '';
    const minSize = filters.minSize ?? null;

    let summaries: GuildSummary[];
    if (isBackendReady()) {
      const list = await fetcher<BackendGuild[]>('/guilds?limit=50');
      summaries = list.map(toGuildSummary);
    } else {
      summaries = await wait(SEED_GUILDS);
    }

    return summaries.filter((g) => {
      if (tag && !g.name.toLowerCase().includes(tag) && !g.tag.toLowerCase().includes(tag)) return false;
      if (language && g.language !== language) return false;
      if (minSize !== null && g.memberCount < minSize) return false;
      return true;
    });
  },

  getProfile: async (guildId: string): Promise<GuildProfile | null> => {
    if (isBackendReady()) {
      try {
        const [g, members] = await Promise.all([
          fetcher<BackendGuild>(`/guilds/${guildId}`),
          fetcher<BackendMember[]>(`/guilds/${guildId}/members`),
        ]);
        const summary = toGuildSummary(g);
        const memberRows = members
          .map((m) => toGuildMember(m))
          .sort((a, b) => b.contributionPts - a.contributionPts);
        return {
          ...summary,
          leaderId: g.leaderId,
          ageUnlockedAt: g.ageUnlockedAt ? 3 : 1,
          members: memberRows,
          weeklyDonations: memberRows.reduce((s, m) => s + m.weeklyContribution, 0),
          weeklyRaidAttendance: 0,
          researchProjectName: null,
          researchProgressPct: 0,
        };
      } catch (err) {
        if (err instanceof FetchError && err.status === 404) return null;
        throw err;
      }
    }

    const summary = SEED_GUILDS.find((g) => g.id === guildId);
    if (!summary) return wait(null);
    const members = FAKE_MEMBERS.filter((m) => m.guildId === guildId)
      .sort((a, b) => b.contributionPts - a.contributionPts);
    return wait<GuildProfile>({
      ...summary,
      leaderId: members.find((m) => m.role === 'leader')?.userId ?? members[0]?.userId ?? '',
      ageUnlockedAt: 3,
      members,
      weeklyDonations: members.reduce((sum, m) => sum + m.weeklyContribution, 0),
      weeklyRaidAttendance: 0.78,
      researchProjectName: 'Mutasyon Özü Çıkarma III',
      researchProgressPct: 64,
    });
  },

  create: async (input: GuildCreateInput): Promise<GuildSummary> => {
    if (isBackendReady()) {
      const created = await fetcher<BackendGuild>('/guilds', {
        method: 'POST',
        body: JSON.stringify({
          leaderId: getCurrentUserId(),
          name: input.name,
          tag: input.tag.toUpperCase(),
        }),
      });
      saveMeta(created.id, {
        language: input.language,
        race: input.race,
        description: input.description,
      });
      return toGuildSummary(created);
    }

    const guild: GuildSummary = {
      id: `g_${input.tag.toLowerCase()}_${Date.now()}`,
      name: input.name,
      tag: input.tag.toUpperCase(),
      language: input.language,
      memberCount: 1,
      capacity: TIER_CAPACITY[1],
      tier: 1,
      tierScore: 0,
      weeklyRank: null,
      race: input.race,
      description: input.description,
      isChampion: false,
    };
    return wait(guild);
  },

  joinGuild: async (guildId: string): Promise<JoinGuildResult> => {
    const userId = getCurrentUserId();
    if (isBackendReady()) {
      await fetcher<BackendMember>(`/guilds/${guildId}/join`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
    } else {
      await wait(undefined);
    }
    return { guildId, userId };
  },

  donate: async (guildId: string, amount: number, resource: 'mineral' | 'gas' = 'mineral'): Promise<DonateResult> => {
    const userId = getCurrentUserId();
    if (isBackendReady()) {
      const updated = await fetcher<BackendMember>(`/guilds/${guildId}/donate`, {
        method: 'POST',
        body: JSON.stringify({ userId, amount, resource }),
      });
      return {
        guildId,
        userId,
        amount,
        contributionPts: updated.contributionPts,
      };
    }
    return wait({ guildId, userId, amount, contributionPts: amount });
  },

  getMembership: async (): Promise<{ guildId: string; role: 'leader' | 'officer' | 'member' } | null> => {
    if (!isBackendReady()) return wait(null);
    const userId = getCurrentUserId();
    try {
      const m = await fetcher<BackendMember | null>(`/guilds/users/${encodeURIComponent(userId)}/membership`);
      if (!m) return null;
      return { guildId: m.guildId, role: m.role };
    } catch (err) {
      if (err instanceof FetchError && err.status === 404) return null;
      throw err;
    }
  },

  getTutorialState: async (): Promise<TutorialStateView> => {
    if (!isBackendReady()) {
      // In stub mode the local hook owns persistence; surface a permissive default
      return wait({
        step: 'not_started',
        tutorialRequired: true,
        rewardGranted: false,
        completedAt: null,
      });
    }
    const userId = getCurrentUserId();
    const s = await fetcher<BackendTutorialState>(`/guilds/tutorial/${encodeURIComponent(userId)}`);
    return {
      step: s.state,
      tutorialRequired: s.tutorialRequired,
      rewardGranted: s.rewardGranted,
      completedAt: s.completedAt,
    };
  },

  // Advance the tutorial by one step. The backend auto-advances
  // not_started → guild_chosen on join and guild_chosen → first_donation on
  // donate, so this is only required for the last two transitions. Both modes
  // are accepted defensively — the server will reject illegal transitions.
  advanceTutorial: async (current: TutorialStep): Promise<TutorialStep> => {
    const next = STUB_TUTORIAL_TRANSITIONS[current];
    if (!isBackendReady()) {
      return wait(next);
    }
    const userId = getCurrentUserId();
    const s = await fetcher<BackendTutorialState>(`/guilds/tutorial/${encodeURIComponent(userId)}/advance`, {
      method: 'POST',
      body: JSON.stringify({ toStep: next }),
    });
    return s.state;
  },

  grantTutorialReward: async (): Promise<TutorialReward> => {
    if (!isBackendReady()) {
      return wait({ energy: 500, cosmetic: 'guild_starter_emblem' });
    }
    const userId = getCurrentUserId();
    try {
      const res = await fetcher<{ reward: TutorialReward }>(
        `/guilds/tutorial/${encodeURIComponent(userId)}/reward`,
        { method: 'POST' },
      );
      return res.reward;
    } catch (err) {
      // 409 means the reward was already granted server-side. Treat as success
      // to avoid blocking the UX — the user has the cosmetic either way.
      if (err instanceof FetchError && err.status === 409) {
        return { energy: 500, cosmetic: 'guild_starter_emblem' };
      }
      throw err;
    }
  },
};
