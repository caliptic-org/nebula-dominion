import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum GuildRole {
  LEADER = 'leader',
  OFFICER = 'officer',
  MEMBER = 'member',
}

@Entity('guild_members')
@Index(['guildId'])
@Index(['userId'], { unique: true })
export class GuildMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: GuildRole, default: GuildRole.MEMBER })
  role: GuildRole;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt: Date;

  @Column({ name: 'contribution_pts', type: 'int', default: 0 })
  contributionPts: number;

  @Column({ name: 'last_active_at', type: 'timestamptz', default: () => 'NOW()' })
  lastActiveAt: Date;
}
