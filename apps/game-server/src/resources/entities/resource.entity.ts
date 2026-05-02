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

  @Column({ type: 'numeric', precision: 12, scale: 4, default: 100 })
  mineral: number;

  @Column({ type: 'numeric', precision: 12, scale: 4, default: 50 })
  gas: number;

  @Column({ type: 'numeric', precision: 12, scale: 4, default: 100 })
  energy: number;

  @Column({ type: 'numeric', precision: 12, scale: 4, default: 0 })
  population: number;

  /** Storage caps — recalculated when the player advances to a new age */
  @Column({ name: 'mineral_cap', default: 24000 })
  mineralCap: number;

  @Column({ name: 'gas_cap', default: 14400 })
  gasCap: number;

  @Column({ name: 'energy_cap', default: 8400 })
  energyCap: number;

  @Column({ name: 'population_cap', default: 5000 })
  populationCap: number;

  /** Net production per tick (30 s) — stored as float for precision, derived from active buildings */
  @Column({ name: 'mineral_per_tick', type: 'numeric', precision: 10, scale: 4, default: 0 })
  mineralPerTick: number;

  @Column({ name: 'gas_per_tick', type: 'numeric', precision: 10, scale: 4, default: 0 })
  gasPerTick: number;

  @Column({ name: 'energy_per_tick', type: 'numeric', precision: 10, scale: 4, default: 0 })
  energyPerTick: number;

  @Column({ name: 'population_per_tick', type: 'numeric', precision: 10, scale: 4, default: 0 })
  populationPerTick: number;

  /** Updated by resource ticks and offline accumulation — used to compute missed production on login */
  @Column({ name: 'last_tick_at', type: 'timestamptz', nullable: true })
  lastTickAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
