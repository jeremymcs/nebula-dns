import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaybooksService } from './playbooks.service';
import {
  Playbook,
  PlaybookTrigger,
  PlaybookAction,
} from './entities/playbook.entity';
import { NotFoundException } from '@nestjs/common';

describe('PlaybooksService', () => {
  let service: PlaybooksService;
  let repository: jest.Mocked<Repository<Playbook>>;

  const mockPlaybook: Playbook = {
    id: 'playbook-1',
    tenantId: 'tenant-1',
    tenant: null as any,
    name: 'Test Playbook',
    description: 'A test playbook',
    trigger: PlaybookTrigger.THREAT_DETECTED,
    triggerConditions: { threat_types: ['malware'] },
    actions: [
      { type: PlaybookAction.BLOCK_DOMAIN, config: { duration: 3600 } },
    ],
    isEnabled: true,
    runCount: 5,
    lastRunAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaybooksService,
        {
          provide: getRepositoryToken(Playbook),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PlaybooksService>(PlaybooksService);
    repository = module.get(getRepositoryToken(Playbook));
  });

  describe('findAll', () => {
    it('should return all playbooks for tenant', async () => {
      repository.find.mockResolvedValue([mockPlaybook]);

      const result = await service.findAll('tenant-1');

      expect(result).toEqual([mockPlaybook]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return default playbooks when none exist', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll('tenant-1');

      expect(result.length).toBe(3);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('trigger');
    });
  });

  describe('findOne', () => {
    it('should return a playbook by id', async () => {
      repository.findOne.mockResolvedValue(mockPlaybook);

      const result = await service.findOne('tenant-1', 'playbook-1');

      expect(result).toEqual(mockPlaybook);
    });

    it('should throw NotFoundException when playbook not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('tenant-1', 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new playbook', async () => {
      const createDto = {
        name: 'New Playbook',
        description: 'A new playbook',
        trigger: PlaybookTrigger.MANUAL,
        actions: [],
      };
      repository.create.mockReturnValue({ ...mockPlaybook, ...createDto });
      repository.save.mockResolvedValue({ ...mockPlaybook, ...createDto });

      const result = await service.create('tenant-1', createDto);

      expect(result.name).toBe('New Playbook');
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a playbook', async () => {
      const updateDto = { name: 'Updated Playbook', isEnabled: false };
      repository.findOne.mockResolvedValue(mockPlaybook);
      repository.save.mockResolvedValue({ ...mockPlaybook, ...updateDto });

      const result = await service.update('tenant-1', 'playbook-1', updateDto);

      expect(result.name).toBe('Updated Playbook');
      expect(result.isEnabled).toBe(false);
    });
  });

  describe('run', () => {
    it('should increment run count and update lastRunAt', async () => {
      repository.findOne.mockResolvedValue({ ...mockPlaybook, runCount: 5 });
      repository.save.mockResolvedValue({
        ...mockPlaybook,
        runCount: 6,
        lastRunAt: new Date(),
      });

      const result = await service.run('tenant-1', 'playbook-1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('executed successfully');
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a playbook', async () => {
      repository.findOne.mockResolvedValue(mockPlaybook);
      repository.remove.mockResolvedValue(mockPlaybook);

      await service.remove('tenant-1', 'playbook-1');

      expect(repository.remove).toHaveBeenCalledWith(mockPlaybook);
    });
  });
});
