// Nebula DNS - Webhook DTOs
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
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  secret?: string;

  @IsArray()
  @ArrayMinSize(1)
  events: string[];

  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ipAllowlist?: string[];

  @IsInt()
  @Min(0)
  @Max(1000)
  @IsOptional()
  rateLimit?: number;
}

export class UpdateWebhookDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUrl()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  secret?: string;

  @IsArray()
  @IsOptional()
  events?: string[];

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ipAllowlist?: string[];

  @IsInt()
  @Min(0)
  @Max(1000)
  @IsOptional()
  rateLimit?: number;
}

export class WebhookResponseDto {
  id: string;
  name: string;
  url: string;
  events: string[];
  isEnabled: boolean;
  headers: Record<string, string>;
  ipAllowlist: string[];
  rateLimit: number;
  lastTriggeredAt?: Date | null;
  lastStatusCode?: number | null;
  lastError?: string | null;
  failureCount: number;
  createdAt: Date;
}

export class WebhookDeliveryResponseDto {
  id: string;
  eventType: string;
  payload: Record<string, any>;
  statusCode?: number | null;
  responseTimeMs?: number | null;
  error?: string | null;
  retryCount: number;
  createdAt: Date;
}

export class TestWebhookDto {
  @IsString()
  @IsOptional()
  eventType?: string;
}

export class TestWebhookResultDto {
  success: boolean;
  statusCode?: number;
  responseTimeMs: number;
  error?: string | null;
}
