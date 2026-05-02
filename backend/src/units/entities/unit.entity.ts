import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UnitType } from './unit-type.entity';

export enum UnitStatus {
  ALIVE = 'alive',
  DEAD = 'dead',
  IN_BATTLE = 'in_battle',
}

@Entity('units')
@Index(['playerId', 'status'])
@Index(['playerId', 'unitTypeId'])
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  @Index()
  playerId: string;

  @Column({ name: 'unit_type_id', type: 'uuid' })
  unitTypeId: string;

  @ManyToOne(() => UnitType, (ut) => ut.units, { eager: true })
  @JoinColumn({ name: 'unit_type_id' })
  unitType: UnitType;

  // Current stats (can differ from base due to battle damage / buffs)
  @Column({ name: 'current_hp', type: 'int' })
  currentHp: number;

  @Column({ name: 'max_hp', type: 'int' })
  maxHp: number;

  @Column({ name: 'attack', type: 'int' })
  attack: number;

  @Column({ name: 'defense', type: 'int' })
  defense: number;

  @Column({ name: 'speed', type: 'int' })
  speed: number;

  @Column({
    type: 'enum',
    enum: UnitStatus,
    default: UnitStatus.ALIVE,
  })
  status: UnitStatus;

  @Column({ name: 'experience', type: 'int', default: 0 })
  experience: number;

  @Column({ name: 'kills', type: 'int', default: 0 })
  kills: number;

  @Column({ name: 'mutation_count', type: 'int', default: 0 })
  mutationCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
