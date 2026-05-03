import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('guild_memberships')
@Unique(['guildId', 'userId'])
export class GuildMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guild_id', length: 100 })
  @Index()
  guildId: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt: Date;
}
