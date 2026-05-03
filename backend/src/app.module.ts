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
import { ResourceConfig } from './resources/entities/resource-config.entity';
import { PlayerResource } from './resources/entities/player-resource.entity';
import { FeatureFlag } from './resources/entities/feature-flag.entity';
import { PlayerSegment } from './resources/entities/player-segment.entity';
import { XpLevelThreshold } from './progression/entities/xp-level-threshold.entity';
import { PlayerProgression } from './progression/entities/player-progression.entity';
import { XpSourceEvent } from './progression/entities/xp-source-event.entity';
import { XpSourceWeight } from './progression/entities/xp-source-weight.entity';
import { BattleModule } from './battle/battle.module';
import { StorageModule } from './storage/storage.module';
import { RedisModule } from './redis/redis.module';
import { UnitsModule } from './units/units.module';
import { SectorWarsModule } from './sector-wars/sector-wars.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ResourcesModule } from './resources/resources.module';
import { ProgressionModule } from './progression/progression.module';
import { VipTierConfig } from './vip/entities/vip-tier-config.entity';
import { VipSpendLedger } from './vip/entities/vip-spend-ledger.entity';
import { PurchaseEvent } from './vip/entities/purchase-event.entity';
import { VipModule } from './vip/vip.module';
import { BattleSchema1746100000000 } from './database/migrations/1746100000000-BattleSchema';
import { UnitsSchema1746200000000 } from './database/migrations/1746200000000-UnitsSchema';
import { SectorWarsSchema1746300000000 } from './database/migrations/1746300000000-SectorWarsSchema';
import { ResourceSchema1746400000000 } from './database/migrations/1746400000000-ResourceSchema';
import { ProgressionSchema1746500000000 } from './database/migrations/1746500000000-ProgressionSchema';
import { VipSchema1746600000000 } from './database/migrations/1746600000000-VipSchema';

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
          Battle, BattleLog, Unit, MutationRule,
          Sector, SectorBattle, WeeklyLeague, LeagueParticipant,
          ResourceConfig, PlayerResource, FeatureFlag, PlayerSegment,
          XpLevelThreshold, PlayerProgression, XpSourceEvent, XpSourceWeight,
          VipTierConfig, VipSpendLedger, PurchaseEvent,
        ],
        migrations: [
          BattleSchema1746100000000,
          UnitsSchema1746200000000,
          SectorWarsSchema1746300000000,
          ResourceSchema1746400000000,
          ProgressionSchema1746500000000,
          VipSchema1746600000000,
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
    ResourcesModule,
    ProgressionModule,
    VipModule,
  ],
})
export class AppModule {}
