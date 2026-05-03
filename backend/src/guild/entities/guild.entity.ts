import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('guilds')
export class Guild {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 5 })
  tag: string;

  @Column({ name: 'leader_id', type: 'uuid' })
  leaderId: string;

  @Column({ name: 'age_unlocked_at', type: 'int', default: 3 })
  ageUnlockedAt: number;

  @Column({ name: 'tier_score', type: 'int', default: 0 })
  tierScore: number;

  @Column({ name: 'member_count', type: 'int', default: 1 })
  memberCount: number;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
