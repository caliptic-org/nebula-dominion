import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TutorialStep {
  NOT_STARTED = 'not_started',
  GUILD_CHOSEN = 'guild_chosen',
  FIRST_DONATION = 'first_donation',
  FIRST_QUEST = 'first_quest',
  COMPLETED = 'completed',
}

export const TUTORIAL_STEP_ORDER: TutorialStep[] = [
  TutorialStep.NOT_STARTED,
  TutorialStep.GUILD_CHOSEN,
  TutorialStep.FIRST_DONATION,
  TutorialStep.FIRST_QUEST,
  TutorialStep.COMPLETED,
];

@Entity('guild_tutorial_states')
export class GuildTutorialState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'tutorial_required', type: 'boolean', default: false })
  tutorialRequired: boolean;

  @Column({ type: 'enum', enum: TutorialStep, default: TutorialStep.NOT_STARTED })
  state: TutorialStep;

  @Column({ name: 'reward_granted', type: 'boolean', default: false })
  rewardGranted: boolean;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
