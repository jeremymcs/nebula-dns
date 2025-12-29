import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Playbook } from './entities/playbook.entity';
import { CreatePlaybookDto, UpdatePlaybookDto } from './dto/playbook.dto';

@Injectable()
export class PlaybooksService {
  private readonly logger = new Logger(PlaybooksService.name);

  constructor(
    @InjectRepository(Playbook)
    private readonly playbookRepository: Repository<Playbook>,
  ) {}

  async findAll(tenantId: string): Promise<Playbook[]> {
    return this.playbookRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Playbook> {
    const playbook = await this.playbookRepository.findOne({
      where: { id, tenantId },
    });

    if (!playbook) {
      throw new NotFoundException('Playbook not found');
    }

    return playbook;
  }

  async create(tenantId: string, dto: CreatePlaybookDto): Promise<Playbook> {
    const playbook = this.playbookRepository.create({
      ...dto,
      tenantId,
    });

    return this.playbookRepository.save(playbook);
  }

  async update(tenantId: string, id: string, dto: UpdatePlaybookDto): Promise<Playbook> {
    const playbook = await this.findOne(tenantId, id);

    Object.assign(playbook, dto);

    return this.playbookRepository.save(playbook);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const playbook = await this.findOne(tenantId, id);
    await this.playbookRepository.remove(playbook);
  }

  async run(tenantId: string, id: string): Promise<{ success: boolean; message: string }> {
    const playbook = await this.findOne(tenantId, id);

    this.logger.log(`Running playbook ${playbook.name} for tenant ${tenantId}`);

    // Update run count and last run time
    playbook.runCount += 1;
    playbook.lastRunAt = new Date();
    await this.playbookRepository.save(playbook);

    // In a real implementation, this would execute the playbook actions
    // For now, we just log and return success
    return {
      success: true,
      message: `Playbook "${playbook.name}" executed successfully`,
    };
  }
}

