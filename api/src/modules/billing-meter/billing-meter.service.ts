// Nebula DNS - Billing Meter Service
// Handles Stripe metered billing for locations and MSP clients
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';

import { Subscription } from '../subscriptions/entities/subscription.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Location } from '../locations/entities/location.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  UsageType,
  UsageReportResultDto,
  MonthlyUsageResponseDto,
  UsageSummaryResponseDto,
} from './dto/usage-report.dto';

// Retry configuration for Stripe API calls
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

@Injectable()
export class BillingMeterService {
  private readonly logger = new Logger(BillingMeterService.name);
  private readonly stripe: Stripe | null;

  // Stripe Billing Meter event names (for the new Stripe Billing Meters API)
  private readonly locationMeterEventName: string;
  private readonly clientMeterEventName: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    private readonly auditLogsService: AuditLogsService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey);
      this.logger.log('Stripe client initialized for billing meter');
    } else {
      this.stripe = null;
      this.logger.warn(
        'Stripe not configured - metered billing features disabled',
      );
    }

    // Load meter event names from environment (for Stripe Billing Meters API)
    this.locationMeterEventName =
      this.configService.get<string>('STRIPE_METER_EVENT_LOCATION') ||
      'location_count';
    this.clientMeterEventName =
      this.configService.get<string>('STRIPE_METER_EVENT_CLIENT') ||
      'client_count';
  }

  /**
   * Check if Stripe is properly configured
   */
  isConfigured(): boolean {
    return this.stripe !== null;
  }

  /**
   * Report location usage to Stripe for a tenant (US-011)
   * Called after location create/delete operations
   */
  async reportLocationUsage(tenantId: string): Promise<UsageReportResultDto> {
    this.logger.debug(`Reporting location usage for tenant ${tenantId}`);

    try {
      // Get current location count for the tenant
      const locationCount = await this.locationRepository.count({
        where: { tenantId },
      });

      // Get tenant's subscription with Stripe info
      const subscription = await this.getSubscriptionForTenant(tenantId);

      if (!subscription?.stripeCustomerId) {
        this.logger.debug(
          `No Stripe customer found for tenant ${tenantId}, skipping usage report`,
        );
        return {
          success: true,
          quantity: locationCount,
          timestamp: new Date(),
        };
      }

      // Report usage to Stripe Billing Meter with retry logic
      const result = await this.reportMeterEventWithRetry(
        subscription.stripeCustomerId,
        locationCount,
        UsageType.LOCATION,
      );

      // Log billing event to audit log
      await this.logBillingEvent(
        tenantId,
        UsageType.LOCATION,
        locationCount,
        result.success,
        result.error,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to report location usage for tenant ${tenantId}`,
        error,
      );

      // Log failed billing event
      await this.logBillingEvent(
        tenantId,
        UsageType.LOCATION,
        0,
        false,
        error.message,
      );

      return {
        success: false,
        quantity: 0,
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Report client usage to Stripe for an MSP tenant (US-012)
   * Called after MSP client create/delete operations
   */
  async reportClientUsage(mspTenantId: string): Promise<UsageReportResultDto> {
    this.logger.debug(`Reporting client usage for MSP tenant ${mspTenantId}`);

    try {
      // Get current client count for the MSP tenant
      // Clients are tenants with managedByMspId pointing to this MSP
      const clientCount = await this.tenantRepository.count({
        where: { managedByMspId: mspTenantId },
      });

      // Get MSP tenant's subscription with Stripe info
      const subscription = await this.getSubscriptionForTenant(mspTenantId);

      if (!subscription?.stripeCustomerId) {
        this.logger.debug(
          `No Stripe customer found for MSP tenant ${mspTenantId}, skipping usage report`,
        );
        return {
          success: true,
          quantity: clientCount,
          timestamp: new Date(),
        };
      }

      // Report usage to Stripe Billing Meter with retry logic
      const result = await this.reportMeterEventWithRetry(
        subscription.stripeCustomerId,
        clientCount,
        UsageType.CLIENT,
      );

      // Log billing event to audit log
      await this.logBillingEvent(
        mspTenantId,
        UsageType.CLIENT,
        clientCount,
        result.success,
        result.error,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to report client usage for MSP tenant ${mspTenantId}`,
        error,
      );

      // Log failed billing event
      await this.logBillingEvent(
        mspTenantId,
        UsageType.CLIENT,
        0,
        false,
        error.message,
      );

      return {
        success: false,
        quantity: 0,
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Get usage summary for a tenant within a date range
   */
  async getUsageSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<UsageSummaryResponseDto[]> {
    const results: UsageSummaryResponseDto[] = [];

    // Get location count
    const locationCount = await this.locationRepository.count({
      where: { tenantId },
    });

    results.push({
      tenantId,
      type: UsageType.LOCATION,
      currentQuantity: locationCount,
      periodStart: startDate,
      periodEnd: endDate,
      totalReported: locationCount, // In set-based billing, reported = current
    });

    // Check if this is an MSP tenant and include client count
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (tenant?.tier === 'msp') {
      const clientCount = await this.tenantRepository.count({
        where: { managedByMspId: tenantId },
      });

      results.push({
        tenantId,
        type: UsageType.CLIENT,
        currentQuantity: clientCount,
        periodStart: startDate,
        periodEnd: endDate,
        totalReported: clientCount,
      });
    }

    return results;
  }

  /**
   * Get current month's usage for dashboard widget
   */
  async getCurrentMonthUsage(
    tenantId: string,
  ): Promise<MonthlyUsageResponseDto> {
    const now = new Date();

    // Get current counts
    const locationCount = await this.locationRepository.count({
      where: { tenantId },
    });

    // Check for MSP client count
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    let clientCount = 0;
    if (tenant?.tier === 'msp') {
      clientCount = await this.tenantRepository.count({
        where: { managedByMspId: tenantId },
      });
    }

    return {
      tenantId,
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      locationCount,
      clientCount,
      locationUsageReported: locationCount,
      clientUsageReported: clientCount,
    };
  }

  /**
   * Get subscription for a tenant
   */
  private async getSubscriptionForTenant(
    tenantId: string,
  ): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { tenantId },
    });
  }

  /**
   * Report a meter event to Stripe Billing Meters API with exponential backoff retry
   * Uses the new Stripe Billing Meters API (v2021+)
   */
  private async reportMeterEventWithRetry(
    stripeCustomerId: string,
    quantity: number,
    usageType: UsageType,
  ): Promise<UsageReportResultDto> {
    if (!this.stripe) {
      return {
        success: false,
        quantity,
        timestamp: new Date(),
        error: 'Stripe not configured',
      };
    }

    const eventName =
      usageType === UsageType.LOCATION
        ? this.locationMeterEventName
        : this.clientMeterEventName;

    let lastError: Error | null = null;
    const timestamp = Math.floor(Date.now() / 1000);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        this.logger.debug(
          `Reporting ${usageType} meter event: ${quantity} for customer ${stripeCustomerId} (attempt ${attempt}/${MAX_RETRIES})`,
        );

        // Use Stripe Billing Meters API to create a meter event
        const meterEvent = await this.stripe.billing.meterEvents.create({
          event_name: eventName,
          payload: {
            stripe_customer_id: stripeCustomerId,
            value: quantity.toString(),
          },
          timestamp,
        });

        this.logger.log(
          `Successfully reported ${usageType} meter event: ${quantity} (identifier: ${meterEvent.identifier})`,
        );

        return {
          success: true,
          usageRecordId: meterEvent.identifier,
          quantity,
          timestamp: new Date(timestamp * 1000),
        };
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Failed to report meter event (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`,
        );

        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          await this.sleep(delayMs);
        }
      }
    }

    return {
      success: false,
      quantity,
      timestamp: new Date(),
      error: lastError?.message || 'Unknown error',
    };
  }

  /**
   * Log billing event to audit log
   */
  private async logBillingEvent(
    tenantId: string,
    usageType: UsageType,
    quantity: number,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.auditLogsService.log({
        tenantId,
        action: 'create',
        resourceType: 'subscription',
        resourceName: `${usageType}_usage_report`,
        newValue: {
          usageType,
          quantity,
          success,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          billingEvent: true,
          usageType,
          quantity,
          success,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to log billing event to audit log: ${error.message}`,
      );
    }
  }

  /**
   * Helper to sleep for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
