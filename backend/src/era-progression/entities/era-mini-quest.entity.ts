import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EraCatchupPackage } from './era-catchup-package.entity';

export enum MiniQuestStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

@Entity('era_mini_quests')
@Index(['playerId', 'status'])
export class EraMiniQuest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'catchup_package_id', type: 'uuid' })
  catchupPackageId: string;

  // Quest sequence within the package (1, 2, 3)
  @Column({ name: 'quest_number', type: 'int' })
  questNumber: number;

  @Column({ name: 'title', type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'title_tr', type: 'varchar', length: 200 })
  titleTr: string;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'description_tr', type: 'text' })
  descriptionTr: string;

  // What objective to track (e.g. "train_units:3", "win_battle:1", "produce_minerals:500")
  @Column({ name: 'objective_type', type: 'varchar', length: 64 })
  objectiveType: string;

  @Column({ name: 'objective_target', type: 'int' })
  objectiveTarget: number;

  @Column({ name: 'objective_current', type: 'int', default: 0 })
  objectiveCurrent: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: MiniQuestStatus,
    default: MiniQuestStatus.ACTIVE,
  })
  status: MiniQuestStatus;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => EraCatchupPackage, (pkg) => pkg.miniQuests)
  @JoinColumn({ name: 'catchup_package_id' })
  catchupPackage: EraCatchupPackage;
}
