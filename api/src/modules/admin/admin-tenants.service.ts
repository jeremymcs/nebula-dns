// Flux Shield - Admin tenant management service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Tenant,
  TenantSettings,
} from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { AgentInstallation } from '../agents/entities/agent-installation.entity';
import { Location } from '../locations/entities/location.entity';
import { LimitsService } from '../limits/limits.service';
import { ClickHouseService } from '../clickhouse/clickhouse.service';
import { AdminActivityService } from './admin-activity.service';
import { AdminActivityAction } from './entities/admin-activity-log.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AuditAction,
  AuditResourceType,
} from '../audit-logs/entities/audit-log.entity';
import { ADMIN_PLATFORM_TENANT_ID } from './constants/admin-audit.constants';
import {
  AdminTenantActionResponseDto,
  AdminTenantDetailDto,
  AdminTenantListQueryDto,
  AdminTenantListResponseDto,
  MspUsageTimeSeriesResponseDto,
  TenantProductModulesDto,
  UpdateTenantLimitsDto,
  UpdateTenantModulesDto,
} from './dto/admin-tenant.dto';
import { MetricPeriod } from './dto/msp-detail.dto';
import { AdminUser } from './dto/admin-jwt-payload.dto';

@Injectable()
export class AdminTenantsService {
  private readonly logger = new Logger(AdminTenantsService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AgentInstallation)
    private readonly agentRepository: Repository<AgentInstallation>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    private readonly limitsService: LimitsService,
    private readonly clickhouseService: ClickHouseService,
    private readonly adminActivityService: AdminActivityService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async listTenants(
    query: AdminTenantListQueryDto,
  ): Promise<AdminTenantListResponseDto> {
    const limit = query.limit ?? 25;
    const offset = query.cursor ? parseInt(query.cursor, 10) : 0;

    const qb = this.tenantRepository
      .createQueryBuilder('tenant')
      .leftJoin('tenant.managedByMsp', 'msp')
      .addSelect(['msp.id', 'msp.name'])
      .orderBy('tenant.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('tenant.status = :status', { status: query.status });
    }
    if (query.plan) {
      qb.andWhere('tenant.plan = :plan', { plan: query.plan });
    }
    if (query.tier) {
      qb.andWhere('tenant.tier = :tier', { tier: query.tier });
    }
    if (query.mspId) {
      qb.andWhere(
        '(tenant.managedByMspId = :mspId OR tenant.id = :mspId)',
        { mspId: query.mspId },
      );
    }
    if (query.q) {
      const q = query.q.trim();
      if (this.isUuid(q)) {
        qb.andWhere('tenant.id = :id', { id: q });
      } else if (q.includes('@')) {
        qb.andWhere('tenant.contactEmail ILIKE :email', {
          email: `%${q}%`,
        });
      } else {
        qb.andWhere(
          '(tenant.name ILIKE :search OR tenant.slug ILIKE :search)',
          { search: `%${q}%` },
        );
      }
    }

    const total = await qb.getCount();
    const rows = await qb.skip(offset).take(limit + 1).getMany();
    const hasMore = rows.length > limit;
    const slice = rows.slice(0, limit);

    return {
      data: slice.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        plan: tenant.plan,
        tier: tenant.tier,
        contactEmail: tenant.contactEmail,
        managedByMspId: tenant.managedByMspId,
        managedByMspName: tenant.managedByMsp?.name ?? null,
        createdAt: tenant.createdAt.toISOString(),
      })),
      pagination: {
        cursor: hasMore ? String(offset + limit) : null,
        hasMore,
        total,
      },
    };
  }

  async getTenantDetail(tenantId: string): Promise<AdminTenantDetailDto> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      relations: ['managedByMsp'],
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.buildTenantDetail(tenant);
  }

  async suspendTenant(
    tenantId: string,
    admin: AdminUser,
    ipAddress?: string,
  ): Promise<AdminTenantActionResponseDto> {
    const tenant = await this.getTenantOrThrow(tenantId);
    if (tenant.status === 'suspended') {
      throw new BadRequestException('Tenant is already suspended');
    }

    const previousStatus = tenant.status;
    tenant.status = 'suspended';
    await this.tenantRepository.save(tenant);

    await this.recordTenantAdminAction({
      admin,
      ipAddress,
      action: 'tenant_suspended',
      tenant,
      metadata: { previousStatus },
      auditAction: 'update',
      auditNewValue: { status: 'suspended' },
    });

    return {
      success: true,
      message: 'Tenant suspended',
      tenant: await this.buildTenantDetail(tenant),
    };
  }

  async reactivateTenant(
    tenantId: string,
    admin: AdminUser,
    ipAddress?: string,
  ): Promise<AdminTenantActionResponseDto> {
    const tenant = await this.getTenantOrThrow(tenantId);
    if (tenant.status === 'active') {
      throw new BadRequestException('Tenant is already active');
    }
    if (tenant.status === 'cancelled') {
      throw new BadRequestException('Cancelled tenants cannot be reactivated');
    }

    tenant.status = 'active';
    await this.tenantRepository.save(tenant);

    await this.recordTenantAdminAction({
      admin,
      ipAddress,
      action: 'tenant_reactivated',
      tenant,
      metadata: { previousStatus: 'suspended' },
      auditAction: 'update',
      auditNewValue: { status: 'active' },
    });

    return {
      success: true,
      message: 'Tenant reactivated',
      tenant: await this.buildTenantDetail(tenant),
    };
  }

  async updateLimits(
    tenantId: string,
    dto: UpdateTenantLimitsDto,
    admin: AdminUser,
    ipAddress?: string,
  ): Promise<AdminTenantActionResponseDto> {
    const tenant = await this.getTenantOrThrow(tenantId);
    const oldValue = {
      locationLimit: tenant.locationLimit,
      clientLimit: tenant.clientLimit,
      plan: tenant.plan,
    };

    if (dto.locationLimit !== undefined) {
      tenant.locationLimit = dto.locationLimit;
    }
    if (dto.clientLimit !== undefined) {
      tenant.clientLimit = dto.clientLimit;
    }
    if (dto.plan !== undefined) {
      tenant.plan = dto.plan;
    }

    await this.tenantRepository.save(tenant);
    await this.limitsService.invalidateLimitsCache(tenantId);

    await this.recordTenantAdminAction({
      admin,
      ipAddress,
      action: 'tenant_limits_updated',
      tenant,
      metadata: { oldValue, newValue: dto },
      auditAction: 'update',
      auditNewValue: dto as Record<string, unknown>,
      auditOldValue: oldValue,
    });

    return {
      success: true,
      message: 'Tenant limits updated',
      tenant: await this.buildTenantDetail(tenant),
    };
  }

  async updateModules(
    tenantId: string,
    dto: UpdateTenantModulesDto,
    admin: AdminUser,
    ipAddress?: string,
  ): Promise<AdminTenantActionResponseDto> {
    const tenant = await this.getTenantOrThrow(tenantId);
    const settings: TenantSettings = { ...(tenant.settings || {}) };
    const modules = { ...(settings.productModules || {}) };

    if (dto.dnsFilter !== undefined) modules.dnsFilter = dto.dnsFilter;
    if (dto.dnsManagement !== undefined) {
      modules.dnsManagement = dto.dnsManagement;
    }
    if (dto.dmarc !== undefined) modules.dmarc = dto.dmarc;

    settings.productModules = modules;
    tenant.settings = settings;
    await this.tenantRepository.save(tenant);

    await this.recordTenantAdminAction({
      admin,
      ipAddress,
      action: 'tenant_modules_updated',
      tenant,
      metadata: { modules },
      auditAction: 'update',
      auditNewValue: modules,
    });

    return {
      success: true,
      message: 'Tenant modules updated',
      tenant: await this.buildTenantDetail(tenant),
    };
  }

  async getMspUsageTimeSeries(
    mspId: string,
    period: MetricPeriod = '7d',
  ): Promise<MspUsageTimeSeriesResponseDto> {
    const msp = await this.tenantRepository.findOne({ where: { id: mspId } });
    if (!msp) {
      throw new NotFoundException('Tenant not found');
    }
    if (msp.tier !== 'msp') {
      throw new BadRequestException('Tenant is not an MSP');
    }

    const clients = await this.tenantRepository.find({
      where: { managedByMspId: mspId },
      select: ['id'],
    });
    const tenantIds = [mspId, ...clients.map((c) => c.id)];

    const series = await this.clickhouseService.getAggregatedQueryTimeSeries(
      tenantIds,
      period === '24h' || period === '7d' || period === '30d' ? period : '7d',
    );

    return {
      data: series.data,
      period,
      isMockData: series.isMockData,
      analyticsAvailable: series.analyticsAvailable,
    };
  }

  private async buildTenantDetail(tenant: Tenant): Promise<AdminTenantDetailDto> {
    const limitsRaw = await this.limitsService.getTenantLimits(tenant.id);

    const [userCount, agentCount, locationCount, users] = await Promise.all([
      this.userRepository.count({ where: { tenantId: tenant.id } }),
      this.agentRepository.count({ where: { tenantId: tenant.id } }),
      this.locationRepository.count({ where: { tenantId: tenant.id } }),
      this.userRepository.find({
        where: { tenantId: tenant.id },
        order: { createdAt: 'DESC' },
        take: 10,
        select: ['id', 'email', 'name', 'role', 'createdAt'],
      }),
    ]);

    let usageStats = {
      totalQueries: 0,
      blockedQueries: 0,
    };
    const analyticsAvailable =
      this.clickhouseService.isHealthy() &&
      !this.clickhouseService.isUsingMockData();
    try {
      usageStats = await this.clickhouseService.getSummaryStats(
        tenant.id,
        '7d',
      );
    } catch (error) {
      this.logger.warn(
        `Usage stats unavailable for ${tenant.id}: ${(error as Error).message}`,
      );
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      plan: tenant.plan,
      tier: tenant.tier,
      contactEmail: tenant.contactEmail,
      managedByMspId: tenant.managedByMspId,
      managedByMspName: tenant.managedByMsp?.name ?? null,
      createdAt: tenant.createdAt.toISOString(),
      limits: {
        locationLimit: limitsRaw.locationLimit,
        clientLimit: limitsRaw.clientLimit,
        familyMemberLimit: limitsRaw.familyMemberLimit,
        tier: limitsRaw.tier,
        queriesPerMonth: limitsRaw.queriesPerMonth ?? null,
      },
      modules: this.resolveModules(tenant),
      userCount,
      agentCount,
      locationCount,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
      })),
      recentUsage: {
        totalQueries: Number(usageStats.totalQueries) || 0,
        blockedQueries: Number(usageStats.blockedQueries) || 0,
        period: '7d',
        isMockData: this.clickhouseService.isUsingMockData(),
        analyticsAvailable,
      },
    };
  }

  private resolveModules(tenant: Tenant): TenantProductModulesDto {
    const stored = tenant.settings?.productModules;
    const planDefaults = {
      dnsFilter: true,
      dnsManagement: tenant.tier !== 'home',
      dmarc: false,
    };
    return {
      dnsFilter: stored?.dnsFilter ?? planDefaults.dnsFilter,
      dnsManagement: stored?.dnsManagement ?? planDefaults.dnsManagement,
      dmarc: stored?.dmarc ?? planDefaults.dmarc,
    };
  }

  private async getTenantOrThrow(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      relations: ['managedByMsp'],
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  private async recordTenantAdminAction(params: {
    admin: AdminUser;
    ipAddress?: string;
    action: AdminActivityAction;
    tenant: Tenant;
    metadata?: Record<string, unknown>;
    auditAction: AuditAction;
    auditNewValue?: Record<string, unknown>;
    auditOldValue?: Record<string, unknown>;
  }): Promise<void> {
    await this.adminActivityService.log({
      adminId: params.admin.adminId,
      action: params.action,
      metadata: {
        tenantId: params.tenant.id,
        tenantName: params.tenant.name,
        ...params.metadata,
      },
      ipAddress: params.ipAddress,
    });

    await this.auditLogsService.log({
      tenantId: ADMIN_PLATFORM_TENANT_ID,
      userId: null,
      action: params.auditAction,
      resourceType: 'tenant' as AuditResourceType,
      resourceId: params.tenant.id,
      resourceName: params.tenant.name,
      oldValue: params.auditOldValue ?? null,
      newValue: {
        adminId: params.admin.adminId,
        adminEmail: params.admin.email,
        adminAction: params.action,
        ...(params.auditNewValue || {}),
      },
      ipAddress: params.ipAddress ?? null,
      metadata: params.metadata ?? null,
    });

    await this.auditLogsService.log({
      tenantId: params.tenant.id,
      userId: null,
      action: params.auditAction,
      resourceType: 'tenant',
      resourceId: params.tenant.id,
      resourceName: params.tenant.name,
      oldValue: params.auditOldValue ?? null,
      newValue: params.auditNewValue ?? null,
      ipAddress: params.ipAddress ?? null,
      metadata: {
        performedByAdminId: params.admin.adminId,
        adminAction: params.action,
      },
    });
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
