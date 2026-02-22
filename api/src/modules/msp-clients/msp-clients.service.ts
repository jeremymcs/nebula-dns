// Nebula DNS - MSP Clients Service
// Business logic for managing MSP-to-client tenant relationships (US-005, US-006)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MspClient } from './entities/msp-client.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateMspClientDto,
  UpdateMspClientDto,
  MspClientResponseDto,
  MspClientListResponseDto,
  MspClientQueryDto,
} from './dto/msp-client.dto';
import { LimitsService } from '../limits/limits.service';
import { BillingMeterService } from '../billing-meter/billing-meter.service';
import { MspTemplatesService } from '../msp/msp-templates.service';

@Injectable()
export class MspClientsService {
  private readonly logger = new Logger(MspClientsService.name);

  constructor(
    @InjectRepository(MspClient)
    private readonly mspClientRepository: Repository<MspClient>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly limitsService: LimitsService,
    private readonly billingMeterService: BillingMeterService,
    @Inject(forwardRef(() => MspTemplatesService))
    private readonly mspTemplatesService: MspTemplatesService,
  ) {}

  /**
   * Get all clients for an MSP tenant
   * @param mspTenantId The MSP tenant ID
   * @param query Optional query parameters for filtering and pagination
   */
  async findAllForMsp(
    mspTenantId: string,
    query?: MspClientQueryDto,
  ): Promise<MspClientListResponseDto> {
    // Verify MSP tenant exists and is an MSP tier
    await this.verifyMspTenant(mspTenantId);

    const page = query?.page || 1;
    const limit = query?.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.mspClientRepository
      .createQueryBuilder('mspClient')
      .leftJoinAndSelect('mspClient.clientTenant', 'clientTenant')
      .leftJoin('clientTenant.locations', 'locations')
      .leftJoin('clientTenant.users', 'users')
      .addSelect('COUNT(DISTINCT locations.id)', 'locationCount')
      .addSelect('COUNT(DISTINCT users.id)', 'userCount')
      .where('mspClient.mspTenantId = :mspTenantId', { mspTenantId })
      .groupBy('mspClient.id')
      .addGroupBy('clientTenant.id');

    // Apply status filter
    if (query?.status) {
      queryBuilder.andWhere('mspClient.status = :status', {
        status: query.status,
      });
    }

    // Apply search filter
    if (query?.search) {
      queryBuilder.andWhere(
        '(clientTenant.name ILIKE :search OR clientTenant.slug ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Get total count
    const totalQuery = this.mspClientRepository
      .createQueryBuilder('mspClient')
      .leftJoin('mspClient.clientTenant', 'clientTenant')
      .where('mspClient.mspTenantId = :mspTenantId', { mspTenantId });

    if (query?.status) {
      totalQuery.andWhere('mspClient.status = :status', {
        status: query.status,
      });
    }

    if (query?.search) {
      totalQuery.andWhere(
        '(clientTenant.name ILIKE :search OR clientTenant.slug ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const total = await totalQuery.getCount();

    // Apply pagination and ordering
    queryBuilder.orderBy('clientTenant.name', 'ASC').skip(skip).take(limit);

    const rawResults = await queryBuilder.getRawAndEntities();
    const mspClients = rawResults.entities;

    // Map raw results to get counts
    const countMap = new Map<
      string,
      { locationCount: number; userCount: number }
    >();
    for (const raw of rawResults.raw) {
      countMap.set(raw.mspClient_id, {
        locationCount: parseInt(raw.locationCount, 10) || 0,
        userCount: parseInt(raw.userCount, 10) || 0,
      });
    }

    const clients: MspClientResponseDto[] = mspClients.map((mc) => {
      const counts = countMap.get(mc.id) || { locationCount: 0, userCount: 0 };
      return this.toResponseDto(mc, counts.locationCount, counts.userCount);
    });

    // Get limits from LimitsService (US-006)
    const limits = await this.limitsService.getTenantLimits(mspTenantId);
    const clientLimit = limits.clientLimit;
    const remaining =
      clientLimit !== null ? Math.max(0, clientLimit - total) : null;

    return {
      clients,
      total,
      limit: clientLimit,
      remaining,
    };
  }

  /**
   * Get a specific MSP-client relationship
   * @param mspTenantId The MSP tenant ID
   * @param clientTenantId The client tenant ID
   */
  async findOne(
    mspTenantId: string,
    clientTenantId: string,
  ): Promise<MspClientResponseDto> {
    const mspClient = await this.mspClientRepository.findOne({
      where: { mspTenantId, clientTenantId },
      relations: [
        'clientTenant',
        'clientTenant.locations',
        'clientTenant.users',
      ],
    });

    if (!mspClient) {
      throw new NotFoundException(
        `Client ${clientTenantId} not found for MSP ${mspTenantId}`,
      );
    }

    const locationCount = mspClient.clientTenant?.locations?.length || 0;
    const userCount = mspClient.clientTenant?.users?.length || 0;

    return this.toResponseDto(mspClient, locationCount, userCount);
  }

  /**
   * Create a new client organization and link it to the MSP
   * Per US-006 acceptance criteria:
   * 1. Check client limit with LimitsService
   * 2. Create new tenant with tier='enterprise' and managedByMspId set
   * 3. Create admin user for client
   * 4. Create msp_clients junction record
   * 5. Optionally apply template policies
   *
   * @param mspTenantId The MSP tenant ID
   * @param dto Client creation data
   * @param creatorUserId Optional user ID for template application
   * @param creatorIp Optional IP address for audit logging
   */
  async create(
    mspTenantId: string,
    dto: CreateMspClientDto,
    creatorUserId?: string,
    creatorIp?: string,
  ): Promise<MspClientResponseDto> {
    // 1. Verify MSP tenant and check client limit using LimitsService
    await this.verifyMspTenant(mspTenantId);
    await this.limitsService.canCreateClient(mspTenantId);

    // Check if admin email is already in use
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.adminEmail.toLowerCase() },
    });
    if (existingUser) {
      throw new ConflictException(
        `Email ${dto.adminEmail} is already in use by another account`,
      );
    }

    // Generate slug from name if not provided
    const baseSlug =
      dto.slug ||
      dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    // Ensure slug is unique
    let slug = baseSlug;
    let counter = 1;
    while (await this.tenantRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 2. Create the client tenant with tier='enterprise' and managedByMspId set
      const clientTenant = queryRunner.manager.create(Tenant, {
        name: dto.name,
        slug,
        status: 'active',
        plan: dto.plan || 'pro',
        tier: 'enterprise', // Per US-006: clients are enterprise tier
        contactEmail: dto.adminEmail,
        contactPhone: dto.contactPhone,
        address: dto.address,
        industry: dto.industry,
        companySize: dto.companySize,
        managedByMspId: mspTenantId, // Set self-referential FK
        settings: {
          timezone: 'UTC',
          blockPageEnabled: true,
        },
      });

      const savedTenant = await queryRunner.manager.save(clientTenant);

      // 3. Create admin user for client
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      const adminUser = queryRunner.manager.create(User, {
        tenantId: savedTenant.id,
        email: dto.adminEmail.toLowerCase(),
        name: `${dto.name} Admin`,
        passwordHash: hashedPassword,
        role: 'owner',
        status: 'pending', // Requires password reset
      });

      await queryRunner.manager.save(adminUser);

      // 4. Create msp_clients junction record
      const mspClient = queryRunner.manager.create(MspClient, {
        mspTenantId,
        clientTenantId: savedTenant.id,
        status: 'active',
      });

      const savedMspClient = await queryRunner.manager.save(mspClient);

      await queryRunner.commitTransaction();

      // 5. Optionally apply template policies (outside transaction)
      if (dto.applyTemplateId && creatorUserId) {
        try {
          await this.mspTemplatesService.deploy(
            creatorUserId,
            mspTenantId,
            dto.applyTemplateId,
            { tenantIds: [savedTenant.id], mode: 'new_tenant' },
            creatorIp,
          );
          this.logger.log(
            `Applied template ${dto.applyTemplateId} to new client ${savedTenant.id}`,
          );
        } catch (error) {
          // Log but don't fail - template application is optional
          this.logger.warn(
            `Failed to apply template ${dto.applyTemplateId} to client ${savedTenant.id}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Created client ${savedTenant.id} (${savedTenant.name}) for MSP ${mspTenantId}`,
      );

      // Invalidate limits cache since we added a client
      await this.limitsService.invalidateLimitsCache(mspTenantId);

      // Report client usage to Stripe for metered billing (US-012)
      this.billingMeterService.reportClientUsage(mspTenantId).catch((error) => {
        this.logger.warn(
          `Failed to report client usage to Stripe: ${error.message}`,
        );
      });

      // Reload with relations
      const result = await this.mspClientRepository.findOne({
        where: { id: savedMspClient.id },
        relations: ['clientTenant'],
      });

      return this.toResponseDto(result!, 0, 1); // 1 user (the admin we just created)
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Link an existing tenant to an MSP
   * @param mspTenantId The MSP tenant ID
   * @param clientTenantId The existing tenant ID to link
   */
  async link(
    mspTenantId: string,
    clientTenantId: string,
  ): Promise<MspClientResponseDto> {
    // Verify MSP tenant
    await this.verifyMspTenant(mspTenantId);

    // Verify client tenant exists
    const clientTenant = await this.tenantRepository.findOne({
      where: { id: clientTenantId },
    });
    if (!clientTenant) {
      throw new NotFoundException(`Tenant ${clientTenantId} not found`);
    }

    // Check if already linked to any MSP
    const existingLink = await this.mspClientRepository.findOne({
      where: { clientTenantId },
    });
    if (existingLink) {
      throw new ConflictException(
        `Tenant ${clientTenantId} is already linked to an MSP`,
      );
    }

    // Cannot link an MSP tier tenant as a client
    if (clientTenant.tier === 'msp') {
      throw new BadRequestException('Cannot link an MSP tenant as a client');
    }

    // Create the relationship
    const mspClient = this.mspClientRepository.create({
      mspTenantId,
      clientTenantId,
      status: 'active',
    });

    const saved = await this.mspClientRepository.save(mspClient);

    // Update the client tenant's managedByMspId
    clientTenant.managedByMspId = mspTenantId;
    await this.tenantRepository.save(clientTenant);

    this.logger.log(
      `Linked existing tenant ${clientTenantId} to MSP ${mspTenantId}`,
    );

    // Report client usage to Stripe for metered billing (US-012)
    this.billingMeterService.reportClientUsage(mspTenantId).catch((error) => {
      this.logger.warn(
        `Failed to report client usage to Stripe: ${error.message}`,
      );
    });

    // Reload with relations
    const result = await this.mspClientRepository.findOne({
      where: { id: saved.id },
      relations: [
        'clientTenant',
        'clientTenant.locations',
        'clientTenant.users',
      ],
    });

    const locationCount = result?.clientTenant?.locations?.length || 0;
    const userCount = result?.clientTenant?.users?.length || 0;

    return this.toResponseDto(result!, locationCount, userCount);
  }

  /**
   * Update an MSP-client relationship or client details
   * Per US-006 spec, only name and status can be updated
   * @param mspTenantId The MSP tenant ID
   * @param clientTenantId The client tenant ID
   * @param dto Update data
   */
  async update(
    mspTenantId: string,
    clientTenantId: string,
    dto: UpdateMspClientDto,
  ): Promise<MspClientResponseDto> {
    const mspClient = await this.mspClientRepository.findOne({
      where: { mspTenantId, clientTenantId },
      relations: ['clientTenant'],
    });

    if (!mspClient) {
      throw new NotFoundException(
        `Client ${clientTenantId} not found for MSP ${mspTenantId}`,
      );
    }

    // Update relationship status if provided
    if (dto.status) {
      mspClient.status = dto.status;
      await this.mspClientRepository.save(mspClient);
    }

    // Update client tenant name if provided (per US-006 spec)
    if (dto.name !== undefined) {
      mspClient.clientTenant.name = dto.name;
      await this.tenantRepository.save(mspClient.clientTenant);
    }

    this.logger.log(`Updated client ${clientTenantId} for MSP ${mspTenantId}`);

    return this.findOne(mspTenantId, clientTenantId);
  }

  /**
   * Remove an MSP-client relationship
   * @param mspTenantId The MSP tenant ID
   * @param clientTenantId The client tenant ID
   * @param deleteClient If true, also deletes the client tenant
   */
  async remove(
    mspTenantId: string,
    clientTenantId: string,
    deleteClient?: boolean,
  ): Promise<void> {
    const mspClient = await this.mspClientRepository.findOne({
      where: { mspTenantId, clientTenantId },
      relations: ['clientTenant'],
    });

    if (!mspClient) {
      throw new NotFoundException(
        `Client ${clientTenantId} not found for MSP ${mspTenantId}`,
      );
    }

    // Remove the MSP-client relationship
    await this.mspClientRepository.remove(mspClient);

    // Update the client tenant to remove the managedByMspId reference
    if (mspClient.clientTenant) {
      mspClient.clientTenant.managedByMspId = null;
      await this.tenantRepository.save(mspClient.clientTenant);
    }

    this.logger.log(
      `Removed relationship between MSP ${mspTenantId} and client ${clientTenantId}`,
    );

    // Optionally delete the client tenant
    if (deleteClient && mspClient.clientTenant) {
      await this.tenantRepository.remove(mspClient.clientTenant);
      this.logger.log(`Deleted client tenant ${clientTenantId}`);
    }

    // Report client usage to Stripe for metered billing (US-012)
    this.billingMeterService.reportClientUsage(mspTenantId).catch((error) => {
      this.logger.warn(
        `Failed to report client usage to Stripe: ${error.message}`,
      );
    });
  }

  /**
   * Get count of clients for an MSP
   * @param mspTenantId The MSP tenant ID
   */
  async getClientCount(mspTenantId: string): Promise<number> {
    return this.mspClientRepository.count({
      where: { mspTenantId },
    });
  }

  /**
   * Get count of active clients for an MSP
   * @param mspTenantId The MSP tenant ID
   */
  async getActiveClientCount(mspTenantId: string): Promise<number> {
    return this.mspClientRepository.count({
      where: { mspTenantId, status: 'active' },
    });
  }

  /**
   * Check if a tenant is managed by a specific MSP
   * @param mspTenantId The MSP tenant ID
   * @param clientTenantId The potential client tenant ID
   */
  async isClientOfMsp(
    mspTenantId: string,
    clientTenantId: string,
  ): Promise<boolean> {
    const count = await this.mspClientRepository.count({
      where: { mspTenantId, clientTenantId },
    });
    return count > 0;
  }

  /**
   * Get the MSP tenant ID for a client tenant
   * @param clientTenantId The client tenant ID
   * @returns The MSP tenant ID or null if not managed
   */
  async getMspForClient(clientTenantId: string): Promise<string | null> {
    const mspClient = await this.mspClientRepository.findOne({
      where: { clientTenantId },
    });
    return mspClient?.mspTenantId || null;
  }

  /**
   * Suspend a client
   * @param mspTenantId The MSP tenant ID
   * @param clientTenantId The client tenant ID
   */
  async suspendClient(
    mspTenantId: string,
    clientTenantId: string,
  ): Promise<MspClientResponseDto> {
    return this.update(mspTenantId, clientTenantId, { status: 'suspended' });
  }

  /**
   * Reactivate a suspended client
   * @param mspTenantId The MSP tenant ID
   * @param clientTenantId The client tenant ID
   */
  async reactivateClient(
    mspTenantId: string,
    clientTenantId: string,
  ): Promise<MspClientResponseDto> {
    return this.update(mspTenantId, clientTenantId, { status: 'active' });
  }

  /**
   * Verify that a tenant is an MSP tier tenant
   * @param tenantId The tenant ID to verify
   */
  private async verifyMspTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    if (tenant.tier !== 'msp') {
      throw new ForbiddenException(
        `Tenant ${tenantId} is not an MSP tier tenant`,
      );
    }

    return tenant;
  }

  /**
   * Convert an MspClient entity to a response DTO
   * Response format per US-006 spec
   */
  private toResponseDto(
    mspClient: MspClient,
    locationCount: number = 0,
    userCount: number = 0,
  ): MspClientResponseDto {
    const clientTenant = mspClient.clientTenant;

    return {
      id: clientTenant?.id || mspClient.clientTenantId,
      name: clientTenant?.name || '',
      status: mspClient.status,
      locationCount,
      userCount,
      createdAt: mspClient.createdAt.toISOString(),
      slug: clientTenant?.slug,
      contactEmail: clientTenant?.contactEmail || undefined,
    };
  }
}
