import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { PlayersModule } from './players/players.module';
import { ResourcesModule } from './resources/resources.module';
import { BuildingsModule } from './buildings/buildings.module';
import { WorkersModule } from './workers/workers.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { GameModule } from './game/game.module';
import { AntiCheatModule } from './anti-cheat/anti-cheat.module';
import { HealthModule } from './health/health.module';
import { ProgressionModule } from './progression/progression.module';
import { ChatModule } from './chat/chat.module';
import { EconomyModule } from './economy/economy.module';
import { GuildsModule } from './guilds/guilds.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot({ wildcard: false, maxListeners: 30 }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        autoLoadEntities: true,
        synchronize: config.get<boolean>('database.synchronize'),
        logging: config.get<boolean>('database.logging'),
        ssl: config.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
        migrations: [join(__dirname, 'database', 'typeorm-migrations', '*.{ts,js}')],
        migrationsTableName: 'typeorm_migrations',
        migrationsRun: config.get<boolean>('database.runMigrations'),
      }),
    }),
    AuthModule,
    PlayersModule,
    ResourcesModule,
    BuildingsModule,
    WorkersModule,
    MatchmakingModule,
    GameModule,
    AntiCheatModule,
    HealthModule,
    ProgressionModule,
    ChatModule,
    EconomyModule,
    GuildsModule,
  ],
})
export class AppModule {}
