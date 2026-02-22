// Nebula DNS - SSO OIDC with PKCE E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// These tests verify the OIDC authentication flow with PKCE support.
// A mock OIDC provider is used to simulate the authorization server.

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SsoConfiguration } from '../src/modules/sso/entities/sso-configuration.entity';
import { Tenant } from '../src/modules/tenants/entities/tenant.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { RedisService } from '../src/modules/redis/redis.service';
import * as crypto from 'crypto';
import {
  generateCodeChallenge,
  verifyPKCE,
  isValidCodeVerifier,
} from '../src/modules/sso/utils/pkce.util';

// Mock OIDC Provider configuration
const MOCK_OIDC_ISSUER = 'https://mock-idp.example.com';
const MOCK_CLIENT_ID = 'test-client-id';
const MOCK_CLIENT_SECRET = 'test-client-secret';
const MOCK_REDIRECT_URI = 'http://localhost:4010/sso/oidc/callback';

/**
 * Mock OIDC Provider that simulates an authorization server
 * This captures and validates PKCE parameters
 */
class MockOidcProvider {
  private capturedCodeChallenge: string | null = null;
  private capturedCodeChallengeMethod: string | null = null;
  private authorizationCode: string | null = null;
  private expectedCodeVerifier: string | null = null;

  /**
   * Simulates the authorization endpoint
   * Captures code_challenge and code_challenge_method
   */
  handleAuthorizationRequest(params: URLSearchParams): {
    code: string;
    state: string;
  } {
    this.capturedCodeChallenge = params.get('code_challenge');
    this.capturedCodeChallengeMethod = params.get('code_challenge_method');
    this.authorizationCode = crypto.randomBytes(32).toString('hex');

    return {
      code: this.authorizationCode,
      state: params.get('state') || '',
    };
  }

  /**
   * Simulates the token endpoint
   * Validates code_verifier against stored code_challenge
   */
  handleTokenRequest(params: URLSearchParams): {
    success: boolean;
    error?: string;
    tokens?: {
      access_token: string;
      id_token: string;
      token_type: string;
      expires_in: number;
    };
  } {
    const codeVerifier = params.get('code_verifier');
    const authCode = params.get('code');

    // Verify authorization code
    if (authCode !== this.authorizationCode) {
      return { success: false, error: 'invalid_grant' };
    }

    // Verify PKCE
    if (
      this.capturedCodeChallenge &&
      this.capturedCodeChallengeMethod === 'S256'
    ) {
      if (!codeVerifier) {
        return {
          success: false,
          error: 'invalid_request - code_verifier required',
        };
      }

      // Validate code_verifier format
      if (!isValidCodeVerifier(codeVerifier)) {
        return {
          success: false,
          error: 'invalid_request - invalid code_verifier format',
        };
      }

      // Verify code_verifier matches code_challenge
      if (!verifyPKCE(codeVerifier, this.capturedCodeChallenge, 'S256')) {
        return {
          success: false,
          error: 'invalid_grant - PKCE verification failed',
        };
      }

      this.expectedCodeVerifier = codeVerifier;
    }

    return {
      success: true,
      tokens: {
        access_token:
          'mock-access-token-' + crypto.randomBytes(16).toString('hex'),
        id_token: this.generateMockIdToken(),
        token_type: 'Bearer',
        expires_in: 3600,
      },
    };
  }

  /**
   * Generate a mock ID token (JWT-like structure for testing)
   */
  private generateMockIdToken(): string {
    const header = Buffer.from(
      JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'test-user-123',
        email: 'testuser@example.com',
        name: 'Test User',
        iss: MOCK_OIDC_ISSUER,
        aud: MOCK_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      }),
    ).toString('base64url');
    const signature = 'mock-signature';
    return `${header}.${payload}.${signature}`;
  }

  getCapturedCodeChallenge(): string | null {
    return this.capturedCodeChallenge;
  }

  getCapturedCodeChallengeMethod(): string | null {
    return this.capturedCodeChallengeMethod;
  }

  getExpectedCodeVerifier(): string | null {
    return this.expectedCodeVerifier;
  }

  reset(): void {
    this.capturedCodeChallenge = null;
    this.capturedCodeChallengeMethod = null;
    this.authorizationCode = null;
    this.expectedCodeVerifier = null;
  }
}

