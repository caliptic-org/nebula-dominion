import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// "player_resources" is the game-server's canonical resources table.
// The api service owns a separate "resources" table with an EAV model
// (type/amount); both share the same Postgres DB, so we use distinct
// table names to avoid collision.
@Entity('player_resources')
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', unique: true })
  @Index()
  playerId: string;

  /* Starter grants — sized to comfortably afford the first 4 buildings:
   *   mineral_extractor (50/0/20) + gas_refinery (75/0/30) +
   *   solar_plant (60/20/0) + barracks (150/50/40)
   *   = 335 mineral / 70 gas / 90 energy required.
   * The buffer leaves room for a second extractor + a tier-1 unit train.
   * Was previously 100/50/100 which trapped new players who needed
   * 150 mineral + 50 gas to even build a barracks — chicken-and-egg
   * since nothing trickles passively before the first building lands. */
  @Column({ type: 'numeric', precision: 12, scale: 4, default: 500 })
  mineral: number;

  @Column({ type: 'numeric', precision: 12, scale: 4, default: 200 })
  gas: number;

  @Column({ type: 'numeric', precision: 12, scale: 4, default: 250 })
  energy: number;

  @Column({ type: 'numeric', precision: 12, scale: 4, default: 0 })
  population: number;

  /** Science points — earned from battles + garrisoned relay/colony/mine nodes */
  @Column({ type: 'numeric', precision: 12, scale: 4, default: 0 })
  science: number;

  /** Storage caps — recalculated when the player advances to a new age */
  @Column({ name: 'mineral_cap', default: 24000 })
  mineralCap: number;

  @Column({ name: 'gas_cap', default: 14400 })
  gasCap: number;

  @Column({ name: 'energy_cap', default: 8400 })
  energyCap: number;

  @Column({ name: 'population_cap', default: 5000 })
  populationCap: number;

  @Column({ name: 'science_cap', default: 999999 })
  scienceCap: number;

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
