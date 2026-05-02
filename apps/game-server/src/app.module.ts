import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { GameModule } from './game/game.module';
import { AntiCheatModule } from './anti-cheat/anti-cheat.module';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { PlayersModule } from './players/players.module';
import { ResourcesModule } from './resources/resources.module';
import { BuildingsModule } from './buildings/buildings.module';
import { WorkersModule } from './workers/workers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot({ wildcard: false, maxListeners: 20 }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    PlayersModule,
    ResourcesModule,
    BuildingsModule,
    WorkersModule,
    MatchmakingModule,
    GameModule,
    AntiCheatModule,
    HealthModule,
  ],
})
export class AppModule {}
