import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { join } from 'path';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://nebula:nebula@localhost:5432/nebula_dominion';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'typeorm-migrations', '*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
  logging: process.env.DB_LOGGING === 'true',
});

export default AppDataSource;
