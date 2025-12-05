import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  async getCurrentTenant(@CurrentUser() user: any) {
    const tenant = await this.tenantsService.findOne(user.tenant_id);
    return { data: tenant };
  }
}
