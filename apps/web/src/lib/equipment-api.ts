import { api } from './api';
import {
  EquipmentItem,
  EquipmentRarity,
  EquipmentSlotType,
  EquipmentStats,
} from '@/types/equipment';

/**
 * Wire client for the NestJS equipment module.
 *
 * Backend routes (apps/api/src/modules/equipment/equipment.controller.ts):
 *   GET  /equipment/catalog          — all active equipment_items
 *   GET  /equipment/inventory        — user's owned items + commander binding
 *   POST /equipment/:id/equip        body: { commanderId }
 *   POST /equipment/:id/unequip
 *
 * The lib/api wrapper prepends `/api/v1` automatically, so paths here stay
 * prefix-free.
 */

interface CatalogDto {
  id: string;
  name: string;
  slot: EquipmentSlotType;
  rarity: EquipmentRarity;
  atkBoost: number;
  defBoost: number;
  hpBoost: number;
  spdBoost: number;
  icon: string;
  description: string;
}

interface InventoryDto extends CatalogDto {
  userEquipmentId: string;
  equippedOnCommanderId: string | null;
  acquiredAt: string;
}

export interface OwnedEquipment extends EquipmentItem {
  equippedOnCommanderId: string | null;
}

function statsFromDto(dto: CatalogDto): EquipmentStats {
  // Strip 0/falsy values so the modal's stat-chip filter renders cleanly.
  const s: EquipmentStats = {};
  if (dto.atkBoost) s.attack = dto.atkBoost;
  if (dto.defBoost) s.defense = dto.defBoost;
  if (dto.hpBoost) s.hp = dto.hpBoost;
  if (dto.spdBoost) s.speed = dto.spdBoost;
  return s;
}

function fromCatalogDto(dto: CatalogDto): EquipmentItem {
  return {
    id: dto.id,
    name: dto.name,
    slot: dto.slot,
    rarity: dto.rarity,
    icon: dto.icon,
    stats: statsFromDto(dto),
    description: dto.description,
  };
}

function fromInventoryDto(dto: InventoryDto): OwnedEquipment {
  return {
    ...fromCatalogDto(dto),
    isEquipped: dto.equippedOnCommanderId !== null,
    equippedOnCommanderId: dto.equippedOnCommanderId,
  };
}

export const equipmentApi = {
  getCatalog: async (): Promise<EquipmentItem[]> => {
    const rows = await api.get<CatalogDto[]>('/equipment/catalog');
    return rows.map(fromCatalogDto);
  },

  getInventory: async (): Promise<OwnedEquipment[]> => {
    const rows = await api.get<InventoryDto[]>('/equipment/inventory');
    return rows.map(fromInventoryDto);
  },

  equip: async (
    equipmentId: string,
    commanderId: string,
  ): Promise<OwnedEquipment> => {
    const dto = await api.post<InventoryDto>(
      `/equipment/${encodeURIComponent(equipmentId)}/equip`,
      { commanderId },
    );
    return fromInventoryDto(dto);
  },

  unequip: async (equipmentId: string): Promise<OwnedEquipment> => {
    const dto = await api.post<InventoryDto>(
      `/equipment/${encodeURIComponent(equipmentId)}/unequip`,
    );
    return fromInventoryDto(dto);
  },
};