describe('SSO OIDC with PKCE E2E Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let ssoConfigRepository: Repository<SsoConfiguration>;
  let tenantRepository: Repository<Tenant>;
  let userRepository: Repository<User>;
  let redisService: RedisService;
  let mockOidcProvider: MockOidcProvider;

  // Test data
  const testTenantId = '550e8400-e29b-41d4-a716-446655440099';
  const testTenantSlug = 'test-oidc-pkce';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    ssoConfigRepository = moduleFixture.get<Repository<SsoConfiguration>>(
      getRepositoryToken(SsoConfiguration),
    );
    tenantRepository = moduleFixture.get<Repository<Tenant>>(
      getRepositoryToken(Tenant),
    );
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    redisService = moduleFixture.get<RedisService>(RedisService);

    mockOidcProvider = new MockOidcProvider();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    mockOidcProvider.reset();
    // Clean up test data
    await ssoConfigRepository.delete({ tenantId: testTenantId });
    await tenantRepository.delete({ id: testTenantId });
  });

  afterEach(async () => {
    // Clean up test data
    await ssoConfigRepository.delete({ tenantId: testTenantId });
    await tenantRepository.delete({ id: testTenantId });
  });

  describe('OIDC Login Initiation with PKCE', () => {
    it('should include PKCE parameters in authorization URL when pkceRequired is true', async () => {
      // Create test tenant
      await tenantRepository.save({
        id: testTenantId,
        name: 'Test OIDC PKCE Tenant',
        slug: testTenantSlug,
        status: 'active',
        plan: 'pro',
      });

      // Create SSO configuration with PKCE enabled
      await ssoConfigRepository.save({
        tenantId: testTenantId,
        providerType: 'oidc',
        isEnabled: true,
        pkceRequired: true,
        oidcIssuer: MOCK_OIDC_ISSUER,
        oidcClientId: MOCK_CLIENT_ID,
        oidcClientSecretEncrypted: 'gcm:encrypted-secret',
        oidcAuthorizationUrl: `${MOCK_OIDC_ISSUER}/authorize`,
        oidcTokenUrl: `${MOCK_OIDC_ISSUER}/token`,
        oidcUserinfoUrl: `${MOCK_OIDC_ISSUER}/userinfo`,
        oidcScopes: 'openid profile email',
        autoProvisionUsers: true,
        defaultRole: 'readonly',
      });

      // Initiate OIDC login (will redirect)
      const response = await request(app.getHttpServer())
        .get(`/sso/oidc/login/${testTenantSlug}`)
        .expect(302);

      // Parse the redirect URL
      const redirectUrl = new URL(response.headers.location);
      const params = redirectUrl.searchParams;

      // Verify PKCE parameters are present
      expect(params.has('code_challenge')).toBe(true);
      expect(params.get('code_challenge_method')).toBe('S256');

      // Verify code_challenge is properly formatted (base64url, 43 chars for SHA-256)
      const codeChallenge = params.get('code_challenge');
      expect(codeChallenge).toBeDefined();
      expect(codeChallenge!.length).toBe(43);
      expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);

      // Verify other OIDC parameters
      expect(params.get('response_type')).toBe('code');
      expect(params.get('client_id')).toBe(MOCK_CLIENT_ID);
      expect(params.get('scope')).toBe('openid profile email');
      expect(params.has('state')).toBe(true);
      expect(params.has('nonce')).toBe(true);
    });

    it('should NOT include PKCE parameters when pkceRequired is false', async () => {
      // Create test tenant
      await tenantRepository.save({
        id: testTenantId,
        name: 'Test OIDC No PKCE Tenant',
        slug: testTenantSlug,
        status: 'active',
        plan: 'pro',
      });

      // Create SSO configuration with PKCE disabled
      await ssoConfigRepository.save({
        tenantId: testTenantId,
        providerType: 'oidc',
        isEnabled: true,
        pkceRequired: false,
        oidcIssuer: MOCK_OIDC_ISSUER,
        oidcClientId: MOCK_CLIENT_ID,
        oidcClientSecretEncrypted: 'gcm:encrypted-secret',
        oidcAuthorizationUrl: `${MOCK_OIDC_ISSUER}/authorize`,
        oidcTokenUrl: `${MOCK_OIDC_ISSUER}/token`,
        oidcUserinfoUrl: `${MOCK_OIDC_ISSUER}/userinfo`,
        oidcScopes: 'openid profile email',
        autoProvisionUsers: true,
        defaultRole: 'readonly',
      });

      // Initiate OIDC login (will redirect)
      const response = await request(app.getHttpServer())
        .get(`/sso/oidc/login/${testTenantSlug}`)
        .expect(302);

      // Parse the redirect URL
      const redirectUrl = new URL(response.headers.location);
      const params = redirectUrl.searchParams;

      // Verify PKCE parameters are NOT present
      expect(params.has('code_challenge')).toBe(false);
      expect(params.has('code_challenge_method')).toBe(false);

      // Verify other OIDC parameters are still present
      expect(params.get('response_type')).toBe('code');
      expect(params.get('client_id')).toBe(MOCK_CLIENT_ID);
    });

    it('should store code_verifier in Redis when PKCE is enabled', async () => {
      // Create test tenant
      await tenantRepository.save({
        id: testTenantId,
        name: 'Test OIDC PKCE Redis Tenant',
        slug: testTenantSlug,
        status: 'active',
        plan: 'pro',
      });

      // Create SSO configuration with PKCE enabled
      await ssoConfigRepository.save({
        tenantId: testTenantId,
        providerType: 'oidc',
        isEnabled: true,
        pkceRequired: true,
        oidcIssuer: MOCK_OIDC_ISSUER,
        oidcClientId: MOCK_CLIENT_ID,
        oidcClientSecretEncrypted: 'gcm:encrypted-secret',
        oidcAuthorizationUrl: `${MOCK_OIDC_ISSUER}/authorize`,
        oidcScopes: 'openid profile email',
        autoProvisionUsers: true,
        defaultRole: 'readonly',
      });

      // Initiate OIDC login
      const response = await request(app.getHttpServer())
        .get(`/sso/oidc/login/${testTenantSlug}`)
        .expect(302);

      // Extract state from redirect URL
      const redirectUrl = new URL(response.headers.location);
      const state = redirectUrl.searchParams.get('state');
      expect(state).toBeDefined();

      // Check that code_verifier was stored in Redis
      const pkceKey = `pkce:${state}`;
      const storedVerifier = await redisService.get(pkceKey);

      expect(storedVerifier).toBeDefined();
      expect(storedVerifier).not.toBeNull();

      // Verify the stored value is a valid code_verifier
      expect(isValidCodeVerifier(storedVerifier!)).toBe(true);

      // Verify the code_challenge in URL matches the stored verifier
      const codeChallenge = redirectUrl.searchParams.get('code_challenge');
      expect(codeChallenge).toBe(generateCodeChallenge(storedVerifier!));
    });

    it('should NOT store code_verifier in Redis when PKCE is disabled', async () => {
      // Create test tenant
      await tenantRepository.save({
        id: testTenantId,
        name: 'Test OIDC No PKCE Redis Tenant',
        slug: testTenantSlug,
        status: 'active',
        plan: 'pro',
      });

      // Create SSO configuration with PKCE disabled
      await ssoConfigRepository.save({
        tenantId: testTenantId,
        providerType: 'oidc',
        isEnabled: true,
        pkceRequired: false,
        oidcIssuer: MOCK_OIDC_ISSUER,
        oidcClientId: MOCK_CLIENT_ID,
        oidcClientSecretEncrypted: 'gcm:encrypted-secret',
        oidcAuthorizationUrl: `${MOCK_OIDC_ISSUER}/authorize`,
        oidcScopes: 'openid profile email',
        autoProvisionUsers: true,
        defaultRole: 'readonly',
      });

      // Initiate OIDC login
      const response = await request(app.getHttpServer())
        .get(`/sso/oidc/login/${testTenantSlug}`)
        .expect(302);

      // Extract state from redirect URL
      const redirectUrl = new URL(response.headers.location);
      const state = redirectUrl.searchParams.get('state');
      expect(state).toBeDefined();

      // Check that code_verifier was NOT stored in Redis
      const pkceKey = `pkce:${state}`;
      const storedVerifier = await redisService.get(pkceKey);

      expect(storedVerifier).toBeNull();
    });
  });

  describe('PKCE Code Verifier Validation', () => {
    it('should generate code_verifier with correct length (43-128 chars)', async () => {
      // Create test tenant
      await tenantRepository.save({
        id: testTenantId,
        name: 'Test OIDC PKCE Length Tenant',
        slug: testTenantSlug,
        status: 'active',
        plan: 'pro',
      });

      // Create SSO configuration with PKCE enabled
      await ssoConfigRepository.save({
        tenantId: testTenantId,
        providerType: 'oidc',
        isEnabled: true,
        pkceRequired: true,
        oidcIssuer: MOCK_OIDC_ISSUER,
        oidcClientId: MOCK_CLIENT_ID,
        oidcClientSecretEncrypted: 'gcm:encrypted-secret',
        oidcAuthorizationUrl: `${MOCK_OIDC_ISSUER}/authorize`,
        oidcScopes: 'openid profile email',
        autoProvisionUsers: true,
        defaultRole: 'readonly',
      });

      // Initiate multiple OIDC logins to test verifier generation
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .get(`/sso/oidc/login/${testTenantSlug}`)
          .expect(302);

        const redirectUrl = new URL(response.headers.location);
        const state = redirectUrl.searchParams.get('state');
        const pkceKey = `pkce:${state}`;
        const storedVerifier = await redisService.get(pkceKey);

        expect(storedVerifier).toBeDefined();
        expect(storedVerifier!.length).toBeGreaterThanOrEqual(43);
        expect(storedVerifier!.length).toBeLessThanOrEqual(128);

        // Clean up
        await redisService.del(pkceKey);
      }
    });

    it('should generate unique code_verifier for each login attempt', async () => {
      // Create test tenant
      await tenantRepository.save({
        id: testTenantId,
        name: 'Test OIDC PKCE Unique Tenant',
        slug: testTenantSlug,
        status: 'active',
        plan: 'pro',
      });

      // Create SSO configuration with PKCE enabled
      await ssoConfigRepository.save({
        tenantId: testTenantId,
        providerType: 'oidc',
        isEnabled: true,
        pkceRequired: true,
        oidcIssuer: MOCK_OIDC_ISSUER,
        oidcClientId: MOCK_CLIENT_ID,
        oidcClientSecretEncrypted: 'gcm:encrypted-secret',
        oidcAuthorizationUrl: `${MOCK_OIDC_ISSUER}/authorize`,
        oidcScopes: 'openid profile email',
        autoProvisionUsers: true,
        defaultRole: 'readonly',
      });

      const verifiers: string[] = [];

      // Initiate multiple OIDC logins
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer())
          .get(`/sso/oidc/login/${testTenantSlug}`)
          .expect(302);

        const redirectUrl = new URL(response.headers.location);
        const state = redirectUrl.searchParams.get('state');
        const pkceKey = `pkce:${state}`;
        const storedVerifier = await redisService.get(pkceKey);

        expect(storedVerifier).toBeDefined();
        verifiers.push(storedVerifier!);

        // Clean up
        await redisService.del(pkceKey);
      }

      // All verifiers should be unique
      const uniqueVerifiers = new Set(verifiers);
      expect(uniqueVerifiers.size).toBe(verifiers.length);
    });

    it('should only contain URL-safe characters in code_verifier', async () => {
      // Create test tenant
      await tenantRepository.save({
        id: testTenantId,
        name: 'Test OIDC PKCE Chars Tenant',
        slug: testTenantSlug,
        status: 'active',
        plan: 'pro',
      });

      // Create SSO configuration with PKCE enabled
      await ssoConfigRepository.save({
        tenantId: testTenantId,
        providerType: 'oidc',
        isEnabled: true,
        pkceRequired: true,
        oidcIssuer: MOCK_OIDC_ISSUER,
        oidcClientId: MOCK_CLIENT_ID,
        oidcClientSecretEncrypted: 'gcm:encrypted-secret',
        oidcAuthorizationUrl: `${MOCK_OIDC_ISSUER}/authorize`,
        oidcScopes: 'openid profile email',
        autoProvisionUsers: true,
        defaultRole: 'readonly',
      });

      // Initiate OIDC login
      const response = await request(app.getHttpServer())
        .get(`/sso/oidc/login/${testTenantSlug}`)
        .expect(302);

      const redirectUrl = new URL(response.headers.location);
      const state = redirectUrl.searchParams.get('state');
      const pkceKey = `pkce:${state}`;
      const storedVerifier = await redisService.get(pkceKey);

      expect(storedVerifier).toBeDefined();

      // RFC 7636 unreserved characters: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
      const urlSafePattern = /^[A-Za-z0-9\-._~]+$/;
      expect(storedVerifier).toMatch(urlSafePattern);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/sso/oidc/login/non-existent-tenant')
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should return 400 when OIDC is not enabled', async () => {
      // Create test tenant
      await tenantRepository.save({
        id: testTenantId,
        name: 'Test OIDC Disabled Tenant',
        slug: testTenantSlug,
        status: 'active',
        plan: 'pro',
      });

      // Create SSO configuration with OIDC disabled
      await ssoConfigRepository.save({
        tenantId: testTenantId,
        providerType: 'oidc',
        isEnabled: false, // Disabled
        pkceRequired: true,
        oidcIssuer: MOCK_OIDC_ISSUER,
        oidcClientId: MOCK_CLIENT_ID,
        oidcClientSecretEncrypted: 'gcm:encrypted-secret',
        oidcScopes: 'openid profile email',
        autoProvisionUsers: true,
        defaultRole: 'readonly',
      });

      const response = await request(app.getHttpServer())
        .get(`/sso/oidc/login/${testTenantSlug}`)
        .expect(400);

      expect(response.body.message).toContain('not enabled');
    });

    it('should return 400 when provider type is SAML (not OIDC)', async () => {
      // Create test tenant
      await tenantRepository.save({
        id: testTenantId,
        name: 'Test SAML Tenant',
        slug: testTenantSlug,
        status: 'active',
        plan: 'pro',
      });

      // Create SSO configuration with SAML
      await ssoConfigRepository.save({
        tenantId: testTenantId,
        providerType: 'saml', // SAML, not OIDC
        isEnabled: true,
        samlEntityId: 'https://idp.example.com/metadata',
        samlSsoUrl: 'https://idp.example.com/sso',
        samlCertificate: 'mock-certificate',
        autoProvisionUsers: true,
        defaultRole: 'readonly',
      });

      const response = await request(app.getHttpServer())
        .get(`/sso/oidc/login/${testTenantSlug}`)
        .expect(400);

      expect(response.body.message).toContain('not enabled');
    });
  });
});
