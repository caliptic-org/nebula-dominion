import { Entity, Column, PrimaryColumn } from 'typeorm';
import { EquipmentSlot, EquipmentRarity, EquipmentStats } from '../types/equipment.types';

@Entity('equipment_items')
export class EquipmentItem {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: EquipmentSlot })
  slot: EquipmentSlot;

  @Column({ type: 'enum', enum: EquipmentRarity })
  rarity: EquipmentRarity;

  @Column({ type: 'varchar', length: 255 })
  icon: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  stats: EquipmentStats;
}
