// Nebula DNS - GeoIP Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { GeoIPService } from './geoip.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { ClickHouseService } from '../clickhouse/clickhouse.service';
import { IpValidationPipe } from './pipes/ip-validation.pipe';
import {
  GeoIPResult,
  GeoIPLookupResponse,
  GeoIPStatus,
  RefreshResult,
  GeoIPErrorResponse,
} from './dto/geoip.dto';

@ApiTags('geoip')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('geoip')
export class GeoIPController {
  constructor(
    private readonly geoIPService: GeoIPService,
    private readonly clickhouseService: ClickHouseService,
  ) {}

  /**
   * Look up geolocation data for an IP address
   * Rate limited to 100 requests per minute per user
   */
  @Get('lookup/:ip')
  @Roles(Role.READONLY, Role.ANALYST, Role.ADMIN, Role.OWNER)
  @ApiOperation({
    summary: 'Look up geolocation data for an IP address',
    description:
      'Returns country, city, region, timezone, coordinates, and ISP information for the given IP address. Supports both IPv4 and IPv6 addresses.',
  })
  @ApiParam({
    name: 'ip',
    description: 'IP address to look up (IPv4 or IPv6)',
    example: '8.8.8.8',
  })
  @ApiResponse({
    status: 200,
    description: 'Geolocation data retrieved successfully',
    type: GeoIPLookupResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid IP address format',
    type: GeoIPErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
  })
  async lookupIP(
    @Param('ip', IpValidationPipe) ip: string,
  ): Promise<GeoIPLookupResponse> {
    const location = this.geoIPService.lookup(ip);

    const result: GeoIPResult = {
      country: location?.country || 'Unknown',
      countryCode: location?.countryCode || 'XX',
      region: location?.region || '',
      city: location?.city || '',
      timezone: location?.timezone || 'UTC',
      coordinates: {
        latitude: location?.latitude || 0,
        longitude: location?.longitude || 0,
      },
      isp: location?.isp,
      org: location?.org,
    };

    return {
      ip,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get GeoIP database status
   */
  @Get('status')
  @Roles(Role.ADMIN, Role.OWNER)
  @ApiOperation({
    summary: 'Get GeoIP database status',
    description:
      'Returns information about the GeoIP database including version, last update time, and record count.',
  })
  @ApiResponse({
    status: 200,
    description: 'Database status retrieved successfully',
    type: GeoIPStatus,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions (requires ADMIN or OWNER role)',
  })
  async getStatus(): Promise<GeoIPStatus> {
    return this.geoIPService.getDatabaseStatus();
  }

  /**
   * Refresh GeoIP database
   */
  @Post('refresh')
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh GeoIP database',
    description:
      'Triggers a refresh of the GeoIP database. This operation may take some time to complete.',
  })
  @ApiResponse({
    status: 200,
    description: 'Database refresh initiated successfully',
    type: RefreshResult,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions (requires OWNER role)',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error - Failed to refresh database',
  })
  async refreshDatabase(): Promise<RefreshResult> {
    return this.geoIPService.refreshDatabase();
  }

  /**
   * Get query map data with geolocation information
   */
  @Get('query-map')
  @Roles(Role.ADMIN, Role.OWNER, Role.ANALYST)
  @ApiOperation({
    summary: 'Get query map data with geolocation',
    description:
      'Returns DNS query statistics enriched with geolocation data for visualization on a map.',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Time period for the data',
    enum: ['24h', '7d', '30d'],
    example: '24h',
  })
  @ApiResponse({
    status: 200,
    description: 'Query map data retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  async getQueryMap(
    @CurrentTenant() tenantId: string,
    @Query('period') period: string = '24h',
  ) {
    // Get client IP stats from ClickHouse
    const clientStats = await this.clickhouseService.getClientIPStats(
      tenantId,
      period,
    );

    // Enrich with GeoIP data
    const locations = await this.geoIPService.getQueryLocations(
      tenantId,
      clientStats.map((s) => ({ clientIp: s.clientIp, count: s.queryCount })),
    );

    return {
      data: locations,
      period,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Legacy lookup endpoint (query parameter based)
   * Maintained for backward compatibility
   */
  @Get('lookup')
  @Roles(Role.READONLY, Role.ANALYST, Role.ADMIN, Role.OWNER)
  @ApiOperation({
    summary: 'Look up geolocation data for an IP address (legacy)',
    description:
      'Legacy endpoint that accepts IP as a query parameter. Use GET /geoip/lookup/:ip instead.',
    deprecated: true,
  })
  @ApiQuery({
    name: 'ip',
    description: 'IP address to look up',
    example: '8.8.8.8',
  })
  @ApiResponse({
    status: 200,
    description: 'Geolocation data retrieved successfully',
  })
  async lookupLegacy(@Query('ip', IpValidationPipe) ip: string) {
    const location = this.geoIPService.lookup(ip);
    return { data: location };
  }
}
