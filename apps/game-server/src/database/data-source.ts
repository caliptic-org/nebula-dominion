import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { join } from 'path';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://nebula:nebula@localhost:5432/nebula_dominion';

// Migrations use raw SQL via QueryRunner, so no entities are needed at the
// CLI level. Entities are loaded by the Nest TypeOrmModule (autoLoadEntities)
// at runtime, where the framework wires them into the same datasource.
const dataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  migrations: [join(__dirname, 'typeorm-migrations', '*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
  logging: process.env.DB_LOGGING === 'true',
});

export default dataSource;
