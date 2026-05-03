export interface QuestTemplate {
  type: string;
  description: string;
  targetAmount: number;
  xpReward: number;
  mineralReward: number;
  gasReward: number;
  energyReward: number;
  awardsLootBox: boolean;
  /** Minimum age level (1-6) this quest applies to */
  minAge: number;
  /** Maximum age level (1-6), 6 = all ages */
  maxAge: number;
}

// Pool of daily quests. Each day 3-5 are randomly selected filtered by player age.
export const QUEST_POOL: QuestTemplate[] = [
  // Age 1+ quests (basic)
  {
    type: 'produce_mineral',
    description: 'Produce 200 Mineral today',
    targetAmount: 200,
    xpReward: 50,
    mineralReward: 0,
    gasReward: 100,
    energyReward: 0,
    awardsLootBox: false,
    minAge: 1,
    maxAge: 6,
  },
  {
    type: 'win_battle',
    description: 'Win 1 battle today',
    targetAmount: 1,
    xpReward: 0,
    mineralReward: 0,
    gasReward: 0,
    energyReward: 0,
    awardsLootBox: true,
    minAge: 1,
    maxAge: 6,
  },
  {
    type: 'build_structure',
    description: 'Build 1 new structure',
    targetAmount: 1,
    xpReward: 80,
    mineralReward: 150,
    gasReward: 0,
    energyReward: 0,
    awardsLootBox: false,
    minAge: 1,
    maxAge: 6,
  },
  {
    type: 'train_units',
    description: 'Train 3 units',
    targetAmount: 3,
    xpReward: 75,
    mineralReward: 0,
    gasReward: 50,
    energyReward: 0,
    awardsLootBox: false,
    minAge: 1,
    maxAge: 6,
  },
  // Age 2+ quests
  {
    type: 'produce_gas',
    description: 'Produce 150 Gas today',
    targetAmount: 150,
    xpReward: 60,
    mineralReward: 100,
    gasReward: 0,
    energyReward: 0,
    awardsLootBox: false,
    minAge: 2,
    maxAge: 6,
  },
  {
    type: 'win_battles_2',
    description: 'Win 2 battles today',
    targetAmount: 2,
    xpReward: 100,
    mineralReward: 0,
    gasReward: 100,
    energyReward: 0,
    awardsLootBox: false,
    minAge: 2,
    maxAge: 6,
  },
  // Age 3+ quests (alliance)
  {
    type: 'donate_resources',
    description: 'Donate 100 resources to alliance members',
    targetAmount: 100,
    xpReward: 200,
    mineralReward: 0,
    gasReward: 0,
    energyReward: 50,
    awardsLootBox: false,
    minAge: 3,
    maxAge: 6,
  },
  {
    type: 'alliance_battle',
    description: 'Participate in 1 alliance battle',
    targetAmount: 1,
    xpReward: 150,
    mineralReward: 100,
    gasReward: 100,
    energyReward: 0,
    awardsLootBox: false,
    minAge: 3,
    maxAge: 6,
  },
  // Age 4+ quests (sector wars)
  {
    type: 'capture_sector',
    description: 'Capture or reinforce 1 sector',
    targetAmount: 1,
    xpReward: 300,
    mineralReward: 200,
    gasReward: 150,
    energyReward: 0,
    awardsLootBox: false,
    minAge: 4,
    maxAge: 6,
  },
  {
    type: 'win_ranked',
    description: 'Win 1 ranked match',
    targetAmount: 1,
    xpReward: 250,
    mineralReward: 100,
    gasReward: 100,
    energyReward: 100,
    awardsLootBox: false,
    minAge: 4,
    maxAge: 6,
  },
  // Age 5+ quests (subspace)
  {
    type: 'enter_subspace',
    description: 'Enter and complete a Subspace zone',
    targetAmount: 1,
    xpReward: 400,
    mineralReward: 0,
    gasReward: 200,
    energyReward: 0,
    awardsLootBox: false,
    minAge: 5,
    maxAge: 6,
  },
];

export const DAILY_QUEST_COUNT = 4; // Number of quests to generate per day
