import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { RedisService } from '../redis/redis.service';
import { ClickHouseService } from '../clickhouse/clickhouse.service';

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
  };
  uptime: number;
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly clickhouseService: ClickHouseService,
  ) {}

  async check(): Promise<HealthStatus> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };
  }

  async checkDetailed(): Promise<DetailedHealthStatus> {
    const [postgres, redis, clickhouse] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkClickhouse(),
    ]);

    const allHealthy =
      postgres.status === 'healthy' &&
      redis.status === 'healthy' &&
      clickhouse.status === 'healthy';

    const anyUnhealthy =
      postgres.status === 'unhealthy' ||
      redis.status === 'unhealthy' ||
      clickhouse.status === 'unhealthy';

    return {
      status: allHealthy ? 'healthy' : anyUnhealthy ? 'degraded' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      dependencies: {
        postgres,
        redis,
        clickhouse,
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
}
