// Nebula DNS - API Key DTOs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Regex for validating IPv4 addresses
 */
const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/**
 * Regex for validating IPv6 addresses (simplified, covers common formats)
 */
const IPV6_REGEX =
  /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::ffff:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/i;

/**
 * Combined IP regex (IPv4 or IPv6)
 */
const IP_REGEX = new RegExp(`(${IPV4_REGEX.source})|(${IPV6_REGEX.source})`);

/**
 * Regex for validating IPv4 CIDR notation
 */
const IPV4_CIDR_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:3[0-2]|[12]?[0-9])$/;

/**
 * Regex for validating IPv6 CIDR notation (simplified)
 */
const IPV6_CIDR_REGEX =
  /^(?:[0-9a-fA-F]{1,4}:){0,7}[0-9a-fA-F]{0,4}(?:::)?(?:[0-9a-fA-F]{1,4}:){0,7}[0-9a-fA-F]{0,4}\/(?:12[0-8]|1[01][0-9]|[1-9]?[0-9])$/i;

/**
 * Combined CIDR regex (IPv4 or IPv6)
 */
const CIDR_REGEX = new RegExp(
  `(${IPV4_CIDR_REGEX.source})|(${IPV6_CIDR_REGEX.source})`,
);

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Human-readable name for the API key',
    example: 'Production Integration Key',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description:
      'Permission scopes for the API key. read: read-only access, write: create/update resources, admin: full access including user management',
    type: [String],
    enum: ['read', 'write', 'admin'],
    example: ['read', 'write'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsOptional()
  scopes?: ('read' | 'write' | 'admin')[];

  @ApiPropertyOptional({
    description: 'Maximum number of requests per minute',
    minimum: 10,
    maximum: 10000,
    default: 1000,
    example: 500,
  })
  @IsNumber()
  @Min(10)
  @Max(10000)
  @IsOptional()
  rateLimit?: number;

  @ApiPropertyOptional({
    description:
      'Expiration date for the API key (ISO 8601 format). If not set, the key never expires.',
    example: '2027-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({
    description:
      'Array of exact IP addresses allowed to use this API key. If not provided or empty (and allowedCidrs is also empty), all IPs are allowed. Maximum 100 IP addresses.',
    type: [String],
    example: ['192.168.1.1', '10.0.0.1', '2001:db8::1'],
  })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(100, { message: 'Maximum 100 allowed IP addresses' })
  @IsString({ each: true })
  @Matches(IP_REGEX, {
    each: true,
    message: 'Each IP address must be a valid IPv4 or IPv6 address',
  })
  allowedIps?: string[];

  @ApiPropertyOptional({
    description:
      'Array of CIDR ranges allowed to use this API key. If not provided or empty (and allowedIps is also empty), all IPs are allowed. Maximum 50 CIDR ranges.',
    type: [String],
    example: ['192.168.0.0/24', '10.0.0.0/8', '2001:db8::/32'],
  })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(50, { message: 'Maximum 50 allowed CIDR ranges' })
  @IsString({ each: true })
  @Matches(CIDR_REGEX, {
    each: true,
    message:
      'Each CIDR must be valid IPv4 or IPv6 CIDR notation (e.g., 192.168.0.0/24)',
  })
  allowedCidrs?: string[];
}

export class UpdateApiKeyDto {
  @ApiPropertyOptional({
    description: 'Human-readable name for the API key',
    example: 'Updated Production Key',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Permission scopes for the API key',
    type: [String],
    enum: ['read', 'write', 'admin'],
    example: ['read'],
  })
  @IsArray()
  @IsOptional()
  scopes?: ('read' | 'write' | 'admin')[];

  @ApiPropertyOptional({
    description: 'Maximum number of requests per minute',
    minimum: 10,
    maximum: 10000,
    example: 1000,
  })
  @IsNumber()
  @Min(10)
  @Max(10000)
  @IsOptional()
  rateLimit?: number;

  @ApiPropertyOptional({
    description: 'Whether the API key is currently active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Expiration date for the API key (ISO 8601 format)',
    example: '2027-06-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({
    description:
      'Array of exact IP addresses allowed to use this API key. Set to empty array to remove all IP restrictions. Set to null to keep existing value. Maximum 100 IP addresses.',
    type: [String],
    example: ['192.168.1.1', '10.0.0.1'],
  })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(100, { message: 'Maximum 100 allowed IP addresses' })
  @IsString({ each: true })
  @Matches(IP_REGEX, {
    each: true,
    message: 'Each IP address must be a valid IPv4 or IPv6 address',
  })
  allowedIps?: string[];

