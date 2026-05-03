export interface LootBoxItem {
  type: 'mineral' | 'gas' | 'energy' | 'premium_currency' | 'cosmetic' | 'unit_blueprint' | 'boost';
  name: string;
  amount?: number;
  description: string;
  weight: number; // Higher = more common
}

// Weighted loot table — roll a random item using cumulative weight
export const LOOT_BOX_TABLE: LootBoxItem[] = [
  { type: 'mineral', name: 'Mineral Pack', amount: 300, description: '+300 Mineral', weight: 30 },
  { type: 'gas', name: 'Gas Canister', amount: 150, description: '+150 Gas', weight: 25 },
  { type: 'energy', name: 'Energy Cell', amount: 200, description: '+200 Energy', weight: 20 },
  { type: 'premium_currency', name: 'Premium Coins', amount: 50, description: '+50 Premium Currency', weight: 10 },
  { type: 'boost', name: 'Production Boost', description: '+50% resource production for 1 hour', weight: 8 },
  { type: 'unit_blueprint', name: 'Unit Blueprint', description: 'Random rare unit blueprint', weight: 5 },
  { type: 'cosmetic', name: 'Commander Skin Fragment', description: 'Rare cosmetic item fragment', weight: 2 },
];

export function rollLootBox(count = 3): LootBoxItem[] {
  const totalWeight = LOOT_BOX_TABLE.reduce((sum, item) => sum + item.weight, 0);
  const results: LootBoxItem[] = [];

  for (let i = 0; i < count; i++) {
    let roll = Math.random() * totalWeight;
    for (const item of LOOT_BOX_TABLE) {
      roll -= item.weight;
      if (roll <= 0) {
        results.push(item);
        break;
      }
    }
  }

  return results;
}
