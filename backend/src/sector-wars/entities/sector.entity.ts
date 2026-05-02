import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { SectorBattle } from './sector-battle.entity';

export enum SectorBonusType {
  NONE = 'none',
  ATTACK_BOOST = 'attack_boost',
  DEFENSE_BOOST = 'defense_boost',
  RESOURCE_BONUS = 'resource_bonus',
  XP_BONUS = 'xp_bonus',
  DARK_MATTER_BONUS = 'dark_matter_bonus',
}

@Entity('sectors')
@Index(['controllingAllianceId'])
export class Sector {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'map_x', type: 'int' })
  mapX: number;

  @Column({ name: 'map_y', type: 'int' })
  mapY: number;

  @Column({ name: 'controlling_alliance_id', type: 'uuid', nullable: true })
  controllingAllianceId: string | null;

  @Column({
    name: 'bonus_type',
    type: 'enum',
    enum: SectorBonusType,
    default: SectorBonusType.NONE,
  })
  bonusType: SectorBonusType;

  @Column({ name: 'bonus_value', type: 'int', default: 0 })
  bonusValue: number;

  @Column({ name: 'defense_rating', type: 'int', default: 100 })
  defenseRating: number;

  @Column({ name: 'is_contested', type: 'boolean', default: false })
  isContested: boolean;

  @Column({ name: 'last_contested_at', type: 'timestamptz', nullable: true })
  lastContestedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => SectorBattle, (sb) => sb.sector)
  battles: SectorBattle[];
}
