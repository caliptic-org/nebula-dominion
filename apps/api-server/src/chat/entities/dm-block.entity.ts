import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('dm_blocks')
@Unique(['blockerId', 'blockedId'])
export class DmBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'blocker_id' })
  @Index()
  blockerId: string;

  @Column({ name: 'blocked_id' })
  @Index()
  blockedId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
