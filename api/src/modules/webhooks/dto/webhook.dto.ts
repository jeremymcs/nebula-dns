// Nebula DNS - Webhook DTOs with Idempotency Support
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUrl,
  IsArray,
  IsObject,
  ArrayMinSize,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const WEBHOOK_EVENTS = [
  'policy.created',
  'policy.updated',
  'policy.deleted',
  'location.created',
  'location.updated',
  'location.deleted',
  'user.created',
  'user.invited',
  'user.deleted',
  'threat.detected',
  'report.generated',
  'subscription.created',
  'subscription.updated',
  'subscription.cancelled',
] as const;

export class CreateWebhookDto {
  @ApiProperty({
    description: 'Human-readable name for the webhook',
    example: 'Slack Security Alerts',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The URL endpoint that will receive webhook payloads',
    example:
      'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
  })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({
    description:
      'Secret key used to sign webhook payloads. The signature is sent in the X-Webhook-Signature header.',
    example: 'whsec_abc123xyz',
  })
  @IsString()
  @IsOptional()
  secret?: string;

  @ApiProperty({
    description:
      'List of event types to subscribe to. Use GET /webhooks/events to see available events.',
    type: [String],
    example: ['policy.created', 'policy.updated', 'threat.detected'],
  })
  @IsArray()
  @ArrayMinSize(1)
  events: string[];

  @ApiPropertyOptional({
    description: 'Custom HTTP headers to include in webhook requests',
    example: {
      'X-Custom-Header': 'custom-value',
      Authorization: 'Bearer token123',
    },
  })
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description:
      'List of IP addresses/CIDR ranges allowed to receive webhooks. Leave empty to allow all.',
    type: [String],
    example: ['192.168.1.0/24', '10.0.0.1'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ipAllowlist?: string[];

  @ApiPropertyOptional({
    description:
      'Maximum number of webhook deliveries per minute (0 for unlimited)',
    minimum: 0,
    maximum: 1000,
    default: 60,
    example: 100,
  })
  @IsInt()
  @Min(0)
  @Max(1000)
  @IsOptional()
  rateLimit?: number;
}

export class UpdateWebhookDto {
  @ApiPropertyOptional({
    description: 'Human-readable name for the webhook',
    example: 'Slack Security Alerts - Updated',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'The URL endpoint that will receive webhook payloads',
    example:
      'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
  })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({
    description:
      'Secret key used to sign webhook payloads. The signature is sent in the X-Webhook-Signature header.',
    example: 'whsec_new_secret_key',
  })
  @IsString()
  @IsOptional()
  secret?: string;

  @ApiPropertyOptional({
    description: 'List of event types to subscribe to',
    type: [String],
    example: ['policy.created', 'threat.detected'],
  })
  @IsArray()
  @IsOptional()
  events?: string[];

  @ApiPropertyOptional({
    description: 'Whether the webhook is enabled and should receive events',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Custom HTTP headers to include in webhook requests',
    example: { 'X-Custom-Header': 'custom-value' },
  })
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'List of IP addresses/CIDR ranges allowed to receive webhooks',
    type: [String],
    example: ['192.168.1.0/24'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ipAllowlist?: string[];

  @ApiPropertyOptional({
    description:
      'Maximum number of webhook deliveries per minute (0 for unlimited)',
    minimum: 0,
    maximum: 1000,
    example: 100,
  })
  @IsInt()
  @Min(0)
  @Max(1000)
  @IsOptional()
  rateLimit?: number;
}

export class WebhookResponseDto {
  @ApiProperty({
    description: 'Unique webhook identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Human-readable webhook name',
    example: 'Slack Security Alerts',
  })
  name: string;

  @ApiProperty({
    description: 'Webhook endpoint URL',
    example: 'https://hooks.slack.com/services/T00000000/B00000000/XXXX',
  })
  url: string;

  @ApiProperty({
    description: 'Subscribed event types',
    type: [String],
    example: ['policy.created', 'threat.detected'],
  })
  events: string[];

  @ApiProperty({
    description: 'Whether the webhook is currently enabled',
    example: true,
  })
  isEnabled: boolean;

  @ApiProperty({
    description: 'Custom headers sent with webhook requests',
    example: { 'X-Custom-Header': 'value' },
  })
  headers: Record<string, string>;

  @ApiProperty({
    description: 'IP allowlist for webhook delivery',
    type: [String],
    example: ['192.168.1.0/24'],
  })
  ipAllowlist: string[];

  @ApiProperty({
    description: 'Rate limit in requests per minute',
    example: 60,
  })
  rateLimit: number;

