export enum AutomataMutationTier {
  TIER_1 = 1,
  TIER_2 = 2,
  TIER_3 = 3,
}

export interface MutationNode {
  id: string;
  name: string;
  description: string;
  tier: AutomataMutationTier;
  cost: { mineral: number; gas: number };
  prerequisiteIds: string[];
  effects: MutationEffect[];
}

export interface MutationEffect {
  target: 'unit_type' | 'all_units' | 'building_type';
  targetValue?: string;
  stat: 'attack' | 'defense' | 'speed' | 'hp' | 'production';
  modifier: 'add' | 'multiply';
  value: number;
}

export const AUTOMATA_MUTATION_TREE: MutationNode[] = [
  // Tier 1 (Age 1)
  {
    id: 'reinforced_plating',
    name: 'Güçlendirilmiş Zırh',
    description: 'Tüm Automata birimlerinin savunmasını +2 artırır.',
    tier: AutomataMutationTier.TIER_1,
    cost: { mineral: 200, gas: 50 },
    prerequisiteIds: [],
    effects: [{ target: 'all_units', stat: 'defense', modifier: 'add', value: 2 }],
  },
  {
    id: 'overclock_processors',
    name: 'Hızlandırılmış İşlemci',
    description: 'combat-bot saldırısını +3 artırır.',
    tier: AutomataMutationTier.TIER_1,
    cost: { mineral: 150, gas: 75 },
    prerequisiteIds: [],
    effects: [{ target: 'unit_type', targetValue: 'combat-bot', stat: 'attack', modifier: 'add', value: 3 }],
  },
  {
    id: 'nano_repair',
    name: 'Nano Onarım Protokolü',
    description: "Tüm Automata birimlerinin max HP'ini %10 artırır.",
    tier: AutomataMutationTier.TIER_1,
    cost: { mineral: 100, gas: 100 },
    prerequisiteIds: [],
    effects: [{ target: 'all_units', stat: 'hp', modifier: 'multiply', value: 1.1 }],
  },
  // Tier 2 (Age 2, Level 13+)
  {
    id: 'siege_protocol',
    name: 'Kuşatma Protokolü',
    description: 'siege-automaton saldırısını +10 artırır ve menzilini genişletir.',
    tier: AutomataMutationTier.TIER_2,
    cost: { mineral: 400, gas: 200 },
    prerequisiteIds: ['reinforced_plating', 'overclock_processors'],
    effects: [{ target: 'unit_type', targetValue: 'siege-automaton', stat: 'attack', modifier: 'add', value: 10 }],
  },
  {
    id: 'swarm_intelligence',
    name: 'Sürü Zekası',
    description: 'nano-drone hızını +2 ve saldırısını +2 artırır.',
    tier: AutomataMutationTier.TIER_2,
    cost: { mineral: 300, gas: 150 },
    prerequisiteIds: ['nano_repair'],
    effects: [
      { target: 'unit_type', targetValue: 'nano-drone', stat: 'speed', modifier: 'add', value: 2 },
      { target: 'unit_type', targetValue: 'nano-drone', stat: 'attack', modifier: 'add', value: 2 },
    ],
  },
  {
    id: 'quantum_shielding',
    name: 'Kuantum Kalkan',
    description: 'shield-sentinel savunmasını +15 artırır.',
    tier: AutomataMutationTier.TIER_2,
    cost: { mineral: 350, gas: 250 },
    prerequisiteIds: ['reinforced_plating'],
    effects: [{ target: 'unit_type', targetValue: 'shield-sentinel', stat: 'defense', modifier: 'add', value: 15 }],
  },
  {
    id: 'factory_overhaul',
    name: 'Fabrika Yenileme',
    description: 'Nano Forge üretimini %25 artırır.',
    tier: AutomataMutationTier.TIER_2,
    cost: { mineral: 500, gas: 300 },
    prerequisiteIds: ['overclock_processors'],
    effects: [{ target: 'building_type', targetValue: 'nano_forge', stat: 'production', modifier: 'multiply', value: 1.25 }],
  },
  // Tier 3 (Age 2, Level 16+)
  {
    id: 'titan_chassis',
    name: 'Titan Şasisi',
    description: 'combat-bot-mk2 tüm statsını +5 artırır.',
    tier: AutomataMutationTier.TIER_3,
    cost: { mineral: 800, gas: 500 },
    prerequisiteIds: ['siege_protocol', 'quantum_shielding'],
    effects: [
      { target: 'unit_type', targetValue: 'combat-bot-mk2', stat: 'attack', modifier: 'add', value: 5 },
      { target: 'unit_type', targetValue: 'combat-bot-mk2', stat: 'defense', modifier: 'add', value: 5 },
      { target: 'unit_type', targetValue: 'combat-bot-mk2', stat: 'hp', modifier: 'add', value: 20 },
    ],
  },
  {
    id: 'neural_network_sync',
    name: 'Nöral Ağ Senkronizasyonu',
    description: 'Tüm Automata birimlerinin saldırısını %20 artırır.',
    tier: AutomataMutationTier.TIER_3,
    cost: { mineral: 1000, gas: 600 },
    prerequisiteIds: ['swarm_intelligence', 'factory_overhaul'],
    effects: [{ target: 'all_units', stat: 'attack', modifier: 'multiply', value: 1.2 }],
  },
];

export function getMutationsByTier(tier: AutomataMutationTier): MutationNode[] {
  return AUTOMATA_MUTATION_TREE.filter((m) => m.tier === tier);
}

export function getMutationById(id: string): MutationNode | undefined {
  return AUTOMATA_MUTATION_TREE.find((m) => m.id === id);
}

export function validateMutationChain(selectedIds: string[]): boolean {
  for (const id of selectedIds) {
    const node = getMutationById(id);
    if (!node) return false;
    for (const prereq of node.prerequisiteIds) {
      if (!selectedIds.includes(prereq)) return false;
    }
  }
  return true;
}
