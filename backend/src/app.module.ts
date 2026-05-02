import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Battle } from './battle/entities/battle.entity';
import { BattleLog } from './battle/entities/battle-log.entity';
import { Unit } from './units/entities/unit.entity';
import { MutationRule } from './units/entities/mutation-rule.entity';
import { Sector } from './sector-wars/entities/sector.entity';
import { SectorBattle } from './sector-wars/entities/sector-battle.entity';
import { WeeklyLeague } from './sector-wars/entities/weekly-league.entity';
import { LeagueParticipant } from './sector-wars/entities/league-participant.entity';
import { AnalyticsEvent } from './analytics/entities/event.entity';
import { BattleModule } from './battle/battle.module';
import { StorageModule } from './storage/storage.module';
import { RedisModule } from './redis/redis.module';
import { UnitsModule } from './units/units.module';
import { SectorWarsModule } from './sector-wars/sector-wars.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BattleSchema1746100000000 } from './database/migrations/1746100000000-BattleSchema';
import { UnitsSchema1746200000000 } from './database/migrations/1746200000000-UnitsSchema';
import { SectorWarsSchema1746300000000 } from './database/migrations/1746300000000-SectorWarsSchema';
import { AnalyticsSchema1746400000000 } from './database/migrations/1746400000000-AnalyticsSchema';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'nebula_dominion'),
        entities: [
          Battle,
          BattleLog,
          Unit,
          MutationRule,
          Sector,
          SectorBattle,
          WeeklyLeague,
          LeagueParticipant,
          AnalyticsEvent,
        ],
        migrations: [
          BattleSchema1746100000000,
          UnitsSchema1746200000000,
          SectorWarsSchema1746300000000,
          AnalyticsSchema1746400000000,
        ],
        synchronize: config.get('NODE_ENV') === 'development',
        logging: config.get('NODE_ENV') === 'development',
        ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    RedisModule,
    StorageModule,
    BattleModule,
    UnitsModule,
    SectorWarsModule,
    LeaderboardModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
