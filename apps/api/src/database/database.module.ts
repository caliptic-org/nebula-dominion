import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const dbConfig = config.get('database');
        const baseOptions = {
          type: 'postgres' as const,
          synchronize: dbConfig.synchronize,
          logging: dbConfig.logging,
          autoLoadEntities: true,
          ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
        };

        if (dbConfig.url) {
          return { ...baseOptions, url: dbConfig.url };
        }

        return {
          ...baseOptions,
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
