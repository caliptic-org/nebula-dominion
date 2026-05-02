import { DataSource } from 'typeorm';
import { Battle } from '../battle/entities/battle.entity';
import { BattleLog } from '../battle/entities/battle-log.entity';
import { BattleSchema1746100000000 } from './migrations/1746100000000-BattleSchema';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nebula_dominion',
  entities: [Battle, BattleLog],
  migrations: [BattleSchema1746100000000],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
