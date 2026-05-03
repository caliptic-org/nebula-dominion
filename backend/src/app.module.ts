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
import { PlayerResources } from './map/entities/player-resources.entity';
import { MapActionLog } from './map/entities/map-action-log.entity';
import { BattleModule } from './battle/battle.module';
import { StorageModule } from './storage/storage.module';
import { RedisModule } from './redis/redis.module';
import { UnitsModule } from './units/units.module';
import { SectorWarsModule } from './sector-wars/sector-wars.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { MapModule } from './map/map.module';
import { BattleSchema1746100000000 } from './database/migrations/1746100000000-BattleSchema';
import { UnitsSchema1746200000000 } from './database/migrations/1746200000000-UnitsSchema';
import { SectorWarsSchema1746300000000 } from './database/migrations/1746300000000-SectorWarsSchema';
import { MapSchema1746400000000 } from './database/migrations/1746400000000-MapSchema';

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
        entities: [Battle, BattleLog, Unit, MutationRule, Sector, SectorBattle, WeeklyLeague, LeagueParticipant, PlayerResources, MapActionLog],
        migrations: [BattleSchema1746100000000, UnitsSchema1746200000000, SectorWarsSchema1746300000000, MapSchema1746400000000],
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
    MapModule,
  ],
})
export class AppModule {}
