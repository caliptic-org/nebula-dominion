import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum BuffType {
  ATTACK = 'attack',
  DEFENSE = 'defense',
  PRODUCTION = 'production',
  XP = 'xp',
  SPEED = 'speed',
}

@Entity('player_buffs')
@Index(['playerId'])
@Index(['playerId', 'expiresAt'])
export class PlayerBuff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'buff_type', type: 'enum', enum: BuffType })
  buffType: BuffType;

  @Column({ type: 'varchar', length: 128 })
  icon: string;

  @Column({ name: 'effect_value', type: 'float' })
  effectValue: number;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
