/**
 * Nebula DNS - MSP Service
 * Handles business logic for MSP user operations
 */

import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantPlan } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { PartnerUser } from '../partners/entities/partner-user.entity';
import { Policy } from '../policies/entities/policy.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

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
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PartnerUser)
    private readonly partnerUserRepository: Repository<PartnerUser>,
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get all client organizations for an MSP user with detailed stats
   */
  async getClientOrganizations(userId: string, tenantId: string): Promise<ClientOrganization[]> {
    // Get the user to check their email
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Check if this user's email matches a partner user
    const partnerUser = await this.partnerUserRepository.findOne({
      where: { email: user.email, status: 'active' },
    });

    let partnerId: string | null = null;

    if (partnerUser) {
      partnerId = partnerUser.partnerId;
    } else {
      // Check if their current tenant belongs to a partner
      const currentTenant = await this.tenantRepository.findOne({
        where: { id: tenantId },
      });
      
      if (currentTenant?.partnerId) {
        partnerId = currentTenant.partnerId;
      }
    }

    if (!partnerId) {
      // Not an MSP user - return empty array
      return [];
    }

    // Get all organizations for this partner with relations
    const organizations = await this.tenantRepository.find({
      where: { partnerId },
      relations: ['locations', 'users'],
      order: { name: 'ASC' },
    });

    // Get policy counts for each organization
    const orgIds = organizations.map(org => org.id);
    const policyCounts = await this.getPolicyCounts(orgIds);

    return organizations.map(org => ({
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
  private async getPolicyCounts(tenantIds: string[]): Promise<Map<string, number>> {
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
   * Get partner ID for the current user
   */
  private async getPartnerId(userId: string, tenantId: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const partnerUser = await this.partnerUserRepository.findOne({
      where: { email: user.email, status: 'active' },
    });

    if (partnerUser) {
      return partnerUser.partnerId;
    }

    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (tenant?.partnerId) {
      return tenant.partnerId;
    }

    throw new ForbiddenException('Not an MSP user');
  }

  /**
   * Create a new client organization
   */
  async createClient(userId: string, tenantId: string, dto: CreateClientDto): Promise<ClientOrganization> {
    const partnerId = await this.getPartnerId(userId, tenantId);

    // Generate slug from name if not provided
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if slug already exists
    const existing = await this.tenantRepository.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Organization with slug "${slug}" already exists`);
    }

    const tenant = this.tenantRepository.create({
      partnerId,
      name: dto.name,
      slug,
      plan: dto.plan || 'free',
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
  async getClient(userId: string, tenantId: string, clientId: string): Promise<ClientOrganization> {
    const partnerId = await this.getPartnerId(userId, tenantId);

    const client = await this.tenantRepository.findOne({
      where: { id: clientId, partnerId },
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
  async updateClient(userId: string, tenantId: string, clientId: string, dto: UpdateClientDto): Promise<ClientOrganization> {
    const partnerId = await this.getPartnerId(userId, tenantId);

    const client = await this.tenantRepository.findOne({
      where: { id: clientId, partnerId },
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
  async deleteClient(userId: string, tenantId: string, clientId: string): Promise<void> {
    const partnerId = await this.getPartnerId(userId, tenantId);

    const client = await this.tenantRepository.findOne({
      where: { id: clientId, partnerId },
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
  async switchOrganization(userId: string, currentTenantId: string, targetOrgId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: any;
  }> {
    const partnerId = await this.getPartnerId(userId, currentTenantId);

    // Verify target org belongs to the same partner
    const targetOrg = await this.tenantRepository.findOne({
      where: { id: targetOrgId, partnerId },
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
      { sub: user.id, type: 'refresh', jti: crypto.randomUUID(), mfaVerified: false },
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
}

