import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from './entities/policy.entity';
import { PolicyVersion, PolicyConfig } from './entities/policy-version.entity';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PaginationQueryDto, PaginatedResponse } from '@/common/dto/pagination.dto';

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
    @InjectRepository(PolicyVersion)
    private readonly versionRepository: Repository<PolicyVersion>,
  ) {}

  async findAll(
    tenantId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<Policy>> {
    const { limit = 20, cursor } = pagination;

    const queryBuilder = this.policyRepository
      .createQueryBuilder('policy')
      .where('policy.tenant_id = :tenantId', { tenantId })
      .orderBy('policy.created_at', 'DESC')
      .take(limit + 1);

    if (cursor) {
      queryBuilder.andWhere('policy.created_at < :cursor', {
        cursor: new Date(Buffer.from(cursor, 'base64').toString()),
      });
    }

    const policies = await queryBuilder.getMany();
    const hasMore = policies.length > limit;

    if (hasMore) {
      policies.pop();
    }

    const nextCursor =
      hasMore && policies.length > 0
        ? Buffer.from(
            policies[policies.length - 1].createdAt.toISOString(),
          ).toString('base64')
        : null;

    return {
      data: policies,
      pagination: {
        cursor: nextCursor,
        hasMore,
      },
    };
  }

  async findOne(tenantId: string, id: string): Promise<Policy & { currentConfig: PolicyConfig }> {
    const policy = await this.policyRepository.findOne({
      where: { id, tenantId },
    });

    if (!policy) {
      throw new NotFoundException(`Policy ${id} not found`);
    }

    // Get current version config
    const currentVersionRecord = await this.versionRepository.findOne({
      where: { policyId: id, version: policy.currentVersion },
    });

    return {
      ...policy,
      currentConfig: currentVersionRecord?.config || {} as PolicyConfig,
    };
  }

  async create(
    tenantId: string,
    createDto: CreatePolicyDto,
    userId: string,
  ): Promise<Policy> {
    // Create policy
    const policy = this.policyRepository.create({
      name: createDto.name,
      description: createDto.description,
      tenantId,
      currentVersion: 1,
      isDefault: createDto.isDefault || false,
    });

    await this.policyRepository.save(policy);

    // Create initial version
    const version = this.versionRepository.create({
      policyId: policy.id,
      version: 1,
      config: createDto.config,
      createdBy: userId,
      changelog: 'Initial version',
    });

    await this.versionRepository.save(version);

    this.logger.log(`Policy ${policy.id} created in tenant ${tenantId}`);
    return policy;
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: UpdatePolicyDto,
    userId: string,
  ): Promise<Policy> {
    const policy = await this.findOne(tenantId, id);

    // Update policy metadata
    if (updateDto.name) policy.name = updateDto.name;
    if (updateDto.description !== undefined)
      policy.description = updateDto.description;

    // If config is updated, create a new version
    if (updateDto.config) {
      const newVersion = policy.currentVersion + 1;

      const version = this.versionRepository.create({
        policyId: id,
        version: newVersion,
        config: updateDto.config,
        createdBy: userId,
        changelog: updateDto.changelog || `Version ${newVersion}`,
      });

      await this.versionRepository.save(version);
      policy.currentVersion = newVersion;
    }

    await this.policyRepository.save(policy);

    this.logger.log(
      `Policy ${id} updated to version ${policy.currentVersion} in tenant ${tenantId}`,
    );
    return policy;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const policy = await this.findOne(tenantId, id);

    if (policy.isDefault) {
      throw new BadRequestException('Cannot delete the default policy');
    }

    // Delete all versions first
    await this.versionRepository.delete({ policyId: id });
    await this.policyRepository.remove(policy);

    this.logger.log(`Policy ${id} deleted from tenant ${tenantId}`);
  }

  async getVersions(tenantId: string, id: string): Promise<PolicyVersion[]> {
    // Verify policy belongs to tenant
    await this.findOne(tenantId, id);

    return this.versionRepository.find({
      where: { policyId: id },
      order: { version: 'DESC' },
    });
  }

  async getVersion(
    tenantId: string,
    id: string,
    versionId: string,
  ): Promise<PolicyVersion> {
    // Verify policy belongs to tenant
    await this.findOne(tenantId, id);

    const version = await this.versionRepository.findOne({
      where: { id: versionId, policyId: id },
    });

    if (!version) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }

    return version;
  }

  async rollback(
    tenantId: string,
    id: string,
    versionId: string,
    userId: string,
  ): Promise<Policy> {
    const policy = await this.findOne(tenantId, id);
    const targetVersion = await this.getVersion(tenantId, id, versionId);

    // Create a new version with the old config
    const newVersion = policy.currentVersion + 1;

    const version = this.versionRepository.create({
      policyId: id,
      version: newVersion,
      config: targetVersion.config,
      createdBy: userId,
      changelog: `Rollback to version ${targetVersion.version}`,
    });

    await this.versionRepository.save(version);

    policy.currentVersion = newVersion;
    await this.policyRepository.save(policy);

    this.logger.log(
      `Policy ${id} rolled back to version ${targetVersion.version} (now version ${newVersion})`,
    );
    return policy;
  }

  async findByLocationId(locationId: string): Promise<PolicyVersion | null> {
    // This would be used by the policy service to get compiled policy
    // Implementation depends on location-policy relationship
    return null;
  }
}
