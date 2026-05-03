import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { EraCatchupPackage } from './era-catchup-package.entity';
import { EraMechanicUnlock } from './era-mechanic-unlock.entity';

@Entity('player_era_progress')
@Index(['playerId'], { unique: true })
export class PlayerEraProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'current_era', type: 'int', default: 1 })
  currentEra: number;

  @Column({ name: 'era_transitioned_at', type: 'timestamptz', nullable: true })
  eraTransitionedAt: Date | null;

  // Resource snapshot at the time of last transition (for 80% threshold validation)
  @Column({ name: 'mineral_snapshot', type: 'int', default: 0 })
  mineralSnapshot: number;

  @Column({ name: 'gas_snapshot', type: 'int', default: 0 })
  gasSnapshot: number;

  // Era 4→5 champion status
  @Column({ name: 'is_champion', type: 'boolean', default: false })
  isChampion: boolean;

  @Column({ name: 'champion_achieved_at', type: 'timestamptz', nullable: true })
  championAchievedAt: Date | null;

  @Column({ name: 'alliance_id', type: 'uuid', nullable: true })
  allianceId: string | null;

  @Column({ name: 'username', type: 'varchar', length: 100, nullable: true })
  username: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => EraCatchupPackage, (pkg) => pkg.eraProgress)
  catchupPackages: EraCatchupPackage[];

  @OneToMany(() => EraMechanicUnlock, (mu) => mu.eraProgress)
  mechanicUnlocks: EraMechanicUnlock[];
}
