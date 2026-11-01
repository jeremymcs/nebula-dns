// Nebula DNS - Admin Dashboard Stats Service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Tenant,
  TenantStatus,
  TenantTier,
} from '../tenants/entities/tenant.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { MspInvoice } from '../msp-billing/entities/msp-invoice.entity';
import { ClickHouseService } from '../clickhouse/clickhouse.service';
import {
  AdminDashboardStatsResponseDto,
  DashboardStatNullableNumberDto,
  DashboardStatNumberDto,
  MspStatusCounts,
  TenantTierCounts,
} from './dto/admin-dashboard.dto';

const CHICAGO_TZ = 'America/Chicago';

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(MspInvoice)
    private readonly mspInvoiceRepository: Repository<MspInvoice>,
    private readonly clickhouseService: ClickHouseService,
  ) {}

  async getStats(): Promise<AdminDashboardStatsResponseDto> {
    const [
      mspStats,
      tenantStats,
      demoTenantCount,
      activeTenants7d,
      billingEnabled,
      revenue,
    ] = await Promise.all([
      this.getMspStats(),
      this.getTenantStats(),
      this.getDemoTenantCount(),
      this.getActiveTenants7d(),
      this.isBillingEnabled(),
      this.getRevenueStats(),
    ]);

    return {
      mspCount: mspStats.mspCount,
      mspPendingCount: mspStats.mspPendingCount,
      mspByStatus: mspStats.mspByStatus,
      tenantCount: tenantStats,
      activeTenants7d,
      monthlyRevenueCents: revenue.monthlyRevenueCents,
      prevMonthRevenueCents: revenue.prevMonthRevenueCents,
      billingEnabled,
      demoTenantCount,
      timestamp: new Date().toISOString(),
    };
  }

  private statNumber(value: number, available = true): DashboardStatNumberDto {
    return { value, available };
  }

  private statNullable(
    value: number | null,
    available: boolean,
  ): DashboardStatNullableNumberDto {
    return { value, available };
  }

  private async getMspStats(): Promise<{
    mspCount: DashboardStatNumberDto;
    mspPendingCount: DashboardStatNumberDto;
    mspByStatus: MspStatusCounts;
  }> {
    try {
      const rows = await this.tenantRepository
        .createQueryBuilder('t')
        .select('t.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('t.tier = :tier', { tier: 'msp' })
        .groupBy('t.status')
        .getRawMany<{ status: TenantStatus; count: string }>();

      const byStatus: MspStatusCounts = {
        active: 0,
        suspended: 0,
        cancelled: 0,
      };

      for (const row of rows) {
        if (row.status in byStatus) {
          byStatus[row.status] = parseInt(row.count, 10) || 0;
        }
      }

      const total = byStatus.active + byStatus.suspended + byStatus.cancelled;
      const pending = byStatus.suspended + byStatus.cancelled;

      return {
        mspCount: this.statNumber(total),
        mspPendingCount: this.statNumber(pending),
        mspByStatus: byStatus,
      };
    } catch (error) {
      this.logger.warn(
        `MSP stats query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        mspCount: this.statNumber(0, false),
        mspPendingCount: this.statNumber(0, false),
        mspByStatus: { active: 0, suspended: 0, cancelled: 0 },
      };
    }
  }

  private async getTenantStats(): Promise<
    AdminDashboardStatsResponseDto['tenantCount']
  > {
    try {
      const tierRows = await this.tenantRepository
        .createQueryBuilder('t')
        .select('t.tier', 'tier')
        .addSelect('COUNT(*)', 'count')
        .groupBy('t.tier')
        .getRawMany<{ tier: TenantTier; count: string }>();

      const byTier: TenantTierCounts = {
        home: 0,
        enterprise: 0,
        msp: 0,
      };

      for (const row of tierRows) {
        if (row.tier in byTier) {
          byTier[row.tier] = parseInt(row.count, 10) || 0;
        }
      }

      const total = byTier.home + byTier.enterprise + byTier.msp;

      const mspClientsRow = await this.tenantRepository
        .createQueryBuilder('t')
        .select('COUNT(*)', 'count')
        .where('t.managed_by_msp_id IS NOT NULL')
        .getRawOne<{ count: string }>();

      const mspClients = parseInt(mspClientsRow?.count ?? '0', 10) || 0;

      return {
        total: this.statNumber(total),
        byTier,
        mspClients: this.statNumber(mspClients),
      };
    } catch (error) {
      this.logger.warn(
        `Tenant stats query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        total: this.statNumber(0, false),
        byTier: { home: 0, enterprise: 0, msp: 0 },
        mspClients: this.statNumber(0, false),
      };
    }
  }

  private async getDemoTenantCount(): Promise<DashboardStatNumberDto> {
    try {
      const row = await this.tenantRepository
        .createQueryBuilder('t')
        .select('COUNT(*)', 'count')
        .where("t.slug = 'demo'")
        .orWhere("(t.settings->>'demo') = 'true'")
        .getRawOne<{ count: string }>();

      return this.statNumber(parseInt(row?.count ?? '0', 10) || 0);
    } catch (error) {
      this.logger.warn(
        `Demo tenant count failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return this.statNumber(0, false);
    }
  }

  private async getActiveTenants7d(): Promise<DashboardStatNumberDto> {
    const count = await this.clickhouseService.queryScalarNumber(`
      SELECT uniqExact(tenant_id) AS active_tenants
      FROM query_logs
      WHERE timestamp >= now() - INTERVAL 7 DAY
    `);

    if (count === null) {
      return this.statNumber(0, false);
    }

    return this.statNumber(count);
  }

  private async isBillingEnabled(): Promise<boolean> {
    const subscriptionCount = await this.subscriptionRepository.count();
    return subscriptionCount > 0;
  }

  private async getRevenueStats(): Promise<{
    monthlyRevenueCents: DashboardStatNullableNumberDto;
    prevMonthRevenueCents: DashboardStatNullableNumberDto;
  }> {
    const billingEnabled = await this.isBillingEnabled();

    if (!billingEnabled) {
      return {
        monthlyRevenueCents: this.statNullable(null, true),
        prevMonthRevenueCents: this.statNullable(null, true),
      };
    }

    try {
      const [currentMonth, previousMonth] = await Promise.all([
        this.sumPaidMspInvoiceRevenueCents('current'),
        this.sumPaidMspInvoiceRevenueCents('previous'),
      ]);

      return {
        monthlyRevenueCents: this.statNullable(currentMonth, true),
        prevMonthRevenueCents: this.statNullable(previousMonth, true),
      };
    } catch (error) {
      this.logger.warn(
        `Revenue stats failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        monthlyRevenueCents: this.statNullable(null, false),
        prevMonthRevenueCents: this.statNullable(null, false),
      };
    }
  }

  /**
   * Sum paid MSP invoice totals for a calendar month in America/Chicago.
   */
  async sumPaidMspInvoiceRevenueCents(
    which: 'current' | 'previous',
  ): Promise<number> {
    const offset = which === 'current' ? 0 : 1;

    const row = await this.mspInvoiceRepository
      .createQueryBuilder('inv')
      .select('COALESCE(SUM(inv.total), 0)', 'total')
      .where('inv.status = :status', { status: 'paid' })
      .andWhere(
        `date_trunc('month', inv.paid_at AT TIME ZONE '${CHICAGO_TZ}') = date_trunc('month', (now() AT TIME ZONE '${CHICAGO_TZ}') - INTERVAL '${offset} month')`,
      )
      .getRawOne<{ total: string }>();

    const dollars = parseFloat(row?.total ?? '0') || 0;
    return Math.round(dollars * 100);
  }
}
