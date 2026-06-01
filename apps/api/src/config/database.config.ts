import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'nebula',
  password: process.env.DB_PASSWORD || 'nebula_pass',
  database: process.env.DB_NAME || 'nebula_dominion',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  // Migrations iki path'te yaşıyor: src/database/migrations/ (yeni, 8 dosya)
  // ve database/migrations/ (eski, 2 dosya). Dist'te __dirname içeren yol:
  //   src/database/migrations  → __dirname + '/../database/migrations'
  //   database/migrations      → __dirname + '/../../database/migrations'
  // Her ikisini de tara, timestamp'e göre sıralanır.
  migrations: [
    __dirname + '/../database/migrations/*{.ts,.js}',
    __dirname + '/../../database/migrations/*{.ts,.js}',
  ],
  // Auto-run pending migrations on api boot — mirrors game-server's
  // DB_RUN_MIGRATIONS behaviour.  Without this, migrations added under
  // src/database/migrations/ are committed to git but never applied on
  // prod, surfacing as "column X does not exist" 500s the first time a
  // service touches the new schema (e.g. VipService.getVipStatus after
  // AddVipDailyClaim landed).  Idempotent — TypeORM tracks executed
  // migrations in the `migrations` table.
  migrationsRun: true,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
};

export default new DataSource(databaseConfig as DataSourceOptions);
