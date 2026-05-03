import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum GuildRaidTier {
  NORMAL = 'normal',
  HARD = 'hard',
  ELITE = 'elite',
}

export enum GuildRaidStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

@Entity('guild_raids')
@Unique('guild_raids_guild_week_unique', ['guildId', 'weekStart'])
export class GuildRaid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ name: 'week_start', type: 'timestamptz' })
  weekStart: Date;

  @Column({ name: 'week_end', type: 'timestamptz' })
  weekEnd: Date;

  @Column({ type: 'enum', enum: GuildRaidTier, default: GuildRaidTier.NORMAL })
  tier: GuildRaidTier;

  @Column({ name: 'boss_max_hp', type: 'bigint' })
  bossMaxHp: number;

  @Column({ name: 'boss_current_hp', type: 'bigint' })
  bossCurrentHp: number;

  @Column({ name: 'member_count_snapshot', type: 'int' })
  memberCountSnapshot: number;

  @Column({ type: 'enum', enum: GuildRaidStatus, default: GuildRaidStatus.ACTIVE })
  status: GuildRaidStatus;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'drops_resolved_at', type: 'timestamptz', nullable: true })
  dropsResolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
