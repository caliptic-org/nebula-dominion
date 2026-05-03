import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
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
import { VipSubscription } from './vip/entities/vip-subscription.entity';
import { VipDailyClaim } from './vip/entities/vip-daily-claim.entity';
import { AnalyticsEvent } from './analytics/entities/event.entity';
import { PlayerBuff } from './stats/entities/player-buff.entity';
import { PlayerResource as StatsPlayerResource } from './stats/entities/player-resource.entity';
import { PlayerPower } from './stats/entities/player-power.entity';
import { LeaderboardSnapshot } from './leaderboard/entities/leaderboard-snapshot.entity';
import { BattleModule } from './battle/battle.module';
import { StorageModule } from './storage/storage.module';
import { RedisModule } from './redis/redis.module';
import { UnitsModule } from './units/units.module';
import { SectorWarsModule } from './sector-wars/sector-wars.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ResourcesModule } from './resources/resources.module';
import { ProgressionModule } from './progression/progression.module';
import { VipModule } from './vip/vip.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { StatsModule } from './stats/stats.module';
import { BattleSchema1746100000000 } from './database/migrations/1746100000000-BattleSchema';
import { UnitsSchema1746200000000 } from './database/migrations/1746200000000-UnitsSchema';
import { SectorWarsSchema1746300000000 } from './database/migrations/1746300000000-SectorWarsSchema';
import { ResourceSchema1746400000000 } from './database/migrations/1746400000000-ResourceSchema';
import { ProgressionSchema1746500000000 } from './database/migrations/1746500000000-ProgressionSchema';
import { VipSchema1746700000000 } from './database/migrations/1746700000000-VipSchema';
import { AnalyticsSchema1746400000000 } from './database/migrations/1746400000000-AnalyticsSchema';
import { StatsSchema1746500000000 } from './database/migrations/1746500000000-StatsSchema';
import { LeaderboardSchema1746500000000 } from './database/migrations/1746500000000-LeaderboardSchema';

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
          VipSubscription, VipDailyClaim,
          AnalyticsEvent,
          PlayerBuff,
          StatsPlayerResource,
          PlayerPower,
          LeaderboardSnapshot,
        ],
        migrations: [
          BattleSchema1746100000000,
          UnitsSchema1746200000000,
          SectorWarsSchema1746300000000,
          ResourceSchema1746400000000,
          ProgressionSchema1746500000000,
          VipSchema1746700000000,
          AnalyticsSchema1746400000000,
          StatsSchema1746500000000,
          LeaderboardSchema1746500000000,
        ],
        synchronize: config.get('NODE_ENV') === 'development',
        logging: config.get('NODE_ENV') === 'development',
        ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    AuthModule,
    RedisModule,
    StorageModule,
    BattleModule,
    UnitsModule,
    SectorWarsModule,
    LeaderboardModule,
    ResourcesModule,
    ProgressionModule,
    VipModule,
    AnalyticsModule,
    StatsModule,
  ],
})
export class AppModule {}
