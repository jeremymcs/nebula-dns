/**
 * Nebula DNS - MSP Service
 * Handles business logic for MSP user operations including context switching (US-007)
 * Updated to use the unified tier system (US-022, US-023)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantPlan } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Policy } from '../policies/entities/policy.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  ContextSwitchResponseDto,
  SwitchBackResponseDto,
} from './dto/context-switch.dto';

export interface CreateClientDto {
  name: string;
  slug?: string;
  plan?: TenantPlan;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  industry?: string;
  companySize?: string;
}

export interface UpdateClientDto {
  name?: string;
  plan?: TenantPlan;
  status?: 'active' | 'suspended';
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  industry?: string;
  companySize?: string;
}

export interface ClientOrganization {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  locationCount: number;
  userCount: number;
  policyCount: number;
  createdAt: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  industry?: string;
  companySize?: string;
}

@Injectable()
export class MspService {
  private readonly logger = new Logger(MspService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Get all client organizations for an MSP user with detailed stats
   * Uses the new tier-based system via managedByMspId
   */
  async getClientOrganizations(
    userId: string,
    tenantId: string,
  ): Promise<ClientOrganization[]> {
    // Get the user and their tenant
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Get the tenant to check if it's an MSP
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant || tenant.tier !== 'msp') {
      // Not an MSP user - return empty array
      return [];
    }

    // Get all organizations managed by this MSP tenant
    const organizations = await this.tenantRepository.find({
      where: { managedByMspId: tenantId },
      relations: ['locations', 'users'],
      order: { name: 'ASC' },
    });

    // Get policy counts for each organization
    const orgIds = organizations.map((org) => org.id);
    const policyCounts = await this.getPolicyCounts(orgIds);

    return organizations.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      plan: org.plan,
      locationCount: org.locations?.length || 0,
      userCount: org.users?.length || 0,
      policyCount: policyCounts.get(org.id) || 0,
      createdAt: org.createdAt.toISOString(),
    }));
  }

  /**
   * Get policy counts for multiple organizations
   */
  private async getPolicyCounts(
    tenantIds: string[],
  ): Promise<Map<string, number>> {
    if (tenantIds.length === 0) return new Map();

    const counts = await this.policyRepository
      .createQueryBuilder('policy')
      .select('policy.tenant_id', 'tenantId')
      .addSelect('COUNT(*)', 'count')
      .where('policy.tenant_id IN (:...tenantIds)', { tenantIds })
      .groupBy('policy.tenant_id')
      .getRawMany();

    const countMap = new Map<string, number>();
    for (const row of counts) {
      countMap.set(row.tenantId, parseInt(row.count, 10));
    }
    return countMap;
  }

  /**
   * Verify the current user has MSP access and return their MSP tenant ID
   * Uses the new tier-based system
   */
  private async verifyMspAccess(
    userId: string,
    tenantId: string,
  ): Promise<Tenant> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    if (tenant.tier !== 'msp') {
      throw new ForbiddenException(
        'Only MSP tier users can access this feature',
      );
    }

    return tenant;
  }

  /**
   * Create a new client organization
   * Uses the new tier-based system via managedByMspId
   */
  async createClient(
    userId: string,
    tenantId: string,
    dto: CreateClientDto,
  ): Promise<ClientOrganization> {
    const mspTenant = await this.verifyMspAccess(userId, tenantId);

    // Check client limit
    if (mspTenant.clientLimit !== null) {
      const clientCount = await this.tenantRepository.count({
        where: { managedByMspId: tenantId },
      });
      if (clientCount >= mspTenant.clientLimit) {
        throw new ForbiddenException(
          `Client limit reached (${mspTenant.clientLimit}). Please upgrade your plan.`,
        );
      }
    }

    // Generate slug from name if not provided
    const slug =
      dto.slug ||
      dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    // Check if slug already exists
    const existing = await this.tenantRepository.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException(
        `Organization with slug "${slug}" already exists`,
      );
    }

    const tenant = this.tenantRepository.create({
      managedByMspId: tenantId, // Link to MSP tenant
      name: dto.name,
      slug,
      plan: dto.plan || 'free',
      tier: 'enterprise', // MSP clients default to enterprise tier
      status: 'active',
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      address: dto.address,
      industry: dto.industry,
      companySize: dto.companySize,
    });

    const saved = await this.tenantRepository.save(tenant);

    return {
      id: saved.id,
      name: saved.name,
      slug: saved.slug,
      status: saved.status,
      plan: saved.plan,
      locationCount: 0,
      userCount: 0,
      policyCount: 0,
      createdAt: saved.createdAt.toISOString(),
      contactEmail: saved.contactEmail || undefined,
      contactPhone: saved.contactPhone || undefined,
      address: saved.address || undefined,
      industry: saved.industry || undefined,
      companySize: saved.companySize || undefined,
    };
  }

  /**
   * Get a single client organization by ID
   */
  async getClient(
    userId: string,
    tenantId: string,
    clientId: string,
  ): Promise<ClientOrganization> {
    await this.verifyMspAccess(userId, tenantId);

    const client = await this.tenantRepository.findOne({
      where: { id: clientId, managedByMspId: tenantId },
      relations: ['locations', 'users'],
    });

    if (!client) {
      throw new NotFoundException('Client organization not found');
    }

    const policyCounts = await this.getPolicyCounts([clientId]);

    return {
      id: client.id,
      name: client.name,
      slug: client.slug,
      status: client.status,
      plan: client.plan,
      locationCount: client.locations?.length || 0,
      userCount: client.users?.length || 0,
      policyCount: policyCounts.get(clientId) || 0,
      createdAt: client.createdAt.toISOString(),
      contactEmail: client.contactEmail || undefined,
      contactPhone: client.contactPhone || undefined,
      address: client.address || undefined,
      industry: client.industry || undefined,
      companySize: client.companySize || undefined,
    };
  }

  /**
   * Update a client organization
   */
  async updateClient(
    userId: string,
    tenantId: string,
    clientId: string,
    dto: UpdateClientDto,
  ): Promise<ClientOrganization> {
    await this.verifyMspAccess(userId, tenantId);

    const client = await this.tenantRepository.findOne({
      where: { id: clientId, managedByMspId: tenantId },
    });

    if (!client) {
      throw new NotFoundException('Client organization not found');
    }

    // Update fields
    if (dto.name) client.name = dto.name;
    if (dto.plan) client.plan = dto.plan;
    if (dto.status) client.status = dto.status;
    if (dto.contactEmail !== undefined) client.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) client.contactPhone = dto.contactPhone;
    if (dto.address !== undefined) client.address = dto.address;
    if (dto.industry !== undefined) client.industry = dto.industry;
    if (dto.companySize !== undefined) client.companySize = dto.companySize;

    await this.tenantRepository.save(client);

    return this.getClient(userId, tenantId, clientId);
  }

  /**
   * Delete a client organization
   */
  async deleteClient(
    userId: string,
    tenantId: string,
    clientId: string,
  ): Promise<void> {
    await this.verifyMspAccess(userId, tenantId);

    const client = await this.tenantRepository.findOne({
      where: { id: clientId, managedByMspId: tenantId },
    });

    if (!client) {
      throw new NotFoundException('Client organization not found');
    }

    await this.tenantRepository.remove(client);
  }

  /**
   * Switch to a different client organization
   * Returns new tokens scoped to the target organization
   */
  async switchOrganization(
    userId: string,
    currentTenantId: string,
    targetOrgId: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: any;
  }> {
    await this.verifyMspAccess(userId, currentTenantId);

    // Verify target org is managed by this MSP
    const targetOrg = await this.tenantRepository.findOne({
      where: { id: targetOrgId, managedByMspId: currentTenantId },
    });

    if (!targetOrg) {
      throw new ForbiddenException('Cannot switch to this organization');
    }

    // Get the user's info
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Generate new tokens for the target organization
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: targetOrgId,
      role: user.role,
      mfaVerified: false,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
    });

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        type: 'refresh',
        jti: crypto.randomUUID(),
        mfaVerified: false,
      },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: targetOrgId,
        tenantName: targetOrg.name,
      },
    };
  }

  /**
   * Switch into a client's context (US-007)
   * Returns a new JWT scoped to the client tenant with MSP claims for attribution
   */
  async switchToClient(
    userId: string,
    mspTenantId: string,
    clientId: string,
    ipAddress?: string,
  ): Promise<ContextSwitchResponseDto> {
    // Verify the MSP tenant exists and is an MSP tier
    const mspTenant = await this.tenantRepository.findOne({
      where: { id: mspTenantId },
    });

    if (!mspTenant) {
      throw new ForbiddenException('MSP tenant not found');
    }

    if (mspTenant.tier !== 'msp') {
      throw new ForbiddenException(
        'Only MSP tier tenants can switch to client context',
      );
    }

    // Get the user's info
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Verify client belongs to this MSP using managedByMspId relationship
    const client = await this.tenantRepository.findOne({
      where: { id: clientId, managedByMspId: mspTenantId },
    });

    if (!client) {
      throw new NotFoundException('Client not found or not owned by this MSP');
    }

    // Generate new JWT with client tenantId and MSP context claims
    const jti = crypto.randomUUID();
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: client.id, // Client's tenant ID
      role: 'admin', // MSP users get admin access to client tenant
      jti,
      mfaVerified: true, // Preserve MFA status from MSP session
      // MSP context switch claims (US-007)
      mspParentTenantId: mspTenantId, // Original MSP tenant ID
      mspUserId: user.id, // Original MSP user ID for attribution
      tier: client.tier, // Client's tier
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
    });

    // Log audit event for context switch
    await this.auditLogsService.log({
      tenantId: mspTenantId, // Log under MSP tenant
      userId: user.id,
      action: 'msp_context_switch',
      resourceType: 'tenant',
      resourceId: client.id,
      resourceName: client.name,
      ipAddress: ipAddress || null,
      metadata: {
        direction: 'switch_to_client',
        clientTenantId: client.id,
        clientName: client.name,
        clientTier: client.tier,
        mspTenantId: mspTenantId,
      },
    });

    this.logger.log(
      `MSP user ${user.id} switched to client context: ${client.name} (${client.id})`,
    );

    return {
      accessToken,
      clientName: client.name,
      clientTenantId: client.id,
      tier: client.tier,
    };
  }

  /**
   * Switch back from client context to original MSP tenant (US-007)
   * Extracts mspParentTenantId from current JWT to return to MSP context
   */
  async switchBackToMsp(
    userId: string,
    currentTenantId: string,
    mspParentTenantId: string,
    ipAddress?: string,
  ): Promise<SwitchBackResponseDto> {
    // Validate we have the MSP parent tenant ID (must be in switched context)
    if (!mspParentTenantId) {
      throw new BadRequestException(
        'Not in a switched client context. No MSP parent tenant found.',
      );
    }

    // Get the MSP tenant
    const mspTenant = await this.tenantRepository.findOne({
      where: { id: mspParentTenantId },
    });

    if (!mspTenant) {
      throw new NotFoundException('MSP tenant not found');
    }

    if (mspTenant.tier !== 'msp') {
      throw new ForbiddenException('Parent tenant is not an MSP tier');
    }

    // Get the user's info
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Get the current client tenant for audit logging
    const currentClient = await this.tenantRepository.findOne({
      where: { id: currentTenantId },
    });

    // Generate new JWT for MSP tenant (no MSP context claims)
    const jti = crypto.randomUUID();
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: mspTenant.id, // Back to MSP tenant ID
      role: user.role, // Restore original role
      jti,
      mfaVerified: true, // Preserve MFA status
      // No MSP context claims - back to normal MSP context
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
    });

    // Log audit event for switch back
    await this.auditLogsService.log({
      tenantId: mspParentTenantId, // Log under MSP tenant
      userId: user.id,
      action: 'msp_context_switch',
      resourceType: 'tenant',
      resourceId: mspTenant.id,
      resourceName: mspTenant.name,
      ipAddress: ipAddress || null,
      metadata: {
        direction: 'switch_back_to_msp',
        previousClientTenantId: currentTenantId,
        previousClientName: currentClient?.name || 'Unknown',
        mspTenantId: mspTenant.id,
      },
    });

    this.logger.log(
      `MSP user ${user.id} switched back to MSP context: ${mspTenant.name} (${mspTenant.id})`,
    );

    return {
      accessToken,
      mspName: mspTenant.name,
      mspTenantId: mspTenant.id,
    };
  }

  /**
   * Verify if the current user is in a switched client context
   */
  isInSwitchedContext(user: any): boolean {
    return !!user.mspParentTenantId;
  }

  /**
   * Get MSP context info from current user
   */
  getMspContextInfo(user: any): {
    isInSwitchedContext: boolean;
    mspParentTenantId?: string;
    mspUserId?: string;
    clientTier?: string;
  } {
    return {
      isInSwitchedContext: !!user.mspParentTenantId,
      mspParentTenantId: user.mspParentTenantId,
      mspUserId: user.mspUserId,
      clientTier: user.tier,
    };
  }
}
