import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Game } from '../../game/entities/game.entity';

export enum BuildingType {
  COMMAND_CENTER = 'command_center',
  MINE = 'mine',
  REFINERY = 'refinery',
  BARRACKS = 'barracks',
  HANGAR = 'hangar',
  RESEARCH_LAB = 'research_lab',
  SHIELD_GENERATOR = 'shield_generator',
  TURRET = 'turret',
}

@Entity('buildings')
export class Building {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  gameId: string;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @Column({ type: 'enum', enum: BuildingType })
  type: BuildingType;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 100 })
  health: number;

  @Column({ default: 100 })
  maxHealth: number;

  @Column({ type: 'jsonb', nullable: true })
  position: { x: number; y: number };

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
