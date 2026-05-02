import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', unique: true })
  @Index()
  playerId: string;

  @Column({ default: 100 })
  mineral: number;

  @Column({ default: 50 })
  gas: number;

  @Column({ default: 100 })
  energy: number;

  /** Maximum resource caps */
  @Column({ name: 'mineral_cap', default: 5000 })
  mineralCap: number;

  @Column({ name: 'gas_cap', default: 2000 })
  gasCap: number;

  @Column({ name: 'energy_cap', default: 500 })
  energyCap: number;

  /** Net production per tick (derived from buildings; stored as denormalized cache) */
  @Column({ name: 'mineral_per_tick', default: 0 })
  mineralPerTick: number;

  @Column({ name: 'gas_per_tick', default: 0 })
  gasPerTick: number;

  @Column({ name: 'energy_per_tick', default: 5 })
  energyPerTick: number;

  @Column({ name: 'last_tick_at', type: 'timestamptz', nullable: true })
  lastTickAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
