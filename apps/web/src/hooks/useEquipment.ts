'use client';

import { useCallback, useEffect, useState } from 'react';
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

export function useCommanderEquipment(
  commanderId: string | null,
): UseCommanderEquipmentResult {
  const [equipment, setEquipment] = useState<CommanderEquipment | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [mutating, setMutating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!commanderId) {
      setEquipment(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    equipmentApi
      .getCommanderEquipment(commanderId)
      .then((data) => {
        if (!cancelled) setEquipment(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setEquipment(null);
          setError(
            err instanceof Error ? err.message : 'Ekipman yüklenemedi',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [commanderId, reloadKey]);

  const equip = useCallback(
    async (slot: EquipmentSlotType, item: EquipmentItem) => {
      if (!commanderId || !equipment) return;
      const previous = equipment;
      const optimistic: CommanderEquipment = {
        ...equipment,
        slots: { ...equipment.slots, [slot]: item },
      };
      setEquipment(optimistic);
      setMutating(true);
      setError(null);
      try {
        const next = await equipmentApi.equipItem(commanderId, slot, item.id);
        setEquipment(next);
      } catch (err) {
        setEquipment(previous);
        setError(err instanceof Error ? err.message : 'Ekipman eklenemedi');
      } finally {
        setMutating(false);
      }
    },
    [commanderId, equipment],
  );

  const unequip = useCallback(
    async (slot: EquipmentSlotType) => {
      if (!commanderId || !equipment) return;
      const previous = equipment;
      const slots = { ...equipment.slots };
      delete slots[slot];
      const optimistic: CommanderEquipment = { ...equipment, slots };
      setEquipment(optimistic);
      setMutating(true);
      setError(null);
      try {
        const next = await equipmentApi.unequipItem(commanderId, slot);
        setEquipment(next);
      } catch (err) {
        setEquipment(previous);
        setError(err instanceof Error ? err.message : 'Ekipman çıkarılamadı');
      } finally {
        setMutating(false);
      }
    },
    [commanderId, equipment],
  );

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { equipment, loading, error, mutating, equip, unequip, reload };
}

interface UseInventoryResult {
  inventory: EquipmentItem[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useEquipmentInventory(enabled: boolean): UseInventoryResult {
  const [inventory, setInventory] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    equipmentApi
      .getInventory()
      .then((items) => {
        if (!cancelled) setInventory(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setInventory([]);
          setError(
            err instanceof Error ? err.message : 'Envanter yüklenemedi',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { inventory, loading, error, reload };
}
