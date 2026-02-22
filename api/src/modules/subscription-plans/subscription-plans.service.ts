// Nebula DNS - Subscription Plans Service
// Service for managing subscription plan limits
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SubscriptionPlanLimit,
  SubscriptionTier,
} from './entities/subscription-plan-limit.entity';
import {
  CreateSubscriptionPlanLimitDto,
  UpdateSubscriptionPlanLimitDto,
} from './dto/subscription-plan.dto';

@Injectable()
export class SubscriptionPlansService {
  private readonly logger = new Logger(SubscriptionPlansService.name);

  constructor(
    @InjectRepository(SubscriptionPlanLimit)
    private readonly planLimitsRepository: Repository<SubscriptionPlanLimit>,
  ) {}

  /**
   * Get all subscription plan limits
   */
  async findAll(options?: {
    tier?: SubscriptionTier;
    isActive?: boolean;
  }): Promise<SubscriptionPlanLimit[]> {
    const queryBuilder = this.planLimitsRepository.createQueryBuilder('plan');

    if (options?.tier) {
      queryBuilder.andWhere('plan.tier = :tier', { tier: options.tier });
    }

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('plan.is_active = :isActive', {
        isActive: options.isActive,
      });
    }

    return queryBuilder
      .orderBy('plan.tier', 'ASC')
      .addOrderBy('plan.base_price', 'ASC')
      .getMany();
  }

  /**
   * Get a subscription plan limit by ID
   */
  async findById(id: string): Promise<SubscriptionPlanLimit> {
    const planLimit = await this.planLimitsRepository.findOne({
      where: { id },
    });

    if (!planLimit) {
      throw new NotFoundException(`Subscription plan limit not found: ${id}`);
    }

    return planLimit;
  }

  /**
   * Get a subscription plan limit by Stripe price ID
   */
  async findByStripePriceId(
    stripePriceId: string,
  ): Promise<SubscriptionPlanLimit> {
    const planLimit = await this.planLimitsRepository.findOne({
      where: { stripePriceId },
    });

    if (!planLimit) {
      throw new NotFoundException(
        `Subscription plan limit not found for Stripe price ID: ${stripePriceId}`,
      );
    }

    return planLimit;
  }

  /**
   * Get subscription plan limits by tier
   */
  async findByTier(tier: SubscriptionTier): Promise<SubscriptionPlanLimit[]> {
    return this.planLimitsRepository.find({
      where: { tier, isActive: true },
      order: { basePrice: 'ASC' },
    });
  }

  /**
   * Get limits for a given Stripe price ID (convenience method)
   * Returns the limits configuration for billing enforcement
   */
  async getLimitsByStripePriceId(stripePriceId: string): Promise<{
    locationLimit: number | null;
    clientLimit: number | null;
    familyMemberLimit: number;
    pricePerLocation: number | null;
    pricePerClient: number | null;
    trialDays: number;
  }> {
    const planLimit = await this.findByStripePriceId(stripePriceId);

    return {
      locationLimit: planLimit.locationLimit,
      clientLimit: planLimit.clientLimit,
      familyMemberLimit: planLimit.familyMemberLimit,
      pricePerLocation: planLimit.pricePerLocation
        ? Number(planLimit.pricePerLocation)
        : null,
      pricePerClient: planLimit.pricePerClient
        ? Number(planLimit.pricePerClient)
        : null,
      trialDays: planLimit.trialDays,
    };
  }

  /**
   * Create a new subscription plan limit
   */
  async create(
    dto: CreateSubscriptionPlanLimitDto,
  ): Promise<SubscriptionPlanLimit> {
    // Check for duplicate Stripe price ID
    const existing = await this.planLimitsRepository.findOne({
      where: { stripePriceId: dto.stripePriceId },
    });

    if (existing) {
      throw new ConflictException(
        `Subscription plan limit already exists for Stripe price ID: ${dto.stripePriceId}`,
      );
    }

    const planLimit = this.planLimitsRepository.create({
      stripePriceId: dto.stripePriceId,
      name: dto.name,
      tier: dto.tier,
      locationLimit: dto.locationLimit ?? null,
      clientLimit: dto.clientLimit ?? null,
      familyMemberLimit: dto.familyMemberLimit ?? 5,
      pricePerLocation: dto.pricePerLocation ?? null,
      pricePerClient: dto.pricePerClient ?? null,
      basePrice: dto.basePrice,
      trialDays: dto.trialDays ?? 14,
      isActive: true,
    });

    const saved = await this.planLimitsRepository.save(planLimit);
    this.logger.log(
      `Created subscription plan limit: ${saved.name} (${saved.stripePriceId})`,
    );

    return saved;
  }

  /**
   * Update a subscription plan limit
   */
  async update(
    id: string,
    dto: UpdateSubscriptionPlanLimitDto,
  ): Promise<SubscriptionPlanLimit> {
    const planLimit = await this.findById(id);

    // Apply updates
    if (dto.name !== undefined) planLimit.name = dto.name;
    if (dto.locationLimit !== undefined)
      planLimit.locationLimit = dto.locationLimit;
    if (dto.clientLimit !== undefined) planLimit.clientLimit = dto.clientLimit;
    if (dto.familyMemberLimit !== undefined)
      planLimit.familyMemberLimit = dto.familyMemberLimit;
    if (dto.pricePerLocation !== undefined)
      planLimit.pricePerLocation = dto.pricePerLocation;
    if (dto.pricePerClient !== undefined)
      planLimit.pricePerClient = dto.pricePerClient;
    if (dto.basePrice !== undefined) planLimit.basePrice = dto.basePrice;
    if (dto.trialDays !== undefined) planLimit.trialDays = dto.trialDays;
    if (dto.isActive !== undefined) planLimit.isActive = dto.isActive;

    const updated = await this.planLimitsRepository.save(planLimit);
    this.logger.log(
      `Updated subscription plan limit: ${updated.name} (${updated.id})`,
    );

    return updated;
  }

  /**
   * Deactivate a subscription plan limit (soft delete)
   */
  async deactivate(id: string): Promise<SubscriptionPlanLimit> {
    const planLimit = await this.findById(id);
    planLimit.isActive = false;

    const updated = await this.planLimitsRepository.save(planLimit);
    this.logger.log(
      `Deactivated subscription plan limit: ${updated.name} (${updated.id})`,
    );

    return updated;
  }

  /**
   * Delete a subscription plan limit (hard delete)
   * Use with caution - generally prefer deactivate
   */
  async delete(id: string): Promise<void> {
    const planLimit = await this.findById(id);

    await this.planLimitsRepository.remove(planLimit);
    this.logger.log(
      `Deleted subscription plan limit: ${planLimit.name} (${id})`,
    );
  }

  /**
   * Check if a tenant would exceed their location limit
   */
  async checkLocationLimit(
    stripePriceId: string,
    currentCount: number,
  ): Promise<{ allowed: boolean; limit: number | null; current: number }> {
    const planLimit = await this.findByStripePriceId(stripePriceId);

    const allowed =
      planLimit.locationLimit === null ||
      currentCount < planLimit.locationLimit;

    return {
      allowed,
      limit: planLimit.locationLimit,
      current: currentCount,
    };
  }

  /**
   * Check if an MSP would exceed their client limit
   */
  async checkClientLimit(
    stripePriceId: string,
    currentCount: number,
  ): Promise<{ allowed: boolean; limit: number | null; current: number }> {
    const planLimit = await this.findByStripePriceId(stripePriceId);

    const allowed =
      planLimit.clientLimit === null || currentCount < planLimit.clientLimit;

    return {
      allowed,
      limit: planLimit.clientLimit,
      current: currentCount,
    };
  }

  /**
   * Check if a family would exceed their member limit
   */
  async checkFamilyMemberLimit(
    stripePriceId: string,
    currentCount: number,
  ): Promise<{ allowed: boolean; limit: number; current: number }> {
    const planLimit = await this.findByStripePriceId(stripePriceId);

    const allowed = currentCount < planLimit.familyMemberLimit;

    return {
      allowed,
      limit: planLimit.familyMemberLimit,
      current: currentCount,
    };
  }

  /**
   * Calculate usage-based charges for a billing period
   */
  async calculateUsageCharges(
    stripePriceId: string,
    locationCount: number,
    clientCount: number,
  ): Promise<{
    basePrice: number;
    locationCharges: number;
    clientCharges: number;
    totalCharges: number;
  }> {
    const planLimit = await this.findByStripePriceId(stripePriceId);

    const basePrice = Number(planLimit.basePrice);

    // Calculate overage charges for locations
    let locationCharges = 0;
    if (
      planLimit.pricePerLocation &&
      planLimit.locationLimit &&
      locationCount > planLimit.locationLimit
    ) {
      const overage = locationCount - planLimit.locationLimit;
      locationCharges = overage * Number(planLimit.pricePerLocation);
    }

    // Calculate overage charges for clients (MSP)
    let clientCharges = 0;
    if (
      planLimit.pricePerClient &&
      planLimit.clientLimit &&
      clientCount > planLimit.clientLimit
    ) {
      const overage = clientCount - planLimit.clientLimit;
      clientCharges = overage * Number(planLimit.pricePerClient);
    }

    // For MSP plans with pricePerClient, all clients are charged
    if (planLimit.tier === 'msp' && planLimit.pricePerClient) {
      clientCharges = clientCount * Number(planLimit.pricePerClient);
    }

    return {
      basePrice,
      locationCharges,
      clientCharges,
      totalCharges: basePrice + locationCharges + clientCharges,
    };
  }
}
