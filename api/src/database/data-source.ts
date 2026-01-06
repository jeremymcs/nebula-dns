/**
 * TypeORM Data Source Configuration for Migrations
 *
 * Used by TypeORM CLI for running migrations
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config({ path: ['.env.local', '.env'] });

export const AppDataSource = new DataSource({
  type: 'postgres',
  url:
    process.env.DATABASE_URL ||
    'postgresql://nebula:nebula@localhost:4432/nebula',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  logging: true,
});
