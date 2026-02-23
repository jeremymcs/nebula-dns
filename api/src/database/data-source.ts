/**
 * TypeORM Data Source Configuration for Migrations
 *
 * Used by TypeORM CLI for running migrations
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config({ path: ['.env.local', '.env'] });

const isProduction = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url:
    process.env.DATABASE_URL ||
    'postgresql://nebula:nebula@localhost:4432/nebula',
  // Use compiled JS paths in production, TS source paths in development
  entities: isProduction ? ['dist/**/*.entity.js'] : ['src/**/*.entity.ts'],
  migrations: isProduction
    ? ['dist/database/migrations/*.js']
    : ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  logging: true,
  // Prevent hanging on slow/SSL connections in production
  connectTimeoutMS: 30000,
  extra: {
    connectionTimeoutMillis: 30000,
    // DO managed PostgreSQL requires SSL
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  },
});
