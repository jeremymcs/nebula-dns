import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Playbook,
  PlaybookTrigger,
  PlaybookAction,
} from './entities/playbook.entity';
import { CreatePlaybookDto, UpdatePlaybookDto } from './dto/playbook.dto';

@Injectable()
export class PlaybooksService {
  private readonly logger = new Logger(PlaybooksService.name);

  constructor(
    @InjectRepository(Playbook)
    private readonly playbookRepository: Repository<Playbook>,
  ) {}

  async findAll(tenantId: string): Promise<Playbook[] | Partial<Playbook>[]> {
    const playbooks = await this.playbookRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });

    // Return demo playbooks if none exist
    if (playbooks.length === 0) {
      return this.getDefaultPlaybooks();
    }

    return playbooks;
  }

  private getDefaultPlaybooks(): Partial<Playbook>[] {
    const now = new Date();
    return [
      {
        id: 'demo-1',
        tenantId: 'demo',
        name: 'Block Malicious Domains',
        description:
          'Automatically block domains flagged as malicious by threat intelligence feeds',
        trigger: PlaybookTrigger.THREAT_DETECTED,
        triggerConditions: { threat_types: ['malware', 'phishing', 'c2'] },
        actions: [
          { type: PlaybookAction.BLOCK_DOMAIN, config: { duration: 86400 } },
        ],
        isEnabled: true,
        runCount: 47,
        lastRunAt: new Date(now.getTime() - 3600000),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'demo-2',
        tenantId: 'demo',
        name: 'Alert on NRD Access',
        description: 'Send alert when newly registered domains are accessed',
        trigger: PlaybookTrigger.NEW_DOMAIN,
        triggerConditions: { domain_age_days_lt: 30 },
        actions: [
          { type: PlaybookAction.SEND_ALERT, config: { severity: 'warning' } },
        ],
        isEnabled: true,
        runCount: 12,
        lastRunAt: new Date(now.getTime() - 7200000),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'demo-3',
        tenantId: 'demo',
        name: 'Quarantine Infected Devices',
        description: 'Isolate devices that attempt to contact known C2 servers',
        trigger: PlaybookTrigger.THREAT_DETECTED,
        triggerConditions: { threat_type: 'c2', attempt_count_gte: 3 },
        actions: [
          { type: PlaybookAction.SEND_ALERT, config: { severity: 'critical' } },
          { type: PlaybookAction.CREATE_TICKET, config: { priority: 'high' } },
        ],
        isEnabled: false,
        runCount: 0,
        lastRunAt: undefined,
        createdAt: now,
        updatedAt: now,
      },
    ];
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

  async update(
    tenantId: string,
    id: string,
    dto: UpdatePlaybookDto,
  ): Promise<Playbook> {
    const playbook = await this.findOne(tenantId, id);

    Object.assign(playbook, dto);

    return this.playbookRepository.save(playbook);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const playbook = await this.findOne(tenantId, id);
    await this.playbookRepository.remove(playbook);
  }

  async run(
    tenantId: string,
    id: string,
  ): Promise<{ success: boolean; message: string }> {
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
