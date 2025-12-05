-- Initialize PostgreSQL schema
-- This is run automatically when the postgres container starts for the first time

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables (TypeORM will handle this in development, but included for reference)
-- See docs/C-database-schema.md for full schema

-- Seed data will be inserted via TypeORM migrations or seed scripts
