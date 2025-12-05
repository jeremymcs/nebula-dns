import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Policy } from './entities/policy.entity';
import { CreatePolicyDto } from './dto/create-policy.dto';

@Injectable()
export class PoliciesService {
  constructor(
    @InjectRepository(Policy)
    private policiesRepository: Repository<Policy>,
    private dataSource: DataSource,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<Policy[]> {
    const query = this.policiesRepository.createQueryBuilder('policy')
      .where('policy.tenant_id = :tenantId', { tenantId });

    if (filters?.is_active !== undefined) {
      query.andWhere('policy.isActive = :isActive', { isActive: filters.is_active });
    }

    return query.orderBy('policy.version', 'DESC').getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Policy> {
    const policy = await this.policiesRepository.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!policy) {
      throw new NotFoundException('Policy not found');
    }

    return policy;
  }

  async create(tenantId: string, userId: string, createPolicyDto: CreatePolicyDto): Promise<Policy> {
    // Get latest version for this tenant
    const latest = await this.policiesRepository.findOne({
      where: { tenant_id: tenantId },
      order: { version: 'DESC' },
    });

    const version = latest ? latest.version + 1 : 1;

    const policy = this.policiesRepository.create({
      tenant_id: tenantId,
      name: createPolicyDto.name,
      version,
      description: createPolicyDto.description,
      config: createPolicyDto.config,
      isActive: false,
      createdBy: userId,
    });

    return this.policiesRepository.save(policy);
  }

  async activate(id: string, tenantId: string): Promise<Policy> {
    return this.dataSource.transaction(async (manager) => {
      // Deactivate current active policy
      await manager.update(
        Policy,
        { tenant_id: tenantId, isActive: true },
        { isActive: false },
      );

      // Activate new policy
      const policy = await manager.findOne(Policy, {
        where: { id, tenant_id: tenantId },
      });

      if (!policy) {
        throw new NotFoundException('Policy not found');
      }

      policy.isActive = true;
      return manager.save(policy);
    });
  }
}
