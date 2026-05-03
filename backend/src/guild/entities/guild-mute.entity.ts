import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('guild_mutes')
@Index(['guildId', 'userId'])
@Index(['expiresAt'])
export class GuildMute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'muted_by', type: 'uuid' })
  mutedBy: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  reason: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
