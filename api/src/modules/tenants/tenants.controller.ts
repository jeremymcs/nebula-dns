import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current tenant details' })
  @ApiResponse({ status: 200, description: 'Tenant details retrieved' })
  async getCurrentTenant(@CurrentTenant() tenantId: string) {
    return this.tenantsService.findById(tenantId);
  }

  @Patch('current')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update current tenant settings' })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  async updateCurrentTenant(
    @CurrentTenant() tenantId: string,
    @Body() updateDto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(tenantId, updateDto);
  }
}
