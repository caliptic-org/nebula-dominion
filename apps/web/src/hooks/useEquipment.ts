'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  CommanderEquipment,
  EquipmentItem,
  EquipmentSlotType,
} from '@/types/equipment';
import { equipmentApi, OwnedEquipment } from '@/lib/equipment-api';

interface UseCommanderEquipmentResult {
  equipment: CommanderEquipment | null;
  loading: boolean;
  error: string | null;
  mutating: boolean;
  equip: (slot: EquipmentSlotType, item: EquipmentItem) => Promise<void>;
  unequip: (slot: EquipmentSlotType) => Promise<void>;
  reload: () => void;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function deriveCommanderEquipment(
  commanderId: string,
  inventory: OwnedEquipment[],
): CommanderEquipment {
  // Reduce the per-user inventory to just what this commander is wearing.
  // The backend's contract is "1 commander × 1 slot × 1 item" so this maps
  // cleanly without conflict resolution.
  const slots: Partial<Record<EquipmentSlotType, EquipmentItem>> = {};
  for (const item of inventory) {
    if (item.equippedOnCommanderId === commanderId) {
      const { equippedOnCommanderId: _ignored, ...rest } = item;
      slots[item.slot] = rest;
    }
  }
  return { commanderId, slots };
}

/**
 * Hook over the equipment endpoints, scoped to a single commander.
 *
 * The backend only exposes a flat /equipment/inventory (no per-commander
 * route), so this hook fetches the full inventory once and derives the
 * commander's loadout client-side. SWR's cache key is the commander id so
 * separate commanders share fetch state.
 *
 * Currently unused (apps/web/src/app/commanders/[id]/page.tsx wires the
 * inventory directly to avoid an extra layer), but kept around for future
 * call sites that prefer the hook abstraction.
 */
export function useCommanderEquipment(
  commanderId: string | null,
): UseCommanderEquipmentResult {
  const key = commanderId ? ['commander-equipment', commanderId] : null;

  const { data, error, isLoading, mutate } = useSWR<OwnedEquipment[]>(
    key,
    () => equipmentApi.getInventory(),
  );

  const [mutating, setMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const equipment = useMemo<CommanderEquipment | null>(() => {
    if (!commanderId || !data) return null;
    return deriveCommanderEquipment(commanderId, data);
  }, [commanderId, data]);

  const equip = useCallback(
    async (_slot: EquipmentSlotType, item: EquipmentItem) => {
      if (!commanderId || mutating) return;
      setMutating(true);
      setMutationError(null);
      try {
        await equipmentApi.equip(item.id, commanderId);
        await mutate();
      } catch (err) {
        setMutationError(errorMessage(err, 'Ekipman eklenemedi'));
      } finally {
        setMutating(false);
      }
    },
    [commanderId, mutate, mutating],
  );

  const unequip = useCallback(
    async (slot: EquipmentSlotType) => {
      if (!commanderId || !equipment || mutating) return;
      const slotItem = equipment.slots[slot];
      if (!slotItem) return;
      setMutating(true);
      setMutationError(null);
      try {
        await equipmentApi.unequip(slotItem.id);
        await mutate();
      } catch (err) {
        setMutationError(errorMessage(err, 'Ekipman çıkarılamadı'));
      } finally {
        setMutating(false);
      }
    },
    [commanderId, equipment, mutate, mutating],
  );

  const reload = useCallback(() => {
    setMutationError(null);
    mutate();
  }, [mutate]);

  const fetchError = error ? errorMessage(error, 'Ekipman yüklenemedi') : null;

  return {
    equipment,
    loading: isLoading,
    error: mutationError ?? fetchError,
    mutating,
    equip,
    unequip,
    reload,
  };
}

interface UseInventoryResult {
  inventory: OwnedEquipment[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useEquipmentInventory(enabled: boolean): UseInventoryResult {
  const { data, error, isLoading, mutate } = useSWR<OwnedEquipment[]>(
    enabled ? 'equipment-inventory' : null,
    () => equipmentApi.getInventory(),
  );

  const reload = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    inventory: data ?? [],
    loading: isLoading,
    error: error ? errorMessage(error, 'Envanter yüklenemedi') : null,
    reload,
  };
}
