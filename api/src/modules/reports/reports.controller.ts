import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { ReportQueryDto, QueryLogDto } from './dto/report-query.dto';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get summary statistics' })
  @ApiResponse({ status: 200, description: 'Summary retrieved' })
  async getSummary(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getSummary(tenantId, query);
  }

  @Get('top-blocked')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get top blocked domains' })
  @ApiResponse({ status: 200, description: 'Top blocked domains retrieved' })
  async getTopBlocked(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getTopBlocked(tenantId, query);
  }

  @Get('blocks-by-category')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get blocks grouped by category' })
  @ApiResponse({ status: 200, description: 'Blocks by category retrieved' })
  async getBlocksByCategory(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getBlocksByCategory(tenantId, query);
  }

  @Get('threats')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get threat trends' })
  @ApiResponse({ status: 200, description: 'Threat trends retrieved' })
  async getThreatTrends(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getThreatTrends(tenantId, query);
  }

  @Get('locations')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get stats by location' })
  @ApiResponse({ status: 200, description: 'Location stats retrieved' })
  async getLocationStats(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getLocationStats(tenantId, query);
  }

  @Get('logs')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get DNS query logs' })
  @ApiResponse({ status: 200, description: 'Query logs retrieved' })
  async getQueryLogs(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryLogDto,
  ) {
    return this.reportsService.getQueryLogs(tenantId, query);
  }

  @Get('trends')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get query trends for charts' })
  @ApiResponse({ status: 200, description: 'Query trends retrieved' })
  async getQueryTrends(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getQueryTrends(tenantId, query);
  }

  @Get('insights')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get AI-generated security insights' })
  @ApiResponse({ status: 200, description: 'Security insights retrieved' })
  async getInsights(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getInsights(tenantId, query);
  }

  @Get('security-score')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get security score and recommendations' })
  @ApiResponse({ status: 200, description: 'Security score retrieved' })
  async getSecurityScore(@CurrentTenant() tenantId: string) {
    return this.reportsService.getSecurityScore(tenantId);
  }

  @Get('investigate')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST)
  @ApiOperation({ summary: 'Investigate a specific domain' })
  @ApiResponse({ status: 200, description: 'Domain investigation results' })
  async investigateDomain(
    @CurrentTenant() tenantId: string,
    @Query('domain') domain: string,
  ) {
    return this.reportsService.investigateDomain(tenantId, domain);
  }

  @Get('data-status')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get analytics data source status' })
  @ApiResponse({ status: 200, description: 'Data source status retrieved' })
  async getDataStatus() {
    return this.reportsService.getDataStatus();
  }

  @Get('dashboard/home')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get simplified home dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Home dashboard stats retrieved' })
  async getHomeDashboard(@CurrentTenant() tenantId: string) {
    return this.reportsService.getHomeDashboard(tenantId);
  }
}
