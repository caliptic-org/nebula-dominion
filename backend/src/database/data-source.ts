import { DataSource } from 'typeorm';
import { Battle } from '../battle/entities/battle.entity';
import { BattleLog } from '../battle/entities/battle-log.entity';
import { Unit } from '../units/entities/unit.entity';
import { MutationRule } from '../units/entities/mutation-rule.entity';
import { Sector } from '../sector-wars/entities/sector.entity';
import { SectorBattle } from '../sector-wars/entities/sector-battle.entity';
import { WeeklyLeague } from '../sector-wars/entities/weekly-league.entity';
import { LeagueParticipant } from '../sector-wars/entities/league-participant.entity';
import { VipSubscription } from '../vip/entities/vip-subscription.entity';
import { VipDailyClaim } from '../vip/entities/vip-daily-claim.entity';
import { BattleSchema1746100000000 } from './migrations/1746100000000-BattleSchema';
import { UnitsSchema1746200000000 } from './migrations/1746200000000-UnitsSchema';
import { SectorWarsSchema1746300000000 } from './migrations/1746300000000-SectorWarsSchema';
import { VipSchema1746700000000 } from './migrations/1746700000000-VipSchema';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nebula_dominion',
  entities: [Battle, BattleLog, Unit, MutationRule, Sector, SectorBattle, WeeklyLeague, LeagueParticipant, VipSubscription, VipDailyClaim],
  migrations: [BattleSchema1746100000000, UnitsSchema1746200000000, SectorWarsSchema1746300000000, VipSchema1746700000000],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
