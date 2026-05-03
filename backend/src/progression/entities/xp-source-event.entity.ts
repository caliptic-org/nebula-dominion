import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('xp_source_events')
export class XpSourceEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'source_type', type: 'varchar', length: 32 })
  sourceType: string;

  @Column({ type: 'int' })
  amount: number;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId: string | null;

  @Column({ name: 'age_at_event', type: 'int' })
  ageAtEvent: number;

  @Column({ name: 'level_at_event', type: 'int' })
  levelAtEvent: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
