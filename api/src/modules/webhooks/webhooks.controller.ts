import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  TestWebhookDto,
} from './dto/webhook.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';

@Controller('webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('events')
  getAvailableEvents() {
    const events = this.webhooksService.getAvailableEvents();
    return { data: events };
  }

  @Post()
  @Roles('admin', 'owner')
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateWebhookDto,
  ) {
    const webhook = await this.webhooksService.create(tenantId, dto);
    return { data: webhook, message: 'Webhook created successfully' };
  }

  @Get()
  async findAll(@CurrentTenant() tenantId: string) {
    const webhooks = await this.webhooksService.findAll(tenantId);
    return { data: webhooks };
  }

  @Get(':id')
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const webhook = await this.webhooksService.findOne(tenantId, id);
    return { data: webhook };
  }

  @Get(':id/deliveries')
  async getDeliveries(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const deliveries = await this.webhooksService.getDeliveries(
      tenantId,
      id,
      limit ? parseInt(limit) : 50,
    );
    return { data: deliveries };
  }

  @Patch(':id')
  @Roles('admin', 'owner')
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    const webhook = await this.webhooksService.update(tenantId, id, dto);
    return { data: webhook };
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.webhooksService.delete(tenantId, id);
    return { success: true };
  }

  @Post(':id/enable')
  @Roles('admin', 'owner')
  async enable(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const webhook = await this.webhooksService.enable(tenantId, id);
    return { data: webhook, message: 'Webhook enabled' };
  }

  @Post(':id/disable')
  @Roles('admin', 'owner')
  async disable(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const webhook = await this.webhooksService.disable(tenantId, id);
    return { data: webhook, message: 'Webhook disabled' };
  }

  @Post(':id/test')
  @Roles('admin', 'owner')
  async test(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: TestWebhookDto,
  ) {
    const result = await this.webhooksService.test(tenantId, id, dto.eventType);
    return { data: result };
  }
}
