// Nebula DNS - Create Alert Config Migration
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAlertConfig1737500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE alert_configs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider_type VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT true,
        config_encrypted JSONB NOT NULL DEFAULT '{}',
        severity_filter VARCHAR[] NOT NULL DEFAULT '{"critical","error"}',
        event_types VARCHAR[] NOT NULL DEFAULT '{}',
        last_sent_at TIMESTAMPTZ,
        last_error TEXT,
        error_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_alert_configs_provider_type
      ON alert_configs (provider_type);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS alert_configs;`);
  }
}
