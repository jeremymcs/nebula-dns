// Nebula DNS - Trials Service Integration Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TrialsService } from './trials.service';
import { TrialHistory, TrialStatus } from './entities/trial-history.entity';
import { Tenant, TenantTier } from '../tenants/entities/tenant.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { EmailService } from '../email/email.service';
import { PaymentsService } from '../payments/payments.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ALL_TEST_ENTITIES } from '../../test/all-entities';

/**
 * TrialsService Integration Tests
 *
 * These tests verify:
 * - Trial start
 * - Trial conversion
 * - Trial expiration
 * - Trial cancellation
 *
 * Uses in-memory database for isolation.
 */
describe('TrialsService Integration', () => {
  let module: TestingModule;
  let trialsService: TrialsService;
  let trialHistoryRepository: Repository<TrialHistory>;
  let tenantRepository: Repository<Tenant>;
  let subscriptionRepository: Repository<Subscription>;
  let emailService: EmailService;
  let paymentsService: PaymentsService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: ALL_TEST_ENTITIES,
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([TrialHistory, Tenant, Subscription]),
      ],
      providers: [
        TrialsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'FRONTEND_URL') return 'http://localhost:4011';
              return null;
            }),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendFamilyInviteEmail: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: PaymentsService,
          useValue: {
            isConfigured: jest.fn().mockReturnValue(false),
            createCheckoutSession: jest.fn().mockResolvedValue({
              sessionId: 'session_123',
              url: 'https://checkout.stripe.com/session_123',
            }),
          },
        },
      ],
    }).compile();

    trialsService = module.get<TrialsService>(TrialsService);
    trialHistoryRepository = module.get(getRepositoryToken(TrialHistory));
    tenantRepository = module.get(getRepositoryToken(Tenant));
    subscriptionRepository = module.get(getRepositoryToken(Subscription));
    emailService = module.get<EmailService>(EmailService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    // Clear database
    await trialHistoryRepository.delete({});
    await subscriptionRepository.delete({});
    await tenantRepository.delete({});
    jest.clearAllMocks();
  });

  describe('startTrial', () => {
    it('should start trial for higher tier', async () => {
      // Create Home tier tenant
      const tenant = tenantRepository.create({
        name: 'Home User',
        slug: 'home-user',
        tier: 'home',
        contactEmail: 'user@example.com',
      });
      await tenantRepository.save(tenant);

      // Start Enterprise trial
      const result = await trialsService.startTrial(tenant.id, {
        tier: 'enterprise',
        billingCycle: 'monthly',
      });

      expect(result.success).toBe(true);
      expect(result.trialTier).toBe('enterprise');
      expect(result.trialDays).toBe(14);
      expect(result.endsAt).toBeDefined();

      // Verify tenant tier upgraded
      const updatedTenant = await tenantRepository.findOne({
        where: { id: tenant.id },
      });
      expect(updatedTenant!.tier).toBe('enterprise');

      // Verify trial history created
      const trial = await trialHistoryRepository.findOne({
        where: { tenantId: tenant.id },
      });
      expect(trial).toBeDefined();
      expect(trial!.trialTier).toBe('enterprise');
      expect(trial!.originalTier).toBe('home');
      expect(trial!.status).toBe('active');
    });

    it('should reject trial for same or lower tier', async () => {
      const tenant = tenantRepository.create({
        name: 'Enterprise User',
        slug: 'enterprise-user',
        tier: 'enterprise',
      });
      await tenantRepository.save(tenant);

      // Try to trial Home tier (lower)
      await expect(
        trialsService.startTrial(tenant.id, {
          tier: 'home',
          billingCycle: 'monthly',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject trial if already has active trial', async () => {
      const tenant = tenantRepository.create({
        name: 'Test User',
        slug: 'test-user',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      // Start first trial
      await trialsService.startTrial(tenant.id, {
        tier: 'enterprise',
        billingCycle: 'monthly',
      });

      // Try to start another trial
      await expect(
        trialsService.startTrial(tenant.id, {
          tier: 'msp',
          billingCycle: 'monthly',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject second trial of same tier', async () => {
      const tenant = tenantRepository.create({
        name: 'Test User',
        slug: 'test-user',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      // Start and complete Enterprise trial
      await trialsService.startTrial(tenant.id, {
        tier: 'enterprise',
        billingCycle: 'monthly',
      });

      // Cancel the trial (to end it)
      await trialsService.cancelTrial(tenant.id);

      // Try to trial Enterprise again
      await expect(
        trialsService.startTrial(tenant.id, {
          tier: 'enterprise',
          billingCycle: 'monthly',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTrialStatus', () => {
    it('should return active trial status', async () => {
      const tenant = tenantRepository.create({
        name: 'Test User',
        slug: 'test-user',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      await trialsService.startTrial(tenant.id, {
        tier: 'enterprise',
        billingCycle: 'monthly',
      });

      const status = await trialsService.getTrialStatus(tenant.id);

      expect(status.hasActiveTrial).toBe(true);
      expect(status.trialTier).toBe('enterprise');
      expect(status.originalTier).toBe('home');
      expect(status.daysRemaining).toBeGreaterThan(0);
      expect(status.availableTrials).toHaveLength(0); // No trials available during active trial
    });

    it('should return available trials when no active trial', async () => {
      const tenant = tenantRepository.create({
        name: 'Test User',
        slug: 'test-user',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      const status = await trialsService.getTrialStatus(tenant.id);

      expect(status.hasActiveTrial).toBe(false);
      expect(status.availableTrials).toContain('enterprise');
      expect(status.availableTrials).toContain('msp');
    });

    it('should exclude already-trialed tiers from available trials', async () => {
      const tenant = tenantRepository.create({
        name: 'Test User',
        slug: 'test-user',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      // Start and cancel Enterprise trial
      await trialsService.startTrial(tenant.id, {
        tier: 'enterprise',
        billingCycle: 'monthly',
      });
      await trialsService.cancelTrial(tenant.id);

      const status = await trialsService.getTrialStatus(tenant.id);

      expect(status.hasActiveTrial).toBe(false);
      expect(status.availableTrials).not.toContain('enterprise');
      expect(status.availableTrials).toContain('msp');
    });
  });

  describe('convertTrial', () => {
    it('should convert trial in development mode', async () => {
      const tenant = tenantRepository.create({
        name: 'Test User',
        slug: 'test-user',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      const trial = await trialsService.startTrial(tenant.id, {
        tier: 'enterprise',
        billingCycle: 'monthly',
      });

      // PaymentsService.isConfigured() returns false (dev mode)
      const result = await trialsService.convertTrial(
        tenant.id,
        'user-123',
        'user@example.com',
        {
          billingCycle: 'monthly',
        },
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('development mode');

      // Verify trial marked as converted
      const updatedTrial = await trialHistoryRepository.findOne({
        where: { tenantId: tenant.id },
      });
      expect(updatedTrial!.status).toBe('converted');
      expect(updatedTrial!.convertedAt).toBeDefined();
    });

    it('should create Stripe checkout session in production mode', async () => {
      jest.spyOn(paymentsService, 'isConfigured').mockReturnValue(true);

      const tenant = tenantRepository.create({
        name: 'Test User',
        slug: 'test-user',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      await trialsService.startTrial(tenant.id, {
        tier: 'enterprise',
        billingCycle: 'monthly',
      });

      const result = await trialsService.convertTrial(
        tenant.id,
        'user-123',
        'user@example.com',
        {
          billingCycle: 'yearly',
        },
      );

      expect(result.success).toBe(true);
      expect(result.checkoutUrl).toBeDefined();
      expect(result.sessionId).toBe('session_123');

      // Verify Stripe checkout was created
      expect(paymentsService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          billingCycle: 'yearly',
          tenantId: tenant.id,
        }),
      );
    });

    it('should throw error if no active trial', async () => {
      const tenant = tenantRepository.create({
        name: 'Test User',
        slug: 'test-user',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      await expect(
        trialsService.convertTrial(tenant.id, 'user-123', 'user@example.com', {
          billingCycle: 'monthly',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelTrial', () => {
    it('should cancel trial and revert to original tier', async () => {
      const tenant = tenantRepository.create({
        name: 'Test User',
        slug: 'test-user',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      // Start trial
      await trialsService.startTrial(tenant.id, {
        tier: 'enterprise',
        billingCycle: 'monthly',
      });

      // Verify tenant upgraded
      let updatedTenant = await tenantRepository.findOne({
        where: { id: tenant.id },
      });
      expect(updatedTenant!.tier).toBe('enterprise');

      // Cancel trial
      await trialsService.cancelTrial(tenant.id, 'Changed my mind');

      // Verify tenant reverted
      updatedTenant = await tenantRepository.findOne({
        where: { id: tenant.id },
      });
      expect(updatedTenant!.tier).toBe('home');

      // Verify trial status
      const trial = await trialHistoryRepository.findOne({
        where: { tenantId: tenant.id },
      });
      expect(trial!.status).toBe('cancelled');
      expect(trial!.endedAt).toBeDefined();
      expect((trial!.metadata as any).cancellationReason).toBe(
        'Changed my mind',
      );
    });

    it('should throw error if no active trial', async () => {
      const tenant = tenantRepository.create({
        name: 'Test User',
        slug: 'test-user',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      await expect(trialsService.cancelTrial(tenant.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleExpiredTrials', () => {
    it('should expire trials that have passed end date', async () => {
      const tenant = tenantRepository.create({
        name: 'Test User',
        slug: 'test-user',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      // Create an expired trial manually
      const expiredTrial = trialHistoryRepository.create({
        tenantId: tenant.id,
        trialTier: 'enterprise',
        originalTier: 'home',
        startedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        endsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        status: 'active',
        warningEmailSent: true,
      });
      await trialHistoryRepository.save(expiredTrial);

      // Update tenant to enterprise (as if trial was active)
      tenant.tier = 'enterprise';
      await tenantRepository.save(tenant);

      // Run expiration job
      await trialsService.handleExpiredTrials();

      // Verify trial expired
      const updatedTrial = await trialHistoryRepository.findOne({
        where: { id: expiredTrial.id },
      });
      expect(updatedTrial!.status).toBe('expired');
      expect(updatedTrial!.endedAt).toBeDefined();

      // Verify tenant downgraded
      const updatedTenant = await tenantRepository.findOne({
        where: { id: tenant.id },
      });
      expect(updatedTenant!.tier).toBe('home');
    });

    it('should not expire trials that have not ended', async () => {
      const tenant = tenantRepository.create({
        name: 'Test User',
        slug: 'test-user',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      // Start active trial
      await trialsService.startTrial(tenant.id, {
        tier: 'enterprise',
        billingCycle: 'monthly',
      });

      // Run expiration job
      await trialsService.handleExpiredTrials();

      // Verify trial still active
      const trial = await trialHistoryRepository.findOne({
        where: { tenantId: tenant.id },
      });
      expect(trial!.status).toBe('active');
    });
  });

  describe('getTrialHistory', () => {
    it('should return all trials for tenant ordered by date', async () => {
      const tenant = tenantRepository.create({
        name: 'Test User',
        slug: 'test-user',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      // Create multiple trials
      const trial1 = trialHistoryRepository.create({
        tenantId: tenant.id,
        trialTier: 'enterprise',
        originalTier: 'home',
        startedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
        status: 'expired',
      });
      await trialHistoryRepository.save(trial1);

      // Start new trial
      await trialsService.startTrial(tenant.id, {
        tier: 'msp',
        billingCycle: 'monthly',
      });

      const history = await trialsService.getTrialHistory(tenant.id);

      expect(history).toHaveLength(2);
      // Should be ordered newest first
      expect(history[0].trialTier).toBe('msp');
      expect(history[1].trialTier).toBe('enterprise');
    });
  });

  describe('completeConversion', () => {
    it('should complete conversion and update subscription', async () => {
      const tenant = tenantRepository.create({
        name: 'Test User',
        slug: 'test-user',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      // Create subscription
      const subscription = subscriptionRepository.create({
        tenantId: tenant.id,
        planId: 'free',
        status: 'trialing',
      });
      await subscriptionRepository.save(subscription);

      // Start trial
      await trialsService.startTrial(tenant.id, {
        tier: 'enterprise',
        billingCycle: 'monthly',
      });

      // Complete conversion
      await trialsService.completeConversion(tenant.id, 'user-123');

      // Verify trial converted
      const trial = await trialHistoryRepository.findOne({
        where: { tenantId: tenant.id },
      });
      expect(trial!.status).toBe('converted');

      // Verify subscription updated
      const updatedSub = await subscriptionRepository.findOne({
        where: { tenantId: tenant.id },
      });
      expect(updatedSub!.status).toBe('active');
      expect(updatedSub!.planId).toBe('pro'); // enterprise tier maps to 'pro' plan
    });
  });

  describe('checkExpiringTrials', () => {
    it('should send warning emails for trials ending soon', async () => {
      const tenant = tenantRepository.create({
        name: 'Test User',
        slug: 'test-user',
        tier: 'home',
        contactEmail: 'user@example.com',
      });
      await tenantRepository.save(tenant);

      // Create trial ending in 2 days (within warning threshold of 3 days)
      const trial = trialHistoryRepository.create({
        tenantId: tenant.id,
        trialTier: 'enterprise',
        originalTier: 'home',
        startedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
        endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        status: 'active',
        warningEmailSent: false,
      });
      await trialHistoryRepository.save(trial);

      tenant.tier = 'enterprise';
      await tenantRepository.save(tenant);

      // Run warning check
      await trialsService.checkExpiringTrials();

      // Verify warning email flag set
      const updatedTrial = await trialHistoryRepository.findOne({
        where: { id: trial.id },
      });
      expect(updatedTrial!.warningEmailSent).toBe(true);
    });

    it('should not send warning for trials not ending soon', async () => {
      const tenant = tenantRepository.create({
        name: 'Test User',
        slug: 'test-user',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      // Create trial ending in 10 days (outside warning threshold)
      const trial = trialHistoryRepository.create({
        tenantId: tenant.id,
        trialTier: 'enterprise',
        originalTier: 'home',
        startedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: 'active',
        warningEmailSent: false,
      });
      await trialHistoryRepository.save(trial);

      await trialsService.checkExpiringTrials();

      // Verify warning email not sent
      const updatedTrial = await trialHistoryRepository.findOne({
        where: { id: trial.id },
      });
      expect(updatedTrial!.warningEmailSent).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should throw NotFoundException for non-existent tenant', async () => {
      await expect(
        trialsService.startTrial('non-existent-id', {
          tier: 'enterprise',
          billingCycle: 'monthly',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
