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

  /** Upgrade tier — starts at 1, bumped by POST /units/:id/upgrade. Stats
   *  get a +10% per level boost applied at upgrade time (persisted on the
   *  hp/attack/defense/speed columns themselves) so combat math doesn't
   *  have to re-derive scaling at runtime. */
  @Column({ type: 'int', default: 1 })
  level: number;

  /** Cooldown deadline for the next /units/:id/upgrade call. Set to
   *  `NOW() + scaledDuration` at upgrade time; rejected if a second
   *  upgrade arrives before this timestamp. Mirrors the
   *  `constructionCompleteAt`-as-cooldown pattern used by
   *  buildings.service upgradeBuilding. Nullable: units that have never
   *  been upgraded leave this null and the gate passes through. */
  @Column({
    name: 'upgrade_completed_at',
    type: 'timestamptz',
    nullable: true,
  })
  upgradeCompletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
