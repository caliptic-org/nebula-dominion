import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { UnitSlot, CommanderSlot } from './formation.entity';

@Entity('formation_templates')
export class FormationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'unit_slots', type: 'jsonb', default: [] })
  unitSlots: UnitSlot[];

  @Column({ name: 'commander_slots', type: 'jsonb', default: [] })
  commanderSlots: CommanderSlot[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
