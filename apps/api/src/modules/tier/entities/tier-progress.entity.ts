import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('tier_progression')
export class TierProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'current_level', type: 'int', default: 1 })
  currentLevel: number;

  @Column({ name: 'current_age', type: 'int', default: 1 })
  currentAge: number;

  @Column({ name: 'current_tier_name', type: 'varchar', length: 64, default: 'Tohum' })
  currentTierName: string;

  @Column({ name: 'xp', type: 'bigint', default: 0 })
  xp: string;

  @Column({ name: 'xp_to_next_level', type: 'bigint', default: 100 })
  xpToNextLevel: string;

  @Column({ name: 'achievements', type: 'jsonb', nullable: true })
  achievements: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
