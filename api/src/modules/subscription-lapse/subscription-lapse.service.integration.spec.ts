// Nebula DNS - Subscription Lapse Service Integration Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SubscriptionLapseService } from './subscription-lapse.service';
import { Tenant, SubscriptionStatus } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { MspClient } from '../msp-clients/entities/msp-client.entity';
import { EmailService } from '../email/email.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RedisService } from '../redis/redis.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

/**
 * SubscriptionLapseService Integration Tests
 *
 * These tests verify:
 * - Grace period start
 * - Grace period expiration
 * - Subscription restoration
 * - DNS blocking for suspended tenants
 *
 * Uses in-memory database and mocked Redis/Email for isolation.
 */
describe('SubscriptionLapseService Integration', () => {
  let module: TestingModule;
  let lapseService: SubscriptionLapseService;
  let tenantRepository: Repository<Tenant>;
  let userRepository: Repository<User>;
  let mspClientRepository: Repository<MspClient>;
  let redisService: RedisService;
  let emailService: EmailService;
  let auditLogsService: AuditLogsService;

  // Mock Redis cache
  const mockRedisCache = new Map<string, string>();

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Tenant, User, Subscription, MspClient],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([Tenant, User, Subscription, MspClient]),
      ],
      providers: [
        SubscriptionLapseService,
        {
          provide: RedisService,
          useValue: {
            get: jest
              .fn()
              .mockImplementation((key: string) =>
                Promise.resolve(mockRedisCache.get(key) || null),
              ),
            set: jest.fn().mockImplementation((key: string, value: string) => {
              mockRedisCache.set(key, value);
              return Promise.resolve();
            }),
            del: jest.fn().mockImplementation((key: string) => {
              mockRedisCache.delete(key);
              return Promise.resolve();
            }),
            publish: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendGracePeriodNotification: jest.fn().mockResolvedValue(undefined),
            sendClientGracePeriodNotification: jest
              .fn()
              .mockResolvedValue(undefined),
            sendSuspensionNotification: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AuditLogsService,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'FRONTEND_URL') return 'http://localhost:4011';
              return null;
            }),
          },
        },
      ],
    }).compile();

    lapseService = module.get<SubscriptionLapseService>(
      SubscriptionLapseService,
    );
    tenantRepository = module.get(getRepositoryToken(Tenant));
    userRepository = module.get(getRepositoryToken(User));
    mspClientRepository = module.get(getRepositoryToken(MspClient));
    redisService = module.get<RedisService>(RedisService);
    emailService = module.get<EmailService>(EmailService);
    auditLogsService = module.get<AuditLogsService>(AuditLogsService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    // Clear database
    await mspClientRepository.delete({});
    await userRepository.delete({});
    await tenantRepository.delete({});

    // Clear Redis mock cache
    mockRedisCache.clear();
    jest.clearAllMocks();
  });

  describe('startGracePeriod', () => {
    it('should start grace period for MSP tenant', async () => {
      // Create MSP tenant
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        subscriptionStatus: 'active',
        contactEmail: 'billing@msp.com',
      });
      await tenantRepository.save(mspTenant);

      await lapseService.startGracePeriod(mspTenant.id);

      // Verify tenant status updated
      const updated = await tenantRepository.findOne({
        where: { id: mspTenant.id },
      });
      expect(updated!.subscriptionStatus).toBe('grace');

      // Verify grace start date stored in Redis
      const graceStartKey = `grace_start:${mspTenant.id}`;
      expect(redisService.set).toHaveBeenCalledWith(
        graceStartKey,
        expect.any(String),
        expect.any(Number),
      );

      // Verify audit log
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'subscription_grace_period_started',
          tenantId: mspTenant.id,
        }),
      );

      // Verify notification sent
      expect(emailService.sendGracePeriodNotification).toHaveBeenCalled();
    });

    it('should update client tenants to grace status', async () => {
      // Create MSP tenant
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        subscriptionStatus: 'active',
        contactEmail: 'billing@msp.com',
      });
      await tenantRepository.save(mspTenant);

      // Create client tenants
      const client1 = tenantRepository.create({
        name: 'Client 1',
        slug: 'client-1',
        tier: 'enterprise',
        subscriptionStatus: 'active',
        managedByMspId: mspTenant.id,
      });
      const client2 = tenantRepository.create({
        name: 'Client 2',
        slug: 'client-2',
        tier: 'enterprise',
        subscriptionStatus: 'active',
        managedByMspId: mspTenant.id,
      });
      await tenantRepository.save([client1, client2]);

      // Create MSP-client relationships
      const mspClient1 = mspClientRepository.create({
        mspTenantId: mspTenant.id,
        clientTenantId: client1.id,
        status: 'active',
      });
      const mspClient2 = mspClientRepository.create({
        mspTenantId: mspTenant.id,
        clientTenantId: client2.id,
        status: 'active',
      });
      await mspClientRepository.save([mspClient1, mspClient2]);

      await lapseService.startGracePeriod(mspTenant.id);

      // Verify clients updated to grace
      const updatedClient1 = await tenantRepository.findOne({
        where: { id: client1.id },
      });
      const updatedClient2 = await tenantRepository.findOne({
        where: { id: client2.id },
      });

      expect(updatedClient1!.subscriptionStatus).toBe('grace');
      expect(updatedClient2!.subscriptionStatus).toBe('grace');
    });

    it('should not start grace period if already in grace', async () => {
      // Create MSP tenant already in grace
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        subscriptionStatus: 'grace',
        contactEmail: 'billing@msp.com',
      });
      await tenantRepository.save(mspTenant);

      // Set existing grace start date
      const graceStartDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      mockRedisCache.set(
        `grace_start:${mspTenant.id}`,
        graceStartDate.toISOString(),
      );

      await lapseService.startGracePeriod(mspTenant.id);

      // Should not create new grace start date
      const setCalls = (redisService.set as jest.Mock).mock.calls.filter(
        (call) => call[0] === `grace_start:${mspTenant.id}`,
      );
      expect(setCalls.length).toBe(0);
    });
  });

  describe('getGracePeriodInfo', () => {
    it('should return grace period info for tenant in grace', async () => {
      // Create MSP tenant
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        subscriptionStatus: 'grace',
      });
      await tenantRepository.save(mspTenant);

      // Set grace start date to 10 days ago
      const graceStartDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      mockRedisCache.set(
        `grace_start:${mspTenant.id}`,
        graceStartDate.toISOString(),
      );

      const info = await lapseService.getGracePeriodInfo(mspTenant.id);

      expect(info.subscriptionStatus).toBe('grace');
      expect(info.graceStartDate).toBeDefined();
      expect(info.daysRemaining).toBe(20); // 30-day grace period - 10 days
    });

    it('should return null days remaining for active tenant', async () => {
      // Create active tenant
      const tenant = tenantRepository.create({
        name: 'Active Company',
        slug: 'active-company',
        tier: 'enterprise',
        subscriptionStatus: 'active',
      });
      await tenantRepository.save(tenant);

      const info = await lapseService.getGracePeriodInfo(tenant.id);

      expect(info.subscriptionStatus).toBe('active');
      expect(info.daysRemaining).toBeNull();
    });
  });

  describe('suspendMspAndClients', () => {
    it('should suspend MSP and all client tenants', async () => {
      // Create MSP tenant
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        subscriptionStatus: 'grace',
      });
      await tenantRepository.save(mspTenant);

      // Create clients
      const client1 = tenantRepository.create({
        name: 'Client 1',
        slug: 'client-1',
        tier: 'enterprise',
        subscriptionStatus: 'grace',
        managedByMspId: mspTenant.id,
      });
      await tenantRepository.save(client1);

      const mspClient1 = mspClientRepository.create({
        mspTenantId: mspTenant.id,
        clientTenantId: client1.id,
        status: 'active',
      });
      await mspClientRepository.save(mspClient1);

      await lapseService.suspendMspAndClients(mspTenant.id);

      // Verify MSP suspended
      const updatedMsp = await tenantRepository.findOne({
        where: { id: mspTenant.id },
      });
      expect(updatedMsp!.subscriptionStatus).toBe('suspended');

      // Verify client suspended
      const updatedClient = await tenantRepository.findOne({
        where: { id: client1.id },
      });
      expect(updatedClient!.subscriptionStatus).toBe('suspended');

      // Verify invalidation published
      expect(redisService.publish).toHaveBeenCalledWith(
        'nebula:invalidate',
        expect.stringContaining('subscription_status'),
      );

      // Verify audit log
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'subscription_suspended',
          tenantId: mspTenant.id,
        }),
      );

      // Verify suspension notification
      expect(emailService.sendSuspensionNotification).toHaveBeenCalled();
    });
  });

  describe('restoreSubscription', () => {
    it('should restore MSP and all client tenants', async () => {
      // Create suspended MSP
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        subscriptionStatus: 'suspended',
      });
      await tenantRepository.save(mspTenant);

      // Create suspended client
      const client1 = tenantRepository.create({
        name: 'Client 1',
        slug: 'client-1',
        tier: 'enterprise',
        subscriptionStatus: 'suspended',
        managedByMspId: mspTenant.id,
      });
      await tenantRepository.save(client1);

      const mspClient1 = mspClientRepository.create({
        mspTenantId: mspTenant.id,
        clientTenantId: client1.id,
        status: 'active',
      });
      await mspClientRepository.save(mspClient1);

      // Set grace start date
      mockRedisCache.set(
        `grace_start:${mspTenant.id}`,
        new Date().toISOString(),
      );

      await lapseService.restoreSubscription(mspTenant.id);

      // Verify MSP restored
      const updatedMsp = await tenantRepository.findOne({
        where: { id: mspTenant.id },
      });
      expect(updatedMsp!.subscriptionStatus).toBe('active');

      // Verify client restored
      const updatedClient = await tenantRepository.findOne({
        where: { id: client1.id },
      });
      expect(updatedClient!.subscriptionStatus).toBe('active');

      // Verify grace start date cleared
      expect(redisService.del).toHaveBeenCalledWith(
        `grace_start:${mspTenant.id}`,
      );

      // Verify invalidation published
      expect(redisService.publish).toHaveBeenCalledWith(
        'nebula:invalidate',
        expect.any(String),
      );

      // Verify audit log
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'subscription_restored',
          tenantId: mspTenant.id,
        }),
      );
    });
  });

  describe('processExpiredGracePeriods', () => {
    it('should suspend tenants with expired grace periods', async () => {
      // Create MSP in grace period (expired)
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        subscriptionStatus: 'grace',
        contactEmail: 'billing@msp.com',
      });
      await tenantRepository.save(mspTenant);

      // Set grace start date to 31 days ago (expired)
      const graceStartDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      mockRedisCache.set(
        `grace_start:${mspTenant.id}`,
        graceStartDate.toISOString(),
      );

      await lapseService.processExpiredGracePeriods();

      // Verify tenant suspended
      const updated = await tenantRepository.findOne({
        where: { id: mspTenant.id },
      });
      expect(updated!.subscriptionStatus).toBe('suspended');
    });

    it('should not suspend tenants with active grace periods', async () => {
      // Create MSP in grace period (not expired)
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        subscriptionStatus: 'grace',
      });
      await tenantRepository.save(mspTenant);

      // Set grace start date to 5 days ago (not expired)
      const graceStartDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      mockRedisCache.set(
        `grace_start:${mspTenant.id}`,
        graceStartDate.toISOString(),
      );

      await lapseService.processExpiredGracePeriods();

      // Verify tenant still in grace
      const updated = await tenantRepository.findOne({
        where: { id: mspTenant.id },
      });
      expect(updated!.subscriptionStatus).toBe('grace');
    });
  });

  describe('isSubscriptionActive', () => {
    it('should return true for active tenant', async () => {
      const tenant = tenantRepository.create({
        name: 'Active Tenant',
        slug: 'active-tenant',
        tier: 'enterprise',
        subscriptionStatus: 'active',
      });
      await tenantRepository.save(tenant);

      const isActive = await lapseService.isSubscriptionActive(tenant.id);
      expect(isActive).toBe(true);
    });

    it('should return true for tenant in grace period', async () => {
      const tenant = tenantRepository.create({
        name: 'Grace Tenant',
        slug: 'grace-tenant',
        tier: 'msp',
        subscriptionStatus: 'grace',
      });
      await tenantRepository.save(tenant);

      const isActive = await lapseService.isSubscriptionActive(tenant.id);
      expect(isActive).toBe(true);
    });

    it('should return false for suspended tenant', async () => {
      const tenant = tenantRepository.create({
        name: 'Suspended Tenant',
        slug: 'suspended-tenant',
        tier: 'msp',
        subscriptionStatus: 'suspended',
      });
      await tenantRepository.save(tenant);

      const isActive = await lapseService.isSubscriptionActive(tenant.id);
      expect(isActive).toBe(false);
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return status and canResolve for active tenant', async () => {
      const tenant = tenantRepository.create({
        name: 'Active Tenant',
        slug: 'active-tenant',
        tier: 'enterprise',
        subscriptionStatus: 'active',
      });
      await tenantRepository.save(tenant);

      const status = await lapseService.getSubscriptionStatus(tenant.id);

      expect(status.status).toBe('active');
      expect(status.canResolve).toBe(true);
    });

    it('should return status and canResolve for suspended tenant', async () => {
      const tenant = tenantRepository.create({
        name: 'Suspended Tenant',
        slug: 'suspended-tenant',
        tier: 'msp',
        subscriptionStatus: 'suspended',
      });
      await tenantRepository.save(tenant);

      const status = await lapseService.getSubscriptionStatus(tenant.id);

      expect(status.status).toBe('suspended');
      expect(status.canResolve).toBe(false);
    });

    it('should cache subscription status in Redis', async () => {
      const tenant = tenantRepository.create({
        name: 'Test Tenant',
        slug: 'test-tenant',
        tier: 'enterprise',
        subscriptionStatus: 'active',
      });
      await tenantRepository.save(tenant);

      await lapseService.getSubscriptionStatus(tenant.id);

      expect(redisService.set).toHaveBeenCalledWith(
        `subscription_status:${tenant.id}`,
        'active',
        300,
      );
    });
  });

  describe('extendGracePeriod', () => {
    it('should extend grace period by specified days', async () => {
      // Create MSP in grace
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        subscriptionStatus: 'grace',
      });
      await tenantRepository.save(mspTenant);

      // Set grace start to 25 days ago (5 days remaining)
      const originalGraceStart = new Date(
        Date.now() - 25 * 24 * 60 * 60 * 1000,
      );
      mockRedisCache.set(
        `grace_start:${mspTenant.id}`,
        originalGraceStart.toISOString(),
      );

      await lapseService.extendGracePeriod(mspTenant.id, 10, 'admin-user-id');

      // Verify new grace start date was set (should extend by 10 days)
      expect(redisService.set).toHaveBeenCalled();

      // Verify audit log
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'grace_period_extended',
          tenantId: mspTenant.id,
          userId: 'admin-user-id',
        }),
      );
    });

    it('should restore suspended tenant to grace when extended', async () => {
      // Create suspended MSP
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        subscriptionStatus: 'suspended',
      });
      await tenantRepository.save(mspTenant);

      // Set original grace start
      mockRedisCache.set(
        `grace_start:${mspTenant.id}`,
        new Date().toISOString(),
      );

      await lapseService.extendGracePeriod(mspTenant.id, 7, 'admin-user-id');

      // Verify tenant moved to grace
      const updated = await tenantRepository.findOne({
        where: { id: mspTenant.id },
      });
      expect(updated!.subscriptionStatus).toBe('grace');
    });
  });

  describe('getMspManagedInfo', () => {
    it('should return MSP info for managed client', async () => {
      // Create MSP
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        contactEmail: 'support@msp.com',
        settings: {
          mspDisplayName: 'MSP Partners Inc',
          mspSupportUrl: 'https://support.msp.com',
        },
      });
      await tenantRepository.save(mspTenant);

      // Create client
      const client = tenantRepository.create({
        name: 'Client Corp',
        slug: 'client-corp',
        tier: 'enterprise',
        managedByMspId: mspTenant.id,
      });
      await tenantRepository.save(client);

      const info = await lapseService.getMspManagedInfo(client.id);

      expect(info.isMspManaged).toBe(true);
      expect(info.mspName).toBe('MSP Company');
      expect(info.mspDisplayName).toBe('MSP Partners Inc');
      expect(info.mspContactEmail).toBe('support@msp.com');
      expect(info.mspSupportUrl).toBe('https://support.msp.com');
    });

    it('should return not managed for standalone tenant', async () => {
      const tenant = tenantRepository.create({
        name: 'Standalone Corp',
        slug: 'standalone-corp',
        tier: 'enterprise',
      });
      await tenantRepository.save(tenant);

      const info = await lapseService.getMspManagedInfo(tenant.id);

      expect(info.isMspManaged).toBe(false);
      expect(info.mspName).toBeUndefined();
    });
  });
});
