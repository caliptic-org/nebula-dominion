import { Race } from '@/types/units';
import {
  GuildCreateInput,
  GuildMember,
  GuildProfile,
  GuildSearchFilters,
  GuildSummary,
  GuildTier,
  TIER_CAPACITY,
  TutorialState,
  TutorialStep,
} from '@/types/guild';

const FAKE_DELAY = 320;

const wait = <T>(value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), FAKE_DELAY));

const tierFromMembers = (count: number): GuildTier => {
  if (count >= 50) return 4;
  if (count >= 35) return 3;
  if (count >= 25) return 2;
  return 1;
};

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
  { userId: 'u_voss',     guildId: 'g_nova_guard', name: 'Voss',         role: 'leader',  race: Race.INSAN,   joinedAt: '2026-04-01T10:00:00Z', contributionPts: 9820, weeklyContribution: 1240, lastActiveAt: '2026-05-03T01:55:00Z', isOnline: true  },
  { userId: 'u_chen',     guildId: 'g_nova_guard', name: 'Chen',         role: 'officer', race: Race.INSAN,   joinedAt: '2026-04-02T08:00:00Z', contributionPts: 7440, weeklyContribution: 980,  lastActiveAt: '2026-05-03T00:30:00Z', isOnline: true  },
  { userId: 'u_kovacs',   guildId: 'g_nova_guard', name: 'Kovacs',       role: 'officer', race: Race.INSAN,   joinedAt: '2026-04-03T12:00:00Z', contributionPts: 6210, weeklyContribution: 740,  lastActiveAt: '2026-05-02T22:10:00Z', isOnline: false },
  { userId: 'u_aurelius', guildId: 'g_nova_guard', name: 'Aurelius',     role: 'member',  race: Race.OTOMAT,  joinedAt: '2026-04-08T14:00:00Z', contributionPts: 4480, weeklyContribution: 620,  lastActiveAt: '2026-05-03T01:30:00Z', isOnline: true  },
  { userId: 'u_morgath',  guildId: 'g_nova_guard', name: 'Morgath',      role: 'member',  race: Race.ZERG,    joinedAt: '2026-04-10T09:00:00Z', contributionPts: 3870, weeklyContribution: 510,  lastActiveAt: '2026-05-02T19:00:00Z', isOnline: false },
  { userId: 'u_lilithra', guildId: 'g_nova_guard', name: 'Lilithra',     role: 'member',  race: Race.SEYTAN,  joinedAt: '2026-04-11T11:00:00Z', contributionPts: 3110, weeklyContribution: 390,  lastActiveAt: '2026-05-02T21:30:00Z', isOnline: true  },
  { userId: 'u_ravenna',  guildId: 'g_nova_guard', name: 'Ravenna',      role: 'member',  race: Race.CANAVAR, joinedAt: '2026-04-15T17:00:00Z', contributionPts: 2540, weeklyContribution: 270,  lastActiveAt: '2026-05-02T12:00:00Z', isOnline: false },
  { userId: 'u_threnix',  guildId: 'g_nova_guard', name: 'Threnix',      role: 'member',  race: Race.ZERG,    joinedAt: '2026-04-18T16:30:00Z', contributionPts: 1820, weeklyContribution: 180,  lastActiveAt: '2026-05-01T20:00:00Z', isOnline: false },
  { userId: 'u_reyes',    guildId: 'g_nova_guard', name: 'Reyes',        role: 'member',  race: Race.INSAN,   joinedAt: '2026-04-22T13:00:00Z', contributionPts: 980,  weeklyContribution: 90,   lastActiveAt: '2026-05-01T08:00:00Z', isOnline: false },
  { userId: 'u_vorhaal',  guildId: 'g_nova_guard', name: 'Vorhaal',      role: 'member',  race: Race.SEYTAN,  joinedAt: '2026-05-01T18:00:00Z', contributionPts: 120,  weeklyContribution: 120,  lastActiveAt: '2026-05-03T01:00:00Z', isOnline: true  },
];

const TUTORIAL_TRANSITIONS: Record<TutorialStep, TutorialStep> = {
  not_started: 'guild_chosen',
  guild_chosen: 'first_donation',
  first_donation: 'first_quest',
  first_quest: 'completed',
  completed: 'completed',
};

export const guildApi = {
  search: (filters: Partial<GuildSearchFilters>): Promise<GuildSummary[]> => {
    const tag = filters.tag?.trim().toLowerCase() ?? '';
    const language = filters.language ?? '';
    const minSize = filters.minSize ?? null;
    const results = SEED_GUILDS.filter((g) => {
      if (tag && !g.name.toLowerCase().includes(tag) && !g.tag.toLowerCase().includes(tag)) return false;
      if (language && g.language !== language) return false;
      if (minSize !== null && g.memberCount < minSize) return false;
      return true;
    });
    return wait(results);
  },

  getProfile: (guildId: string): Promise<GuildProfile | null> => {
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

  create: (input: GuildCreateInput): Promise<GuildSummary> => {
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

  advanceTutorial: (current: TutorialStep): Promise<TutorialStep> =>
    wait(TUTORIAL_TRANSITIONS[current]),

  // BACKEND CONTRACT (required before swapping in the real endpoint):
  //   POST /api/guild/tutorial/reward MUST be idempotent based on
  //   `users.tutorial_completed_at`. The frontend cannot prevent reward
  //   duplication on its own — localStorage `nebula:guildTutorial` can be
  //   reset via DevTools to re-trigger this CTA. The server is the only
  //   authority that can decide whether the +500 Energy / cosmetic grant
  //   has already happened. Frontend additionally guards via
  //   `state.rewardClaimed` (see useGuildTutorial.advance).
  grantTutorialReward: (): Promise<{ energy: number; cosmetic: string }> =>
    wait({ energy: 500, cosmetic: 'guild_crest_starter' }),
};

export const tierFromMemberCount = tierFromMembers;