  @ApiPropertyOptional({
    description:
      'Array of CIDR ranges allowed to use this API key. Set to empty array to remove all CIDR restrictions. Set to null to keep existing value. Maximum 50 CIDR ranges.',
    type: [String],
    example: ['192.168.0.0/24', '10.0.0.0/8'],
  })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(50, { message: 'Maximum 50 allowed CIDR ranges' })
  @IsString({ each: true })
  @Matches(CIDR_REGEX, {
    each: true,
    message:
      'Each CIDR must be valid IPv4 or IPv6 CIDR notation (e.g., 192.168.0.0/24)',
  })
  allowedCidrs?: string[];
}

export class ApiKeyResponseDto {
  @ApiProperty({
    description: 'Unique API key identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Human-readable API key name',
    example: 'Production Integration Key',
  })
  name: string;

  @ApiProperty({
    description:
      'Prefix of the API key for identification (full key is never returned)',
    example: 'nbla_prod_a1b2c3',
  })
  keyPrefix: string;

  @ApiProperty({
    description: 'Permission scopes assigned to this key',
    type: [String],
    example: ['read', 'write'],
  })
  scopes: string[];

  @ApiProperty({
    description: 'Rate limit in requests per minute',
    example: 1000,
  })
  rateLimit: number;

  @ApiProperty({
    description: 'Whether the API key is currently active',
    example: true,
  })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp of last API key usage',
    example: '2026-01-15T10:30:00Z',
    nullable: true,
  })
  lastUsedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Expiration date of the API key',
    example: '2027-01-01T00:00:00Z',
    nullable: true,
  })
  expiresAt?: Date | null;

  @ApiProperty({
    description: 'API key creation timestamp',
    example: '2026-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description:
      'Array of exact IP addresses allowed to use this API key. If null or empty (and allowedCidrs is also empty), all IPs are allowed.',
    type: [String],
    example: ['192.168.1.1', '10.0.0.1'],
    nullable: true,
  })
  allowedIps?: string[] | null;

  @ApiPropertyOptional({
    description:
      'Array of CIDR ranges allowed to use this API key. If null or empty (and allowedIps is also empty), all IPs are allowed.',
    type: [String],
    example: ['192.168.0.0/24', '10.0.0.0/8'],
    nullable: true,
  })
  allowedCidrs?: string[] | null;
}

export class NewApiKeyResponseDto extends ApiKeyResponseDto {
  @ApiProperty({
    description:
      'The full API key value. This is only shown once at creation time - store it securely!',
    example: 'nbla_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  })
  apiKey: string;

  @ApiPropertyOptional({
    description: 'ID of the original key if this was created via rotation',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  rotatedFromId?: string;

  @ApiPropertyOptional({
    description: 'When the old key will expire (only present when rotating)',
    example: '2026-01-16T10:30:00Z',
  })
  oldKeyExpiresAt?: Date;
}

export class RotateApiKeyDto {
  @ApiPropertyOptional({
    description:
      'Number of hours the old key remains valid after rotation. This allows time to update integrations without downtime.',
    minimum: 1,
    maximum: 168,
    default: 24,
    example: 48,
  })
  @IsNumber()
  @Min(1)
  @Max(168)
  @IsOptional()
  gracePeriodHours?: number;
}

export class ApiKeyUsageStatsDto {
  @ApiProperty({
    description: 'Total number of requests made with this key',
    example: 15420,
  })
  totalRequests: number;

  @ApiProperty({ description: 'Number of requests made today', example: 523 })
  requestsToday: number;

  @ApiProperty({
    description: 'Number of requests made in the last 7 days',
    example: 3250,
  })
  requestsThisWeek: number;

  @ApiProperty({
    description: 'Average response time in milliseconds',
    example: 45.2,
  })
  averageResponseTime: number;

  @ApiProperty({
    description: 'Most frequently accessed endpoints',
    type: 'array',
    example: [
      { endpoint: 'GET /policies', count: 5420 },
      { endpoint: 'GET /reports/summary', count: 2150 },
    ],
  })
  topEndpoints: { endpoint: string; count: number }[];

  @ApiProperty({
    description: 'Percentage of requests that returned errors',
    example: 0.5,
  })
  errorRate: number;
}
