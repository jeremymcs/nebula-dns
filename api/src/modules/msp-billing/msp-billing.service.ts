// Nebula DNS - MSP Billing Service
// Updated to use the unified tier system (US-022, US-023)
// The "partnerId" is now the tenant ID of an MSP-tier tenant
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import Stripe from 'stripe';
import {
  QueryBundle,
  MspSubscription,
  MspPurchase,
  MspUsage,
  MspInvoice,
} from './entities';
import { Tenant } from '../tenants/entities/tenant.entity';
import { ClickHouseService } from '../clickhouse/clickhouse.service';
import { EmailService } from '../email/email.service';
import {
  CreateQueryBundleDto,
  UpdateQueryBundleDto,
  UpdateSubscriptionSettingsDto,
  BillingOverviewDto,
  UsageSummaryDto,
} from './dto/msp-billing.dto';

@Injectable()
export class MspBillingService {
  private readonly logger = new Logger(MspBillingService.name);
  private readonly stripe: Stripe | null;

  constructor(
    @InjectRepository(QueryBundle)
    private readonly bundleRepository: Repository<QueryBundle>,
    @InjectRepository(MspSubscription)
    private readonly subscriptionRepository: Repository<MspSubscription>,
    @InjectRepository(MspPurchase)
    private readonly purchaseRepository: Repository<MspPurchase>,
    @InjectRepository(MspUsage)
    private readonly usageRepository: Repository<MspUsage>,
    @InjectRepository(MspInvoice)
    private readonly invoiceRepository: Repository<MspInvoice>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly clickHouseService: ClickHouseService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = stripeKey ? new Stripe(stripeKey) : null;
  }

  // ============================================
  // BUNDLE MANAGEMENT (Admin)
  // ============================================

