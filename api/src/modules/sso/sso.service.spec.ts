/**
 * Nebula DNS - Enterprise DNS Security Platform
 * SSO Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { SsoService } from './sso.service';
import { SsoConfiguration } from './entities/sso-configuration.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';

describe('SsoService', () => {
  let service: SsoService;
  let ssoConfigRepository: jest.Mocked<Repository<SsoConfiguration>>;
  let tenantRepository: jest.Mocked<Repository<Tenant>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockSsoConfigRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockTenantRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        SSO_ENCRYPTION_KEY: 'test-sso-key-1234567890',
        API_URL: 'https://api.nebuladns.example.com',
        SAML_SP_ENTITY_ID: 'nebuladns-sp',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SsoService,
        { provide: getRepositoryToken(SsoConfiguration), useValue: mockSsoConfigRepository },
        { provide: getRepositoryToken(Tenant), useValue: mockTenantRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<SsoService>(SsoService);
    ssoConfigRepository = module.get(getRepositoryToken(SsoConfiguration));
    tenantRepository = module.get(getRepositoryToken(Tenant));
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfiguration', () => {
    it('should return SSO configuration for tenant', async () => {
      const tenantId = 'tenant-123';
      const mockConfig = {
        id: 'config-123',
        tenantId,
        provider: 'okta',
        isEnabled: true,
      };

      mockSsoConfigRepository.findOne.mockResolvedValue(mockConfig as any);

      const result = await service.getConfiguration(tenantId);

      expect(mockSsoConfigRepository.findOne).toHaveBeenCalledWith({
        where: { tenantId },
      });
      expect(result).toEqual(mockConfig);
    });

    it('should return null if no configuration exists', async () => {
      const tenantId = 'tenant-123';
      mockSsoConfigRepository.findOne.mockResolvedValue(null);

      const result = await service.getConfiguration(tenantId);

      expect(result).toBeNull();
    });
  });

  describe('isEnabled', () => {
    it('should return true if SSO is enabled', async () => {
      const tenantId = 'tenant-123';
      mockSsoConfigRepository.findOne.mockResolvedValue({
        isEnabled: true,
      } as any);

      const result = await service.isEnabled(tenantId);

      expect(result).toBe(true);
    });

    it('should return false if SSO is disabled', async () => {
      const tenantId = 'tenant-123';
      mockSsoConfigRepository.findOne.mockResolvedValue({
        isEnabled: false,
      } as any);

      const result = await service.isEnabled(tenantId);

      expect(result).toBe(false);
    });

    it('should return false if no SSO config exists', async () => {
      const tenantId = 'tenant-123';
      mockSsoConfigRepository.findOne.mockResolvedValue(null);

      const result = await service.isEnabled(tenantId);

      expect(result).toBe(false);
    });
  });

  describe('disable', () => {
    it('should disable SSO for tenant', async () => {
      const tenantId = 'tenant-123';
      const mockConfig = {
        id: 'config-123',
        tenantId,
        isEnabled: true,
      };

      mockSsoConfigRepository.findOne.mockResolvedValue(mockConfig as any);
      mockSsoConfigRepository.save.mockResolvedValue({ ...mockConfig, isEnabled: false } as any);

      await service.disable(tenantId);

      expect(mockSsoConfigRepository.save).toHaveBeenCalled();
    });
  });
});

