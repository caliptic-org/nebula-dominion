import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum Race {
  HUMAN = 'human',
  ZERG = 'zerg',
  AUTOMATON = 'automaton',
  MONSTER = 'monster',
  DEMON = 'demon',
}

export interface Resources {
  minerals: number;
  energy: number;
  darkMatter: number;
}

export interface BuildingSlot {
  buildingId: string;
  level: number;
  completedAt?: string;
}

@Entity('game_states')
export class GameState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 1 })
  age: number;

  @Column({
    type: 'enum',
    enum: Race,
    default: Race.HUMAN,
  })
  race: Race;

  @Column({
    type: 'jsonb',
    default: { minerals: 500, energy: 200, darkMatter: 0 },
  })
  resources: Resources;

  @Column({
    type: 'jsonb',
    default: [],
  })
  buildings: BuildingSlot[];

  @Column({ name: 'total_score', default: 0 })
  totalScore: number;

  @Column({ name: 'battles_won', default: 0 })
  battlesWon: number;

  @Column({ name: 'battles_lost', default: 0 })
  battlesLost: number;

  @Column({ name: 'last_active_at', type: 'timestamptz', nullable: true })
  lastActiveAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
