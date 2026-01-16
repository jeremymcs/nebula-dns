/**
 * Nebula DNS - MSP Templates Service
 * Handles business logic for MSP policy template operations
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  MspTemplate,
  MspTemplateDeployment,
  MspTemplateConfig,
} from './entities/msp-template.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { PartnerUser } from '../partners/entities/partner-user.entity';
import { Policy } from '../policies/entities/policy.entity';
import { PolicyVersion } from '../policies/entities/policy-version.entity';
import { RedisService } from '../redis/redis.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  CreateMspTemplateDto,
  UpdateMspTemplateDto,
  DeployTemplateDto,
  MspTemplateResponseDto,
  DeploymentResultDto,
} from './dto/template.dto';
import { Location } from '../locations/entities/location.entity';
import { PolicyCompilerService } from '../policies/policy-compiler.service';

@Injectable()
export class MspTemplatesService {
  private readonly logger = new Logger(MspTemplatesService.name);

  constructor(
    @InjectRepository(MspTemplate)
    private readonly templateRepository: Repository<MspTemplate>,
    @InjectRepository(MspTemplateDeployment)
    private readonly deploymentRepository: Repository<MspTemplateDeployment>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PartnerUser)
    private readonly partnerUserRepository: Repository<PartnerUser>,
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
    @InjectRepository(PolicyVersion)
    private readonly policyVersionRepository: Repository<PolicyVersion>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    private readonly redisService: RedisService,
    private readonly auditLogsService: AuditLogsService,
    private readonly policyCompilerService: PolicyCompilerService,
  ) {}

  /**
   * Get partner ID for the current user
   */
  private async getPartnerId(
    userId: string,
    tenantId: string,
  ): Promise<string> {
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

    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (tenant?.partnerId) {
      return tenant.partnerId;
    }

    throw new ForbiddenException('Not an MSP user');
  }

  /**
   * Get all templates for the partner
   */
  async findAll(
    userId: string,
    tenantId: string,
  ): Promise<MspTemplateResponseDto[]> {
    const partnerId = await this.getPartnerId(userId, tenantId);

    const templates = await this.templateRepository.find({
      where: { partnerId },
      order: { createdAt: 'DESC' },
    });

    // Get deployment counts for each template
    const deploymentCounts = await this.getDeploymentCounts(
      templates.map((t) => t.id),
    );

    return templates.map((template) => ({
      id: template.id,
      partnerId: template.partnerId,
      name: template.name,
      description: template.description,
      config: template.config,
      version: template.version,
      isDefault: template.isDefault,
      category: template.category,
      tags: template.tags || [],
      deployedTo: deploymentCounts.get(template.id) || 0,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    }));
  }

  /**
   * Get deployment counts for multiple templates
   */
  private async getDeploymentCounts(
    templateIds: string[],
  ): Promise<Map<string, number>> {
    if (templateIds.length === 0) return new Map();

    const counts = await this.deploymentRepository
      .createQueryBuilder('deployment')
      .select('deployment.template_id', 'templateId')
      .addSelect('COUNT(DISTINCT deployment.tenant_id)', 'count')
      .where('deployment.template_id IN (:...templateIds)', { templateIds })
      .andWhere('deployment.status = :status', { status: 'completed' })
      .groupBy('deployment.template_id')
      .getRawMany();

    const countMap = new Map<string, number>();
    for (const row of counts) {
      countMap.set(row.templateId, parseInt(row.count, 10));
    }
    return countMap;
  }

  /**
   * Get a single template by ID
   */
  async findOne(
    userId: string,
    tenantId: string,
    templateId: string,
  ): Promise<MspTemplateResponseDto> {
    const partnerId = await this.getPartnerId(userId, tenantId);

    const template = await this.templateRepository.findOne({
      where: { id: templateId, partnerId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    const deploymentCounts = await this.getDeploymentCounts([templateId]);

    return {
      id: template.id,
      partnerId: template.partnerId,
      name: template.name,
      description: template.description,
      config: template.config,
      version: template.version,
      isDefault: template.isDefault,
      category: template.category,
      tags: template.tags || [],
      deployedTo: deploymentCounts.get(templateId) || 0,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  /**
   * Create a new template
   */
  async create(
    userId: string,
    tenantId: string,
    dto: CreateMspTemplateDto,
    ipAddress?: string,
  ): Promise<MspTemplateResponseDto> {
    const partnerId = await this.getPartnerId(userId, tenantId);

    // Check for duplicate name within partner
    const existing = await this.templateRepository.findOne({
      where: { partnerId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Template with name "${dto.name}" already exists`,
      );
    }

    const template = this.templateRepository.create({
      partnerId,
      name: dto.name,
      description: dto.description,
      config: dto.config,
      isDefault: dto.isDefault || false,
      category: dto.category,
      tags: dto.tags || [],
      version: 1,
    });

    await this.templateRepository.save(template);

    // Audit log
    await this.auditLogsService.log({
      tenantId,
      userId,
      action: 'create',
      resourceType: 'template',
      resourceId: template.id,
      resourceName: template.name,
      newValue: { name: template.name, category: template.category },
      ipAddress,
    });

    this.logger.log(
      `Template ${template.id} created by user ${userId} for partner ${partnerId}`,
    );

    return {
      id: template.id,
      partnerId: template.partnerId,
      name: template.name,
      description: template.description,
      config: template.config,
      version: template.version,
      isDefault: template.isDefault,
      category: template.category,
      tags: template.tags,
      deployedTo: 0,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  /**
   * Update an existing template
   */
  async update(
    userId: string,
    tenantId: string,
    templateId: string,
    dto: UpdateMspTemplateDto,
    ipAddress?: string,
  ): Promise<MspTemplateResponseDto> {
    const partnerId = await this.getPartnerId(userId, tenantId);

    const template = await this.templateRepository.findOne({
      where: { id: templateId, partnerId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    const oldValue = {
      name: template.name,
      description: template.description,
      category: template.category,
      version: template.version,
    };

    // Check for duplicate name if name is being changed
    if (dto.name && dto.name !== template.name) {
      const existing = await this.templateRepository.findOne({
        where: { partnerId, name: dto.name },
      });
      if (existing) {
        throw new ConflictException(
          `Template with name "${dto.name}" already exists`,
        );
      }
      template.name = dto.name;
    }

    // Update fields
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.isDefault !== undefined) template.isDefault = dto.isDefault;
    if (dto.category !== undefined) template.category = dto.category;
    if (dto.tags !== undefined) template.tags = dto.tags;

    // If config is updated, increment version
    if (dto.config) {
      template.config = {
        ...dto.config,
        schedules: dto.config.schedules || [],
      } as MspTemplateConfig;
      template.version += 1;
    }

    await this.templateRepository.save(template);

    // Audit log
    await this.auditLogsService.log({
      tenantId,
      userId,
      action: 'update',
      resourceType: 'template',
      resourceId: template.id,
      resourceName: template.name,
      oldValue,
      newValue: {
        name: template.name,
        description: template.description,
        category: template.category,
        version: template.version,
      },
      ipAddress,
    });

    this.logger.log(
      `Template ${templateId} updated to version ${template.version}`,
    );

    const deploymentCounts = await this.getDeploymentCounts([templateId]);

    return {
      id: template.id,
      partnerId: template.partnerId,
      name: template.name,
      description: template.description,
      config: template.config,
      version: template.version,
      isDefault: template.isDefault,
      category: template.category,
      tags: template.tags,
      deployedTo: deploymentCounts.get(templateId) || 0,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  /**
   * Delete a template
   */
  async remove(
    userId: string,
    tenantId: string,
    templateId: string,
    ipAddress?: string,
  ): Promise<void> {
    const partnerId = await this.getPartnerId(userId, tenantId);

    const template = await this.templateRepository.findOne({
      where: { id: templateId, partnerId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    await this.templateRepository.remove(template);

    // Audit log
    await this.auditLogsService.log({
      tenantId,
      userId,
      action: 'delete',
      resourceType: 'template',
      resourceId: templateId,
      resourceName: template.name,
      oldValue: { name: template.name, category: template.category },
      ipAddress,
    });

    this.logger.log(`Template ${templateId} deleted by user ${userId}`);
  }

  /**
   * Deploy a template to multiple tenants
   */
  async deploy(
    userId: string,
    tenantId: string,
    templateId: string,
    dto: DeployTemplateDto,
    ipAddress?: string,
  ): Promise<DeploymentResultDto> {
    const partnerId = await this.getPartnerId(userId, tenantId);

    // Verify template exists and belongs to partner
    const template = await this.templateRepository.findOne({
      where: { id: templateId, partnerId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    // Verify all tenants belong to this partner
    const tenants = await this.tenantRepository.find({
      where: {
        id: In(dto.tenantIds),
        partnerId,
      },
    });

    if (tenants.length !== dto.tenantIds.length) {
      const foundIds = new Set(tenants.map((t) => t.id));
      const missingIds = dto.tenantIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Some tenants not found or not owned by partner: ${missingIds.join(', ')}`,
      );
    }

    const mode = dto.mode || 'overlay';
    const results: DeploymentResultDto['results'] = [];

    // Deploy to each tenant
    for (const targetTenant of tenants) {
      try {
        const policyId = await this.deployToTenant(
          template,
          targetTenant,
          userId,
          mode,
        );

        // Record deployment
        const deployment = this.deploymentRepository.create({
          templateId: template.id,
          tenantId: targetTenant.id,
          deployedBy: userId,
          templateVersion: template.version,
          deploymentMode: mode,
          status: 'completed',
          policiesCreated: 1,
        });
        await this.deploymentRepository.save(deployment);

        results.push({
          tenantId: targetTenant.id,
          status: 'success',
          policyId,
        });

        this.logger.log(
          `Template ${templateId} deployed to tenant ${targetTenant.id} (policy: ${policyId})`,
        );
      } catch (error) {
        // Record failed deployment
        const deployment = this.deploymentRepository.create({
          templateId: template.id,
          tenantId: targetTenant.id,
          deployedBy: userId,
          templateVersion: template.version,
          deploymentMode: mode,
          status: 'failed',
          policiesCreated: 0,
        });
        await this.deploymentRepository.save(deployment);

        results.push({
          tenantId: targetTenant.id,
          status: 'failed',
          error: error.message,
        });

        this.logger.error(
          `Failed to deploy template ${templateId} to tenant ${targetTenant.id}: ${error.message}`,
        );
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    const failCount = results.filter((r) => r.status === 'failed').length;

    // Audit log for bulk deployment
    await this.auditLogsService.log({
      tenantId,
      userId,
      action: 'create',
      resourceType: 'template',
      resourceId: templateId,
      resourceName: `Deploy: ${template.name}`,
      newValue: {
        templateId,
        templateName: template.name,
        mode,
        totalTenants: dto.tenantIds.length,
        successCount,
        failCount,
      },
      ipAddress,
      metadata: { operation: 'bulk_deploy' },
    });

    return {
      success: failCount === 0,
      totalTenants: dto.tenantIds.length,
      successfulDeployments: successCount,
      failedDeployments: failCount,
      results,
    };
  }

  /**
   * Deploy template to a single tenant
   */
  private async deployToTenant(
    template: MspTemplate,
    targetTenant: Tenant,
    userId: string,
    mode: 'new_tenant' | 'overlay',
  ): Promise<string> {
    const config = template.config;

    // Generate policy name from template
    const policyName = config.policyName || `${template.name} Policy`;
    const policyDescription =
      config.policyDescription || `Created from template: ${template.name}`;

    // Create the policy entity
    const policy = this.policyRepository.create({
      name: policyName,
      description: policyDescription,
      tenantId: targetTenant.id,
      currentVersion: 1,
      isDefault: mode === 'new_tenant',
    });

    await this.policyRepository.save(policy);

    // Create initial policy version with the template config
    const policyConfig = {
      blockCategories: config.blockCategories,
      warnCategories: config.warnCategories,
      threatBlocking: config.threatBlocking,
      safesearch: config.safesearch,
      schedules: config.schedules || [],
    };

    const version = this.policyVersionRepository.create({
      policyId: policy.id,
      version: 1,
      config: policyConfig,
      createdBy: userId,
      changelog: `Created from template: ${template.name} v${template.version}`,
    });

    await this.policyVersionRepository.save(version);

    // Invalidate cache for all locations in the tenant that might use the default policy
    await this.invalidateTenantPolicyCache(targetTenant.id, policy.id);

    return policy.id;
  }

  /**
   * Invalidate policy cache for tenant locations
   */
  private async invalidateTenantPolicyCache(
    tenantId: string,
    policyId: string,
  ): Promise<void> {
    try {
      const locations = await this.locationRepository.find({
        where: { tenantId },
        select: ['id', 'tenantId', 'policyId'],
      });

      for (const location of locations) {
        // Recompile policies for locations that use this policy or have no specific policy
        if (!location.policyId || location.policyId === policyId) {
          const effectivePolicyId = location.policyId || policyId;
          await this.policyCompilerService.compile(
            tenantId,
            effectivePolicyId,
            location.id,
          );
          await this.redisService.invalidatePolicy(location.id);
        }
      }

      this.logger.debug(
        `Invalidated cache for ${locations.length} locations in tenant ${tenantId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to invalidate policy cache: ${error.message}`);
    }
  }

  /**
   * Get deployment history for a template
   */
  async getDeploymentHistory(
    userId: string,
    tenantId: string,
    templateId: string,
    limit = 50,
  ): Promise<MspTemplateDeployment[]> {
    const partnerId = await this.getPartnerId(userId, tenantId);

    // Verify template belongs to partner
    const template = await this.templateRepository.findOne({
      where: { id: templateId, partnerId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    return this.deploymentRepository.find({
      where: { templateId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
