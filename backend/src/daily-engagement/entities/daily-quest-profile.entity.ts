import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { QuestDefinition } from '../types/daily-engagement.types';

@Entity('daily_quest_profiles')
@Index(['playerId'], { unique: true })
export class DailyQuestProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid', unique: true })
  playerId: string;

  // 'YYYY-MM-DD' of the active quest set; null = never initialized
  @Column({ name: 'quest_date', type: 'date', nullable: true })
  questDate: string | null;

  @Column({ type: 'jsonb', default: [] })
  quests: QuestDefinition[];

  @Column({ name: 'bonus_chest_claimed', type: 'boolean', default: false })
  bonusChestClaimed: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
