// Nebula DNS - System Health DTOs
// DTOs for system health monitoring and status endpoints
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Service status values
 */
export type ServiceHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Overall system health status
 */
export type OverallHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * ServiceStatusDto - Status of individual external service
 *
 * Represents the health state of a single service like policy-svc,
 * dnsdist, or unbound.
 */
export class ServiceStatusDto {
  @ApiProperty({
    description: 'Service identifier',
    example: 'policy-svc',
    enum: ['policy-svc', 'dnsdist', 'unbound'],
  })
  name: string;

  @ApiProperty({
    description: 'Service health status',
    enum: ['healthy', 'degraded', 'unhealthy'],
    example: 'healthy',
  })
  status: ServiceHealthStatus;

  @ApiPropertyOptional({
    description: 'Response latency in milliseconds',
    example: 12,
  })
  latencyMs?: number;

  @ApiPropertyOptional({
    description: 'Error message if service is unhealthy',
    example: 'Connection timeout',
  })
  error?: string;

  @ApiProperty({
    description: 'Timestamp of last health check (ISO format)',
    example: '2026-01-18T03:00:00.000Z',
  })
  lastChecked: string;
}

/**
 * Error rate statistics for a time window
 */
export class ErrorWindowDto {
  @ApiProperty({
    description: 'Number of errors in the time window',
    example: 1234,
  })
  errorCount: number;

  @ApiProperty({
    description: 'Total queries in the time window',
    example: 2547893,
  })
  totalQueries: number;

  @ApiProperty({
    description: 'Error rate as percentage',
    example: 0.05,
  })
  errorRate: number;
}

/**
 * ErrorRatesDto - Error rates for multiple time windows
 *
 * Provides error statistics for both last hour and last 24 hours,
 * sourced from ClickHouse analytics data.
 */
export class ErrorRatesDto {
  @ApiProperty({
    description: 'Error statistics for the last hour',
    type: ErrorWindowDto,
  })
  lastHour: ErrorWindowDto;

  @ApiProperty({
    description: 'Error statistics for the last 24 hours',
    type: ErrorWindowDto,
  })
  last24Hours: ErrorWindowDto;

  @ApiProperty({
    description: 'Whether using mock data (ClickHouse unavailable)',
    example: false,
  })
  isMockData: boolean;
}

/**
 * RecentErrorDto - Individual error log entry
 *
 * Represents a single DNS query that resulted in an error,
 * used for error investigation.
 */
export class RecentErrorDto {
  @ApiProperty({
    description: 'Error timestamp (ISO format)',
    example: '2026-01-18T02:45:30.123Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Domain that caused the error',
    example: 'malware.example.com',
  })
  domain: string;

  @ApiProperty({
    description: 'Error reason or type',
    example: 'policy_error',
  })
  reason: string;

  @ApiProperty({
    description: 'Client IP address that made the query',
    example: '192.168.1.100',
  })
  clientIp: string;

  @ApiProperty({
    description: 'Tenant ID associated with the query',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  tenantId: string;
}

/**
 * QueryVolumeDto - Aggregate query volume statistics
 *
 * Provides overall DNS query counts for a specified time period,
 * spanning all tenants (admin view).
 */
export class QueryVolumeDto {
  @ApiProperty({
    description: 'Total DNS queries in the period',
    example: 2547893,
  })
  totalQueries: number;

  @ApiProperty({
    description: 'Number of blocked queries',
    example: 127394,
  })
  blockedQueries: number;

  @ApiProperty({
    description: 'Number of allowed queries',
    example: 2420499,
  })
  allowedQueries: number;

  @ApiProperty({
    description: 'Time period for the statistics',
    example: '24h',
    enum: ['1h', '24h'],
  })
  period: string;

  @ApiProperty({
    description: 'Whether using mock data (ClickHouse unavailable)',
    example: false,
  })
  isMockData: boolean;
}

/**
 * ClickHouse storage status
 */
export class ClickHouseStatusDto {
  @ApiProperty({
    description: 'Whether ClickHouse is connected',
    example: true,
  })
  connected: boolean;

  @ApiPropertyOptional({
    description: 'Connection latency in milliseconds',
    example: 5,
  })
  latencyMs?: number;

  @ApiProperty({
    description: 'Number of consecutive connection failures',
    example: 0,
  })
  consecutiveFailures: number;

  @ApiPropertyOptional({
    description: 'Error message if not connected',
    example: 'Connection refused',
  })
  error?: string;
}

/**
 * Redis storage status
 */
export class RedisStatusDto {
  @ApiProperty({
    description: 'Whether Redis is connected',
    example: true,
  })
  connected: boolean;

  @ApiPropertyOptional({
    description: 'Ping latency in milliseconds',
    example: 2,
  })
  latencyMs?: number;

  @ApiPropertyOptional({
    description: 'Error message if not connected',
    example: 'Connection refused',
  })
  error?: string;
}

/**
 * StorageStatusDto - Storage service connection status
 *
 * Combined status for both ClickHouse (analytics) and Redis (cache)
 * storage backends.
 */
export class StorageStatusDto {
  @ApiProperty({
    description: 'ClickHouse analytics database status',
    type: ClickHouseStatusDto,
  })
  clickhouse: ClickHouseStatusDto;

  @ApiProperty({
    description: 'Redis cache status',
    type: RedisStatusDto,
  })
  redis: RedisStatusDto;
}

/**
 * SystemHealthResponseDto - Combined system health response
 *
 * Aggregates all health check results into a single response
 * for the system health endpoint.
 */
export class SystemHealthResponseDto {
  @ApiProperty({
    description: 'Overall system health status',
    enum: ['healthy', 'degraded', 'unhealthy'],
    example: 'healthy',
  })
  overallStatus: OverallHealthStatus;

  @ApiProperty({
    description: 'External service health statuses',
    type: [ServiceStatusDto],
  })
  services: ServiceStatusDto[];

  @ApiProperty({
    description: 'Storage backend statuses',
    type: StorageStatusDto,
  })
  storage: StorageStatusDto;

  @ApiProperty({
    description: 'Error rate statistics',
    type: ErrorRatesDto,
  })
  errorRates: ErrorRatesDto;

  @ApiProperty({
    description: 'Query volume statistics',
    type: QueryVolumeDto,
  })
  queryVolume: QueryVolumeDto;

  @ApiProperty({
    description: 'Timestamp of the health check (ISO format)',
    example: '2026-01-18T03:00:00.000Z',
  })
  timestamp: string;
}

/**
 * SystemHealthQueryDto - Query parameters for health endpoint
 */
export class SystemHealthQueryDto {
  @ApiPropertyOptional({
    description: 'Time period for error rates and query volume',
    enum: ['1h', '24h'],
    default: '24h',
  })
  @IsOptional()
  @IsEnum(['1h', '24h'], {
    message: 'Period must be one of: 1h, 24h',
  })
  period?: '1h' | '24h' = '24h';
}

/**
 * RecentErrorsQueryDto - Query parameters for recent errors endpoint
 */
export class RecentErrorsQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of errors to return',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number = 20;
}
