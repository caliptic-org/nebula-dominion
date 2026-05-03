import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface UnitSlot {
  unitId: string;
  position: number;
}

export interface CommanderSlot {
  commanderId: string;
  position: number;
}

@Entity('formations')
@Index(['playerId'])
@Index(['playerId', 'isActive'])
export class Formation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'unit_slots', type: 'jsonb', default: [] })
  unitSlots: UnitSlot[];

  @Column({ name: 'commander_slots', type: 'jsonb', default: [] })
  commanderSlots: CommanderSlot[];

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

  @Column({ name: 'is_last_active', type: 'boolean', default: false })
  isLastActive: boolean;

  @Column({ name: 'total_power', type: 'int', default: 0 })
  totalPower: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
