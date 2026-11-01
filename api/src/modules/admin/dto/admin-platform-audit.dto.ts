// Flux Shield - Platform audit log viewer DTOs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export type PlatformAuditSource = 'admin' | 'tenant' | 'all';

export class AdminPlatformAuditQueryDto {
  @ApiPropertyOptional({ enum: ['admin', 'tenant', 'all'], default: 'all' })
  @IsOptional()
  @IsEnum(['admin', 'tenant', 'all'])
  source?: PlatformAuditSource = 'all';

  @ApiPropertyOptional({ description: 'Filter tenant audit logs by tenant' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Admin actor ID (admin activity) or user ID (tenant audit)' })
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class AdminPlatformAuditEntryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['admin', 'tenant'] })
  source: 'admin' | 'tenant';

  @ApiProperty()
  action: string;

  @ApiPropertyOptional()
  tenantId: string | null;

  @ApiPropertyOptional()
  tenantName: string | null;

  @ApiPropertyOptional()
  actorId: string | null;

  @ApiPropertyOptional()
  actorEmail: string | null;

  @ApiPropertyOptional()
  actorName: string | null;

  @ApiPropertyOptional()
  resourceType: string | null;

  @ApiPropertyOptional()
  resourceId: string | null;

  @ApiPropertyOptional()
  metadata: Record<string, unknown> | null;

  @ApiPropertyOptional()
  ipAddress: string | null;

  @ApiProperty()
  createdAt: string;
}

export class AdminPlatformAuditResponseDto {
  @ApiProperty({ type: [AdminPlatformAuditEntryDto] })
  data: AdminPlatformAuditEntryDto[];

  @ApiProperty()
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}
