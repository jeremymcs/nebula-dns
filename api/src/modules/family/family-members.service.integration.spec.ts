// Nebula DNS - Family Members Service Integration Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { FamilyMembersService } from './family-members.service';
import { FamilyInvitation } from './entities/family-invitation.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Policy } from '../policies/entities/policy.entity';
import { PolicyVersion } from '../policies/entities/policy-version.entity';
import { Location } from '../locations/entities/location.entity';
import { LocationToken } from '../locations/entities/location-token.entity';
import { EmailService } from '../email/email.service';
import { LimitsService } from '../limits/limits.service';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * FamilyMembersService Integration Tests
 *
 * These tests verify:
 * - Family member invitation
 * - Invitation acceptance
 * - Member removal
 * - Limit enforcement
 *
 * Uses PostgreSQL container via Testcontainers (started in globalSetup).
 */
describe('FamilyMembersService Integration', () => {
  let module: TestingModule;
  let familyService: FamilyMembersService;
  let invitationRepository: Repository<FamilyInvitation>;
  let tenantRepository: Repository<Tenant>;
  let userRepository: Repository<User>;
  let dataSource: DataSource;
  let emailService: EmailService;
  let limitsService: LimitsService;

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
            FamilyInvitation,
            Tenant,
            User,
            Policy,
            PolicyVersion,
            Location,
            LocationToken,
          ],
          synchronize: true,
          dropSchema: true,
          ssl: false,
        }),
        TypeOrmModule.forFeature([FamilyInvitation, Tenant, User]),
      ],
      providers: [
        FamilyMembersService,
        {
          provide: EmailService,
          useValue: {
            sendFamilyInviteEmail: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: LimitsService,
          useValue: {
            canInviteFamilyMember: jest.fn().mockResolvedValue({
              allowed: true,
              current: 0,
              limit: 5,
              remaining: 5,
            }),
            invalidateLimitsCache: jest.fn(),
          },
        },
      ],
    }).compile();

    familyService = module.get<FamilyMembersService>(FamilyMembersService);
    invitationRepository = module.get(getRepositoryToken(FamilyInvitation));
    tenantRepository = module.get(getRepositoryToken(Tenant));
    userRepository = module.get(getRepositoryToken(User));
    dataSource = module.get<DataSource>(DataSource);
    emailService = module.get<EmailService>(EmailService);
    limitsService = module.get<LimitsService>(LimitsService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    // Delete in FK-safe order (children before parents).
    // clear() uses TRUNCATE which PostgreSQL rejects when FK constraints exist.
    await invitationRepository.createQueryBuilder().delete().execute();
    await userRepository.createQueryBuilder().delete().execute();
    await tenantRepository.createQueryBuilder().delete().execute();
    jest.clearAllMocks();
  });

  describe('createInvitation', () => {
    it('should create family invitation and send email', async () => {
      // Create Home tier tenant
      const tenant = tenantRepository.create({
        name: 'Smith Family',
        slug: 'smith-family',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      // Create owner user
      const owner = userRepository.create({
        tenantId: tenant.id,
        email: 'john@smith.com',
        name: 'John Smith',
        passwordHash: await bcrypt.hash('password', 10),
        role: 'owner',
        status: 'active',
      });
      await userRepository.save(owner);

      // Create invitation
      const result = await familyService.createInvitation(tenant.id, owner.id, {
        email: 'jane@smith.com',
        displayName: 'Jane Smith',
      });

      expect(result.invitation).toBeDefined();
      expect(result.sent).toBe(true);

      // Verify invitation created
      const invitation = await invitationRepository.findOne({
        where: { email: 'jane@smith.com' },
      });
      expect(invitation).toBeDefined();
      expect(invitation!.status).toBe('pending');
      expect(invitation!.displayName).toBe('Jane Smith');

      // Verify email sent
      expect(emailService.sendFamilyInviteEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jane@smith.com',
          familyName: 'Smith Family',
          inviterName: 'John Smith',
        }),
      );

      // Verify limit check
      expect(limitsService.canInviteFamilyMember).toHaveBeenCalledWith(
        tenant.id,
      );
    });

    it('should reject invitation for non-Home tier', async () => {
      // Create Enterprise tier tenant
      const tenant = tenantRepository.create({
        name: 'Enterprise Corp',
        slug: 'enterprise-corp',
        tier: 'enterprise',
      });
      await tenantRepository.save(tenant);

      const owner = userRepository.create({
        tenantId: tenant.id,
        email: 'admin@enterprise.com',
        name: 'Admin',
        passwordHash: await bcrypt.hash('password', 10),
        role: 'owner',
        status: 'active',
      });
      await userRepository.save(owner);

      await expect(
        familyService.createInvitation(tenant.id, owner.id, {
          email: 'user@example.com',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject duplicate email in same family', async () => {
      const tenant = tenantRepository.create({
        name: 'Smith Family',
        slug: 'smith-family',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      const owner = userRepository.create({
        tenantId: tenant.id,
        email: 'john@smith.com',
        name: 'John Smith',
        passwordHash: await bcrypt.hash('password', 10),
        role: 'owner',
        status: 'active',
      });
      await userRepository.save(owner);

      // Create existing user
      const existingMember = userRepository.create({
        tenantId: tenant.id,
        email: 'jane@smith.com',
        name: 'Jane Smith',
        passwordHash: await bcrypt.hash('password', 10),
        role: 'member',
        status: 'active',
      });
      await userRepository.save(existingMember);

      // Try to invite same email
      await expect(
        familyService.createInvitation(tenant.id, owner.id, {
          email: 'jane@smith.com',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject duplicate pending invitation', async () => {
      const tenant = tenantRepository.create({
        name: 'Smith Family',
        slug: 'smith-family',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      const owner = userRepository.create({
        tenantId: tenant.id,
        email: 'john@smith.com',
        name: 'John Smith',
        passwordHash: await bcrypt.hash('password', 10),
        role: 'owner',
        status: 'active',
      });
      await userRepository.save(owner);

      // Create first invitation
      await familyService.createInvitation(tenant.id, owner.id, {
        email: 'jane@smith.com',
      });

      // Try to invite same email again
      await expect(
        familyService.createInvitation(tenant.id, owner.id, {
          email: 'jane@smith.com',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation and create member user', async () => {
      const tenant = tenantRepository.create({
        name: 'Smith Family',
        slug: 'smith-family',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      const owner = userRepository.create({
        tenantId: tenant.id,
        email: 'john@smith.com',
        name: 'John Smith',
        passwordHash: await bcrypt.hash('password', 10),
        role: 'owner',
        status: 'active',
      });
      await userRepository.save(owner);

      // Create invitation
      const { invitation } = await familyService.createInvitation(
        tenant.id,
        owner.id,
        {
          email: 'jane@smith.com',
          displayName: 'Jane',
        },
      );

      // Get token from the invitation (we need to mock this since it's hashed)
      // For testing, we'll create a new invitation with a known token
      const testToken = 'test-token-12345';
      const crypto = require('crypto'); // eslint-disable-line @typescript-eslint/no-var-requires
      const tokenHash = crypto
        .createHash('sha256')
        .update(testToken)
        .digest('hex');

      await invitationRepository.update({ id: invitation.id }, { tokenHash });

      // Accept invitation
      const result = await familyService.acceptInvitation({
        token: testToken,
        name: 'Jane Smith',
        password: 'SecurePassword123!',
      });

      expect(result.user).toBeDefined();
      expect(result.tenant).toBeDefined();

      // Verify user created
      const user = await userRepository.findOne({
        where: { email: 'jane@smith.com' },
      });
      expect(user).toBeDefined();
      expect(user!.name).toBe('Jane Smith');
      expect(user!.role).toBe('member');
      expect(user!.status).toBe('active');
      expect(user!.tenantId).toBe(tenant.id);

      // Verify password hashed
      const passwordValid = await bcrypt.compare(
        'SecurePassword123!',
        user!.passwordHash,
      );
      expect(passwordValid).toBe(true);

      // Verify invitation marked as accepted
      const updatedInvitation = await invitationRepository.findOne({
        where: { id: invitation.id },
      });
      expect(updatedInvitation!.status).toBe('accepted');
      expect(updatedInvitation!.acceptedAt).toBeDefined();
      expect(updatedInvitation!.acceptedByUserId).toBe(user!.id);
    });

    it('should reject expired invitation', async () => {
      const tenant = tenantRepository.create({
        name: 'Smith Family',
        slug: 'smith-family',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      const testToken = 'expired-token-123';
      const crypto = require('crypto'); // eslint-disable-line @typescript-eslint/no-var-requires
      const tokenHash = crypto
        .createHash('sha256')
        .update(testToken)
        .digest('hex');

      // Create expired invitation
      const expiredInvitation = invitationRepository.create({
        tenantId: tenant.id,
        invitedById: '00000000-0000-0000-0000-000000000001',
        email: 'expired@smith.com',
        tokenHash,
        status: 'pending',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      });
      await invitationRepository.save(expiredInvitation);

      await expect(
        familyService.acceptInvitation({
          token: testToken,
          name: 'Test User',
          password: 'password123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject already-used invitation', async () => {
      const tenant = tenantRepository.create({
        name: 'Smith Family',
        slug: 'smith-family',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      const testToken = 'used-token-123';
      const crypto = require('crypto'); // eslint-disable-line @typescript-eslint/no-var-requires
      const tokenHash = crypto
        .createHash('sha256')
        .update(testToken)
        .digest('hex');

      // Create accepted invitation
      const usedInvitation = invitationRepository.create({
        tenantId: tenant.id,
        invitedById: '00000000-0000-0000-0000-000000000001',
        email: 'used@smith.com',
        tokenHash,
        status: 'accepted',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      await invitationRepository.save(usedInvitation);

      await expect(
        familyService.acceptInvitation({
          token: testToken,
          name: 'Test User',
          password: 'password123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if email already has account', async () => {
      const tenant = tenantRepository.create({
        name: 'Smith Family',
        slug: 'smith-family',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      // Create existing user (in different tenant)
      const otherTenant = tenantRepository.create({
        name: 'Other Family',
        slug: 'other-family',
        tier: 'home',
      });
      await tenantRepository.save(otherTenant);

      const existingUser = userRepository.create({
        tenantId: otherTenant.id,
        email: 'existing@smith.com',
        name: 'Existing User',
        passwordHash: await bcrypt.hash('password', 10),
        role: 'owner',
        status: 'active',
      });
      await userRepository.save(existingUser);

      const testToken = 'test-token-123';
      const crypto = require('crypto'); // eslint-disable-line @typescript-eslint/no-var-requires
      const tokenHash = crypto
        .createHash('sha256')
        .update(testToken)
        .digest('hex');

      const invitation = invitationRepository.create({
        tenantId: tenant.id,
        invitedById: '00000000-0000-0000-0000-000000000001',
        email: 'existing@smith.com',
        tokenHash,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      await invitationRepository.save(invitation);

      await expect(
        familyService.acceptInvitation({
          token: testToken,
          name: 'Test User',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getFamilyOverview', () => {
    it('should return members and pending invitations', async () => {
      const tenant = tenantRepository.create({
        name: 'Smith Family',
        slug: 'smith-family',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      // Create owner
      const owner = userRepository.create({
        tenantId: tenant.id,
        email: 'john@smith.com',
        name: 'John Smith',
        passwordHash: await bcrypt.hash('password', 10),
        role: 'owner',
        status: 'active',
      });
      await userRepository.save(owner);

      // Create member
      const member = userRepository.create({
        tenantId: tenant.id,
        email: 'jane@smith.com',
        name: 'Jane Smith',
        passwordHash: await bcrypt.hash('password', 10),
        role: 'member',
        status: 'active',
      });
      await userRepository.save(member);

      // Create pending invitation
      await familyService.createInvitation(tenant.id, owner.id, {
        email: 'bob@smith.com',
        displayName: 'Bob',
      });

      const overview = await familyService.getFamilyOverview(tenant.id);

      expect(overview.members).toHaveLength(2); // Owner + 1 member
      expect(overview.pendingInvitations).toHaveLength(1);
      expect(overview.totalMembers).toBe(2); // 1 member + 1 pending
      expect(overview.maxMembers).toBe(5);
      expect(overview.remainingSlots).toBe(3);
    });
  });

  describe('removeMember', () => {
    it('should remove family member', async () => {
      const tenant = tenantRepository.create({
        name: 'Smith Family',
        slug: 'smith-family',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      const owner = userRepository.create({
        tenantId: tenant.id,
        email: 'john@smith.com',
        name: 'John Smith',
        passwordHash: await bcrypt.hash('password', 10),
        role: 'owner',
        status: 'active',
      });
      await userRepository.save(owner);

      const member = userRepository.create({
        tenantId: tenant.id,
        email: 'jane@smith.com',
        name: 'Jane Smith',
        passwordHash: await bcrypt.hash('password', 10),
        role: 'member',
        status: 'active',
      });
      await userRepository.save(member);

      // Remove member
      await familyService.removeMember(tenant.id, member.id);

      // Verify member deleted
      const deletedMember = await userRepository.findOne({
        where: { id: member.id },
      });
      expect(deletedMember).toBeNull();

      // Verify limits cache invalidated
      expect(limitsService.invalidateLimitsCache).toHaveBeenCalledWith(
        tenant.id,
      );
    });

    it('should reject removing owner', async () => {
      const tenant = tenantRepository.create({
        name: 'Smith Family',
        slug: 'smith-family',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      const owner = userRepository.create({
        tenantId: tenant.id,
        email: 'john@smith.com',
        name: 'John Smith',
        passwordHash: await bcrypt.hash('password', 10),
        role: 'owner',
        status: 'active',
      });
      await userRepository.save(owner);

      await expect(
        familyService.removeMember(tenant.id, owner.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject removing non-member user', async () => {
      const tenant = tenantRepository.create({
        name: 'Smith Family',
        slug: 'smith-family',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      const admin = userRepository.create({
        tenantId: tenant.id,
        email: 'admin@smith.com',
        name: 'Admin',
        passwordHash: await bcrypt.hash('password', 10),
        role: 'admin',
        status: 'active',
      });
      await userRepository.save(admin);

      await expect(
        familyService.removeMember(tenant.id, admin.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel pending invitation', async () => {
      const tenant = tenantRepository.create({
        name: 'Smith Family',
        slug: 'smith-family',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      const owner = userRepository.create({
        tenantId: tenant.id,
        email: 'john@smith.com',
        name: 'John Smith',
        passwordHash: await bcrypt.hash('password', 10),
        role: 'owner',
        status: 'active',
      });
      await userRepository.save(owner);

      const { invitation } = await familyService.createInvitation(
        tenant.id,
        owner.id,
        {
          email: 'jane@smith.com',
        },
      );

      await familyService.cancelInvitation(tenant.id, invitation.id);

      // Verify invitation cancelled
      const cancelled = await invitationRepository.findOne({
        where: { id: invitation.id },
      });
      expect(cancelled!.status).toBe('cancelled');
    });

    it('should reject cancelling non-pending invitation', async () => {
      const tenant = tenantRepository.create({
        name: 'Smith Family',
        slug: 'smith-family',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      const acceptedInvitation = invitationRepository.create({
        tenantId: tenant.id,
        invitedById: '00000000-0000-0000-0000-000000000001',
        email: 'test@smith.com',
        tokenHash: 'hash',
        status: 'accepted',
        expiresAt: new Date(),
      });
      await invitationRepository.save(acceptedInvitation);

      await expect(
        familyService.cancelInvitation(tenant.id, acceptedInvitation.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendInvitation', () => {
    it('should resend invitation with new token and extended expiry', async () => {
      const tenant = tenantRepository.create({
        name: 'Smith Family',
        slug: 'smith-family',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      const owner = userRepository.create({
        tenantId: tenant.id,
        email: 'john@smith.com',
        name: 'John Smith',
        passwordHash: await bcrypt.hash('password', 10),
        role: 'owner',
        status: 'active',
      });
      await userRepository.save(owner);

      const { invitation } = await familyService.createInvitation(
        tenant.id,
        owner.id,
        {
          email: 'jane@smith.com',
        },
      );

      const originalExpiry = invitation.expiresAt;

      jest.clearAllMocks();

      // Resend
      const result = await familyService.resendInvitation(
        tenant.id,
        invitation.id,
        owner.id,
      );

      expect(result.sent).toBe(true);

      // Verify new email sent
      expect(emailService.sendFamilyInviteEmail).toHaveBeenCalled();

      // Verify expiry extended
      const updated = await invitationRepository.findOne({
        where: { id: invitation.id },
      });
      expect(updated!.expiresAt.getTime()).toBeGreaterThan(
        originalExpiry.getTime(),
      );
    });
  });

  describe('getInvitationByToken', () => {
    it('should return invitation info for valid token', async () => {
      const tenant = tenantRepository.create({
        name: 'Smith Family',
        slug: 'smith-family',
        tier: 'home',
      });
      await tenantRepository.save(tenant);

      const testToken = 'test-token-123';
      const crypto = require('crypto'); // eslint-disable-line @typescript-eslint/no-var-requires
      const tokenHash = crypto
        .createHash('sha256')
        .update(testToken)
        .digest('hex');

      const invitation = invitationRepository.create({
        tenantId: tenant.id,
        invitedById: '00000000-0000-0000-0000-000000000001',
        email: 'jane@smith.com',
        displayName: 'Jane',
        tokenHash,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      await invitationRepository.save(invitation);

      const info = await familyService.getInvitationByToken(testToken);

      expect(info.email).toBe('jane@smith.com');
      expect(info.displayName).toBe('Jane');
      expect(info.isExpired).toBe(false);
    });
  });
});
