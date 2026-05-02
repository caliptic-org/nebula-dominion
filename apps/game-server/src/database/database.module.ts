import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Player } from '../players/entities/player.entity';
import { Building } from '../buildings/entities/building.entity';
import { Resource } from '../resources/entities/resource.entity';
import { RedisProvider } from './redis.provider';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        entities: [Player, Building, Resource],
        synchronize: config.get<boolean>('database.synchronize', false),
        logging: config.get<boolean>('database.logging', false),
        ssl: config.get<boolean>('database.ssl', false)
          ? { rejectUnauthorized: false }
          : false,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [RedisProvider],
  exports: [RedisProvider],
})
export class DatabaseModule {}
