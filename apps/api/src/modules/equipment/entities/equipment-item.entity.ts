import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserEquipment } from './user-equipment.entity';

/**
 * Equipment slot taxonomy. Mirrors apps/web/src/types/equipment.ts so the
 * frontend's SLOT_META / SLOT_ORDER can decode catalog rows without a
 * translation step.
 *
 *   silah       -> weapon
 *   zirh        -> armor
 *   aksesuar_1  -> accessory slot 1
 *   aksesuar_2  -> accessory slot 2
 *   aksesuar_3  -> accessory slot 3
 *   ozel        -> race-locked "special" slot
 */
export type EquipmentSlot =
  | 'silah'
  | 'zirh'
  | 'aksesuar_1'
  | 'aksesuar_2'
  | 'aksesuar_3'
  | 'ozel';

export type EquipmentRarity =
  | 'siradan'   // common   - gray
  | 'yaygin'    // uncommon - green
  | 'nadir'     // rare     - blue
  | 'destansi'  // epic     - purple
  | 'efsanevi'; // legendary- gold

export const EQUIPMENT_SLOT_VALUES = [
  'silah',
  'zirh',
  'aksesuar_1',
  'aksesuar_2',
  'aksesuar_3',
  'ozel',
] as const;

export const EQUIPMENT_RARITY_VALUES = [
  'siradan',
  'yaygin',
  'nadir',
  'destansi',
  'efsanevi',
] as const;

@Entity('equipment_items')
export class EquipmentItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'enum', enum: EQUIPMENT_SLOT_VALUES })
  slot: EquipmentSlot;

  @Column({ type: 'enum', enum: EQUIPMENT_RARITY_VALUES, default: 'siradan' })
  rarity: EquipmentRarity;

  @Column({ name: 'atk_boost', type: 'int', default: 0 })
  atkBoost: number;

  @Column({ name: 'def_boost', type: 'int', default: 0 })
  defBoost: number;

  @Column({ name: 'hp_boost', type: 'int', default: 0 })
  hpBoost: number;

  @Column({ name: 'spd_boost', type: 'int', default: 0 })
  spdBoost: number;

  @Column({ type: 'varchar', length: 50 })
  icon: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => UserEquipment, (ue) => ue.equipmentItem)
  userEquipments: UserEquipment[];
}
