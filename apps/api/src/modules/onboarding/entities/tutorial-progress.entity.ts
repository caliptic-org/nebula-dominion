import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('tutorial_progress')
export class TutorialProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'user_id', length: 255 })
  userId: string;

  @Column({
    name: 'completed_steps',
    type: 'text',
    array: true,
    default: '{}',
  })
  completedSteps: string[];

  @Column({ name: 'current_step', length: 100, default: 'welcome' })
  currentStep: string;

  @Column({ name: 'selected_race', length: 50, nullable: true })
  selectedRace: string | null;

  @Column({ name: 'is_completed', default: false })
  isCompleted: boolean;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'skipped', default: false })
  skipped: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
