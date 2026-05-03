import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EquipmentSlot } from '../types/equipment.types';

@Entity('commanders')
@Index(['playerId'])
export class Commander {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'locked_slots', type: 'simple-array', default: '' })
  lockedSlots: EquipmentSlot[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
