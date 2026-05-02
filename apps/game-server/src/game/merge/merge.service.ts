import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Race } from '../../matchmaking/dto/join-queue.dto';
import {
  MERGE_RECIPE_MAP,
  MERGE_RECIPES,
  MergeRecipe,
  MutationNode,
  findMutationNode,
  getAvailableMutations,
} from './merge.data';
import { UnitState } from '../room.service';

export interface MergeResult {
  mergedUnit: UnitState;
  removedUnitIds: string[];
  recipe: MergeRecipe;
}

export interface MutateResult {
  unit: UnitState;
  manaCost: number;
  unlockedAbility?: string;
  mutation: MutationNode;
}

@Injectable()
export class MergeService {
  /** Look up a recipe by the ingredient unit types (order-independent) */
  findRecipe(unitTypes: string[]): MergeRecipe | null {
    const key = [...unitTypes].sort().join('+');
    return MERGE_RECIPE_MAP.get(key) ?? null;
  }

  /**
   * Create the merged unit from source units.
   * Returns the new unit plus the IDs of the source units to remove.
   */
  merge(sourceUnits: UnitState[], recipe: MergeRecipe): MergeResult {
    const position = sourceUnits[0].position;
    const mergedUnit: UnitState = {
      id: uuidv4(),
      type: recipe.result.type,
      hp: recipe.result.hp,
      maxHp: recipe.result.maxHp,
      attack: recipe.result.attack,
      defense: recipe.result.defense,
      speed: recipe.result.speed,
      position,
      actionUsed: true,
      abilities: [],
      appliedMutations: [],
    };
    return {
      mergedUnit,
      removedUnitIds: sourceUnits.map((u) => u.id),
      recipe,
    };
  }

  /**
   * Apply a mutation to a merged unit.
   * Mutates the unit object in-place and returns the mana cost.
   */
  mutate(unit: UnitState, mutationId: string): MutateResult | null {
    const recipe = this.getRecipeForUnitType(unit.type);
    if (!recipe) return null;

    const applied = unit.appliedMutations ?? [];
    const available = getAvailableMutations(recipe, applied);
    const mutation = available.find((m) => m.id === mutationId);
    if (!mutation) return null;

    unit.attack += mutation.statBoosts.attack ?? 0;
    unit.defense += mutation.statBoosts.defense ?? 0;
    unit.speed += mutation.statBoosts.speed ?? 0;
    const hpBoost = mutation.statBoosts.hp ?? 0;
    unit.maxHp += hpBoost;
    unit.hp = Math.min(unit.hp + hpBoost, unit.maxHp);

    if (mutation.unlocksAbility) {
      unit.abilities = [...(unit.abilities ?? []), mutation.unlocksAbility];
    }
    unit.appliedMutations = [...applied, mutationId];

    return {
      unit,
      manaCost: mutation.manaCost,
      unlockedAbility: mutation.unlocksAbility,
      mutation,
    };
  }

  /** Get the recipe for a merged unit type (reverse lookup) */
  getRecipeForUnitType(unitType: string): MergeRecipe | null {
    return MERGE_RECIPES.find((r) => r.result.type === unitType) ?? null;
  }

  /** Get available next mutations for a unit given its current state */
  getAvailableMutationsForUnit(unit: UnitState): MutationNode[] {
    const recipe = this.getRecipeForUnitType(unit.type);
    if (!recipe) return [];
    return getAvailableMutations(recipe, unit.appliedMutations ?? []);
  }

  /** Returns all recipes, optionally filtered by race */
  getAllRecipes(race?: Race): MergeRecipe[] {
    if (!race) return MERGE_RECIPES;
    return MERGE_RECIPES.filter((r) => r.race === race);
  }

  /** Full mutation tree for a given merged unit type */
  getMutationTree(unitType: string): MutationNode[] | null {
    const recipe = this.getRecipeForUnitType(unitType);
    return recipe?.mutations ?? null;
  }

  /** Recursively find a mutation node anywhere in a recipe's tree */
  findMutationNode(recipe: MergeRecipe, mutationId: string): MutationNode | null {
    return findMutationNode(recipe.mutations, mutationId);
  }
}
