/**
 * Nebula DNS - Enterprise DNS Security Platform
 * SSO Service Unit Tests
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
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
import { RedisService } from '../redis/redis.service';

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
        SSO_ENCRYPTION_KEY: 'test-sso-key-1234567890-minimum-32-bytes',
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

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue({
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    }),
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(undefined),
  };

  // Set test encryption keys in environment before tests run
  beforeAll(() => {
    process.env.SSO_ENCRYPTION_KEY = 'test-sso-key-1234567890-minimum-32-bytes';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SsoService,
        {
          provide: getRepositoryToken(SsoConfiguration),
          useValue: mockSsoConfigRepository,
        },
        { provide: getRepositoryToken(Tenant), useValue: mockTenantRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedisService },
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
      mockSsoConfigRepository.save.mockResolvedValue({
        ...mockConfig,
        isEnabled: false,
      } as any);

      await service.disable(tenantId);

      expect(mockSsoConfigRepository.save).toHaveBeenCalled();
    });
  });

  describe('PKCE Support', () => {
    describe('initiateOidcLogin', () => {
      it('should include PKCE parameters when pkceRequired is true', async () => {
        const tenantSlug = 'test-tenant';
        const mockTenant = {
          id: 'tenant-123',
          slug: tenantSlug,
        };
        const mockConfig = {
          id: 'config-123',
          tenantId: 'tenant-123',
          providerType: 'oidc',
          isEnabled: true,
          pkceRequired: true,
          oidcIssuer: 'https://auth.example.com',
          oidcClientId: 'client-123',
          oidcScopes: 'openid profile email',
          oidcAuthorizationUrl: 'https://auth.example.com/authorize',
        };

        mockTenantRepository.findOne.mockResolvedValue(mockTenant as any);
        mockSsoConfigRepository.findOne.mockResolvedValue(mockConfig as any);

        const result = await service.initiateOidcLogin(tenantSlug);

        // Verify PKCE parameters are in the URL
        expect(result.redirectUrl).toContain('code_challenge=');
        expect(result.redirectUrl).toContain('code_challenge_method=S256');

        // Verify code_verifier was stored in Redis
        expect(mockRedisService.set).toHaveBeenCalled();
        const setCall = mockRedisService.set.mock.calls[0];
        expect(setCall[0]).toContain('pkce:');
        expect(setCall[2]).toBe(300); // 5 minute TTL
      });

      it('should not include PKCE parameters when pkceRequired is false', async () => {
        const tenantSlug = 'test-tenant';
        const mockTenant = {
          id: 'tenant-123',
          slug: tenantSlug,
        };
        const mockConfig = {
          id: 'config-123',
          tenantId: 'tenant-123',
          providerType: 'oidc',
          isEnabled: true,
          pkceRequired: false,
          oidcIssuer: 'https://auth.example.com',
          oidcClientId: 'client-123',
          oidcScopes: 'openid profile email',
          oidcAuthorizationUrl: 'https://auth.example.com/authorize',
        };

        mockTenantRepository.findOne.mockResolvedValue(mockTenant as any);
        mockSsoConfigRepository.findOne.mockResolvedValue(mockConfig as any);

        const result = await service.initiateOidcLogin(tenantSlug);

        // Verify PKCE parameters are NOT in the URL
        expect(result.redirectUrl).not.toContain('code_challenge=');
        expect(result.redirectUrl).not.toContain('code_challenge_method=');

        // Verify code_verifier was NOT stored in Redis
        expect(mockRedisService.set).not.toHaveBeenCalled();
      });
    });

    describe('configureOidc', () => {
      it('should default pkceRequired to true for new configurations', async () => {
        const tenantId = 'tenant-123';
        const dto = {
          issuer: 'https://auth.example.com',
          clientId: 'client-123',
          clientSecret: 'secret-123',
        };

        mockSsoConfigRepository.findOne.mockResolvedValue(null);
        mockSsoConfigRepository.create.mockReturnValue({
          tenantId,
        } as any);
        mockSsoConfigRepository.save.mockImplementation((config) =>
          Promise.resolve(config),
        );

        // Mock fetch for PKCE support check
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              authorization_endpoint: 'https://auth.example.com/authorize',
              token_endpoint: 'https://auth.example.com/token',
              code_challenge_methods_supported: ['S256'],
            }),
        });

        const result = await service.configureOidc(tenantId, dto as any);

        expect(result.pkceRequired).toBe(true);
      });

      it('should respect explicitly set pkceRequired value', async () => {
        const tenantId = 'tenant-123';
        const dto = {
          issuer: 'https://auth.example.com',
          clientId: 'client-123',
          clientSecret: 'secret-123',
          pkceRequired: false,
        };

        mockSsoConfigRepository.findOne.mockResolvedValue(null);
        mockSsoConfigRepository.create.mockReturnValue({
          tenantId,
        } as any);
        mockSsoConfigRepository.save.mockImplementation((config) =>
          Promise.resolve(config),
        );

        const result = await service.configureOidc(tenantId, dto as any);

        expect(result.pkceRequired).toBe(false);
      });
    });

    describe('checkPkceSupport', () => {
      it('should return true when provider supports S256', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              code_challenge_methods_supported: ['S256', 'plain'],
            }),
        });

        const result = await service.checkPkceSupport(
          'https://auth.example.com',
        );

        expect(result).toBe(true);
      });

      it('should return false when provider does not support S256', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              code_challenge_methods_supported: ['plain'],
            }),
        });

        const result = await service.checkPkceSupport(
          'https://auth.example.com',
        );

        expect(result).toBe(false);
      });

      it('should return false when code_challenge_methods_supported is not present', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              authorization_endpoint: 'https://auth.example.com/authorize',
            }),
        });

        const result = await service.checkPkceSupport(
          'https://auth.example.com',
        );

        expect(result).toBe(false);
      });

      it('should return false when fetch fails', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

        const result = await service.checkPkceSupport(
          'https://auth.example.com',
        );

        expect(result).toBe(false);
      });

      it('should return false when response is not ok', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: false,
          status: 404,
        });

        const result = await service.checkPkceSupport(
          'https://auth.example.com',
        );

        expect(result).toBe(false);
      });
    });
  });

  describe('SAML Signing', () => {
    describe('configureSaml', () => {
      it('should generate signing keys for new SAML configuration', async () => {
        const tenantId = 'tenant-123';
        const dto = {
          entityId: 'https://idp.example.com/metadata',
          ssoUrl: 'https://idp.example.com/sso',
          certificate: 'MIIC...base64cert...',
          signRequests: true,
        };

        mockSsoConfigRepository.findOne.mockResolvedValue(null);
        mockSsoConfigRepository.create.mockReturnValue({
          tenantId,
        } as any);
        mockSsoConfigRepository.save.mockImplementation((config) =>
          Promise.resolve(config),
        );

        const result = await service.configureSaml(tenantId, dto as any);

        expect(result.samlSigningCert).toBeDefined();
        expect(result.samlSigningCert).toContain('-----BEGIN CERTIFICATE-----');
        expect(result.samlSigningKeyEncrypted).toBeDefined();
        expect(result.samlSignRequests).toBe(true);
      });

      it('should default signRequests to true for new configurations', async () => {
        const tenantId = 'tenant-123';
        const dto = {
          entityId: 'https://idp.example.com/metadata',
          ssoUrl: 'https://idp.example.com/sso',
          certificate: 'MIIC...base64cert...',
          // signRequests not specified
        };

        mockSsoConfigRepository.findOne.mockResolvedValue(null);
        mockSsoConfigRepository.create.mockReturnValue({
          tenantId,
        } as any);
        mockSsoConfigRepository.save.mockImplementation((config) =>
          Promise.resolve(config),
        );

        const result = await service.configureSaml(tenantId, dto as any);

        expect(result.samlSignRequests).toBe(true);
      });

      it('should not regenerate signing keys when updating existing config', async () => {
        const tenantId = 'tenant-123';
        const existingCert =
          '-----BEGIN CERTIFICATE-----\nEXISTING...\n-----END CERTIFICATE-----';
        const existingKeyEnc = 'encrypted-key-data';
        const dto = {
          entityId: 'https://idp.example.com/metadata-updated',
          ssoUrl: 'https://idp.example.com/sso',
          certificate: 'MIIC...base64cert...',
        };

        mockSsoConfigRepository.findOne.mockResolvedValue({
          id: 'config-123',
          tenantId,
          samlSigningCert: existingCert,
          samlSigningKeyEncrypted: existingKeyEnc,
        } as any);
        mockSsoConfigRepository.save.mockImplementation((config) =>
          Promise.resolve(config),
        );

        const result = await service.configureSaml(tenantId, dto as any);

        // Should keep existing signing keys
        expect(result.samlSigningCert).toBe(existingCert);
        expect(result.samlSigningKeyEncrypted).toBe(existingKeyEnc);
      });
    });

    describe('getSigningCertificateByTenant', () => {
      it('should return signing certificate for tenant', async () => {
        const tenantId = 'tenant-123';
        const mockCert =
          '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----';
        mockSsoConfigRepository.findOne.mockResolvedValue({
          samlSigningCert: mockCert,
        } as any);

        const result = await service.getSigningCertificateByTenant(tenantId);

        expect(result).toBe(mockCert);
      });

      it('should return null if no signing certificate exists', async () => {
        const tenantId = 'tenant-123';
        mockSsoConfigRepository.findOne.mockResolvedValue({
          samlSigningCert: null,
        } as any);

        const result = await service.getSigningCertificateByTenant(tenantId);

        expect(result).toBeNull();
      });

      it('should return null if no config exists', async () => {
        const tenantId = 'tenant-123';
        mockSsoConfigRepository.findOne.mockResolvedValue(null);

        const result = await service.getSigningCertificateByTenant(tenantId);

        expect(result).toBeNull();
      });
    });

    describe('rotateSamlSigningKeys', () => {
      it('should rotate signing keys and store previous certificate', async () => {
        const tenantId = 'tenant-123';
        const oldCert =
          '-----BEGIN CERTIFICATE-----\nOLD...\n-----END CERTIFICATE-----';
        const mockConfig = {
          id: 'config-123',
          tenantId,
          providerType: 'saml',
          samlSigningCert: oldCert,
          samlSigningKeyEncrypted: 'old-encrypted-key',
          samlPreviousSigningCert: null,
          samlPreviousCertExpiresAt: null,
        };

        mockSsoConfigRepository.findOne.mockResolvedValue(mockConfig as any);
        mockSsoConfigRepository.save.mockImplementation((config) =>
          Promise.resolve(config),
        );

        const result = await service.rotateSamlSigningKeys(tenantId);

        // Should return new certificate
        expect(result.newCertificate).toBeDefined();
        expect(result.newCertificate).toContain('-----BEGIN CERTIFICATE-----');
        expect(result.newCertificate).not.toBe(oldCert);

        // Should set expiration for previous certificate (24 hours grace period)
        expect(result.previousCertExpiresAt).toBeDefined();
        const expiresAt = new Date(result.previousCertExpiresAt);
        const now = new Date();
        const diff = expiresAt.getTime() - now.getTime();
        // Should be approximately 24 hours (with some tolerance)
        expect(diff).toBeGreaterThan(23 * 60 * 60 * 1000);
        expect(diff).toBeLessThan(25 * 60 * 60 * 1000);
      });

      it('should throw error for non-SAML configurations', async () => {
        const tenantId = 'tenant-123';
        mockSsoConfigRepository.findOne.mockResolvedValue({
          id: 'config-123',
          tenantId,
          providerType: 'oidc',
        } as any);

        await expect(service.rotateSamlSigningKeys(tenantId)).rejects.toThrow(
          'Key rotation is only applicable to SAML configurations',
        );
      });

      it('should throw error if no config exists', async () => {
        const tenantId = 'tenant-123';
        mockSsoConfigRepository.findOne.mockResolvedValue(null);

        await expect(service.rotateSamlSigningKeys(tenantId)).rejects.toThrow(
          'SSO configuration not found',
        );
      });
    });

    describe('getSpMetadata', () => {
      it('should include signing certificate in metadata when signing is enabled', async () => {
        const tenantId = 'tenant-123';
        const mockCert =
          '-----BEGIN CERTIFICATE-----\nMIICtest...\n-----END CERTIFICATE-----';
        mockSsoConfigRepository.findOne.mockResolvedValue({
          samlSigningCert: mockCert,
          samlSignRequests: true,
        } as any);

        const metadata = await service.getSpMetadata(tenantId);

        expect(metadata).toContain('AuthnRequestsSigned="true"');
        expect(metadata).toContain('KeyDescriptor use="signing"');
        expect(metadata).toContain('X509Certificate');
      });

      it('should not include signing certificate when signing is disabled', async () => {
        const tenantId = 'tenant-123';
        mockSsoConfigRepository.findOne.mockResolvedValue({
          samlSigningCert: null,
          samlSignRequests: false,
        } as any);

        const metadata = await service.getSpMetadata(tenantId);

        expect(metadata).toContain('AuthnRequestsSigned="false"');
        expect(metadata).not.toContain('KeyDescriptor');
      });

      it('should return basic metadata without tenant ID', async () => {
        const metadata = await service.getSpMetadata();

        expect(metadata).toContain('EntityDescriptor');
        expect(metadata).toContain('SPSSODescriptor');
        expect(metadata).toContain('AuthnRequestsSigned="false"');
        expect(metadata).not.toContain('KeyDescriptor');
      });
    });
  });
});
