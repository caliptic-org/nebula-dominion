import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { EquipmentSlot } from '../types/equipment.types';
import { EquipmentItem } from './equipment-item.entity';

@Entity('commander_equipment_slots')
export class CommanderEquipmentSlot {
  @PrimaryColumn({ name: 'commander_id', type: 'uuid' })
  commanderId: string;

  @PrimaryColumn({ type: 'enum', enum: EquipmentSlot })
  slot: EquipmentSlot;

  @Column({ name: 'item_id', type: 'varchar', length: 255 })
  itemId: string;

  @ManyToOne(() => EquipmentItem, { eager: true })
  @JoinColumn({ name: 'item_id' })
  item: EquipmentItem;
}
