import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { GameModule } from './game/game.module';
import { BuildingModule } from './building/building.module';
import { ResourceModule } from './resource/resource.module';
import { UnitModule } from './unit/unit.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (config: ConfigService) => ({
        ttl: config.get<number>('cache.ttl', 300) * 1000,
        store: 'ioredis',
        host: config.get<string>('redis.host', 'localhost'),
        port: config.get<number>('redis.port', 6379),
        password: config.get<string>('redis.password') || undefined,
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
          password: config.get<string>('redis.password') || undefined,
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    AuthModule,
    UserModule,
    GameModule,
    BuildingModule,
    ResourceModule,
    UnitModule,
    HealthModule,
  ],
})
export class AppModule {}
