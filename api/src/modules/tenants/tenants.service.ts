import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { slug } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with slug ${slug} not found`);
    }
    return tenant;
  }

  async update(id: string, updateDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findById(id);
    
    Object.assign(tenant, updateDto);
    await this.tenantRepository.save(tenant);

    this.logger.log(`Tenant ${id} updated`);
    return tenant;
  }

  async create(name: string, slug: string): Promise<Tenant> {
    const tenant = this.tenantRepository.create({
      name,
      slug,
      status: 'active',
      plan: 'free',
    });

    await this.tenantRepository.save(tenant);
    this.logger.log(`Tenant ${tenant.id} created: ${name}`);
    
    return tenant;
  }
}
