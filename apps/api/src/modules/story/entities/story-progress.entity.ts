import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('story_progress')
export class StoryProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'user_id', length: 255 })
  userId: string;

  @Column({
    name: 'completed_chapters',
    type: 'text',
    array: true,
    default: '{}',
  })
  completedChapters: string[];

  @Column({ name: 'current_chapter', length: 100, default: 'ch_01_arrival' })
  currentChapter: string;

  @Column({ name: 'last_choice', type: 'jsonb', nullable: true })
  lastChoice: Record<string, string> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