  async getAvailableBundles(): Promise<QueryBundle[]> {
    return this.bundleRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', queryCount: 'ASC' },
    });
  }

  async getAllBundles(): Promise<QueryBundle[]> {
    return this.bundleRepository.find({
      order: { sortOrder: 'ASC', queryCount: 'ASC' },
    });
  }

  async createBundle(dto: CreateQueryBundleDto): Promise<QueryBundle> {
    const pricePerMillion = (dto.price / dto.queryCount) * 1000000;

    const bundle = this.bundleRepository.create({
      ...dto,
      pricePerMillion,
      validityDays: dto.validityDays || 30,
    });

    return this.bundleRepository.save(bundle);
  }

  async updateBundle(
    id: string,
    dto: UpdateQueryBundleDto,
  ): Promise<QueryBundle> {
    const bundle = await this.bundleRepository.findOne({ where: { id } });
    if (!bundle) {
      throw new NotFoundException('Bundle not found');
    }

    Object.assign(bundle, dto);

    if (dto.price !== undefined || dto.queryCount !== undefined) {
      const price = dto.price ?? bundle.price;
      const queryCount = dto.queryCount ?? bundle.queryCount;
      bundle.pricePerMillion = (price / queryCount) * 1000000;
    }

    return this.bundleRepository.save(bundle);
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // Note: partnerId is now the MSP tenant ID (tenant with tier='msp')
  // ============================================

  async getOrCreateSubscription(mspTenantId: string): Promise<MspSubscription> {
    let subscription = await this.subscriptionRepository.findOne({
      where: { partnerId: mspTenantId },
    });

    if (!subscription) {
      subscription = this.subscriptionRepository.create({
        partnerId: mspTenantId, // MSP tenant ID
        status: 'active',
        queryBalance: 0,
        overageRate: 0.5, // $0.50 per 1000 queries overage
      });
      subscription = await this.subscriptionRepository.save(subscription);
    }

    return subscription;
  }

  async getBillingOverview(mspTenantId: string): Promise<BillingOverviewDto> {
    const subscription = await this.getOrCreateSubscription(mspTenantId);

    // Get usage this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const usageThisMonth = await this.getMonthlyUsage(
      mspTenantId,
      startOfMonth,
      now,
    );

    // Calculate estimated cost for overages
    const estimatedCost =
      subscription.currentOverage > 0
        ? (subscription.currentOverage / 1000) *
          Number(subscription.overageRate)
        : 0;

    return {
      partnerId: mspTenantId,
      status: subscription.status,
      queryBalance: Number(subscription.queryBalance),
      totalPurchased: Number(subscription.totalPurchased),
      totalUsed: Number(subscription.totalUsed),
      currentOverage: Number(subscription.currentOverage),
      overageRate: Number(subscription.overageRate),
      alertThreshold: subscription.alertThreshold
        ? Number(subscription.alertThreshold)
        : null,
      autoPurchaseEnabled: !!subscription.autoPurchaseBundleId,
      billingPeriodStart: subscription.billingPeriodStart,
      billingPeriodEnd: subscription.billingPeriodEnd,
      usageThisMonth,
      estimatedCost,
    };
  }

  async updateSubscriptionSettings(
    mspTenantId: string,
    dto: UpdateSubscriptionSettingsDto,
  ): Promise<MspSubscription> {
    const subscription = await this.getOrCreateSubscription(mspTenantId);

    if (dto.overageRate !== undefined) {
      subscription.overageRate = dto.overageRate;
    }
    if (dto.alertThreshold !== undefined) {
      subscription.alertThreshold = dto.alertThreshold;
    }
    if (dto.autoPurchaseThreshold !== undefined) {
      subscription.autoPurchaseThreshold = dto.autoPurchaseThreshold;
    }
    if (dto.autoPurchaseBundleId !== undefined) {
      subscription.autoPurchaseBundleId = dto.autoPurchaseBundleId;
    }

    return this.subscriptionRepository.save(subscription);
  }

  // ============================================
  // PURCHASE MANAGEMENT
  // ============================================

  async purchaseBundle(
    mspTenantId: string,
    bundleId: string,
  ): Promise<MspPurchase> {
    const bundle = await this.bundleRepository.findOne({
      where: { id: bundleId, isActive: true },
    });
    if (!bundle) {
      throw new NotFoundException('Bundle not found or inactive');
    }

    const subscription = await this.getOrCreateSubscription(mspTenantId);

    // Create purchase record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + bundle.validityDays);

    const purchase = this.purchaseRepository.create({
      partnerId: mspTenantId,
      bundleId,
      status: 'completed', // In production, this would be 'pending' until payment confirmed
      queryCount: bundle.queryCount,
      amount: Number(bundle.price),
      expiresAt,
      description: `Purchased ${bundle.name} bundle`,
    });

    await this.purchaseRepository.save(purchase);

    // Update subscription balance
    subscription.queryBalance =
      Number(subscription.queryBalance) + Number(bundle.queryCount);
    subscription.totalPurchased =
      Number(subscription.totalPurchased) + Number(bundle.queryCount);
    await this.subscriptionRepository.save(subscription);

    this.logger.log(
      `MSP tenant ${mspTenantId} purchased bundle ${bundleId}: ${bundle.queryCount} queries`,
    );

    return purchase;
  }

  async getPurchaseHistory(
    mspTenantId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ purchases: MspPurchase[]; total: number }> {
    const [purchases, total] = await this.purchaseRepository.findAndCount({
      where: { partnerId: mspTenantId },
      relations: ['bundle'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { purchases, total };
  }

  // ============================================
  // USAGE TRACKING
  // ============================================

  private async getMonthlyUsage(
    mspTenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.usageRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.queryCount)', 'total')
      .where('usage.partnerId = :mspTenantId', { mspTenantId })
      .andWhere('usage.usageDate >= :startDate', { startDate })
      .andWhere('usage.usageDate <= :endDate', { endDate })
      .getRawOne();

    return result?.total ? Number(result.total) : 0;
  }

  async getUsageSummary(
    mspTenantId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ): Promise<UsageSummaryDto[]> {
    const usage = await this.usageRepository.find({
      where: {
        partnerId: mspTenantId,
        usageDate: Between(startDate, endDate),
      },
      order: { usageDate: 'ASC' },
    });

    // Group by the requested period
    const grouped = new Map<string, UsageSummaryDto>();

    for (const record of usage) {
      let key: string;
      const date = new Date(record.usageDate);

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped.has(key)) {
        grouped.set(key, {
          date: key,
          queryCount: 0,
          blockedCount: 0,
          allowedCount: 0,
          threatCount: 0,
        });
      }

      const summary = grouped.get(key)!;
      summary.queryCount += Number(record.queryCount);
      summary.blockedCount += Number(record.blockedCount);
      summary.allowedCount += Number(record.allowedCount);
      summary.threatCount += Number(record.threatCount);
    }

    return Array.from(grouped.values());
  }

  async getUsageByTenant(
    mspTenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    {
      tenantId: string;
      tenantName: string;
      queryCount: number;
      percentage: number;
    }[]
  > {
    // Get tenants managed by this MSP
    const tenants = await this.tenantRepository.find({
      where: { managedByMspId: mspTenantId },
    });

    const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

    const usage = await this.usageRepository
      .createQueryBuilder('usage')
      .select('usage.tenantId', 'tenantId')
      .addSelect('SUM(usage.queryCount)', 'queryCount')
      .where('usage.partnerId = :mspTenantId', { mspTenantId })
      .andWhere('usage.usageDate >= :startDate', { startDate })
      .andWhere('usage.usageDate <= :endDate', { endDate })
      .groupBy('usage.tenantId')
      .getRawMany();

    const totalQueries = usage.reduce(
      (sum, u) => sum + Number(u.queryCount),
      0,
    );

    return usage.map((u) => ({
      tenantId: u.tenantId,
      tenantName: tenantMap.get(u.tenantId) || 'Unknown',
      queryCount: Number(u.queryCount),
      percentage:
        totalQueries > 0 ? (Number(u.queryCount) / totalQueries) * 100 : 0,
    }));
  }

  // ============================================
  // INVOICE MANAGEMENT
  // ============================================

  async getInvoices(
    mspTenantId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ invoices: MspInvoice[]; total: number }> {
    const [invoices, total] = await this.invoiceRepository.findAndCount({
      where: { partnerId: mspTenantId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { invoices, total };
  }

  async getInvoiceById(
    mspTenantId: string,
    invoiceId: string,
  ): Promise<MspInvoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, partnerId: mspTenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  // ============================================
  // REAL-TIME USAGE FROM CLICKHOUSE
  // ============================================

  /**
   * Get real-time usage for today from ClickHouse (not yet persisted to PostgreSQL)
   */
  async getRealTimeUsage(mspTenantId: string): Promise<{
    todayQueries: number;
    todayBlocked: number;
    todayThreats: number;
    lastHourQueries: number;
    byTenant: { tenantId: string; tenantName: string; queries: number }[];
  }> {
    // Get tenants managed by this MSP
    const tenants = await this.tenantRepository.find({
      where: { managedByMspId: mspTenantId },
    });

    let todayQueries = 0;
    let todayBlocked = 0;
    let todayThreats = 0;
    let lastHourQueries = 0;
    const byTenant: {
      tenantId: string;
      tenantName: string;
      queries: number;
    }[] = [];

    for (const tenant of tenants) {
      try {
        // Get today's stats
        const todayStats = await this.clickHouseService.getSummaryStats(
          tenant.id,
          'day',
        );
        const hourStats = await this.clickHouseService.getSummaryStats(
          tenant.id,
          'hour',
        );

        const tenantTodayQueries = todayStats?.totalQueries || 0;
        todayQueries += tenantTodayQueries;
        todayBlocked += todayStats?.blockedQueries || 0;
        todayThreats += todayStats?.threatsBlocked || 0;
        lastHourQueries += hourStats?.totalQueries || 0;

        if (tenantTodayQueries > 0) {
          byTenant.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            queries: tenantTodayQueries,
          });
        }
      } catch (error) {
        this.logger.warn(
          `Failed to get real-time usage for tenant ${tenant.id}:`,
          error,
        );
      }
    }

    // Sort by queries descending
    byTenant.sort((a, b) => b.queries - a.queries);

    return {
      todayQueries,
      todayBlocked,
      todayThreats,
      lastHourQueries,
      byTenant,
    };
  }

  // ============================================
  // USAGE AGGREGATION (Cron job)
  // ============================================

  /**
   * Run daily at 1 AM UTC to aggregate previous day's usage
   */
  @Cron('0 1 * * *') // 1:00 AM every day
  async aggregateDailyUsageCron(): Promise<void> {
    await this.aggregateDailyUsage();
  }

  async aggregateDailyUsage(): Promise<void> {
    this.logger.log('Starting daily usage aggregation...');

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all MSP-tier tenants (these are the "partners" in the new system)
    const mspTenants = await this.tenantRepository.find({
      where: { tier: 'msp' },
    });

    for (const mspTenant of mspTenants) {
      try {
        // Get tenants managed by this MSP
        const managedTenants = await this.tenantRepository.find({
          where: { managedByMspId: mspTenant.id },
        });

        let mspTotalQueries = 0;

        for (const tenant of managedTenants) {
          // Query ClickHouse for this tenant's usage
          const stats = await this.clickHouseService.getSummaryStats(
            tenant.id,
            'day',
          );

          const totalQueries = stats?.totalQueries || 0;
          const blockedQueries = stats?.blockedQueries || 0;
          const allowedQueries = stats?.allowedQueries || 0;
          const threatsBlocked = stats?.threatsBlocked || 0;

          if (totalQueries > 0) {
            // Create or update usage record
            const existing = await this.usageRepository.findOne({
              where: {
                partnerId: mspTenant.id,
                tenantId: tenant.id,
                usageDate: yesterday,
              },
            });

            if (existing) {
              existing.queryCount = totalQueries;
              existing.blockedCount = blockedQueries;
              existing.allowedCount = allowedQueries;
              existing.threatCount = threatsBlocked;
              await this.usageRepository.save(existing);
            } else {
              await this.usageRepository.save({
                partnerId: mspTenant.id,
                tenantId: tenant.id,
                usageDate: yesterday,
                queryCount: totalQueries,
                blockedCount: blockedQueries,
                allowedCount: allowedQueries,
                threatCount: threatsBlocked,
              });
            }

            mspTotalQueries += totalQueries;
          }
        }

        // Deduct from MSP's balance
        if (mspTotalQueries > 0) {
          await this.deductUsage(mspTenant.id, mspTotalQueries);
        }
      } catch (error) {
        this.logger.error(
          `Failed to aggregate usage for MSP ${mspTenant.id}:`,
          error,
        );
      }
    }

    this.logger.log('Daily usage aggregation completed');
  }

  private async deductUsage(
    mspTenantId: string,
    queryCount: number,
  ): Promise<void> {
    const subscription = await this.getOrCreateSubscription(mspTenantId);

    const currentBalance = Number(subscription.queryBalance);

    if (currentBalance >= queryCount) {
      // Deduct from balance
      subscription.queryBalance = currentBalance - queryCount;
    } else {
      // Use remaining balance and add to overage
      const overage = queryCount - currentBalance;
      subscription.queryBalance = 0;
      subscription.currentOverage =
        Number(subscription.currentOverage) + overage;
    }

    subscription.totalUsed = Number(subscription.totalUsed) + queryCount;
    await this.subscriptionRepository.save(subscription);

    // Check if we need to trigger auto-purchase
    if (
      subscription.autoPurchaseBundleId &&
      subscription.autoPurchaseThreshold &&
      Number(subscription.queryBalance) < subscription.autoPurchaseThreshold
    ) {
      await this.triggerAutoPurchase(
        mspTenantId,
        subscription.autoPurchaseBundleId,
      );
    }

    // Check if we need to send alert
    if (
      subscription.alertThreshold &&
      Number(subscription.queryBalance) < subscription.alertThreshold &&
      (!subscription.lastAlertAt ||
        Date.now() - subscription.lastAlertAt.getTime() > 24 * 60 * 60 * 1000)
    ) {
      await this.sendLowBalanceAlert(mspTenantId);
    }
  }

  private async triggerAutoPurchase(
    mspTenantId: string,
    bundleId: string,
  ): Promise<void> {
    this.logger.log(`Triggering auto-purchase for MSP tenant ${mspTenantId}`);

    try {
      const purchase = await this.purchaseBundle(mspTenantId, bundleId);
      purchase.isAutoPurchase = true;
      await this.purchaseRepository.save(purchase);
    } catch (error) {
      this.logger.error(
        `Auto-purchase failed for MSP tenant ${mspTenantId}:`,
        error,
      );
    }
  }

  private async sendLowBalanceAlert(mspTenantId: string): Promise<void> {
    this.logger.log(`Sending low balance alert to MSP tenant ${mspTenantId}`);

    // Get MSP tenant info (replaces the old partner lookup)
    const mspTenant = await this.tenantRepository.findOne({
      where: { id: mspTenantId },
    });

    if (!mspTenant) {
      this.logger.warn(
        `MSP tenant ${mspTenantId} not found for low balance alert`,
      );
      return;
    }

    // Get subscription info
    const subscription = await this.subscriptionRepository.findOne({
      where: { partnerId: mspTenantId },
    });

    // Update last alert time
    await this.subscriptionRepository.update(
      { partnerId: mspTenantId },
      { lastAlertAt: new Date() },
    );

    // Send email notification
    try {
      const contactEmail =
        mspTenant.contactEmail || mspTenant.settings?.contactEmail;
      if (contactEmail) {
        await this.emailService.sendPaymentFailedEmail({
          to: contactEmail,
          companyName: mspTenant.name,
          updatePaymentUrl: `${this.configService.get('FRONTEND_URL')}/dashboard/billing`,
        });
        this.logger.log(`Low balance alert sent to ${contactEmail}`);
      } else {
        this.logger.warn(`No contact email for MSP tenant ${mspTenantId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send low balance alert: ${error.message}`);
    }
  }
}
