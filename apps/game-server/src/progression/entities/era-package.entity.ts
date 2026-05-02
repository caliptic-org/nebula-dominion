import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('era_packages')
@Index(['userId', 'toAge'], { unique: true }) // one package per user per era
export class EraPackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'from_age', type: 'int' })
  fromAge: number;

  @Column({ name: 'to_age', type: 'int' })
  toAge: number;

  @Column({ name: 'gold_granted', type: 'int', default: 0 })
  goldGranted: number;

  @Column({ name: 'gems_granted', type: 'int', default: 0 })
  gemsGranted: number;

  @Column({ name: 'premium_currency_granted', type: 'int', default: 0 })
  premiumCurrencyGranted: number;

  @Column({ name: 'unit_pack_count', type: 'int', default: 0 })
  unitPackCount: number;

  @Column({ name: 'production_boost_multiplier', type: 'numeric', precision: 4, scale: 2, default: 1 })
  productionBoostMultiplier: number;

  @Column({ name: 'production_boost_expires_at', type: 'timestamptz', nullable: true })
  productionBoostExpiresAt: Date | null;

  @CreateDateColumn({ name: 'granted_at' })
  grantedAt: Date;
}
