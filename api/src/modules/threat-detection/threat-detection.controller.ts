// Nebula DNS - Threat Detection Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ThreatDetectionService } from './threat-detection.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import {
  GetRecentThreatsDto,
  GetThreatStatsDto,
  AnalyzeDomainDto,
  ThreatDetectionStatusDto,
  PaginatedThreatsResponseDto,
  ThreatStatsDto,
  DomainAnalysisDto,
} from './dto/threat-detection.dto';

@ApiTags('threat-detection')
@ApiBearerAuth()
@Controller('threat-detection')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ThreatDetectionController {
  private readonly logger = new Logger(ThreatDetectionController.name);

  constructor(
    private readonly threatDetectionService: ThreatDetectionService,
  ) {}

  @Get('status')
  @Roles(Role.READONLY, Role.ANALYST, Role.ADMIN, Role.OWNER)
  @ApiOperation({
    summary: 'Get threat detection status',
    description:
      'Returns the current status of threat detection including enabled feeds, last update times, and total threats tracked',
  })
  @ApiResponse({
    status: 200,
    description: 'Threat detection status retrieved successfully',
    type: ThreatDetectionStatusDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  async getStatus(
    @CurrentTenant() tenantId: string,
  ): Promise<ThreatDetectionStatusDto> {
    this.logger.log(`Getting threat detection status for tenant: ${tenantId}`);
    return this.threatDetectionService.getStatus(tenantId);
  }

  @Get('recent')
  @Roles(Role.ANALYST, Role.ADMIN, Role.OWNER)
  @ApiOperation({
    summary: 'Get recent detected threats',
    description:
      'Returns a paginated list of recently detected threats with optional filtering by severity, category, and date range',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent threats retrieved successfully',
    type: PaginatedThreatsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  async getRecentThreats(
    @CurrentTenant() tenantId: string,
    @Query() query: GetRecentThreatsDto,
  ): Promise<PaginatedThreatsResponseDto> {
    this.logger.log(
      `Getting recent threats for tenant: ${tenantId}, filters: ${JSON.stringify(query)}`,
    );
    return this.threatDetectionService.getRecentThreats(tenantId, query);
  }

  @Get('stats')
  @Roles(Role.ANALYST, Role.ADMIN, Role.OWNER)
  @ApiOperation({
    summary: 'Get threat statistics',
    description:
      'Returns aggregated statistics about detected threats grouped by category, severity, or day',
  })
  @ApiResponse({
    status: 200,
    description: 'Threat statistics retrieved successfully',
    type: ThreatStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  async getStats(
    @CurrentTenant() tenantId: string,
    @Query() query: GetThreatStatsDto,
  ): Promise<ThreatStatsDto> {
    this.logger.log(
      `Getting threat stats for tenant: ${tenantId}, params: ${JSON.stringify(query)}`,
    );
    return this.threatDetectionService.getStats(tenantId, query);
  }

  @Post('analyze')
  @Roles(Role.ANALYST, Role.ADMIN, Role.OWNER)
  @ApiOperation({
    summary: 'Analyze a domain for threats',
    description:
      'Analyzes a specific domain against threat feeds and detection algorithms to determine if it is malicious',
  })
  @ApiResponse({
    status: 200,
    description: 'Domain analysis completed successfully',
    type: DomainAnalysisDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid domain format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  async analyzeDomain(
    @CurrentTenant() tenantId: string,
    @Body() body: AnalyzeDomainDto,
  ): Promise<DomainAnalysisDto> {
    this.logger.log(
      `Analyzing domain for tenant: ${tenantId}, domain: ${body.domain}`,
    );
    return this.threatDetectionService.analyzeDomain(tenantId, body.domain);
  }
}
