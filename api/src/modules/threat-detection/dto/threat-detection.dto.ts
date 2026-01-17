// Nebula DNS - Threat Detection DTOs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsFQDN,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Request DTOs
// ============================================================================

export class GetRecentThreatsDto {
  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Pagination cursor for next page' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    enum: ['low', 'medium', 'high', 'critical'],
    description: 'Filter by severity level',
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity?: 'low' | 'medium' | 'high' | 'critical';

  @ApiPropertyOptional({
    enum: ['dga', 'tunneling', 'exfiltration', 'c2', 'malware'],
    description: 'Filter by threat category',
  })
  @IsOptional()
  @IsEnum(['dga', 'tunneling', 'exfiltration', 'c2', 'malware'])
  category?: 'dga' | 'tunneling' | 'exfiltration' | 'c2' | 'malware';

  @ApiPropertyOptional({ description: 'Start date for filtering (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class GetThreatStatsDto {
  @ApiPropertyOptional({ description: 'Start date for statistics (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for statistics (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: ['category', 'severity', 'day', 'hour'],
    description: 'Group statistics by field',
    default: 'category',
  })
  @IsOptional()
  @IsEnum(['category', 'severity', 'day', 'hour'])
  groupBy?: 'category' | 'severity' | 'day' | 'hour' = 'category';
}

export class AnalyzeDomainDto {
  @ApiProperty({
    description: 'Domain to analyze against threat feeds',
    example: 'suspicious-domain.xyz',
  })
  @IsFQDN({}, { message: 'domain must be a valid fully qualified domain name' })
  domain: string;
}

// ============================================================================
// Response DTOs
// ============================================================================

export class ThreatFeedStatus {
  @ApiProperty({ description: 'Threat feed identifier' })
  id: string;

  @ApiProperty({ description: 'Threat feed name' })
  name: string;

  @ApiProperty({ description: 'Whether the feed is enabled' })
  enabled: boolean;

  @ApiProperty({ description: 'Last update timestamp' })
  lastUpdated: string;

  @ApiProperty({ description: 'Number of indicators in this feed' })
  indicatorCount: number;
}

export class ThreatDetectionStatusDto {
  @ApiProperty({ description: 'Whether threat detection is enabled globally' })
  enabled: boolean;

  @ApiProperty({
    type: [ThreatFeedStatus],
    description: 'List of configured threat feeds',
  })
  feeds: ThreatFeedStatus[];

  @ApiProperty({ description: 'Total number of active threat indicators' })
  totalThreatsTracked: number;

  @ApiProperty({ description: 'Last time any feed was updated' })
  lastGlobalUpdate: string;

  @ApiProperty({ description: 'Threats detected in the last 24 hours' })
  threatsDetectedLast24h: number;
}

export class DetectedThreatDto {
  @ApiProperty({ description: 'Unique threat identifier' })
  id: string;

  @ApiProperty({ description: 'Tenant identifier' })
  tenantId: string;

  @ApiProperty({
    enum: ['dga', 'tunneling', 'exfiltration', 'c2', 'malware'],
    description: 'Type of threat detected',
  })
  type: 'dga' | 'tunneling' | 'exfiltration' | 'c2' | 'malware';

  @ApiProperty({
    enum: ['low', 'medium', 'high', 'critical'],
    description: 'Severity level',
  })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Domain involved in the threat' })
  domain: string;

  @ApiProperty({ description: 'Client IP address that made the request' })
  clientIp: string;

  @ApiProperty({ description: 'Location identifier' })
  locationId: string;

  @ApiProperty({ description: 'Additional details about the threat' })
  details: Record<string, any>;

  @ApiProperty({ description: 'When the threat was detected' })
  timestamp: string;
}

export class PaginatedThreatsResponseDto {
  @ApiProperty({ type: [DetectedThreatDto], description: 'List of threats' })
  data: DetectedThreatDto[];

  @ApiProperty({ description: 'Cursor for next page, null if no more pages' })
  nextCursor: string | null;

  @ApiProperty({ description: 'Total count of threats matching the filter' })
  total: number;
}

export class ThreatCountByCategory {
  @ApiProperty({ description: 'Threat category' })
  category: string;

  @ApiProperty({ description: 'Number of threats in this category' })
  count: number;
}

export class ThreatCountBySeverity {
  @ApiProperty({ description: 'Severity level' })
  severity: string;

  @ApiProperty({ description: 'Number of threats at this severity' })
  count: number;
}

export class ThreatCountByDay {
  @ApiProperty({ description: 'Date (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ description: 'Number of threats on this day' })
  count: number;
}

export class ThreatStatsDto {
  @ApiProperty({
    type: [ThreatCountByCategory],
    description: 'Threats grouped by category',
  })
  byCategory: ThreatCountByCategory[];

  @ApiProperty({
    type: [ThreatCountBySeverity],
    description: 'Threats grouped by severity',
  })
  bySeverity: ThreatCountBySeverity[];

  @ApiProperty({
    type: [ThreatCountByDay],
    description: 'Threats grouped by day',
  })
  byDay: ThreatCountByDay[];

  @ApiProperty({ description: 'Total threats in the period' })
  totalThreats: number;

  @ApiProperty({ description: 'Start of the statistics period' })
  periodStart: string;

  @ApiProperty({ description: 'End of the statistics period' })
  periodEnd: string;
}

export class ThreatSource {
  @ApiProperty({ description: 'Source feed or detection method' })
  source: string;

  @ApiProperty({ description: 'Confidence score from this source (0-100)' })
  confidence: number;

  @ApiProperty({ description: 'When this source last updated the indicator' })
  lastSeen: string;
}

export class DomainAnalysisDto {
  @ApiProperty({ description: 'The analyzed domain' })
  domain: string;

  @ApiProperty({ description: 'Whether the domain is considered a threat' })
  isThreat: boolean;

  @ApiProperty({ description: 'Overall confidence score (0-100)' })
  confidence: number;

  @ApiProperty({
    description: 'Threat categories this domain belongs to',
    type: [String],
  })
  categories: string[];

  @ApiProperty({
    enum: ['low', 'medium', 'high', 'critical', null],
    description: 'Recommended severity level, null if not a threat',
  })
  severity: 'low' | 'medium' | 'high' | 'critical' | null;

  @ApiProperty({
    type: [ThreatSource],
    description: 'Sources that identified this domain',
  })
  sources: ThreatSource[];

  @ApiProperty({ description: 'Analysis details and indicators' })
  analysis: {
    entropy?: number;
    consonantRatio?: number;
    subdomainLength?: number;
    indicators?: string[];
  };

  @ApiProperty({ description: 'When the analysis was performed' })
  analyzedAt: string;
}
