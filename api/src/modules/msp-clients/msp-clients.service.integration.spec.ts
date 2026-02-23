// Nebula DNS - MSP Clients Service Integration Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MspClientsService } from './msp-clients.service';
import { MspClient } from './entities/msp-client.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { LimitsService } from '../limits/limits.service';
import { BillingMeterService } from '../billing-meter/billing-meter.service';
import { MspTemplatesService } from '../msp/msp-templates.service';
import { Location } from '../locations/entities/location.entity';
import { LocationToken } from '../locations/entities/location-token.entity';
import { FamilyMember } from '../family/entities/family-member.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { Policy } from '../policies/entities/policy.entity';
import { PolicyVersion } from '../policies/entities/policy-version.entity';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';

/**
 * MspClientsService Integration Tests
 *
 * These tests verify:
 * - Client creation with limit enforcement
 * - Client linking to MSP
 * - Client suspension/reactivation
 * - Billing meter updates on client changes
 *
 * Uses PostgreSQL container via Testcontainers (started in globalSetup).
 */
describe('MspClientsService Integration', () => {
  let module: TestingModule;
  let mspClientsService: MspClientsService;
  let tenantRepository: Repository<Tenant>;
  let userRepository: Repository<User>;
  let mspClientRepository: Repository<MspClient>;
  let dataSource: DataSource;
  let limitsService: LimitsService;
  let billingMeterService: BillingMeterService;

  beforeAll(async () => {
    // Use DATABASE_URL from global Testcontainers setup
    const databaseUrl =
      process.env.DATABASE_URL ||
      'postgresql://test:test@localhost:5432/nebula_test';

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: databaseUrl,
          entities: [
            MspClient,
            Tenant,
            User,
            Location,
            LocationToken,
            FamilyMember,
            SubscriptionPlan,
            Subscription,
            Policy,
            PolicyVersion,
          ],
          synchronize: true,
          dropSchema: true,
          ssl: false,
        }),
        TypeOrmModule.forFeature([
          MspClient,
          Tenant,
          User,
          Location,
          FamilyMember,
          SubscriptionPlan,
          Subscription,
        ]),
      ],
      providers: [
        MspClientsService,
        {
          provide: LimitsService,
          useValue: {
            canCreateClient: jest.fn().mockResolvedValue({
              allowed: true,
              current: 0,
              limit: 50,
              remaining: 50,
            }),
            invalidateLimitsCache: jest.fn(),
          },
        },
        {
          provide: BillingMeterService,
          useValue: {
            reportClientUsage: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: MspTemplatesService,
          useValue: {
            deploy: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    mspClientsService = module.get<MspClientsService>(MspClientsService);
    tenantRepository = module.get(getRepositoryToken(Tenant));
    userRepository = module.get(getRepositoryToken(User));
    mspClientRepository = module.get(getRepositoryToken(MspClient));
    dataSource = module.get<DataSource>(DataSource);
    limitsService = module.get<LimitsService>(LimitsService);
    billingMeterService = module.get<BillingMeterService>(BillingMeterService);
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

    // Clear mocks
    jest.clearAllMocks();
  });

  describe('create - Client Creation', () => {
    it('should create client organization with admin user', async () => {
      // Create MSP tenant
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        partnerId: 'partner-123',
        contactEmail: 'msp@example.com',
      });
      await tenantRepository.save(mspTenant);

      // Create client
      const result = await mspClientsService.create(mspTenant.id, {
        name: 'Client Corp',
        adminEmail: 'admin@clientcorp.com',
        plan: 'pro',
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Client Corp');
      expect(result.status).toBe('active');

      // Verify tenant was created
      const clientTenant = await tenantRepository.findOne({
        where: { id: result.id },
      });
      expect(clientTenant).toBeDefined();
      expect(clientTenant!.tier).toBe('enterprise');
      expect(clientTenant!.managedByMspId).toBe(mspTenant.id);

      // Verify admin user was created
      const adminUser = await userRepository.findOne({
        where: { email: 'admin@clientcorp.com' },
      });
      expect(adminUser).toBeDefined();
      expect(adminUser!.role).toBe('owner');
      expect(adminUser!.tenantId).toBe(result.id);
      expect(adminUser!.status).toBe('pending');

      // Verify MSP-client relationship was created
      const mspClient = await mspClientRepository.findOne({
        where: { clientTenantId: result.id },
      });
      expect(mspClient).toBeDefined();
      expect(mspClient!.mspTenantId).toBe(mspTenant.id);
    });

    it('should enforce client limits via LimitsService', async () => {
      // Create MSP tenant
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        partnerId: 'partner-123',
      });
      await tenantRepository.save(mspTenant);

      await mspClientsService.create(mspTenant.id, {
        name: 'Client Corp',
        adminEmail: 'admin@client.com',
      });

      // Verify limit check was called
      expect(limitsService.canCreateClient).toHaveBeenCalledWith(mspTenant.id);
    });

    it('should reject duplicate admin email', async () => {
      // Create MSP tenant
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        partnerId: 'partner-123',
      });
      await tenantRepository.save(mspTenant);

      // Create first client
      await mspClientsService.create(mspTenant.id, {
        name: 'Client 1',
        adminEmail: 'admin@client.com',
      });

      // Try to create second client with same email
      await expect(
        mspClientsService.create(mspTenant.id, {
          name: 'Client 2',
          adminEmail: 'admin@client.com',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should generate unique slug for client', async () => {
      // Create MSP tenant
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        partnerId: 'partner-123',
      });
      await tenantRepository.save(mspTenant);

      // Create two clients with same name
      const client1 = await mspClientsService.create(mspTenant.id, {
        name: 'Test Client',
        adminEmail: 'admin1@client.com',
      });

      const client2 = await mspClientsService.create(mspTenant.id, {
        name: 'Test Client',
        adminEmail: 'admin2@client.com',
      });

      const tenant1 = await tenantRepository.findOne({
        where: { id: client1.id },
      });
      const tenant2 = await tenantRepository.findOne({
        where: { id: client2.id },
      });

      expect(tenant1!.slug).not.toBe(tenant2!.slug);
    });

    it('should invalidate limits cache after creation', async () => {
      // Create MSP tenant
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        partnerId: 'partner-123',
      });
      await tenantRepository.save(mspTenant);

      await mspClientsService.create(mspTenant.id, {
        name: 'Client Corp',
        adminEmail: 'admin@client.com',
      });

      // Verify cache invalidation was called
      expect(limitsService.invalidateLimitsCache).toHaveBeenCalledWith(
        mspTenant.id,
      );
    });

    it('should report billing meter usage after creation', async () => {
      // Create MSP tenant
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        partnerId: 'partner-123',
      });
      await tenantRepository.save(mspTenant);

      await mspClientsService.create(mspTenant.id, {
        name: 'Client Corp',
        adminEmail: 'admin@client.com',
      });

      // Wait for async billing meter call
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify billing meter was updated
      expect(billingMeterService.reportClientUsage).toHaveBeenCalledWith(
        mspTenant.id,
      );
    });
  });

  describe('link - Link Existing Tenant', () => {
    it('should link existing tenant to MSP', async () => {
      // Create MSP tenant
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        partnerId: 'partner-123',
      });
      await tenantRepository.save(mspTenant);

      // Create existing standalone tenant
      const existingTenant = tenantRepository.create({
        name: 'Existing Corp',
        slug: 'existing-corp',
        tier: 'enterprise',
      });
      await tenantRepository.save(existingTenant);

      // Link it
      const result = await mspClientsService.link(
        mspTenant.id,
        existingTenant.id,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(existingTenant.id);
      expect(result.status).toBe('active');

      // Verify tenant was updated
      const updatedTenant = await tenantRepository.findOne({
        where: { id: existingTenant.id },
      });
      expect(updatedTenant!.managedByMspId).toBe(mspTenant.id);
    });

    it('should reject linking already-linked tenant', async () => {
      // Create MSP tenants
      const msp1 = tenantRepository.create({
        name: 'MSP 1',
        slug: 'msp-1',
        tier: 'msp',
        partnerId: 'partner-1',
      });
      await tenantRepository.save(msp1);

      const msp2 = tenantRepository.create({
        name: 'MSP 2',
        slug: 'msp-2',
        tier: 'msp',
        partnerId: 'partner-2',
      });
      await tenantRepository.save(msp2);

      // Create client
      const client = tenantRepository.create({
        name: 'Client',
        slug: 'client',
        tier: 'enterprise',
      });
      await tenantRepository.save(client);

      // Link to MSP 1
      await mspClientsService.link(msp1.id, client.id);

      // Try to link to MSP 2
      await expect(mspClientsService.link(msp2.id, client.id)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update - Client Updates', () => {
    it('should update client status', async () => {
      // Create MSP and client
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        partnerId: 'partner-123',
      });
      await tenantRepository.save(mspTenant);

      const client = await mspClientsService.create(mspTenant.id, {
        name: 'Client Corp',
        adminEmail: 'admin@client.com',
      });

      // Update status
      const updated = await mspClientsService.update(mspTenant.id, client.id, {
        status: 'suspended',
      });

      expect(updated.status).toBe('suspended');
    });

    it('should update client name', async () => {
      // Create MSP and client
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        partnerId: 'partner-123',
      });
      await tenantRepository.save(mspTenant);

      const client = await mspClientsService.create(mspTenant.id, {
        name: 'Old Name',
        adminEmail: 'admin@client.com',
      });

      // Update name
      const updated = await mspClientsService.update(mspTenant.id, client.id, {
        name: 'New Name',
      });

      expect(updated.name).toBe('New Name');
    });
  });

  describe('suspendClient / reactivateClient', () => {
    it('should suspend and reactivate client', async () => {
      // Create MSP and client
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        partnerId: 'partner-123',
      });
      await tenantRepository.save(mspTenant);

      const client = await mspClientsService.create(mspTenant.id, {
        name: 'Client Corp',
        adminEmail: 'admin@client.com',
      });

      // Suspend
      const suspended = await mspClientsService.suspendClient(
        mspTenant.id,
        client.id,
      );
      expect(suspended.status).toBe('suspended');

      // Reactivate
      const reactivated = await mspClientsService.reactivateClient(
        mspTenant.id,
        client.id,
      );
      expect(reactivated.status).toBe('active');
    });
  });

  describe('remove - Client Removal', () => {
    it('should remove MSP-client relationship only', async () => {
      // Create MSP and client
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        partnerId: 'partner-123',
      });
      await tenantRepository.save(mspTenant);

      const client = await mspClientsService.create(mspTenant.id, {
        name: 'Client Corp',
        adminEmail: 'admin@client.com',
      });

      // Remove relationship (but not tenant)
      await mspClientsService.remove(mspTenant.id, client.id, false);

      // Verify relationship is gone
      const mspClient = await mspClientRepository.findOne({
        where: { clientTenantId: client.id },
      });
      expect(mspClient).toBeNull();

      // Verify tenant still exists
      const clientTenant = await tenantRepository.findOne({
        where: { id: client.id },
      });
      expect(clientTenant).toBeDefined();
      expect(clientTenant!.managedByMspId).toBeNull();
    });

    it('should delete client tenant when deleteClient=true', async () => {
      // Create MSP and client
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        partnerId: 'partner-123',
      });
      await tenantRepository.save(mspTenant);

      const client = await mspClientsService.create(mspTenant.id, {
        name: 'Client Corp',
        adminEmail: 'admin@client.com',
      });

      // Remove and delete tenant
      await mspClientsService.remove(mspTenant.id, client.id, true);

      // Verify tenant is deleted
      const clientTenant = await tenantRepository.findOne({
        where: { id: client.id },
      });
      expect(clientTenant).toBeNull();
    });

    it('should report billing meter usage after removal', async () => {
      // Create MSP and client
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        partnerId: 'partner-123',
      });
      await tenantRepository.save(mspTenant);

      const client = await mspClientsService.create(mspTenant.id, {
        name: 'Client Corp',
        adminEmail: 'admin@client.com',
      });

      jest.clearAllMocks();

      await mspClientsService.remove(mspTenant.id, client.id);

      // Wait for async billing meter call
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(billingMeterService.reportClientUsage).toHaveBeenCalledWith(
        mspTenant.id,
      );
    });
  });

  describe('findAllForMsp - List Clients', () => {
    it('should return all clients for MSP', async () => {
      // Create MSP
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        partnerId: 'partner-123',
      });
      await tenantRepository.save(mspTenant);

      // Create multiple clients
      for (let i = 0; i < 3; i++) {
        await mspClientsService.create(mspTenant.id, {
          name: `Client ${i}`,
          adminEmail: `admin${i}@client.com`,
        });
      }

      const result = await mspClientsService.findAllForMsp(mspTenant.id);

      expect(result.clients).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should filter by status', async () => {
      // Create MSP
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        partnerId: 'partner-123',
      });
      await tenantRepository.save(mspTenant);

      // Create clients
      const client1 = await mspClientsService.create(mspTenant.id, {
        name: 'Active Client',
        adminEmail: 'active@client.com',
      });

      const client2 = await mspClientsService.create(mspTenant.id, {
        name: 'Suspended Client',
        adminEmail: 'suspended@client.com',
      });

      // Suspend one
      await mspClientsService.suspendClient(mspTenant.id, client2.id);

      // Filter by active
      const activeClients = await mspClientsService.findAllForMsp(
        mspTenant.id,
        {
          status: 'active',
        },
      );

      expect(activeClients.clients).toHaveLength(1);
      expect(activeClients.clients[0].name).toBe('Active Client');
    });
  });

  describe('getClientCount / getActiveClientCount', () => {
    it('should count total and active clients separately', async () => {
      // Create MSP
      const mspTenant = tenantRepository.create({
        name: 'MSP Company',
        slug: 'msp-company',
        tier: 'msp',
        partnerId: 'partner-123',
      });
      await tenantRepository.save(mspTenant);

      // Create clients
      const client1 = await mspClientsService.create(mspTenant.id, {
        name: 'Client 1',
        adminEmail: 'client1@example.com',
      });

      const client2 = await mspClientsService.create(mspTenant.id, {
        name: 'Client 2',
        adminEmail: 'client2@example.com',
      });

      // Suspend one
      await mspClientsService.suspendClient(mspTenant.id, client1.id);

      const totalCount = await mspClientsService.getClientCount(mspTenant.id);
      const activeCount = await mspClientsService.getActiveClientCount(
        mspTenant.id,
      );

      expect(totalCount).toBe(2);
      expect(activeCount).toBe(1);
    });
  });

  describe('Error handling', () => {
    it('should throw NotFoundException for non-existent MSP', async () => {
      await expect(
        mspClientsService.create('non-existent-msp', {
          name: 'Client',
          adminEmail: 'admin@client.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject non-MSP tier tenant as MSP', async () => {
      // Create regular enterprise tenant
      const regularTenant = tenantRepository.create({
        name: 'Regular Company',
        slug: 'regular-company',
        tier: 'enterprise',
      });
      await tenantRepository.save(regularTenant);

      await expect(
        mspClientsService.create(regularTenant.id, {
          name: 'Client',
          adminEmail: 'admin@client.com',
        }),
      ).rejects.toThrow('is not an MSP tier tenant');
    });
  });
});
