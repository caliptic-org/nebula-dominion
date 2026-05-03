import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { PlayerEraProgress } from './player-era-progress.entity';
import { EraMiniQuest } from './era-mini-quest.entity';

@Entity('era_catchup_packages')
@Index(['playerId', 'era'])
export class EraCatchupPackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'era', type: 'int' })
  era: number;

  // 24-hour 50% production boost
  @Column({ name: 'production_boost_pct', type: 'int', default: 50 })
  productionBoostPct: number;

  @Column({ name: 'production_boost_expires_at', type: 'timestamptz' })
  productionBoostExpiresAt: Date;

  // Free unit unlock code from new era's unit_types
  @Column({ name: 'free_unit_type_code', type: 'varchar', length: 64, nullable: true })
  freeUnitTypeCode: string | null;

  @Column({ name: 'free_unit_claimed', type: 'boolean', default: false })
  freeUnitClaimed: boolean;

  @Column({ name: 'free_unit_claimed_at', type: 'timestamptz', nullable: true })
  freeUnitClaimedAt: Date | null;

  @Column({ name: 'player_era_progress_id', type: 'uuid' })
  playerEraProgressId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => PlayerEraProgress, (p) => p.catchupPackages)
  @JoinColumn({ name: 'player_era_progress_id' })
  eraProgress: PlayerEraProgress;

  @OneToMany(() => EraMiniQuest, (q) => q.catchupPackage)
  miniQuests: EraMiniQuest[];
}
