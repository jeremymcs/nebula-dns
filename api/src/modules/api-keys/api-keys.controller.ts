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
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto, UpdateApiKeyDto, RotateApiKeyDto } from './dto/api-key.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/common/decorators/user.decorator';

@Controller('api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @Roles('admin', 'owner')
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateApiKeyDto,
  ) {
    const apiKey = await this.apiKeysService.create(tenantId, user.id, dto);
    return {
      data: apiKey,
      message: 'API key created. Make sure to copy the key now - it will not be shown again.',
    };
  }

  @Get()
  async findAll(@CurrentTenant() tenantId: string) {
    const apiKeys = await this.apiKeysService.findAll(tenantId);
    return { data: apiKeys };
  }

  @Get(':id')
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    const apiKey = await this.apiKeysService.findOne(tenantId, id);
    return { data: apiKey };
  }

  @Get(':id/usage')
  async getUsageStats(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    const stats = await this.apiKeysService.getUsageStats(tenantId, id);
    return { data: stats };
  }

  @Patch(':id')
  @Roles('admin', 'owner')
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateApiKeyDto,
  ) {
    const apiKey = await this.apiKeysService.update(tenantId, id, dto);
    return { data: apiKey };
  }

  @Post(':id/revoke')
  @Roles('admin', 'owner')
  async revoke(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    const apiKey = await this.apiKeysService.revoke(tenantId, id);
    return { data: apiKey, message: 'API key revoked successfully' };
  }

  @Post(':id/rotate')
  @Roles('admin', 'owner')
  async rotate(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RotateApiKeyDto,
  ) {
    const newApiKey = await this.apiKeysService.rotate(tenantId, id, dto.gracePeriodHours);
    return {
      data: newApiKey,
      message: `API key rotated. Old key will remain active for ${dto.gracePeriodHours || 24} hours. Make sure to copy the new key now - it will not be shown again.`,
    };
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  async delete(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.apiKeysService.delete(tenantId, id);
    return { success: true };
  }
}
