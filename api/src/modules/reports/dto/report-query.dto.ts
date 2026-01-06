import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class ReportQueryDto {
  @ApiPropertyOptional({ enum: ['24h', '7d', '30d', 'custom'], default: '7d' })
  @IsOptional()
  @IsEnum(['24h', '7d', '30d', 'custom'])
  period?: '24h' | '7d' | '30d' | 'custom' = '7d';

  @ApiPropertyOptional({
    description: 'Start date for custom period (ISO 8601)',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for custom period (ISO 8601)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by location ID' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class QueryLogDto {
  @ApiPropertyOptional({ description: 'Pagination cursor' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({ enum: ['allow', 'block', 'rewrite'] })
  @IsOptional()
  @IsEnum(['allow', 'block', 'rewrite'])
  action?: 'allow' | 'block' | 'rewrite';

  @ApiPropertyOptional({ description: 'Filter by location ID' })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Search by domain name' })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({ description: 'Start date for log range (ISO 8601)' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date for log range (ISO 8601)' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({
    enum: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR'],
  })
  @IsOptional()
  @IsString()
  queryType?: string;
}

export interface QueryLogEntry {
  id: string;
  timestamp: string;
  domain: string;
  queryType: string;
  clientIp: string;
  locationId: string;
  locationName: string;
  action: 'allow' | 'block' | 'rewrite';
  reason: string;
  category?: string;
  responseTime: number;
  cached: boolean;
}
