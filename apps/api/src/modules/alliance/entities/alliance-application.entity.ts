import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Alliance } from './alliance.entity';

export enum ApplicationType {
  REQUEST = 'request',
  INVITE = 'invite',
}

export enum ApplicationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('alliance_applications')
export class AllianceApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'alliance_id' })
  allianceId: string;

  @ManyToOne(() => Alliance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alliance_id' })
  alliance: Alliance;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: ApplicationType, default: ApplicationType.REQUEST })
  type: ApplicationType;

  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.PENDING })
  status: ApplicationStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