  @ApiPropertyOptional({
    description: 'Timestamp of last successful delivery',
    example: '2026-01-15T10:30:00Z',
    nullable: true,
  })
  lastTriggeredAt?: Date | null;

  @ApiPropertyOptional({
    description: 'HTTP status code from last delivery attempt',
    example: 200,
    nullable: true,
  })
  lastStatusCode?: number | null;

  @ApiPropertyOptional({
    description: 'Error message from last failed delivery',
    example: 'Connection timeout',
    nullable: true,
  })
  lastError?: string | null;

  @ApiProperty({ description: 'Consecutive failure count', example: 0 })
  failureCount: number;

  @ApiProperty({
    description: 'Webhook creation timestamp',
    example: '2026-01-01T00:00:00Z',
  })
  createdAt: Date;
}

export class WebhookDeliveryResponseDto {
  @ApiProperty({
    description: 'Unique delivery identifier',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  @ApiProperty({
    description: 'Type of event that triggered the delivery',
    example: 'policy.created',
  })
  eventType: string;

  @ApiProperty({
    description: 'Event payload that was delivered',
    example: { policyId: '123', name: 'New Policy', action: 'created' },
  })
  payload: Record<string, any>;

  @ApiPropertyOptional({
    description: 'HTTP response status code',
    example: 200,
    nullable: true,
  })
  statusCode?: number | null;

  @ApiPropertyOptional({
    description: 'Response time in milliseconds',
    example: 150,
    nullable: true,
  })
  responseTimeMs?: number | null;

  @ApiPropertyOptional({
    description: 'Error message if delivery failed',
    example: null,
    nullable: true,
  })
  error?: string | null;

  @ApiProperty({ description: 'Number of retry attempts', example: 0 })
  retryCount: number;

  @ApiPropertyOptional({
    description:
      'Idempotency key for this delivery. Use this to deduplicate webhook events on your end.',
    example: '550e8400-e29b-41d4-a716-446655440002',
    nullable: true,
  })
  idempotencyKey?: string | null;

  @ApiProperty({
    description: 'Delivery timestamp',
    example: '2026-01-15T10:30:00Z',
  })
  createdAt: Date;
}

export class TestWebhookDto {
  @ApiPropertyOptional({
    description:
      'Event type to simulate in the test payload. Defaults to policy.created.',
    example: 'policy.created',
  })
  @IsString()
  @IsOptional()
  eventType?: string;
}

export class TestWebhookResultDto {
  @ApiProperty({
    description: 'Whether the test delivery was successful',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'HTTP response status code',
    example: 200,
  })
  statusCode?: number;

  @ApiProperty({ description: 'Response time in milliseconds', example: 125 })
  responseTimeMs: number;

  @ApiPropertyOptional({
    description: 'Error message if test failed',
    example: null,
    nullable: true,
  })
  error?: string | null;
}

// Secret Rotation DTOs

export class RotateSecretDto {
  @ApiPropertyOptional({
    description:
      'Grace period in hours during which both old and new secrets are accepted. Default is 24 hours.',
    minimum: 1,
    maximum: 168,
    default: 24,
    example: 24,
  })
  @IsInt()
  @Min(1)
  @Max(168) // Max 7 days
  @IsOptional()
  gracePeriodHours?: number;
}

export class RotateSecretResponseDto {
  @ApiProperty({
    description:
      'The new webhook secret. Store this securely as it will not be displayed again.',
    example: 'whsec_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  })
  secret: string;

  @ApiProperty({
    description:
      'Timestamp when the grace period ends and the old secret will be invalidated.',
    example: '2026-01-17T10:30:00Z',
  })
  gracePeriodEndsAt: Date;

  @ApiProperty({
    description: 'Timestamp when the secret rotation was performed.',
    example: '2026-01-16T10:30:00Z',
  })
  rotatedAt: Date;

  @ApiProperty({
    description:
      'Whether there was a previous secret that will remain valid during the grace period.',
    example: true,
  })
  hasPreviousSecret: boolean;
}

export class WebhookSecretStatusDto {
  @ApiProperty({
    description: 'Whether the webhook has a secret configured.',
    example: true,
  })
  hasSecret: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp of the last secret rotation.',
    example: '2026-01-16T10:30:00Z',
    nullable: true,
  })
  lastRotatedAt?: Date | null;

  @ApiProperty({
    description: 'Whether the webhook is currently in a grace period.',
    example: true,
  })
  inGracePeriod: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp when the grace period ends.',
    example: '2026-01-17T10:30:00Z',
    nullable: true,
  })
  gracePeriodEndsAt?: Date | null;
}
