import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Alliance } from './alliance.entity';

@Entity('alliance_donations')
export class AllianceDonation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'alliance_id' })
  allianceId: string;

  @ManyToOne(() => Alliance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alliance_id' })
  alliance: Alliance;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'bigint', default: 0 })
  mineral: number;

  @Column({ type: 'bigint', default: 0 })
  gas: number;

  @Column({ type: 'bigint', default: 0 })
  energy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
