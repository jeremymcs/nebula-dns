/**
 * Nebula DNS - MSP Templates Service
 * Handles business logic for MSP policy template operations
 * Including versioning (US-034), rollback (US-035), and client application (US-036)
 * Updated to use the unified tier system (US-022, US-023)
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
import { MspTemplateVersion } from './entities/msp-template-version.entity';
import {
  ClientTemplateApplication,
  ApplicationStatus,
} from './entities/client-template-application.entity';
import {
  TemplateApplyJob,
  ApplyJobResult,
} from './entities/template-apply-job.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
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
import {
  TemplateVersionResponseDto,
  TemplateVersionListResponseDto,
  RollbackResponseDto,
  ApplyJobResponseDto,
  ClientsUsingTemplateResponseDto,
  ClientUsingTemplateDto,
  ConfigDiffResponseDto,
} from './dto/template-version.dto';
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
    @InjectRepository(MspTemplateVersion)
    private readonly versionRepository: Repository<MspTemplateVersion>,
    @InjectRepository(ClientTemplateApplication)
    private readonly applicationRepository: Repository<ClientTemplateApplication>,
    @InjectRepository(TemplateApplyJob)
    private readonly applyJobRepository: Repository<TemplateApplyJob>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
   * Get MSP tenant ID for the current user
   * Uses the unified tier system - MSP tenants are identified by tier='msp'
   */
  private async getMspTenantId(
    userId: string,
    tenantId: string,
  ): Promise<string> {
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
      throw new ForbiddenException('Only MSP tier users can access templates');
    }

    return tenant.id;
  }

  /**
   * Get all templates for the partner
   */
  async findAll(
    userId: string,
    tenantId: string,
  ): Promise<MspTemplateResponseDto[]> {
    const mspTenantId = await this.getMspTenantId(userId, tenantId);

    const templates = await this.templateRepository.find({
      where: { partnerId: mspTenantId },
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

    const counts = await this.applicationRepository
      .createQueryBuilder('app')
      .select('app.template_id', 'templateId')
      .addSelect('COUNT(DISTINCT app.client_tenant_id)', 'count')
      .where('app.template_id IN (:...templateIds)', { templateIds })
      .andWhere('app.status = :status', { status: 'completed' })
      .groupBy('app.template_id')
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
    const mspTenantId = await this.getMspTenantId(userId, tenantId);

    const template = await this.templateRepository.findOne({
      where: { id: templateId, partnerId: mspTenantId },
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
    const mspTenantId = await this.getMspTenantId(userId, tenantId);

    // Check for duplicate name within partner
    const existing = await this.templateRepository.findOne({
      where: { partnerId: mspTenantId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Template with name "${dto.name}" already exists`,
      );
    }

    const template = this.templateRepository.create({
      partnerId: mspTenantId,
      name: dto.name,
      description: dto.description,
      config: dto.config,
      isDefault: dto.isDefault || false,
      category: dto.category,
      tags: dto.tags || [],
      version: 1,
    });

    await this.templateRepository.save(template);

    // Create initial version record (US-034)
    const versionRecord = this.versionRepository.create({
      templateId: template.id,
      version: 1,
      config: template.config,
      createdBy: userId,
      changelog: 'Initial version',
      isRollback: false,
    });
    await this.versionRepository.save(versionRecord);

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
      `Template ${template.id} created by user ${userId} for MSP tenant ${mspTenantId}`,
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
    const mspTenantId = await this.getMspTenantId(userId, tenantId);

    const template = await this.templateRepository.findOne({
      where: { id: templateId, partnerId: mspTenantId },
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
        where: { partnerId: mspTenantId, name: dto.name },
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

    // If config is updated, increment version and create version record (US-034)
    if (dto.config) {
      template.config = {
        ...dto.config,
        schedules: dto.config.schedules || [],
      } as MspTemplateConfig;
      template.version += 1;

      // Create version record
      const versionRecord = this.versionRepository.create({
        templateId: template.id,
        version: template.version,
        config: template.config,
        createdBy: userId,
        changelog: dto.description ? `Updated: ${dto.description}` : undefined,
        isRollback: false,
      });
      await this.versionRepository.save(versionRecord);
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
    const mspTenantId = await this.getMspTenantId(userId, tenantId);

    const template = await this.templateRepository.findOne({
      where: { id: templateId, partnerId: mspTenantId },
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

  // ============================================
  // US-034: Template Version History
  // ============================================

  /**
   * Get all versions for a template
   */
  async getVersions(
    userId: string,
    tenantId: string,
    templateId: string,
  ): Promise<TemplateVersionListResponseDto> {
    const mspTenantId = await this.getMspTenantId(userId, tenantId);

    const template = await this.templateRepository.findOne({
      where: { id: templateId, partnerId: mspTenantId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    const versions = await this.versionRepository.find({
      where: { templateId },
      relations: ['creator'],
      order: { version: 'DESC' },
    });

    return {
      versions: versions.map((v) => ({
        id: v.id,
        templateId: v.templateId,
        version: v.version,
        config: v.config,
        createdBy: v.createdBy,
        createdByName: v.creator?.name,
        changelog: v.changelog,
        isRollback: v.isRollback,
        rollbackFromVersion: v.rollbackFromVersion ?? undefined,
        createdAt: v.createdAt,
      })),
      currentVersion: template.version,
      totalVersions: versions.length,
    };
  }

  /**
   * Get a specific version
   */
  async getVersion(
    userId: string,
    tenantId: string,
    templateId: string,
    versionId: string,
  ): Promise<TemplateVersionResponseDto> {
    const mspTenantId = await this.getMspTenantId(userId, tenantId);

    const template = await this.templateRepository.findOne({
      where: { id: templateId, partnerId: mspTenantId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    const version = await this.versionRepository.findOne({
      where: { id: versionId, templateId },
      relations: ['creator'],
    });

    if (!version) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }

    return {
      id: version.id,
      templateId: version.templateId,
      version: version.version,
      config: version.config,
      createdBy: version.createdBy,
      createdByName: version.creator?.name,
      changelog: version.changelog,
      isRollback: version.isRollback,
      rollbackFromVersion: version.rollbackFromVersion ?? undefined,
      createdAt: version.createdAt,
    };
  }

  /**
   * Get diff between a version and current
   */
  async getVersionDiff(
    userId: string,
    tenantId: string,
    templateId: string,
    versionNumber: number,
  ): Promise<ConfigDiffResponseDto> {
    const mspTenantId = await this.getMspTenantId(userId, tenantId);

    const template = await this.templateRepository.findOne({
      where: { id: templateId, partnerId: mspTenantId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    const oldVersion = await this.versionRepository.findOne({
      where: { templateId, version: versionNumber },
    });

    if (!oldVersion) {
      throw new NotFoundException(`Version ${versionNumber} not found`);
    }

    const diff = this.computeConfigDiff(oldVersion.config, template.config);

    return {
      templateId,
      fromVersion: versionNumber,
      toVersion: template.version,
      diff,
      summary: this.generateDiffSummary(diff),
    };
  }

  /**
   * Compute diff between two configs
   */
  private computeConfigDiff(
    oldConfig: MspTemplateConfig,
    newConfig: MspTemplateConfig,
  ): {
    added: Record<string, any>;
    removed: Record<string, any>;
    changed: Record<string, { from: any; to: any }>;
  } {
    const added: Record<string, any> = {};
    const removed: Record<string, any> = {};
    const changed: Record<string, { from: any; to: any }> = {};

    // Compare blockCategories
    const oldBlocked = new Set(oldConfig.blockCategories || []);
    const newBlocked = new Set(newConfig.blockCategories || []);
    const addedCategories = [...newBlocked].filter((c) => !oldBlocked.has(c));
    const removedCategories = [...oldBlocked].filter((c) => !newBlocked.has(c));
    if (addedCategories.length > 0) added.blockCategories = addedCategories;
    if (removedCategories.length > 0)
      removed.blockCategories = removedCategories;

    // Compare warnCategories
    const oldWarn = new Set(oldConfig.warnCategories || []);
    const newWarn = new Set(newConfig.warnCategories || []);
    const addedWarn = [...newWarn].filter((c) => !oldWarn.has(c));
    const removedWarn = [...oldWarn].filter((c) => !newWarn.has(c));
    if (addedWarn.length > 0) added.warnCategories = addedWarn;
    if (removedWarn.length > 0) removed.warnCategories = removedWarn;

    // Compare threatBlocking
    if (
      oldConfig.threatBlocking?.enabled !== newConfig.threatBlocking?.enabled
    ) {
      changed.threatBlockingEnabled = {
        from: oldConfig.threatBlocking?.enabled,
        to: newConfig.threatBlocking?.enabled,
      };
    }

    // Compare safesearch
    if (oldConfig.safesearch?.enabled !== newConfig.safesearch?.enabled) {
      changed.safesearchEnabled = {
        from: oldConfig.safesearch?.enabled,
        to: newConfig.safesearch?.enabled,
      };
    }

    // Compare schedules
    const oldSchedules = oldConfig.schedules?.length || 0;
    const newSchedules = newConfig.schedules?.length || 0;
    if (oldSchedules !== newSchedules) {
      changed.schedulesCount = { from: oldSchedules, to: newSchedules };
    }

    return { added, removed, changed };
  }

  /**
   * Generate human-readable diff summary
   */
  private generateDiffSummary(diff: {
    added: Record<string, any>;
    removed: Record<string, any>;
    changed: Record<string, { from: any; to: any }>;
  }): string {
    const parts: string[] = [];

    if (diff.added.blockCategories?.length > 0) {
      parts.push(
        `Added ${diff.added.blockCategories.length} blocked categories`,
      );
    }
    if (diff.removed.blockCategories?.length > 0) {
      parts.push(
        `Removed ${diff.removed.blockCategories.length} blocked categories`,
      );
    }
    if (diff.changed.threatBlockingEnabled) {
      parts.push(
        `Threat blocking ${diff.changed.threatBlockingEnabled.to ? 'enabled' : 'disabled'}`,
      );
    }
    if (diff.changed.safesearchEnabled) {
      parts.push(
        `SafeSearch ${diff.changed.safesearchEnabled.to ? 'enabled' : 'disabled'}`,
      );
    }
    if (diff.changed.schedulesCount) {
      parts.push(
        `Schedules changed from ${diff.changed.schedulesCount.from} to ${diff.changed.schedulesCount.to}`,
      );
    }

    return parts.length > 0
      ? parts.join('. ') + '.'
      : 'No significant changes.';
  }

  // ============================================
  // US-035: Template Rollback
  // ============================================

  /**
   * Rollback template to a previous version
   */
  async rollbackToVersion(
    userId: string,
    tenantId: string,
    templateId: string,
    targetVersionId: string,
    reapplyToClients: boolean = false,
    ipAddress?: string,
  ): Promise<RollbackResponseDto> {
    const mspTenantId = await this.getMspTenantId(userId, tenantId);

    const template = await this.templateRepository.findOne({
      where: { id: templateId, partnerId: mspTenantId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    const targetVersion = await this.versionRepository.findOne({
      where: { id: targetVersionId, templateId },
    });

    if (!targetVersion) {
      throw new NotFoundException(`Version ${targetVersionId} not found`);
    }

    if (targetVersion.version === template.version) {
      throw new BadRequestException('Cannot rollback to the current version');
    }

    const oldVersion = template.version;
    const newVersion = template.version + 1;

    // Update template with old config
    template.config = targetVersion.config;
    template.version = newVersion;
    await this.templateRepository.save(template);

    // Create new version record marked as rollback
    const rollbackVersionRecord = this.versionRepository.create({
      templateId: template.id,
      version: newVersion,
      config: targetVersion.config,
      createdBy: userId,
      changelog: `Rollback to v${targetVersion.version}`,
      isRollback: true,
      rollbackFromVersion: targetVersion.version,
    });
    await this.versionRepository.save(rollbackVersionRecord);

    // Audit log
    await this.auditLogsService.log({
      tenantId,
      userId,
      action: 'update',
      resourceType: 'template',
      resourceId: templateId,
      resourceName: template.name,
      oldValue: { version: oldVersion },
      newValue: {
        version: newVersion,
        rolledBackTo: targetVersion.version,
      },
      ipAddress,
      metadata: { operation: 'rollback' },
    });

    this.logger.log(
      `Template ${templateId} rolled back from v${oldVersion} to v${targetVersion.version} (now v${newVersion})`,
    );

    let applyJobId: string | undefined;

    // Optionally re-apply to all clients
    if (reapplyToClients) {
      const job = await this.startApplyJob(
        userId,
        tenantId,
        templateId,
        'all',
        ipAddress,
      );
      applyJobId = job.jobId;
    }

    return {
      success: true,
      newVersion,
      rolledBackToVersion: targetVersion.version,
      message: `Successfully rolled back to v${targetVersion.version}. This created v${newVersion}.`,
      applyJobId,
    };
  }

  // ============================================
  // US-036: Client Application
  // ============================================

  /**
   * Get clients using this template
   */
  async getClientsUsingTemplate(
    userId: string,
    tenantId: string,
    templateId: string,
  ): Promise<ClientsUsingTemplateResponseDto> {
    const mspTenantId = await this.getMspTenantId(userId, tenantId);

    const template = await this.templateRepository.findOne({
      where: { id: templateId, partnerId: mspTenantId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    const applications = await this.applicationRepository.find({
      where: { templateId },
      relations: ['clientTenant'],
    });

    const clients: ClientUsingTemplateDto[] = applications.map((app) => ({
      clientId: app.clientTenantId,
      clientName: app.clientTenant?.name || 'Unknown',
      clientSlug: app.clientTenant?.slug || 'unknown',
      appliedVersion: app.appliedVersion,
      isLatestVersion: app.appliedVersion === template.version,
      status: app.status,
      policyId: app.policyId || undefined,
      appliedAt: app.updatedAt,
    }));

    const clientsOnLatest = clients.filter((c) => c.isLatestVersion).length;

    return {
      clients,
      totalClients: clients.length,
      clientsOnLatest,
      clientsOutdated: clients.length - clientsOnLatest,
    };
  }

  /**
   * Start async apply job
   */
  async startApplyJob(
    userId: string,
    tenantId: string,
    templateId: string,
    clientIds: string[] | 'all',
    ipAddress?: string,
  ): Promise<ApplyJobResponseDto> {
    const mspTenantId = await this.getMspTenantId(userId, tenantId);

    const template = await this.templateRepository.findOne({
      where: { id: templateId, partnerId: mspTenantId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    // Get target clients
    let targetClientIds: string[];

    if (clientIds === 'all') {
      // Get all clients from existing applications
      const existingApps = await this.applicationRepository.find({
        where: { templateId },
        select: ['clientTenantId'],
      });
      targetClientIds = existingApps.map((app) => app.clientTenantId);

      if (targetClientIds.length === 0) {
        throw new BadRequestException(
          'No clients are currently using this template',
        );
      }
    } else {
      // Verify provided client IDs belong to partner
      const tenants = await this.tenantRepository.find({
        where: { id: In(clientIds), managedByMspId: mspTenantId },
      });

      if (tenants.length !== clientIds.length) {
        const foundIds = new Set(tenants.map((t) => t.id));
        const missingIds = clientIds.filter((id) => !foundIds.has(id));
        throw new BadRequestException(
          `Some clients not found or not owned by MSP: ${missingIds.join(', ')}`,
        );
      }

      targetClientIds = clientIds;
    }

    // Create job record
    const job = this.applyJobRepository.create({
      templateId,
      templateVersion: template.version,
      initiatedBy: userId,
      status: 'pending',
      totalClients: targetClientIds.length,
      processedClients: 0,
      successCount: 0,
      failedCount: 0,
      clientIds: targetClientIds,
      results: [],
    });
    await this.applyJobRepository.save(job);

    // Start processing asynchronously
    this.processApplyJob(job.id, template, userId, ipAddress).catch((error) => {
      this.logger.error(`Apply job ${job.id} failed: ${error.message}`);
    });

    return {
      jobId: job.id,
      status: 'pending',
      totalClients: targetClientIds.length,
      processedClients: 0,
      successCount: 0,
      failedCount: 0,
    };
  }

  /**
   * Process apply job asynchronously
   */
  private async processApplyJob(
    jobId: string,
    template: MspTemplate,
    userId: string,
    ipAddress?: string,
  ): Promise<void> {
    const job = await this.applyJobRepository.findOne({ where: { id: jobId } });
    if (!job) return;

    // Update job status to in_progress
    job.status = 'in_progress';
    job.startedAt = new Date();
    await this.applyJobRepository.save(job);

    // Get tenant info for all clients
    const tenants = await this.tenantRepository.find({
      where: { id: In(job.clientIds) },
    });
    const tenantMap = new Map(tenants.map((t) => [t.id, t]));

    const results: ApplyJobResult[] = [];

    for (const clientId of job.clientIds) {
      const tenant = tenantMap.get(clientId);

      try {
        if (!tenant) {
          throw new Error('Client tenant not found');
        }

        // Apply template to client
        const policyId = await this.applyTemplateToClient(
          template,
          tenant,
          userId,
        );

        results.push({
          clientId,
          clientName: tenant.name,
          status: 'success',
          policyId,
        });

        job.successCount++;
      } catch (error) {
        results.push({
          clientId,
          clientName: tenant?.name || 'Unknown',
          status: 'failed',
          error: error.message,
        });

        job.failedCount++;
      }

      job.processedClients++;
      job.results = results;
      await this.applyJobRepository.save(job);
    }

    // Mark job as completed
    job.status = job.failedCount === 0 ? 'completed' : 'completed';
    job.completedAt = new Date();
    await this.applyJobRepository.save(job);

    this.logger.log(
      `Apply job ${jobId} completed: ${job.successCount} success, ${job.failedCount} failed`,
    );
  }

  /**
   * Apply template to a single client
   */
  private async applyTemplateToClient(
    template: MspTemplate,
    tenant: Tenant,
    userId: string,
  ): Promise<string> {
    // Check for existing application
    let application = await this.applicationRepository.findOne({
      where: { templateId: template.id, clientTenantId: tenant.id },
    });

    const config = template.config;
    const policyName = config.policyName || `${template.name} Policy`;
    const policyDescription =
      config.policyDescription || `Created from template: ${template.name}`;

    let policyId: string;

    if (application?.policyId) {
      // Update existing policy
      const existingPolicy = await this.policyRepository.findOne({
        where: { id: application.policyId },
      });

      if (existingPolicy) {
        existingPolicy.currentVersion++;
        await this.policyRepository.save(existingPolicy);

        // Create new policy version
        const policyConfig = {
          blockCategories: config.blockCategories,
          warnCategories: config.warnCategories,
          threatBlocking: config.threatBlocking,
          safesearch: config.safesearch,
          schedules: config.schedules || [],
        };

        const newVersion = this.policyVersionRepository.create({
          policyId: existingPolicy.id,
          version: existingPolicy.currentVersion,
          config: policyConfig,
          createdBy: userId,
          changelog: `Updated from template: ${template.name} v${template.version}`,
        });
        await this.policyVersionRepository.save(newVersion);

        policyId = existingPolicy.id;
      } else {
        // Policy was deleted, create new one
        policyId = await this.createPolicyFromTemplate(
          template,
          tenant,
          userId,
        );
      }
    } else {
      // Create new policy
      policyId = await this.createPolicyFromTemplate(template, tenant, userId);
    }

    // Update or create application record
    if (application) {
      application.appliedVersion = template.version;
      application.appliedBy = userId;
      application.status = 'completed';
      application.errorMessage = null;
      application.policyId = policyId;
    } else {
      application = this.applicationRepository.create({
        templateId: template.id,
        clientTenantId: tenant.id,
        appliedVersion: template.version,
        appliedBy: userId,
        status: 'completed',
        policyId,
      });
    }
    await this.applicationRepository.save(application);

    // Invalidate cache
    await this.invalidateTenantPolicyCache(tenant.id, policyId);

    return policyId;
  }

  /**
   * Create a new policy from template
   */
  private async createPolicyFromTemplate(
    template: MspTemplate,
    tenant: Tenant,
    userId: string,
  ): Promise<string> {
    const config = template.config;
    const policyName = config.policyName || `${template.name} Policy`;
    const policyDescription =
      config.policyDescription || `Created from template: ${template.name}`;

    const policy = this.policyRepository.create({
      name: policyName,
      description: policyDescription,
      tenantId: tenant.id,
      currentVersion: 1,
      isDefault: false,
    });
    await this.policyRepository.save(policy);

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

    return policy.id;
  }

  /**
   * Get apply job status
   */
  async getApplyJobStatus(
    userId: string,
    tenantId: string,
    templateId: string,
    jobId: string,
  ): Promise<ApplyJobResponseDto> {
    const mspTenantId = await this.getMspTenantId(userId, tenantId);

    const template = await this.templateRepository.findOne({
      where: { id: templateId, partnerId: mspTenantId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    const job = await this.applyJobRepository.findOne({
      where: { id: jobId, templateId },
    });

    if (!job) {
      throw new NotFoundException(`Apply job ${jobId} not found`);
    }

    return {
      jobId: job.id,
      status: job.status,
      totalClients: job.totalClients,
      processedClients: job.processedClients,
      successCount: job.successCount,
      failedCount: job.failedCount,
      results: job.results,
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
    };
  }

  /**
   * Retry failed applications
   */
  async retryFailedApplications(
    userId: string,
    tenantId: string,
    templateId: string,
    clientIds: string[],
    ipAddress?: string,
  ): Promise<ApplyJobResponseDto> {
    // Verify the clients actually failed
    const applications = await this.applicationRepository.find({
      where: {
        templateId,
        clientTenantId: In(clientIds),
        status: 'failed' as ApplicationStatus,
      },
    });

    const failedClientIds = applications.map((a) => a.clientTenantId);

    if (failedClientIds.length === 0) {
      throw new BadRequestException(
        'No failed applications found for the specified clients',
      );
    }

    return this.startApplyJob(
      userId,
      tenantId,
      templateId,
      failedClientIds,
      ipAddress,
    );
  }

  // ============================================
  // Legacy Deploy Methods (kept for backwards compatibility)
  // ============================================

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
    const mspTenantId = await this.getMspTenantId(userId, tenantId);

    // Verify template exists and belongs to partner
    const template = await this.templateRepository.findOne({
      where: { id: templateId, partnerId: mspTenantId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    // Verify all tenants belong to this partner
    const tenants = await this.tenantRepository.find({
      where: {
        id: In(dto.tenantIds),
        managedByMspId: mspTenantId,
      },
    });

    if (tenants.length !== dto.tenantIds.length) {
      const foundIds = new Set(tenants.map((t) => t.id));
      const missingIds = dto.tenantIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Some tenants not found or not owned by MSP: ${missingIds.join(', ')}`,
      );
    }

    const mode = dto.mode || 'overlay';
    const results: DeploymentResultDto['results'] = [];

    // Deploy to each tenant
    for (const targetTenant of tenants) {
      try {
        const policyId = await this.applyTemplateToClient(
          template,
          targetTenant,
          userId,
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
    const mspTenantId = await this.getMspTenantId(userId, tenantId);

    // Verify template belongs to partner
    const template = await this.templateRepository.findOne({
      where: { id: templateId, partnerId: mspTenantId },
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
