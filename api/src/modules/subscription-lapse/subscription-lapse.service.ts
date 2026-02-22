// Nebula DNS - Subscription Lapse Service
// Core business logic for handling MSP subscription lapses (US-028, US-029)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Tenant, SubscriptionStatus } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { MspClient } from '../msp-clients/entities/msp-client.entity';
import { EmailService } from '../email/email.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RedisService } from '../redis/redis.service';

export interface GracePeriodInfo {
  tenantId: string;
  tenantName: string;
  subscriptionStatus: SubscriptionStatus;
  graceStartDate: Date | null;
  daysRemaining: number | null;
  mspName?: string;
  mspContactEmail?: string;
  mspSupportUrl?: string;
}

export interface MspManagedInfo {
  isMspManaged: boolean;
  mspName?: string;
  mspDisplayName?: string;
  mspContactEmail?: string;
  mspSupportUrl?: string;
}

@Injectable()
export class SubscriptionLapseService {
  private readonly logger = new Logger(SubscriptionLapseService.name);
  private readonly GRACE_PERIOD_DAYS = 30;
  private readonly NOTIFICATION_DAYS = [1, 7, 14, 21, 28];

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(MspClient)
    private readonly mspClientRepository: Repository<MspClient>,
    private readonly emailService: EmailService,
    private readonly auditLogsService: AuditLogsService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get MSP managed info for a tenant (US-027)
   * Returns information about the MSP managing this tenant for display in UI
   */
  async getMspManagedInfo(tenantId: string): Promise<MspManagedInfo> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      relations: ['managedByMsp'],
    });

    if (!tenant || !tenant.managedByMspId) {
      return { isMspManaged: false };
    }

    const mspTenant = tenant.managedByMsp;
    if (!mspTenant) {
      return { isMspManaged: false };
    }

    // Get MSP settings for display name and support URL
    const mspSettings = mspTenant.settings as {
      mspDisplayName?: string;
      mspSupportUrl?: string;
    } | null;

    return {
      isMspManaged: true,
      mspName: mspTenant.name,
      mspDisplayName: mspSettings?.mspDisplayName || mspTenant.name,
      mspContactEmail: mspTenant.contactEmail || undefined,
      mspSupportUrl: mspSettings?.mspSupportUrl || undefined,
    };
  }

  /**
   * Get grace period info for a tenant (US-028)
   */
  async getGracePeriodInfo(tenantId: string): Promise<GracePeriodInfo> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      relations: ['managedByMsp'],
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const graceStartDate = await this.getGraceStartDate(tenantId);
    let daysRemaining: number | null = null;

    if (tenant.subscriptionStatus === 'grace' && graceStartDate) {
      const endDate = new Date(graceStartDate);
      endDate.setDate(endDate.getDate() + this.GRACE_PERIOD_DAYS);
      daysRemaining = Math.max(
        0,
        Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      );
    }

    const mspInfo = tenant.managedByMsp;

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      subscriptionStatus: tenant.subscriptionStatus,
      graceStartDate,
      daysRemaining,
      mspName: mspInfo?.name,
      mspContactEmail: mspInfo?.contactEmail || undefined,
      mspSupportUrl: (mspInfo?.settings as any)?.mspSupportUrl,
    };
  }

  /**
   * Start grace period for an MSP tenant (US-028)
   * Called when MSP subscription status changes to 'past_due'
   */
  async startGracePeriod(mspTenantId: string): Promise<void> {
    const mspTenant = await this.tenantRepository.findOne({
      where: { id: mspTenantId },
    });

    if (!mspTenant) {
      throw new NotFoundException(`MSP Tenant ${mspTenantId} not found`);
    }

    if (mspTenant.tier !== 'msp') {
      this.logger.warn(`Tenant ${mspTenantId} is not an MSP tier`);
      return;
    }

    // Check if already in grace period
    const existingGraceStart = await this.getGraceStartDate(mspTenantId);
    if (existingGraceStart) {
      this.logger.log(`MSP ${mspTenantId} already in grace period`);
      return;
    }

    // Set grace start date in Redis
    const graceStartDate = new Date();
    await this.setGraceStartDate(mspTenantId, graceStartDate);

    // Update MSP tenant status to grace
    mspTenant.subscriptionStatus = 'grace';
    await this.tenantRepository.save(mspTenant);

    // Update all client tenants to grace status
    await this.updateClientTenantsStatus(mspTenantId, 'grace');

    // Log audit event
    await this.auditLogsService.log({
      tenantId: mspTenantId,
      action: 'subscription_grace_period_started',
      resourceType: 'tenant',
      resourceId: mspTenantId,
      resourceName: mspTenant.name,
      metadata: {
        graceStartDate: graceStartDate.toISOString(),
        gracePeriodDays: this.GRACE_PERIOD_DAYS,
      },
    });

    this.logger.log(
      `Started ${this.GRACE_PERIOD_DAYS}-day grace period for MSP ${mspTenantId}`,
    );

    // Send initial grace period notification
    await this.sendGracePeriodNotification(mspTenantId, this.GRACE_PERIOD_DAYS);
  }

  /**
   * Check and process expired grace periods (US-028, US-029)
   * Called by daily cron job
   */
  async processExpiredGracePeriods(): Promise<void> {
    // Find all MSP tenants in grace period
    const mspTenantsInGrace = await this.tenantRepository.find({
      where: {
        tier: 'msp',
        subscriptionStatus: 'grace',
      },
    });

    for (const mspTenant of mspTenantsInGrace) {
      const graceStartDate = await this.getGraceStartDate(mspTenant.id);
      if (!graceStartDate) {
        // No grace start date found, fix the inconsistency
        await this.setGraceStartDate(mspTenant.id, new Date());
        continue;
      }

      const daysSinceStart = Math.floor(
        (Date.now() - graceStartDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceStart >= this.GRACE_PERIOD_DAYS) {
        // Grace period expired - suspend the MSP and all clients
        await this.suspendMspAndClients(mspTenant.id);
      } else {
        // Check if we need to send a notification today
        const daysRemaining = this.GRACE_PERIOD_DAYS - daysSinceStart;
        if (this.NOTIFICATION_DAYS.includes(daysRemaining)) {
          await this.sendGracePeriodNotification(mspTenant.id, daysRemaining);
        }
      }
    }
  }

  /**
   * Suspend MSP and all client tenants (US-028, US-029)
   */
  async suspendMspAndClients(mspTenantId: string): Promise<void> {
    const mspTenant = await this.tenantRepository.findOne({
      where: { id: mspTenantId },
    });

    if (!mspTenant) {
      return;
    }

    // Update MSP tenant status
    mspTenant.subscriptionStatus = 'suspended';
    await this.tenantRepository.save(mspTenant);

    // Update all client tenants to suspended
    await this.updateClientTenantsStatus(mspTenantId, 'suspended');

    // Invalidate policy cache for all affected tenants to trigger DNS cutoff
    await this.invalidatePolicyCacheForMsp(mspTenantId);

    // Log audit event
    await this.auditLogsService.log({
      tenantId: mspTenantId,
      action: 'subscription_suspended',
      resourceType: 'tenant',
      resourceId: mspTenantId,
      resourceName: mspTenant.name,
      metadata: {
        reason: 'grace_period_expired',
        gracePeriodDays: this.GRACE_PERIOD_DAYS,
      },
    });

    this.logger.warn(
      `MSP ${mspTenantId} and all clients suspended after grace period`,
    );

    // Send suspension notification
    await this.sendSuspensionNotification(mspTenantId);
  }

  /**
   * Restore MSP and all client tenants after subscription renewal (US-029)
   */
  async restoreSubscription(mspTenantId: string): Promise<void> {
    const mspTenant = await this.tenantRepository.findOne({
      where: { id: mspTenantId },
    });

    if (!mspTenant) {
      throw new NotFoundException(`MSP Tenant ${mspTenantId} not found`);
    }

    // Clear grace start date
    await this.clearGraceStartDate(mspTenantId);

    // Update MSP tenant status
    mspTenant.subscriptionStatus = 'active';
    await this.tenantRepository.save(mspTenant);

    // Update all client tenants to active
    await this.updateClientTenantsStatus(mspTenantId, 'active');

    // Invalidate policy cache for immediate restoration
    await this.invalidatePolicyCacheForMsp(mspTenantId);

    // Log audit event
    await this.auditLogsService.log({
      tenantId: mspTenantId,
      action: 'subscription_restored',
      resourceType: 'tenant',
      resourceId: mspTenantId,
      resourceName: mspTenant.name,
      metadata: {
        previousStatus: 'suspended',
      },
    });

    this.logger.log(`MSP ${mspTenantId} subscription restored`);
  }

  /**
   * Manually extend grace period (admin function) (US-028)
   */
  async extendGracePeriod(
    mspTenantId: string,
    additionalDays: number,
    adminUserId: string,
  ): Promise<void> {
    const mspTenant = await this.tenantRepository.findOne({
      where: { id: mspTenantId },
    });

    if (!mspTenant) {
      throw new NotFoundException(`MSP Tenant ${mspTenantId} not found`);
    }

    const currentGraceStart = await this.getGraceStartDate(mspTenantId);
    if (!currentGraceStart) {
      throw new Error('Tenant is not in grace period');
    }

    // Extend by moving the grace start date forward
    const newGraceStart = new Date(currentGraceStart);
    newGraceStart.setDate(newGraceStart.getDate() + additionalDays);
    await this.setGraceStartDate(mspTenantId, newGraceStart);

    // If tenant was suspended, move back to grace
    if (mspTenant.subscriptionStatus === 'suspended') {
      mspTenant.subscriptionStatus = 'grace';
      await this.tenantRepository.save(mspTenant);
      await this.updateClientTenantsStatus(mspTenantId, 'grace');
      await this.invalidatePolicyCacheForMsp(mspTenantId);
    }

    // Log audit event
    await this.auditLogsService.log({
      tenantId: mspTenantId,
      userId: adminUserId,
      action: 'grace_period_extended',
      resourceType: 'tenant',
      resourceId: mspTenantId,
      resourceName: mspTenant.name,
      metadata: {
        additionalDays,
        newGraceStart: newGraceStart.toISOString(),
      },
    });

    this.logger.log(
      `Grace period extended by ${additionalDays} days for MSP ${mspTenantId}`,
    );
  }

  /**
   * Check if tenant's subscription is active (US-029)
   * Used by policy service to determine if DNS should be blocked
   */
  async isSubscriptionActive(tenantId: string): Promise<boolean> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: ['subscriptionStatus'],
    });

    if (!tenant) {
      return false;
    }

    return (
      tenant.subscriptionStatus === 'active' ||
      tenant.subscriptionStatus === 'grace'
    );
  }

  /**
   * Get subscription status for policy service (US-029)
   */
  async getSubscriptionStatus(tenantId: string): Promise<{
    status: SubscriptionStatus;
    canResolve: boolean;
  }> {
    // Try Redis cache first
    const cached = await this.redisService.get(
      `subscription_status:${tenantId}`,
    );
    if (cached) {
      const status = cached as SubscriptionStatus;
      return {
        status,
        canResolve: status !== 'suspended',
      };
    }

    // Fetch from database
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: ['subscriptionStatus'],
    });

    if (!tenant) {
      return { status: 'suspended', canResolve: false };
    }

    // Cache for 5 minutes
    await this.redisService.set(
      `subscription_status:${tenantId}`,
      tenant.subscriptionStatus,
      300,
    );

    return {
      status: tenant.subscriptionStatus,
      canResolve: tenant.subscriptionStatus !== 'suspended',
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private async getGraceStartDate(tenantId: string): Promise<Date | null> {
    const value = await this.redisService.get(`grace_start:${tenantId}`);
    return value ? new Date(value) : null;
  }

  private async setGraceStartDate(tenantId: string, date: Date): Promise<void> {
    // Store with 45-day TTL (grace period + buffer)
    await this.redisService.set(
      `grace_start:${tenantId}`,
      date.toISOString(),
      45 * 24 * 60 * 60,
    );
  }

  private async clearGraceStartDate(tenantId: string): Promise<void> {
    await this.redisService.del(`grace_start:${tenantId}`);
    await this.redisService.del(`subscription_status:${tenantId}`);
  }

  private async updateClientTenantsStatus(
    mspTenantId: string,
    status: SubscriptionStatus,
  ): Promise<void> {
    // Find all client tenants managed by this MSP
    const mspClients = await this.mspClientRepository.find({
      where: { mspTenantId },
    });

    const clientTenantIds = mspClients.map((c) => c.clientTenantId);

    if (clientTenantIds.length === 0) {
      return;
    }

    // Update all client tenants
    await this.tenantRepository.update(
      { id: In(clientTenantIds) },
      { subscriptionStatus: status },
    );

    // Clear cached status for all clients
    for (const clientId of clientTenantIds) {
      await this.redisService.del(`subscription_status:${clientId}`);
    }

    this.logger.log(
      `Updated ${clientTenantIds.length} client tenants to status: ${status}`,
    );
  }

  private async invalidatePolicyCacheForMsp(
    mspTenantId: string,
  ): Promise<void> {
    // Publish invalidation message to Redis pub/sub
    const message = JSON.stringify({
      type: 'subscription_status',
      mspTenantId,
    });
    await this.redisService.publish('nebula:invalidate', message);
  }

  private async sendGracePeriodNotification(
    mspTenantId: string,
    daysRemaining: number,
  ): Promise<void> {
    const mspTenant = await this.tenantRepository.findOne({
      where: { id: mspTenantId },
    });

    if (!mspTenant || !mspTenant.contactEmail) {
      return;
    }

    const frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:4001';

    // Send email to MSP
    await this.emailService.sendGracePeriodNotification({
      to: mspTenant.contactEmail,
      companyName: mspTenant.name,
      daysRemaining,
      updatePaymentUrl: `${frontendUrl}/dashboard/billing`,
    });

    // Also send to client admins if within notification days
    if (this.NOTIFICATION_DAYS.includes(daysRemaining)) {
      await this.notifyClientAdmins(mspTenantId, daysRemaining);
    }
  }

  private async notifyClientAdmins(
    mspTenantId: string,
    daysRemaining: number,
  ): Promise<void> {
    const mspTenant = await this.tenantRepository.findOne({
      where: { id: mspTenantId },
    });

    if (!mspTenant) {
      return;
    }

    // Get all client tenants
    const mspClients = await this.mspClientRepository.find({
      where: { mspTenantId },
      relations: ['clientTenant'],
    });

    for (const mspClient of mspClients) {
      const clientTenant = mspClient.clientTenant;
      if (!clientTenant) continue;

      // Find admin users for this client
      const admins = await this.userRepository.find({
        where: {
          tenantId: clientTenant.id,
          role: In(['owner', 'admin']),
          status: 'active',
        },
      });

      for (const admin of admins) {
        await this.emailService.sendClientGracePeriodNotification({
          to: admin.email,
          clientName: clientTenant.name,
          mspName: mspTenant.name,
          mspContactEmail: mspTenant.contactEmail || undefined,
          daysRemaining,
        });
      }
    }
  }

  private async sendSuspensionNotification(mspTenantId: string): Promise<void> {
    const mspTenant = await this.tenantRepository.findOne({
      where: { id: mspTenantId },
    });

    if (!mspTenant || !mspTenant.contactEmail) {
      return;
    }

    const frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:4001';

    await this.emailService.sendSuspensionNotification({
      to: mspTenant.contactEmail,
      companyName: mspTenant.name,
      updatePaymentUrl: `${frontendUrl}/dashboard/billing`,
    });
  }
}
