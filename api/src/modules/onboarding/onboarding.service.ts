/**
 * Onboarding Service
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingProgress, OnboardingStep } from './entities/onboarding-progress.entity';

const DEFAULT_STEPS = ['welcome', 'location', 'policy', 'configure', 'verify'];

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectRepository(OnboardingProgress)
    private readonly progressRepository: Repository<OnboardingProgress>,
  ) {}

  async getProgress(tenantId: string): Promise<OnboardingProgress> {
    let progress = await this.progressRepository.findOne({
      where: { tenantId },
    });

    if (!progress) {
      // Create new progress record
      progress = this.progressRepository.create({
        tenantId,
        currentStep: 'welcome',
        stepsCompleted: DEFAULT_STEPS.map(id => ({ id, completed: false })),
      });
      progress = await this.progressRepository.save(progress);
    }

    return progress;
  }

  async updateProgress(tenantId: string, currentStep?: string, completeStep?: string): Promise<OnboardingProgress> {
    let progress = await this.getProgress(tenantId);

    if (currentStep) {
      progress.currentStep = currentStep;
    }

    if (completeStep) {
      const stepIndex = progress.stepsCompleted.findIndex(s => s.id === completeStep);
      if (stepIndex >= 0) {
        progress.stepsCompleted[stepIndex] = {
          ...progress.stepsCompleted[stepIndex],
          completed: true,
          completedAt: new Date().toISOString(),
        };
      } else {
        progress.stepsCompleted.push({
          id: completeStep,
          completed: true,
          completedAt: new Date().toISOString(),
        });
      }
    }

    return this.progressRepository.save(progress);
  }

  async completeOnboarding(tenantId: string, skipped = false): Promise<OnboardingProgress> {
    const progress = await this.getProgress(tenantId);

    if (skipped) {
      progress.skippedAt = new Date();
    } else {
      progress.completedAt = new Date();
      // Mark all steps as completed
      progress.stepsCompleted = progress.stepsCompleted.map(step => ({
        ...step,
        completed: true,
        completedAt: step.completedAt || new Date().toISOString(),
      }));
    }

    return this.progressRepository.save(progress);
  }

  async resetProgress(tenantId: string): Promise<OnboardingProgress> {
    const progress = await this.getProgress(tenantId);
    
    progress.currentStep = 'welcome';
    progress.stepsCompleted = DEFAULT_STEPS.map(id => ({ id, completed: false }));
    progress.completedAt = null;
    progress.skippedAt = null;

    return this.progressRepository.save(progress);
  }
}

