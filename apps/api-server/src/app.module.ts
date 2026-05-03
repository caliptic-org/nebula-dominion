import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GameStateModule } from './game-state/game-state.module';
import { ScoreboardModule } from './scoreboard/scoreboard.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      { name: 'login', ttl: 60000, limit: 5 },
      { name: 'register', ttl: 3600000, limit: 10 },
    ]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    GameStateModule,
    ScoreboardModule,
    HealthModule,
  ],
})
export class AppModule {}
