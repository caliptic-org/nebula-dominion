import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UnitType } from '../constants/race-configs.constants';
import { Race } from '../../matchmaking/dto/join-queue.dto';

@Entity('player_units')
@Index(['playerId', 'isAlive'])
export class PlayerUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id' })
  @Index()
  playerId: string;

  @Column({ type: 'enum', enum: UnitType })
  type: UnitType;

  @Column({ type: 'enum', enum: Race })
  race: Race;

  @Column()
  hp: number;

  @Column({ name: 'max_hp' })
  maxHp: number;

  @Column()
  attack: number;

  @Column()
  defense: number;

  @Column()
  speed: number;

  @Column({ name: 'position_x', default: 0 })
  positionX: number;

  @Column({ name: 'position_y', default: 0 })
  positionY: number;

  @Column({ type: 'jsonb', default: [] })
  abilities: string[];

  @Column({ name: 'is_alive', default: true })
  isAlive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
