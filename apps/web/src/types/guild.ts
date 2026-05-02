import { Race } from './units';

export type GuildRole = 'leader' | 'officer' | 'member';

export type TutorialStep =
  | 'not_started'
  | 'guild_chosen'
  | 'first_donation'
  | 'first_quest'
  | 'completed';

export type GuildTier = 1 | 2 | 3 | 4;

export const TIER_CAPACITY: Record<GuildTier, number> = {
  1: 25,
  2: 35,
  3: 50,
  4: 70,
};

export const TIER_LABEL: Record<GuildTier, string> = {
  1: 'KÜÇÜK LONCA',
  2: 'ORTA LONCA',
  3: 'BÜYÜK LONCA',
  4: 'ELİT LONCA',
};

export interface GuildSummary {
  id: string;
  name: string;
  tag: string;
  language: string;
  memberCount: number;
  capacity: number;
  tier: GuildTier;
  tierScore: number;
  weeklyRank: number | null;
  race: Race;
  description: string;
  isChampion: boolean;
}

export interface GuildMember {
  userId: string;
  guildId: string;
  name: string;
  role: GuildRole;
  race: Race;
  joinedAt: string;
  contributionPts: number;
  weeklyContribution: number;
  lastActiveAt: string;
  isOnline: boolean;
}

export interface GuildProfile extends GuildSummary {
  leaderId: string;
  ageUnlockedAt: number;
  members: GuildMember[];
  weeklyDonations: number;
  weeklyRaidAttendance: number;
  researchProjectName: string | null;
  researchProgressPct: number;
}

export interface TutorialState {
  step: TutorialStep;
  guildId: string | null;
  rewardClaimed: boolean;
  startedAt: string | null;
  completedAt: string | null;
}

export interface GuildSearchFilters {
  tag: string;
  language: string;
  minSize: number | null;
}

export interface GuildCreateInput {
  name: string;
  tag: string;
  language: string;
  description: string;
  race: Race;
  isFreeTrial: boolean;
}

export const SUPPORTED_LANGUAGES = ['tr', 'en', 'de', 'es', 'fr', 'ja'] as const;
export type GuildLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABEL: Record<GuildLanguage, string> = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  ja: '日本語',
};
