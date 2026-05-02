import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Alliance } from './alliance.entity';

@Entity('alliance_storage')
export class AllianceStorage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'alliance_id', unique: true })
  allianceId: string;

  @OneToOne(() => Alliance, (a) => a.storage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alliance_id' })
  alliance: Alliance;

  @Column({ type: 'bigint', default: 0 })
  minerals: number;

  @Column({ type: 'bigint', default: 0 })
  energy: number;

  @Column({ name: 'premium_gems', type: 'int', default: 0 })
  premiumGems: number;

  @Column({ type: 'bigint', default: 500000 })
  capacity: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
