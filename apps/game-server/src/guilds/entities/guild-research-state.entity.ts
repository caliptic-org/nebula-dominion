import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum GuildResearchBranch {
  PRODUCTION = 'production',
  RAID = 'raid',
  EXPANSION = 'expansion',
}

export enum GuildResearchStatus {
  RESEARCHING = 'researching',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('guild_research_states')
export class GuildResearchState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ name: 'research_id', type: 'varchar', length: 64 })
  researchId: string;

  @Column({ type: 'enum', enum: GuildResearchBranch })
  branch: GuildResearchBranch;

  @Column({ type: 'int' })
  level: number;

  @Column({ type: 'enum', enum: GuildResearchStatus, default: GuildResearchStatus.RESEARCHING })
  status: GuildResearchStatus;

  @Column({ name: 'xp_required', type: 'int' })
  xpRequired: number;

  @Column({ name: 'xp_contributed', type: 'int', default: 0 })
  xpContributed: number;

  @Column({ name: 'slot_week_start', type: 'timestamptz' })
  slotWeekStart: Date;

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'deadline_at', type: 'timestamptz' })
  deadlineAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'selected_by', type: 'varchar', length: 255 })
  selectedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
