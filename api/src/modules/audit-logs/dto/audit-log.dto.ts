import { IsString, IsOptional, IsUUID, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AuditAction, AuditResourceType } from '../entities/audit-log.entity';

export class QueryAuditLogsDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  action?: AuditAction;

  @IsOptional()
  @IsString()
  resourceType?: AuditResourceType;

  @IsOptional()
  @IsUUID()
  resourceId?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  cursor?: string;
}

export class AuditLogResponseDto {
  id: string;
  userId: string | null;
  userName?: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  resourceName: string | null;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

export class CreateAuditLogDto {
  tenantId: string;
  userId?: string | null;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  resourceName?: string | null;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
}

export class ExportAuditLogsDto {
  @IsOptional()
  @IsString()
  format?: 'csv' | 'json' = 'csv';

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsString()
  resourceType?: AuditResourceType;
}

