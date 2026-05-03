import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PlayerEraProgress } from './player-era-progress.entity';

@Entity('era_mechanic_unlocks')
@Index(['playerId', 'era'])
export class EraMechanicUnlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'era', type: 'int' })
  era: number;

  // Mechanic identifier (e.g. "resource_extraction", "alliance_bonuses", "advanced_merge")
  @Column({ name: 'mechanic_code', type: 'varchar', length: 64 })
  mechanicCode: string;

  @Column({ name: 'mechanic_name', type: 'varchar', length: 128 })
  mechanicName: string;

  @Column({ name: 'mechanic_name_tr', type: 'varchar', length: 128 })
  mechanicNameTr: string;

  // Time when this mechanic becomes available to the player (progressive disclosure)
  @Column({ name: 'unlocks_at', type: 'timestamptz' })
  unlocksAt: Date;

  @Column({ name: 'is_unlocked', type: 'boolean', default: false })
  isUnlocked: boolean;

  // Track first-use tutorial state
  @Column({ name: 'tutorial_shown', type: 'boolean', default: false })
  tutorialShown: boolean;

  @Column({ name: 'first_used_at', type: 'timestamptz', nullable: true })
  firstUsedAt: Date | null;

  @Column({ name: 'player_era_progress_id', type: 'uuid' })
  playerEraProgressId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => PlayerEraProgress, (p) => p.mechanicUnlocks)
  @JoinColumn({ name: 'player_era_progress_id' })
  eraProgress: PlayerEraProgress;
}
