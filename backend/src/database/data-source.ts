import { DataSource } from 'typeorm';
import { Battle } from '../battle/entities/battle.entity';
import { BattleLog } from '../battle/entities/battle-log.entity';
import { UnitType } from '../units/entities/unit-type.entity';
import { Unit } from '../units/entities/unit.entity';
import { BattleSchema1746100000000 } from './migrations/1746100000000-BattleSchema';
import { UnitSchema1746200000000 } from './migrations/1746200000000-UnitSchema';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nebula_dominion',
  entities: [Battle, BattleLog, UnitType, Unit],
  migrations: [BattleSchema1746100000000, UnitSchema1746200000000],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
