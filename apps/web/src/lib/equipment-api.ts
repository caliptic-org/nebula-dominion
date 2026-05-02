import { api } from './api';
import {
  CommanderEquipment,
  EquipmentItem,
  EquipmentSlotType,
} from '@/types/equipment';

export const equipmentApi = {
  getCommanderEquipment: (commanderId: string) =>
    api.get<CommanderEquipment>(`/api/commanders/${commanderId}/equipment`),

  equipItem: (commanderId: string, slot: EquipmentSlotType, itemId: string) =>
    api.put<CommanderEquipment>(
      `/api/commanders/${commanderId}/equipment/${slot}`,
      { itemId },
    ),

  unequipItem: (commanderId: string, slot: EquipmentSlotType) =>
    api.delete<CommanderEquipment>(
      `/api/commanders/${commanderId}/equipment/${slot}`,
    ),

  getInventory: () => api.get<EquipmentItem[]>('/api/equipment/inventory'),
};
