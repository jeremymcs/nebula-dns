import { IsOptional, IsEnum, IsString, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReportQueryDto {
  @ApiPropertyOptional({ enum: ['24h', '7d', '30d', 'custom'], default: '7d' })
  @IsOptional()
  @IsEnum(['24h', '7d', '30d', 'custom'])
  period?: '24h' | '7d' | '30d' | 'custom' = '7d';

  @ApiPropertyOptional({ description: 'Start date for custom period (ISO 8601)' })
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
