import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Game } from '../../game/entities/game.entity';

/**
 * api-side BuildingType enum — aligned with game-server's canonical enum
 * (apps/game-server/src/buildings/entities/building.entity.ts) per P5.2.
 *
 * The legacy api-only values (MINE, REFINERY, HANGAR, RESEARCH_LAB) are
 * retained for backward compatibility with any rows that were inserted
 * before the alignment migration (1779635000000) extended the DB enum.
 * New code should reach for the game-server-aligned names
 * (MINERAL_EXTRACTOR, GAS_REFINERY, FACTORY, ACADEMY).
 *
 * Postgres `buildings_type_enum` already accepts all of these values via
 * the ADD VALUE migration — no DB change needed alongside this TS change.
 *
 * The api `buildings` table and the game-server `player_buildings` table
 * are separate concepts (in-game battle entity vs persistent base) but
 * share enum values so cross-service code (e.g. battle resolution
 * referencing a player's base) can use one string vocabulary.
 */
export enum BuildingType {
  // Shared core (both services)
  COMMAND_CENTER     = 'command_center',
  BARRACKS           = 'barracks',
  SHIELD_GENERATOR   = 'shield_generator',
  TURRET             = 'turret',
  // game-server canonical (Çağ 1 production)
  MINERAL_EXTRACTOR  = 'mineral_extractor',
  GAS_REFINERY       = 'gas_refinery',
  SOLAR_PLANT        = 'solar_plant',
  ACADEMY            = 'academy',
  FACTORY            = 'factory',
  SPAWNING_POOL      = 'spawning_pool',
  HATCHERY           = 'hatchery',
  // game-server Çağ 2 buildings (Automata)
  NANO_FORGE         = 'nano_forge',
  CYBER_CORE         = 'cyber_core',
  QUANTUM_REACTOR    = 'quantum_reactor',
  DEFENSE_MATRIX     = 'defense_matrix',
  REPAIR_DRONE_BAY   = 'repair_drone_bay',
  // Legacy api-only — kept for back-compat; do not introduce new usages.
  MINE               = 'mine',
  REFINERY           = 'refinery',
  HANGAR             = 'hangar',
  RESEARCH_LAB       = 'research_lab',
}

@Entity('buildings')
export class Building {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  gameId: string;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @Column({ type: 'enum', enum: BuildingType })
  type: BuildingType;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 100 })
  health: number;

  @Column({ default: 100 })
  maxHealth: number;

  @Column({ type: 'jsonb', nullable: true })
  position: { x: number; y: number };

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
