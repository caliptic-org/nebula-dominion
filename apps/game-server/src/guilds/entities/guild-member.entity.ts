import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Guild } from './guild.entity';

export enum GuildRole {
  LEADER = 'leader',
  OFFICER = 'officer',
  MEMBER = 'member',
}

@Entity('guild_members')
export class GuildMember {
  @PrimaryColumn({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Index()
  @PrimaryColumn({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ type: 'enum', enum: GuildRole, default: GuildRole.MEMBER })
  role: GuildRole;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @Column({ name: 'contribution_pts', type: 'int', default: 0 })
  contributionPts: number;

  @Column({ name: 'last_active_at', type: 'timestamptz', default: () => 'NOW()' })
  lastActiveAt: Date;

  @ManyToOne(() => Guild, (g) => g.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guild_id' })
  guild: Guild;
}
