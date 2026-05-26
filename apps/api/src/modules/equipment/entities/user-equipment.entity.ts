import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { EquipmentItem } from './equipment-item.entity';

/**
 * Junction row: which equipment a user owns and (optionally) which commander
 * currently has it equipped. A NULL equippedOnCommanderId means the item is
 * sitting in the inventory unequipped. equippedOnCommanderId references a
 * static commander slug (e.g. 'voss', 'malphas') from apps/web/src/app/
 * commanders/data.ts — commanders are not a DB table yet, so this is a
 * plain string FK by convention.
 *
 * UNIQUE(user_id, equipment_id) keeps inventory unique per item — duplicates
 * would be a separate "stacks" feature (out of MVP scope).
 */
@Entity('user_equipment')
@Unique(['userId', 'equipmentId'])
export class UserEquipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ name: 'equipment_id', type: 'uuid' })
  equipmentId: string;

  @ManyToOne(() => EquipmentItem, (item) => item.userEquipments, { eager: true })
  @JoinColumn({ name: 'equipment_id' })
  equipmentItem: EquipmentItem;

  // Commander id is a free-form slug (see commanders data file); no FK.
  // NULL = unequipped (in user's inventory only).
  @Index()
  @Column({
    name: 'equipped_on_commander_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  equippedOnCommanderId: string | null;

  @CreateDateColumn({ name: 'acquired_at' })
  acquiredAt: Date;
}
