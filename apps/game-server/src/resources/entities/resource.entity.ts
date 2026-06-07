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
  // numeric(20,4) accommodates Lv 54 upgrade costs (≈10^12) without
  // overflow. Migration 1779800000000 widened the columns on existing
  // rows; entity defaults match the schema.
  @Column({ type: 'numeric', precision: 20, scale: 4, default: 500 })
  mineral: number;

  @Column({ type: 'numeric', precision: 20, scale: 4, default: 200 })
  gas: number;

  @Column({ type: 'numeric', precision: 20, scale: 4, default: 250 })
  energy: number;

  @Column({ type: 'numeric', precision: 20, scale: 4, default: 0 })
  population: number;

  /** Science points — earned from battles + garrisoned relay/colony/mine nodes */
  @Column({ type: 'numeric', precision: 20, scale: 4, default: 0 })
  science: number;

  /** Storage caps — bigint so Lv 54 wallets can hold trillions.
   *  Default 10T (10_000_000_000_000) across all four playable currencies
   *  so the cap never gates a tester during a playtest pass. Per-age
   *  rebalancing can drop these per row if real-economy tuning needs it
   *  later; the default is the safe ceiling. */
  @Column({ name: 'mineral_cap', type: 'bigint', default: 10000000000000 })
  mineralCap: number;

  @Column({ name: 'gas_cap', type: 'bigint', default: 10000000000000 })
  gasCap: number;

  @Column({ name: 'energy_cap', type: 'bigint', default: 10000000000000 })
  energyCap: number;

  @Column({ name: 'population_cap', type: 'bigint', default: 5000 })
  populationCap: number;

  @Column({ name: 'science_cap', type: 'bigint', default: 10000000000000 })
  scienceCap: number;

  /** Net production per tick (30 s) — stored as float for precision, derived from active buildings.
   *  Widened to numeric(20,4) alongside the amount columns so Lv 54 multi-
   *  building stacks don't overflow when production rates are recomputed. */
  @Column({ name: 'mineral_per_tick', type: 'numeric', precision: 20, scale: 4, default: 0 })
  mineralPerTick: number;

  @Column({ name: 'gas_per_tick', type: 'numeric', precision: 20, scale: 4, default: 0 })
  gasPerTick: number;

  @Column({ name: 'energy_per_tick', type: 'numeric', precision: 20, scale: 4, default: 0 })
  energyPerTick: number;

  @Column({ name: 'population_per_tick', type: 'numeric', precision: 20, scale: 4, default: 0 })
  populationPerTick: number;

  /** Science produced per tick (30 s) — cycle 17 BAL-02. Derived from
   *  active research labs (academy / cyber_core / hatchery sciencePerTick)
   *  in recalculateProductionRates. Decouples mid-game base upgrades from
   *  PvP-only science sourcing. Companion migration:
   *  1779940000000-AddBuildingScienceProduction. */
  @Column({ name: 'science_per_tick', type: 'numeric', precision: 20, scale: 4, default: 0 })
  sciencePerTick: number;

  /** Updated by resource ticks and offline accumulation — used to compute missed production on login */
  @Column({ name: 'last_tick_at', type: 'timestamptz', nullable: true })
  lastTickAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
