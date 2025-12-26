import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GeoIPService } from './geoip.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ClickHouseService } from '../clickhouse/clickhouse.service';

@Controller('geoip')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'owner', 'analyst')
export class GeoIPController {
  constructor(
    private readonly geoIPService: GeoIPService,
    private readonly clickhouseService: ClickHouseService,
  ) {}

  @Get('query-map')
  async getQueryMap(
    @CurrentTenant() tenantId: string,
    @Query('period') period: string = '24h',
  ) {
    // Get client IP stats from ClickHouse
    const clientStats = await this.clickhouseService.getClientIPStats(tenantId, period);
    
    // Enrich with GeoIP data
    const locations = await this.geoIPService.getQueryLocations(
      tenantId,
      clientStats.map(s => ({ clientIp: s.clientIp, count: s.queryCount })),
    );

    return {
      data: locations,
      period,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('lookup')
  async lookup(@Query('ip') ip: string) {
    const location = this.geoIPService.lookup(ip);
    return { data: location };
  }
}

