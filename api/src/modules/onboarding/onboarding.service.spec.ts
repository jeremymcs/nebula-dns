import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingService } from './onboarding.service';
import { OnboardingProgress } from './entities/onboarding-progress.entity';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let repository: jest.Mocked<Repository<OnboardingProgress>>;

  const mockProgress: OnboardingProgress = {
    id: 'progress-1',
    tenantId: 'tenant-1',
    tenant: null as any,
    currentStep: 'location',
    stepsCompleted: [
      { id: 'welcome', completed: true, completedAt: new Date().toISOString() },
      { id: 'location', completed: false },
    ],
    completedAt: null,
    skippedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        {
          provide: getRepositoryToken(OnboardingProgress),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
    repository = module.get(getRepositoryToken(OnboardingProgress));
  });

  describe('getProgress', () => {
    it('should return existing progress for tenant', async () => {
      repository.findOne.mockResolvedValue(mockProgress);

      const result = await service.getProgress('tenant-1');

      expect(result).toEqual(mockProgress);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
      });
    });

    it('should create new progress if none exists', async () => {
      repository.findOne.mockResolvedValue(null);
      const newProgress = {
        ...mockProgress,
        stepsCompleted: [
          { id: 'welcome', completed: false },
          { id: 'location', completed: false },
          { id: 'policy', completed: false },
          { id: 'configure', completed: false },
          { id: 'verify', completed: false },
        ],
        currentStep: 'welcome',
      };
      repository.create.mockReturnValue(newProgress);
      repository.save.mockResolvedValue(newProgress);

      const result = await service.getProgress('tenant-1');

      expect(result.currentStep).toBe('welcome');
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('updateProgress', () => {
    it('should update current step', async () => {
      repository.findOne.mockResolvedValue(mockProgress);
      const updated = { ...mockProgress, currentStep: 'policy' };
      repository.save.mockResolvedValue(updated);

      const result = await service.updateProgress('tenant-1', 'policy');

      expect(result.currentStep).toBe('policy');
    });

    it('should mark step as completed', async () => {
      repository.findOne.mockResolvedValue(mockProgress);
      const updated = {
        ...mockProgress,
        stepsCompleted: [
          { id: 'welcome', completed: true, completedAt: expect.any(String) },
          { id: 'location', completed: true, completedAt: expect.any(String) },
        ],
      };
      repository.save.mockResolvedValue(updated);

      const result = await service.updateProgress(
        'tenant-1',
        undefined,
        'location',
      );

      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('completeOnboarding', () => {
    it('should mark onboarding as completed', async () => {
      repository.findOne.mockResolvedValue(mockProgress);
      const completed = {
        ...mockProgress,
        completedAt: new Date(),
      };
      repository.save.mockResolvedValue(completed);

      const result = await service.completeOnboarding('tenant-1');

      expect(result.completedAt).not.toBeNull();
    });

    it('should mark onboarding as skipped', async () => {
      repository.findOne.mockResolvedValue(mockProgress);
      const skipped = {
        ...mockProgress,
        skippedAt: new Date(),
      };
      repository.save.mockResolvedValue(skipped);

      const result = await service.completeOnboarding('tenant-1', true);

      expect(result.skippedAt).not.toBeNull();
    });
  });

  describe('resetProgress', () => {
    it('should reset all progress', async () => {
      repository.findOne.mockResolvedValue(mockProgress);
      const reset = {
        ...mockProgress,
        currentStep: 'welcome',
        completedAt: null,
        skippedAt: null,
      };
      repository.save.mockResolvedValue(reset);

      const result = await service.resetProgress('tenant-1');

      expect(result.currentStep).toBe('welcome');
      expect(result.completedAt).toBeNull();
    });
  });
});
