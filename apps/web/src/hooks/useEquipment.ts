'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import {
  CommanderEquipment,
  EquipmentItem,
  EquipmentSlotType,
} from '@/types/equipment';
import { equipmentApi } from '@/lib/equipment-api';

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

export function useCommanderEquipment(
  commanderId: string | null,
): UseCommanderEquipmentResult {
  const key = commanderId ? ['commander-equipment', commanderId] : null;

  const { data, error, isLoading, mutate } = useSWR<CommanderEquipment>(
    key,
    () => equipmentApi.getCommanderEquipment(commanderId!),
  );

  const [mutating, setMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const equip = useCallback(
    async (slot: EquipmentSlotType, item: EquipmentItem) => {
      if (!commanderId || !data || mutating) return;
      const optimistic: CommanderEquipment = {
        ...data,
        slots: { ...data.slots, [slot]: item },
      };
      setMutating(true);
      setMutationError(null);
      try {
        await mutate(equipmentApi.equipItem(commanderId, slot, item.id), {
          optimisticData: optimistic,
          rollbackOnError: true,
          populateCache: true,
          revalidate: false,
        });
      } catch (err) {
        setMutationError(errorMessage(err, 'Ekipman eklenemedi'));
      } finally {
        setMutating(false);
      }
    },
    [commanderId, data, mutate, mutating],
  );

  const unequip = useCallback(
    async (slot: EquipmentSlotType) => {
      if (!commanderId || !data || mutating) return;
      const slots = { ...data.slots };
      delete slots[slot];
      const optimistic: CommanderEquipment = { ...data, slots };
      setMutating(true);
      setMutationError(null);
      try {
        await mutate(equipmentApi.unequipItem(commanderId, slot), {
          optimisticData: optimistic,
          rollbackOnError: true,
          populateCache: true,
          revalidate: false,
        });
      } catch (err) {
        setMutationError(errorMessage(err, 'Ekipman çıkarılamadı'));
      } finally {
        setMutating(false);
      }
    },
    [commanderId, data, mutate, mutating],
  );

  const reload = useCallback(() => {
    setMutationError(null);
    mutate();
  }, [mutate]);

  const fetchError = error ? errorMessage(error, 'Ekipman yüklenemedi') : null;

  return {
    equipment: data ?? null,
    loading: isLoading,
    error: mutationError ?? fetchError,
    mutating,
    equip,
    unequip,
    reload,
  };
}

interface UseInventoryResult {
  inventory: EquipmentItem[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useEquipmentInventory(enabled: boolean): UseInventoryResult {
  const { data, error, isLoading, mutate } = useSWR<EquipmentItem[]>(
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
