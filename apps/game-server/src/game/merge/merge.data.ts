import { Race } from '../../matchmaking/dto/join-queue.dto';

export interface MergeResultStats {
  type: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface MutationNode {
  id: string;
  name: string;
  manaCost: number;
  statBoosts: Partial<{ attack: number; defense: number; speed: number; hp: number }>;
  unlocksAbility?: string;
  next?: MutationNode[];
}

export interface MergeRecipe {
  id: string;
  race: Race;
  /** Sorted ingredient unit types used as lookup key */
  ingredients: string[];
  result: MergeResultStats;
  /** Root-level mutations the player can choose after merging */
  mutations: MutationNode[];
  description: string;
}

function ingredientKey(...types: string[]): string {
  return [...types].sort().join('+');
}

export const MERGE_RECIPES: MergeRecipe[] = [
  // ─── HUMAN ────────────────────────────────────────────────────────────────
  {
    id: 'human_soldier_soldier',
    race: Race.HUMAN,
    ingredients: ingredientKey('soldier', 'soldier').split('+'),
    result: { type: 'knight', hp: 65, maxHp: 65, attack: 16, defense: 12, speed: 3 },
    description: 'Two soldiers forge their wills into a fearless knight.',
    mutations: [
      {
        id: 'shield-bash',
        name: 'Shield Bash',
        manaCost: 20,
        statBoosts: { attack: 4, defense: 3 },
        unlocksAbility: 'stun_strike',
        next: [
          {
            id: 'war-cry',
            name: 'War Cry',
            manaCost: 25,
            statBoosts: { attack: 6, defense: 2 },
            unlocksAbility: 'rally_allies',
          },
          {
            id: 'fortress-stance',
            name: 'Fortress Stance',
            manaCost: 25,
            statBoosts: { defense: 10, hp: 20 },
            unlocksAbility: 'iron_will',
          },
        ],
      },
    ],
  },
  {
    id: 'human_mage_archer',
    race: Race.HUMAN,
    ingredients: ingredientKey('mage', 'archer').split('+'),
    result: { type: 'arcane-ranger', hp: 40, maxHp: 40, attack: 22, defense: 4, speed: 4 },
    description: 'Arcane energies infuse arrows with devastating magical force.',
    mutations: [
      {
        id: 'piercing-shot',
        name: 'Piercing Shot',
        manaCost: 20,
        statBoosts: { attack: 5, speed: 1 },
        unlocksAbility: 'armor_pierce',
        next: [
          {
            id: 'arcane-volley',
            name: 'Arcane Volley',
            manaCost: 30,
            statBoosts: { attack: 8 },
            unlocksAbility: 'multi_shot',
          },
          {
            id: 'mana-arrow',
            name: 'Mana Arrow',
            manaCost: 30,
            statBoosts: { attack: 6, defense: 4 },
            unlocksAbility: 'mana_drain',
          },
        ],
      },
    ],
  },
  {
    id: 'human_mage_soldier',
    race: Race.HUMAN,
    ingredients: ingredientKey('mage', 'soldier').split('+'),
    result: { type: 'battle-mage', hp: 50, maxHp: 50, attack: 20, defense: 7, speed: 2 },
    description: 'A warrior who weaves spells into every swing of the blade.',
    mutations: [
      {
        id: 'arcane-strike',
        name: 'Arcane Strike',
        manaCost: 20,
        statBoosts: { attack: 7, defense: 2 },
        unlocksAbility: 'spell_blade',
        next: [
          {
            id: 'arcane-shield',
            name: 'Arcane Shield',
            manaCost: 25,
            statBoosts: { defense: 8, hp: 15 },
            unlocksAbility: 'mana_shield',
          },
          {
            id: 'mana-surge',
            name: 'Mana Surge',
            manaCost: 30,
            statBoosts: { attack: 12 },
            unlocksAbility: 'arcane_burst',
          },
        ],
      },
    ],
  },
  {
    id: 'human_archer_soldier',
    race: Race.HUMAN,
    ingredients: ingredientKey('archer', 'soldier').split('+'),
    result: { type: 'scout', hp: 48, maxHp: 48, attack: 14, defense: 6, speed: 5 },
    description: 'Swift and deadly, the scout strikes before enemies can react.',
    mutations: [
      {
        id: 'shadow-step',
        name: 'Shadow Step',
        manaCost: 15,
        statBoosts: { speed: 2, attack: 3 },
        unlocksAbility: 'ambush',
        next: [
          {
            id: 'rapid-fire',
            name: 'Rapid Fire',
            manaCost: 25,
            statBoosts: { attack: 8, speed: 1 },
            unlocksAbility: 'double_strike',
          },
          {
            id: 'evasion',
            name: 'Evasion',
            manaCost: 20,
            statBoosts: { speed: 3, defense: 5 },
            unlocksAbility: 'dodge',
          },
        ],
      },
    ],
  },

  // ─── ZERG ──────────────────────────────────────────────────────────────────
  {
    id: 'zerg_drone_drone',
    race: Race.ZERG,
    ingredients: ingredientKey('drone', 'drone').split('+'),
    result: { type: 'ravager', hp: 45, maxHp: 45, attack: 15, defense: 8, speed: 4 },
    description: 'Two drones bio-fuse into a faster, deadlier ravager.',
    mutations: [
      {
        id: 'corrosive-acid',
        name: 'Corrosive Acid',
        manaCost: 20,
        statBoosts: { attack: 6, defense: 2 },
        unlocksAbility: 'acid_splash',
        next: [
          {
            id: 'rapid-molt',
            name: 'Rapid Molt',
            manaCost: 25,
            statBoosts: { speed: 3, hp: 15 },
            unlocksAbility: 'regenerate',
          },
          {
            id: 'hyper-growth',
            name: 'Hyper Growth',
            manaCost: 30,
            statBoosts: { attack: 10, defense: 4 },
            unlocksAbility: 'frenzy',
          },
        ],
      },
    ],
  },
  {
    id: 'zerg_drone_guardian',
    race: Race.ZERG,
    ingredients: ingredientKey('drone', 'guardian').split('+'),
    result: { type: 'broodmother', hp: 80, maxHp: 80, attack: 20, defense: 14, speed: 2 },
    description: 'Guardian instincts amplified by drone bio-mass create the broodmother.',
    mutations: [
      {
        id: 'spawn-larva',
        name: 'Spawn Larva',
        manaCost: 25,
        statBoosts: { hp: 20, defense: 4 },
        unlocksAbility: 'spawn_drone',
        next: [
          {
            id: 'chitin-armor',
            name: 'Chitin Armor',
            manaCost: 30,
            statBoosts: { defense: 10, hp: 25 },
            unlocksAbility: 'hardened_shell',
          },
          {
            id: 'toxic-blood',
            name: 'Toxic Blood',
            manaCost: 25,
            statBoosts: { attack: 8, defense: 2 },
            unlocksAbility: 'poison_retaliation',
          },
        ],
      },
    ],
  },
  {
    id: 'zerg_ravager_ravager',
    race: Race.ZERG,
    ingredients: ingredientKey('ravager', 'ravager').split('+'),
    result: { type: 'overlord', hp: 90, maxHp: 90, attack: 25, defense: 12, speed: 3 },
    description: 'Two ravagers merge into the supreme apex predator of the swarm.',
    mutations: [
      {
        id: 'psionic-burst',
        name: 'Psionic Burst',
        manaCost: 30,
        statBoosts: { attack: 8, speed: 1 },
        unlocksAbility: 'mind_shatter',
        next: [
          {
            id: 'swarm-aura',
            name: 'Swarm Aura',
            manaCost: 35,
            statBoosts: { attack: 6, defense: 6, speed: 2 },
            unlocksAbility: 'hive_mind',
          },
          {
            id: 'consume',
            name: 'Consume',
            manaCost: 35,
            statBoosts: { hp: 40, attack: 10 },
            unlocksAbility: 'devour',
          },
        ],
      },
    ],
  },

  // ─── AUTOMATON ─────────────────────────────────────────────────────────────
  {
    id: 'automaton_combat-bot_combat-bot',
    race: Race.AUTOMATON,
    ingredients: ingredientKey('combat-bot', 'combat-bot').split('+'),
    result: { type: 'mega-bot', hp: 90, maxHp: 90, attack: 22, defense: 22, speed: 2 },
    description: 'Dual combat units merge into a hardened titan of metal and fury.',
    mutations: [
      {
        id: 'hydraulic-fist',
        name: 'Hydraulic Fist',
        manaCost: 20,
        statBoosts: { attack: 8, defense: 4 },
        unlocksAbility: 'knockback',
        next: [
          {
            id: 'reinforced-plating',
            name: 'Reinforced Plating',
            manaCost: 30,
            statBoosts: { defense: 12, hp: 20 },
            unlocksAbility: 'damage_reduction',
          },
          {
            id: 'overcharge',
            name: 'Overcharge',
            manaCost: 30,
            statBoosts: { attack: 15, speed: 1 },
            unlocksAbility: 'power_surge',
          },
        ],
      },
    ],
  },
  {
    id: 'automaton_artillery_combat-bot',
    race: Race.AUTOMATON,
    ingredients: ingredientKey('artillery', 'combat-bot').split('+'),
    result: { type: 'siege-mech', hp: 60, maxHp: 60, attack: 32, defense: 12, speed: 1 },
    description: 'Artillery range fused with combat chassis: mobile devastation.',
    mutations: [
      {
        id: 'explosive-shell',
        name: 'Explosive Shell',
        manaCost: 25,
        statBoosts: { attack: 10, defense: 3 },
        unlocksAbility: 'area_bombardment',
        next: [
          {
            id: 'advanced-targeting',
            name: 'Advanced Targeting',
            manaCost: 30,
            statBoosts: { attack: 12, speed: 1 },
            unlocksAbility: 'precision_strike',
          },
          {
            id: 'shield-generator',
            name: 'Shield Generator',
            manaCost: 30,
            statBoosts: { defense: 15, hp: 25 },
            unlocksAbility: 'energy_barrier',
          },
        ],
      },
    ],
  },
  {
    id: 'automaton_artillery_artillery',
    race: Race.AUTOMATON,
    ingredients: ingredientKey('artillery', 'artillery').split('+'),
    result: { type: 'orbital-cannon', hp: 40, maxHp: 40, attack: 45, defense: 5, speed: 1 },
    description: 'Twin artillery combine into a weapon of mass destruction.',
    mutations: [
      {
        id: 'plasma-round',
        name: 'Plasma Round',
        manaCost: 30,
        statBoosts: { attack: 15 },
        unlocksAbility: 'plasma_burst',
        next: [
          {
            id: 'orbital-strike',
            name: 'Orbital Strike',
            manaCost: 40,
            statBoosts: { attack: 20 },
            unlocksAbility: 'annihilate',
          },
          {
            id: 'bunker-down',
            name: 'Bunker Down',
            manaCost: 35,
            statBoosts: { defense: 20, hp: 30 },
            unlocksAbility: 'fortify',
          },
        ],
      },
    ],
  },
  {
    id: 'automaton_mega-bot_artillery',
    race: Race.AUTOMATON,
    ingredients: ingredientKey('mega-bot', 'artillery').split('+'),
    result: { type: 'titan', hp: 120, maxHp: 120, attack: 40, defense: 30, speed: 1 },
    description: 'The ultimate automaton weapon—unstoppable and nearly indestructible.',
    mutations: [
      {
        id: 'titan-smash',
        name: 'Titan Smash',
        manaCost: 35,
        statBoosts: { attack: 15, defense: 5 },
        unlocksAbility: 'earthquake',
        next: [
          {
            id: 'godcore-protocol',
            name: 'Godcore Protocol',
            manaCost: 50,
            statBoosts: { attack: 20, defense: 15, hp: 40 },
            unlocksAbility: 'omega_strike',
          },
        ],
      },
    ],
  },
];

/** Fast lookup by sorted ingredient key */
export const MERGE_RECIPE_MAP = new Map<string, MergeRecipe>(
  MERGE_RECIPES.map((r) => [r.ingredients.slice().sort().join('+'), r]),
);

/** Recursive DFS to find a mutation node by ID */
export function findMutationNode(nodes: MutationNode[], id: string): MutationNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.next) {
      const found = findMutationNode(node.next, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Returns the mutation nodes the player can choose next,
 * given the list of already-applied mutation IDs.
 */
export function getAvailableMutations(recipe: MergeRecipe, applied: string[]): MutationNode[] {
  if (applied.length === 0) return recipe.mutations;
  const lastId = applied[applied.length - 1];
  const lastNode = findMutationNode(recipe.mutations, lastId);
  return lastNode?.next ?? [];
}
