import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SiemService } from './siem.service';
import {
  CreateSplunkIntegrationDto,
  CreateElasticIntegrationDto,
  CreateSentinelIntegrationDto,
  CreateSyslogIntegrationDto,
  UpdateSiemIntegrationDto,
} from './dto/siem.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';

@Controller('siem')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'owner')
export class SiemController {
  constructor(private readonly siemService: SiemService) {}

  // ==================== CREATE INTEGRATIONS ====================

  @Post('splunk')
  async createSplunk(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSplunkIntegrationDto,
  ) {
    const integration = await this.siemService.createSplunk(tenantId, dto);
    return { data: integration, message: 'Splunk integration created successfully' };
  }

  @Post('elastic')
  async createElastic(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateElasticIntegrationDto,
  ) {
    const integration = await this.siemService.createElastic(tenantId, dto);
    return { data: integration, message: 'Elasticsearch integration created successfully' };
  }

  @Post('sentinel')
  async createSentinel(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSentinelIntegrationDto,
  ) {
    const integration = await this.siemService.createSentinel(tenantId, dto);
    return { data: integration, message: 'Microsoft Sentinel integration created successfully' };
  }

  @Post('syslog')
  async createSyslog(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSyslogIntegrationDto,
  ) {
    const integration = await this.siemService.createSyslog(tenantId, dto);
    return { data: integration, message: 'Syslog integration created successfully' };
  }

  // ==================== COMMON OPERATIONS ====================

  @Get()
  async findAll(@CurrentTenant() tenantId: string) {
    const integrations = await this.siemService.findAll(tenantId);
    return { data: integrations };
  }

  @Get(':id')
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    const integration = await this.siemService.findOne(tenantId, id);
    return { data: integration };
  }

  @Patch(':id')
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSiemIntegrationDto,
  ) {
    const integration = await this.siemService.update(tenantId, id, dto);
    return { data: integration };
  }

  @Delete(':id')
  async delete(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.siemService.delete(tenantId, id);
    return { success: true };
  }

  @Post(':id/enable')
  async enable(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    const integration = await this.siemService.enable(tenantId, id);
    return { data: integration, message: 'Integration enabled' };
  }

  @Post(':id/disable')
  async disable(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    const integration = await this.siemService.disable(tenantId, id);
    return { data: integration, message: 'Integration disabled' };
  }

  @Post(':id/test')
  async test(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    const result = await this.siemService.test(tenantId, id);
    return { data: result };
  }
}
