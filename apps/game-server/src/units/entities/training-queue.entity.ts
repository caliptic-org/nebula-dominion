import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { UnitType } from '../constants/race-configs.constants';
import { Race } from '../../matchmaking/dto/join-queue.dto';

@Entity('training_queue')
@Index(['playerId', 'isComplete'])
export class TrainingQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id' })
  @Index()
  playerId: string;

  @Column({ name: 'building_id' })
  buildingId: string;

  @Column({ type: 'enum', enum: UnitType, name: 'unit_type' })
  unitType: UnitType;

  @Column({ type: 'enum', enum: Race })
  race: Race;

  @Column({ name: 'completes_at', type: 'timestamptz' })
  completesAt: Date;

  @Column({ name: 'is_complete', default: false })
  isComplete: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
