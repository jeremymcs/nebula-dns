// Nebula DNS - Admin Service Unit Tests
// Tests for admin authentication and MSP tenant creation
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AdminService } from './admin.service';
import { AdminSessionService } from './admin-session.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ClickHouseService } from '../clickhouse/clickhouse.service';
import { EmailService } from '../email/email.service';
import { AdminActivityService } from './admin-activity.service';
import { Admin } from './entities/admin.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Location } from '../locations/entities/location.entity';
import { User } from '../users/entities/user.entity';
import { CreateMspTenantDto } from './dto/msp-onboarding.dto';

// Mock manager functions
const mockManagerCreate = jest.fn();
const mockManagerSave = jest.fn();

describe('AdminService', () => {
  let service: AdminService;
  let adminRepository: jest.Mocked<Repository<Admin>>;
  let tenantRepository: jest.Mocked<Repository<Tenant>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: Partial<QueryRunner>;

  // Mock entities
  const mockAdmin: Partial<Admin> = {
    id: 'admin-uuid-1234',
    email: 'admin@nebula.local',
    name: 'Test Admin',
    passwordHash: '$2b$12$hashedpassword',
    status: 'active',
    mfaSetupComplete: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
  };

  const mockTenant: Partial<Tenant> = {
    id: 'tenant-uuid-1234',
    name: 'Acme MSP',
    slug: 'acme-msp',
    status: 'active',
    tier: 'msp',
    contactEmail: 'support@acme.com',
    locationLimit: null,
    clientLimit: null,
    createdAt: new Date('2026-01-18T12:00:00Z'),
  };

  const mockUser: Partial<User> = {
    id: 'user-uuid-1234',
    email: 'admin@acme.com',
    name: 'Acme Admin',
    role: 'owner',
    status: 'pending',
    tenantId: 'tenant-uuid-1234',
    createdAt: new Date('2026-01-18T12:00:00Z'),
  };

  beforeEach(async () => {
    // Reset manager mocks
    mockManagerCreate.mockReset();
    mockManagerSave.mockReset();

    // Create mock query runner
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: mockManagerCreate,
        save: mockManagerSave,
      } as any,
    };

    // Create mock data source
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as unknown as jest.Mocked<DataSource>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(Admin),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              leftJoin: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              groupBy: jest.fn().mockReturnThis(),
              addGroupBy: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              offset: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([]),
              getCount: jest.fn().mockResolvedValue(0),
              getMany: jest.fn().mockResolvedValue([]),
            }),
          },
        },
        {
          provide: getRepositoryToken(Location),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue({
              innerJoin: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getCount: jest.fn().mockResolvedValue(0),
            }),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              innerJoin: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getCount: jest.fn().mockResolvedValue(0),
            }),
          },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: AdminSessionService,
          useValue: {
            createSession: jest.fn(),
            blacklistToken: jest.fn(),
            parseDeviceInfo: jest.fn().mockReturnValue({
              browser: 'Chrome',
              os: 'macOS',
              device: 'Desktop',
            }),
            getSessions: jest.fn().mockResolvedValue([]),
            revokeAllSessions: jest.fn().mockResolvedValue(0),
            isTokenBlacklisted: jest.fn().mockResolvedValue(false),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockImplementation((key: string, defaultValue?: any) => {
                const config: Record<string, any> = {
                  ADMIN_MAX_FAILED_ATTEMPTS: 5,
                  ADMIN_LOCKOUT_DURATION_MINUTES: 30,
                  JWT_SECRET: 'test-jwt-secret',
                  ADMIN_JWT_SECRET: 'test-admin-jwt-secret',
                };
                return config[key] ?? defaultValue;
              }),
          },
        },
        {
          provide: AuditLogsService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: ClickHouseService,
          useValue: {
            getSummaryStats: jest.fn().mockResolvedValue({
              totalQueries: 1000,
              blockedQueries: 100,
              threatsBlocked: 10,
            }),
            isUsingMockData: jest.fn().mockReturnValue(false),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendMspWelcomeEmail: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: AdminActivityService,
          useValue: {
            log: jest.fn().mockResolvedValue({ id: 'activity-id' }),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    adminRepository = module.get(getRepositoryToken(Admin));
    tenantRepository = module.get(getRepositoryToken(Tenant));
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMspTenant', () => {
    const validDto: CreateMspTenantDto = {
      name: 'Acme Managed Services',
      adminEmail: 'admin@acme.com',
    };

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();

      // Default: no existing user with same email
      userRepository.findOne.mockResolvedValue(null);

      // Default: no existing tenant with same slug
      tenantRepository.findOne.mockResolvedValue(null);

      // Mock query runner manager
      mockManagerCreate.mockImplementation((entity: any, data: any) => ({
        ...data,
        id: entity === Tenant ? 'tenant-uuid-1234' : 'user-uuid-1234',
        createdAt: new Date('2026-01-18T12:00:00Z'),
      }));

      mockManagerSave.mockImplementation((entity: any) =>
        Promise.resolve(entity),
      );
    });

    it('should create MSP tenant with valid input', async () => {
      const result = await service.createMspTenant(validDto, 'admin-uuid-1234');

      // Verify tenant created with correct properties
      expect(mockManagerCreate).toHaveBeenCalledWith(
        Tenant,
        expect.objectContaining({
          name: 'Acme Managed Services',
          status: 'active',
          tier: 'msp',
          contactEmail: 'admin@acme.com',
        }),
      );

      // Verify user created with correct properties
      expect(mockManagerCreate).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          email: 'admin@acme.com',
          role: 'owner',
          status: 'pending',
        }),
      );

      // Verify transaction committed
      expect(queryRunner.commitTransaction).toHaveBeenCalled();

      // Verify response structure
      expect(result).toMatchObject({
        status: 'active',
        tier: 'msp',
        adminEmail: 'admin@acme.com',
        welcomeEmailSent: true, // Email service mocked to return true
      });
      expect(result.id).toBeDefined();
      expect(result.adminUserId).toBeDefined();
      // tempPassword is no longer in response (security - sent only via email)
    });

    it('should throw ConflictException for duplicate email', async () => {
      // Mock existing user with same email
      userRepository.findOne.mockResolvedValue(mockUser as User);

      await expect(
        service.createMspTenant(validDto, 'admin-uuid-1234'),
      ).rejects.toThrow(ConflictException);

      // Verify transaction never started
      expect(queryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should generate unique slug when not provided', async () => {
      // First slug check returns existing tenant, second returns null
      tenantRepository.findOne
        .mockResolvedValueOnce(mockTenant as Tenant) // 'acme-managed-services' exists
        .mockResolvedValueOnce(null); // 'acme-managed-services-1' doesn't exist

      const result = await service.createMspTenant(validDto, 'admin-uuid-1234');

      // Verify slug has counter suffix
      expect(mockManagerCreate).toHaveBeenCalledWith(
        Tenant,
        expect.objectContaining({
          slug: 'acme-managed-services-1',
        }),
      );
    });

    it('should use provided slug if available and unique', async () => {
      const dtoWithSlug: CreateMspTenantDto = {
        ...validDto,
        slug: 'custom-slug',
      };

      const result = await service.createMspTenant(
        dtoWithSlug,
        'admin-uuid-1234',
      );

      expect(mockManagerCreate).toHaveBeenCalledWith(
        Tenant,
        expect.objectContaining({
          slug: 'custom-slug',
        }),
      );
    });

    it('should throw ConflictException if provided slug already exists', async () => {
      const dtoWithSlug: CreateMspTenantDto = {
        ...validDto,
        slug: 'existing-slug',
      };

      // When slug is provided, only the explicit slug check is called
      // (generateUniqueSlug is skipped because dto.slug is truthy)
      tenantRepository.findOne.mockResolvedValueOnce(mockTenant as Tenant);

      await expect(
        service.createMspTenant(dtoWithSlug, 'admin-uuid-1234'),
      ).rejects.toThrow(ConflictException);
    });

    it('should rollback transaction on error', async () => {
      // Mock error during tenant save
      mockManagerSave.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.createMspTenant(validDto, 'admin-uuid-1234'),
      ).rejects.toThrow('Database error');

      // Verify rollback was called
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();

      // Verify commit was not called
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();

      // Verify query runner released
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should set defaults for optional fields', async () => {
      const minimalDto: CreateMspTenantDto = {
        name: 'Minimal MSP',
        adminEmail: 'admin@minimal.com',
      };

      await service.createMspTenant(minimalDto, 'admin-uuid-1234');

      // Verify tenant defaults
      expect(mockManagerCreate).toHaveBeenCalledWith(
        Tenant,
        expect.objectContaining({
          name: 'Minimal MSP',
          contactEmail: 'admin@minimal.com', // Defaults to adminEmail
          contactPhone: null,
          locationLimit: null,
          clientLimit: null,
        }),
      );

      // Verify user defaults
      expect(mockManagerCreate).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          name: 'Minimal MSP Admin', // Defaults to "${name} Admin"
        }),
      );
    });

    it('should use provided optional fields when specified', async () => {
      const fullDto: CreateMspTenantDto = {
        name: 'Full MSP',
        slug: 'full-msp',
        adminEmail: 'admin@full.com',
        adminName: 'John Smith',
        contactEmail: 'support@full.com',
        contactPhone: '+1-555-123-4567',
        locationLimit: 100,
        clientLimit: 50,
      };

      await service.createMspTenant(fullDto, 'admin-uuid-1234');

      // Verify all fields passed through
      expect(mockManagerCreate).toHaveBeenCalledWith(
        Tenant,
        expect.objectContaining({
          name: 'Full MSP',
          slug: 'full-msp',
          contactEmail: 'support@full.com',
          contactPhone: '+1-555-123-4567',
          locationLimit: 100,
          clientLimit: 50,
        }),
      );

      expect(mockManagerCreate).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          name: 'John Smith',
        }),
      );
    });

    it('should normalize email to lowercase', async () => {
      const upperEmailDto: CreateMspTenantDto = {
        name: 'Test MSP',
        adminEmail: 'Admin@Example.COM',
      };

      await service.createMspTenant(upperEmailDto, 'admin-uuid-1234');

      // Verify email normalized
      expect(mockManagerCreate).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          email: 'admin@example.com',
        }),
      );

      // Verify email check used normalized email
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@example.com' },
      });
    });

    it('should hash password with bcrypt cost 12', async () => {
      const hashSpy = jest.spyOn(bcrypt, 'hash');

      await service.createMspTenant(validDto, 'admin-uuid-1234');

      // Verify bcrypt called with cost 12
      expect(hashSpy).toHaveBeenCalledWith(expect.any(String), 12);
    });

    it('should release query runner in finally block', async () => {
      // Success case
      await service.createMspTenant(validDto, 'admin-uuid-1234');
      expect(queryRunner.release).toHaveBeenCalled();

      jest.clearAllMocks();

      // Re-setup mocks for error case
      mockManagerCreate.mockImplementation((entity: any, data: any) => ({
        ...data,
        id: entity === Tenant ? 'tenant-uuid-1234' : 'user-uuid-1234',
        createdAt: new Date('2026-01-18T12:00:00Z'),
      }));

      // Error case
      mockManagerSave.mockRejectedValueOnce(new Error('Database error'));
      await expect(
        service.createMspTenant(validDto, 'admin-uuid-1234'),
      ).rejects.toThrow();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });
});
