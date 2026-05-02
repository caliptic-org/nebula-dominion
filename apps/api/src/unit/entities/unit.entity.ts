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

export enum UnitType {
  FIGHTER = 'fighter',
  BOMBER = 'bomber',
  CRUISER = 'cruiser',
  DESTROYER = 'destroyer',
  BATTLESHIP = 'battleship',
  TRANSPORT = 'transport',
  SCOUT = 'scout',
  CARRIER = 'carrier',
}

export enum UnitStatus {
  IDLE = 'idle',
  MOVING = 'moving',
  ATTACKING = 'attacking',
  DEFENDING = 'defending',
  TRAINING = 'training',
}

@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  gameId: string;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @Column({ type: 'enum', enum: UnitType })
  type: UnitType;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 1 })
  count: number;

  @Column({ type: 'enum', enum: UnitStatus, default: UnitStatus.IDLE })
  status: UnitStatus;

  @Column({ type: 'jsonb', nullable: true })
  position: { x: number; y: number } | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
