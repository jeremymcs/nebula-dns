// Nebula DNS - Health Check Service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { RedisService } from '../redis/redis.service';
import { ClickHouseService } from '../clickhouse/clickhouse.service';
import {
  SecretsService,
  SecretsHealthStatus,
} from '../secrets/secrets.service';
import { getEncryptionConfigStatus } from '../../config/encryption.config';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
}

export interface DependencyStatus {
  status: 'healthy' | 'unhealthy';
  latencyMs?: number;
  error?: string;
}

export interface DetailedHealthStatus extends HealthStatus {
  dependencies: {
    postgres: DependencyStatus;
    redis: DependencyStatus;
    clickhouse: DependencyStatus;
    secrets?: DependencyStatus;
  };
  uptime: number;
}

export interface EncryptionHealthStatus {
  status: 'configured' | 'misconfigured';
  environment: string;
  keys: Array<{
    key: string;
    isPresent: boolean;
    isValidLength: boolean;
  }>;
  hasErrors: boolean;
  hasWarnings: boolean;
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly clickhouseService: ClickHouseService,
    @Optional() private readonly secretsService?: SecretsService,
  ) {}

  async check(): Promise<HealthStatus> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };
  }

  async checkDetailed(): Promise<DetailedHealthStatus> {
    const [postgres, redis, clickhouse, secrets] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkClickhouse(),
      this.checkSecrets(),
    ]);

    const allHealthy =
      postgres.status === 'healthy' &&
      redis.status === 'healthy' &&
      clickhouse.status === 'healthy' &&
      secrets.status === 'healthy';

    const anyUnhealthy =
      postgres.status === 'unhealthy' ||
      redis.status === 'unhealthy' ||
      clickhouse.status === 'unhealthy' ||
      secrets.status === 'unhealthy';

    return {
      status: allHealthy ? 'healthy' : anyUnhealthy ? 'degraded' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      dependencies: {
        postgres,
        redis,
        clickhouse,
        secrets,
      },
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  private async checkPostgres(): Promise<DependencyStatus> {
    try {
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      return {
        status: 'healthy',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      const start = Date.now();
      await this.redisService.getClient().ping();
      return {
        status: 'healthy',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkClickhouse(): Promise<DependencyStatus> {
    try {
      const start = Date.now();
      const status = this.clickhouseService.getConnectionStatus();
      if (status.connected) {
        return {
          status: 'healthy',
          latencyMs: Date.now() - start,
        };
      } else {
        return {
          status: 'unhealthy',
          error: `Not connected (${status.consecutiveFailures} consecutive failures)`,
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkSecrets(): Promise<DependencyStatus> {
    if (!this.secretsService) {
      return { status: 'healthy' }; // No secrets service configured
    }

    try {
      const start = Date.now();
      const secretsHealth = await this.secretsService.getHealthStatus();
      return {
        status: secretsHealth.connected ? 'healthy' : 'unhealthy',
        latencyMs: secretsHealth.latencyMs ?? Date.now() - start,
        error: secretsHealth.error,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get detailed secrets provider health status
   */
  async checkSecretsDetailed(): Promise<SecretsHealthStatus | null> {
    if (!this.secretsService) {
      return null;
    }
    return this.secretsService.getHealthStatus();
  }

  async checkReady(): Promise<{
    ready: boolean;
    checks: Record<string, boolean>;
  }> {
    const [postgres, redis] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
    ]);

    const checks = {
      postgres: postgres.status === 'healthy',
      redis: redis.status === 'healthy',
    };

    const ready = checks.postgres && checks.redis;

    return { ready, checks };
  }

  /**
   * Check encryption configuration status.
   * This endpoint validates that all required encryption keys are configured
   * without exposing any actual key values.
   */
  checkEncryption(): EncryptionHealthStatus {
    const configStatus = getEncryptionConfigStatus();

    // Map key results without exposing actual lengths in production
    // (to prevent timing attacks on key length)
    const keys = configStatus.keys.map((k) => ({
      key: k.key,
      isPresent: k.isPresent,
      isValidLength: k.isValidLength,
      // Don't expose actualLength - security consideration
    }));

    return {
      status: configStatus.isConfigured ? 'configured' : 'misconfigured',
      environment: configStatus.environment,
      keys,
      hasErrors: configStatus.errors.length > 0,
      hasWarnings: configStatus.warnings.length > 0,
    };
  }
}
