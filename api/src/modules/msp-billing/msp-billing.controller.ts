import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { MspBillingService } from './msp-billing.service';
import {
  CreateQueryBundleDto,
  UpdateQueryBundleDto,
  PurchaseBundleDto,
  UpdateSubscriptionSettingsDto,
  UsageQueryDto,
} from './dto/msp-billing.dto';

interface AuthUser {
  userId: string;
  email: string;
  tenantId: string;
  partnerId?: string;
  role: string;
}

@ApiTags('MSP Billing')
@Controller('msp/billing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MspBillingController {
  constructor(private readonly billingService: MspBillingService) {}

  // ============================================
  // BILLING OVERVIEW
  // ============================================

  @Get('overview')
  @ApiOperation({ summary: 'Get billing overview for current MSP' })
  async getBillingOverview(@CurrentUser() user: AuthUser) {
    const partnerId = this.getPartnerId(user);
    return this.billingService.getBillingOverview(partnerId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update billing settings' })
  async updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateSubscriptionSettingsDto,
  ) {
    const partnerId = this.getPartnerId(user);
    return this.billingService.updateSubscriptionSettings(partnerId, dto);
  }

  // ============================================
  // BUNDLES
  // ============================================

  @Get('bundles')
  @ApiOperation({ summary: 'Get available query bundles' })
  async getAvailableBundles() {
    return this.billingService.getAvailableBundles();
  }

  @Post('bundles/purchase')
  @ApiOperation({ summary: 'Purchase a query bundle' })
  async purchaseBundle(
    @CurrentUser() user: AuthUser,
    @Body() dto: PurchaseBundleDto,
  ) {
    const partnerId = this.getPartnerId(user);
    return this.billingService.purchaseBundle(partnerId, dto.bundleId);
  }

  // ============================================
  // PURCHASES
  // ============================================

  @Get('purchases')
  @ApiOperation({ summary: 'Get purchase history' })
  async getPurchaseHistory(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const partnerId = this.getPartnerId(user);
    return this.billingService.getPurchaseHistory(partnerId, limit || 20, offset || 0);
  }

  // ============================================
  // USAGE
  // ============================================

  @Get('usage')
  @ApiOperation({ summary: 'Get usage summary' })
  async getUsageSummary(
    @CurrentUser() user: AuthUser,
    @Query() query: UsageQueryDto,
  ) {
    const partnerId = this.getPartnerId(user);
    
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    return this.billingService.getUsageSummary(
      partnerId,
      startDate,
      endDate,
      query.groupBy || 'day',
    );
  }

  @Get('usage/by-tenant')
  @ApiOperation({ summary: 'Get usage breakdown by tenant/client' })
  async getUsageByTenant(
    @CurrentUser() user: AuthUser,
    @Query() query: UsageQueryDto,
  ) {
    const partnerId = this.getPartnerId(user);

    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    return this.billingService.getUsageByTenant(partnerId, startDate, endDate);
  }

  @Get('usage/realtime')
  @ApiOperation({ summary: 'Get real-time usage from ClickHouse for today' })
  async getRealTimeUsage(@CurrentUser() user: AuthUser) {
    const partnerId = this.getPartnerId(user);
    return this.billingService.getRealTimeUsage(partnerId);
  }

  // ============================================
  // INVOICES
  // ============================================

  @Get('invoices')
  @ApiOperation({ summary: 'Get invoice history' })
  async getInvoices(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const partnerId = this.getPartnerId(user);
    return this.billingService.getInvoices(partnerId, limit || 20, offset || 0);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice details' })
  async getInvoice(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) invoiceId: string,
  ) {
    const partnerId = this.getPartnerId(user);
    return this.billingService.getInvoiceById(partnerId, invoiceId);
  }

  // ============================================
  // HELPERS
  // ============================================

  @Post('admin/aggregate-usage')
  @ApiOperation({ summary: 'Manually trigger daily usage aggregation (admin only)' })
  async triggerAggregation(@CurrentUser() user: AuthUser) {
    // In production, add admin role check
    await this.billingService.aggregateDailyUsage();
    return { success: true, message: 'Usage aggregation triggered' };
  }

  private getPartnerId(user: AuthUser): string {
    // For now, use a demo partner ID. In production, this would come from the user's JWT
    // or be looked up based on the user's tenant association
    return user.partnerId || '550e8400-e29b-41d4-a716-446655440010';
  }
}

