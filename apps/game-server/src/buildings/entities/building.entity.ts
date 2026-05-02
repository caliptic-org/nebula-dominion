import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BuildingType {
  COMMAND_CENTER = 'command_center',
  MINERAL_EXTRACTOR = 'mineral_extractor',
  GAS_REFINERY = 'gas_refinery',
  SOLAR_PLANT = 'solar_plant',
  BARRACKS = 'barracks',
  TURRET = 'turret',
  SHIELD_GENERATOR = 'shield_generator',
  // Race-specific production buildings
  SPAWNING_POOL = 'spawning_pool',
  HATCHERY = 'hatchery',
  FACTORY = 'factory',
  ACADEMY = 'academy',
}

export enum BuildingStatus {
  CONSTRUCTING = 'constructing',
  ACTIVE = 'active',
  DESTROYED = 'destroyed',
}

@Entity('buildings')
@Index(['playerId', 'status'])
export class Building {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id' })
  @Index()
  playerId: string;

  @Column({ type: 'enum', enum: BuildingType })
  type: BuildingType;

  @Column({ default: 1 })
  level: number;

  @Column({ type: 'enum', enum: BuildingStatus, default: BuildingStatus.CONSTRUCTING })
  status: BuildingStatus;

  @Column({ name: 'construction_started_at', type: 'timestamptz', nullable: true })
  constructionStartedAt: Date | null;

  @Column({ name: 'construction_complete_at', type: 'timestamptz', nullable: true })
  constructionCompleteAt: Date | null;

  @Column({ name: 'position_x', default: 0 })
  positionX: number;

  @Column({ name: 'position_y', default: 0 })
  positionY: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
