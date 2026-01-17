// Nebula DNS - SSO Service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Single Sign-On service with AES-256-GCM encryption for client secrets

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { SAML, SamlConfig } from '@node-saml/node-saml';
import { SsoConfiguration } from './entities/sso-configuration.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { ConfigureSamlDto, ConfigureOidcDto } from './dto/sso.dto';
import { RedisService } from '../redis/redis.service';
import { generatePKCEPair } from './utils/pkce.util';
import {
  generateSigningKeyPair,
  signXMLWithCertificate,
  buildAuthnRequest,
  buildLogoutRequest,
  generateSamlId,
  getSamlTimestamp,
  extractCertificateBase64,
} from './utils/saml-keys.util';
import { v4 as uuidv4 } from 'uuid';
import { getEncryptionKey } from '../../config/encryption.config';
import {
  encrypt,
  decrypt,
  deriveKey,
  detectEncryptionFormat,
  EncryptionError,
} from '../../common/utils/encryption.util';

// PKCE code verifier TTL in seconds (5 minutes)
const PKCE_TTL_SECONDS = 300;

// Redis key prefix for PKCE code verifiers
const PKCE_KEY_PREFIX = 'pkce:';

// Grace period for old certificate during key rotation (24 hours)
const KEY_ROTATION_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);
  private readonly encryptionKey: Buffer;
  private readonly legacyEncryptionKey: Buffer;

  constructor(
    @InjectRepository(SsoConfiguration)
    private ssoConfigRepository: Repository<SsoConfiguration>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {
    // Use centralized encryption key management with GCM key derivation
    const key = getEncryptionKey('SSO_ENCRYPTION_KEY');
    this.encryptionKey = deriveKey(key, 'sso-gcm-salt');
    // Keep legacy key for backward compatibility during migration
    this.legacyEncryptionKey = crypto.scryptSync(key, 'salt', 32);
  }

  // Encrypt using AES-256-GCM
  private encryptSecret(text: string): string {
    return encrypt(text, this.encryptionKey);
  }

  // Decrypt with legacy CBC support for backward compatibility
  private decryptSecret(encryptedText: string): string {
    try {
      const formatInfo = detectEncryptionFormat(encryptedText);

      if (formatInfo.isLegacy) {
        this.logger.warn(
          'Detected legacy CBC encryption format in SSO secret - consider running migration',
        );
        return this.decryptLegacyCBC(encryptedText);
      }

      return decrypt(encryptedText, this.encryptionKey);
    } catch (error) {
      this.logger.error('SSO secret decryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        context: 'SsoService.decryptSecret',
        isLegacy:
          error instanceof EncryptionError ? error.isLegacyFormat : false,
      });
      throw new BadRequestException(
        'Unable to decrypt SSO configuration. Please contact support.',
      );
    }
  }

  // Decrypt legacy CBC-encrypted data
  private decryptLegacyCBC(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      this.legacyEncryptionKey,
      iv,
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Re-encrypt legacy data to GCM format (opportunistic migration)
  private async reEncryptIfLegacy(
    config: SsoConfiguration,
    field: 'oidcClientSecretEncrypted' | 'samlSigningKeyEncrypted',
    decryptedValue: string,
    encryptedValue: string,
  ): Promise<void> {
    const formatInfo = detectEncryptionFormat(encryptedValue);

    if (formatInfo.isLegacy) {
      try {
        config[field] = this.encryptSecret(decryptedValue);
        await this.ssoConfigRepository.save(config);
        this.logger.log(
          `SSO: Migrated tenant ${config.tenantId} ${field} to GCM encryption`,
        );
      } catch (error) {
        this.logger.warn(
          `SSO: Failed to migrate tenant ${config.tenantId} ${field} to GCM encryption`,
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }
  }

  private createSamlInstance(config: SsoConfiguration): SAML {
    const callbackUrl = `${this.configService.get('API_URL')}/sso/saml/callback`;
    const entityId = this.configService.get(
      'SAML_SP_ENTITY_ID',
      'nebuladns-sp',
    );

    const samlConfig: SamlConfig = {
      callbackUrl,
      entryPoint: config.samlSsoUrl || undefined,
      issuer: entityId,
      idpCert: config.samlCertificate || '',
      wantAssertionsSigned: true,
      wantAuthnResponseSigned: true, // Require signed responses
      signatureAlgorithm: 'sha256',
      identifierFormat:
        'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    };

    // Add SP signing certificate and key if available and signing is enabled
    if (
      config.samlSignRequests &&
      config.samlSigningCert &&
      config.samlSigningKeyEncrypted
    ) {
      const decryptedKey = this.decryptSecret(config.samlSigningKeyEncrypted);
      samlConfig.privateKey = decryptedKey;
      samlConfig.publicCert = config.samlSigningCert;

      // Opportunistically re-encrypt if legacy format
      this.reEncryptIfLegacy(
        config,
        'samlSigningKeyEncrypted',
        decryptedKey,
        config.samlSigningKeyEncrypted,
      ).catch(() => {});
    }

    return new SAML(samlConfig);
  }

  private generateSsoTokens(user: User): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      ssoAuthenticated: true,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh', jti: uuidv4(), ssoAuthenticated: true },
      {
        expiresIn:
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  async getConfiguration(tenantId: string): Promise<SsoConfiguration | null> {
    return this.ssoConfigRepository.findOne({ where: { tenantId } });
  }

  async configureSaml(
    tenantId: string,
    dto: ConfigureSamlDto,
  ): Promise<SsoConfiguration> {
    let config = await this.ssoConfigRepository.findOne({
      where: { tenantId },
    });

    const isNewConfig = !config;
    if (!config) {
      config = this.ssoConfigRepository.create({ tenantId });
    }

    config.providerType = 'saml';
    config.samlEntityId = dto.entityId;
    config.samlSsoUrl = dto.ssoUrl;
    config.samlSloUrl = dto.sloUrl || null;
    config.samlCertificate = dto.certificate;
    config.autoProvisionUsers = dto.autoProvisionUsers ?? true;
    config.defaultRole = dto.defaultRole || 'readonly';
    config.domainRestriction = dto.domainRestriction || null;
    config.attributeMapping = (dto.attributeMapping as Record<
      string,
      string
    >) || { email: 'email', name: 'name' };

    // Set signRequests - default to true for new configs
    config.samlSignRequests =
      dto.signRequests ?? config.samlSignRequests ?? true;

    // Generate signing keys if this is a new config or no keys exist
    if (
      isNewConfig ||
      !config.samlSigningCert ||
      !config.samlSigningKeyEncrypted
    ) {
      this.logger.log(`Generating SAML signing keys for tenant: ${tenantId}`);
      const keyPair = generateSigningKeyPair({
        commonName: `Nebula DNS SP - ${tenantId}`,
        organization: 'Nebula DNS',
        country: 'US',
      });
      config.samlSigningCert = keyPair.certificate;
      // Encrypt with GCM
      config.samlSigningKeyEncrypted = this.encryptSecret(keyPair.privateKey);
    }

    return this.ssoConfigRepository.save(config);
  }

  async configureOidc(
    tenantId: string,
    dto: ConfigureOidcDto,
  ): Promise<SsoConfiguration> {
    let config = await this.ssoConfigRepository.findOne({
      where: { tenantId },
    });

    if (!config) {
      config = this.ssoConfigRepository.create({ tenantId });
    }

    config.providerType = 'oidc';
    config.oidcIssuer = dto.issuer;
    config.oidcClientId = dto.clientId;
    // Encrypt with GCM
    config.oidcClientSecretEncrypted = this.encryptSecret(dto.clientSecret);
    config.oidcAuthorizationUrl = dto.authorizationUrl || null;
    config.oidcTokenUrl = dto.tokenUrl || null;
    config.oidcUserinfoUrl = dto.userinfoUrl || null;
    config.oidcScopes = dto.scopes || 'openid profile email';
    config.pkceRequired = dto.pkceRequired ?? true; // Default to true for new configs
    config.autoProvisionUsers = dto.autoProvisionUsers ?? true;
    config.defaultRole = dto.defaultRole || 'readonly';
    config.domainRestriction = dto.domainRestriction || null;
    config.attributeMapping = (dto.attributeMapping as Record<
      string,
      string
    >) || { email: 'email', name: 'name' };

    // Check if OIDC provider supports PKCE
    if (config.pkceRequired) {
      await this.checkPkceSupport(dto.issuer);
    }

    return this.ssoConfigRepository.save(config);
  }

  async enableSso(tenantId: string): Promise<SsoConfiguration> {
    const config = await this.getConfiguration(tenantId);
    if (!config) {
      throw new NotFoundException('SSO not configured');
    }

    // Validate configuration is complete
    if (config.providerType === 'saml') {
      if (
        !config.samlEntityId ||
        !config.samlSsoUrl ||
        !config.samlCertificate
      ) {
        throw new BadRequestException('SAML configuration incomplete');
      }
    } else if (config.providerType === 'oidc') {
      if (
        !config.oidcIssuer ||
        !config.oidcClientId ||
        !config.oidcClientSecretEncrypted
      ) {
        throw new BadRequestException('OIDC configuration incomplete');
      }
    }

    config.isEnabled = true;
    await this.tenantRepository.update(tenantId, { ssoEnabled: true } as any);

    return this.ssoConfigRepository.save(config);
  }

  async disableSso(tenantId: string): Promise<SsoConfiguration> {
    const config = await this.getConfiguration(tenantId);
    if (!config) {
      throw new NotFoundException('SSO not configured');
    }

    config.isEnabled = false;
    await this.tenantRepository.update(tenantId, { ssoEnabled: false } as any);

    return this.ssoConfigRepository.save(config);
  }

  // Check if SSO is enabled for a tenant
  async isEnabled(tenantId: string): Promise<boolean> {
    const config = await this.getConfiguration(tenantId);
    return config?.isEnabled ?? false;
  }

  // Alias for disableSso - used by tests
  async disable(tenantId: string): Promise<SsoConfiguration> {
    return this.disableSso(tenantId);
  }

  async deleteSsoConfig(tenantId: string): Promise<void> {
    await this.ssoConfigRepository.delete({ tenantId });
    await this.tenantRepository.update(tenantId, {
      ssoEnabled: false,
      ssoEnforced: false,
    } as any);
  }

  async initiateSamlLogin(
    tenantSlug: string,
  ): Promise<{ redirectUrl: string }> {
    const tenant = await this.tenantRepository.findOne({
      where: { slug: tenantSlug },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const config = await this.getConfiguration(tenant.id);
    if (!config || !config.isEnabled || config.providerType !== 'saml') {
      throw new BadRequestException('SAML SSO not enabled for this tenant');
    }

    try {
      const saml = this.createSamlInstance(config);
      const redirectUrl = await saml.getAuthorizeUrlAsync(
        tenant.slug,
        undefined,
        {},
      );
      this.logger.log(`SAML login initiated for tenant: ${tenantSlug}`);
      return { redirectUrl };
    } catch (error) {
      this.logger.error(`SAML login initiation failed: ${error.message}`);
      throw new BadRequestException('Failed to initiate SAML login');
    }
  }

  async handleSamlCallback(
    samlResponse: string,
    relayState: string,
  ): Promise<{ user: User; token: string; refreshToken: string }> {
    // Extract tenant from RelayState
    const tenant = await this.tenantRepository.findOne({
      where: { slug: relayState },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const config = await this.getConfiguration(tenant.id);
    if (!config || !config.isEnabled) {
      throw new UnauthorizedException('SSO not enabled');
    }

    try {
      const saml = this.createSamlInstance(config);

      // Validate and parse SAML response using @node-saml/node-saml
      const profile = await saml.validatePostResponseAsync({
        SAMLResponse: samlResponse,
      });

      if (!profile || !profile.profile) {
        throw new UnauthorizedException('Invalid SAML response');
      }

      const samlProfile = profile.profile;

      // Extract user attributes based on attribute mapping
      const emailAttr = config.attributeMapping?.email || 'email';
      const nameAttr = config.attributeMapping?.name || 'name';

      // Try multiple common email attributes
      const email =
        samlProfile[emailAttr] ||
        samlProfile.email ||
        samlProfile.nameID ||
        (samlProfile as any)[
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
        ];

      const name =
        samlProfile[nameAttr] ||
        samlProfile.displayName ||
        (samlProfile as any)[
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'
        ] ||
        (samlProfile as any)[
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'
        ];

      if (!email) {
        this.logger.error(
          'Email not found in SAML response. Available attributes:',
          Object.keys(samlProfile),
        );
        throw new BadRequestException('Email not found in SAML response');
      }

      this.logger.log(
        `SAML callback: extracted email ${email} for tenant ${tenant.slug}`,
      );

      // Check domain restriction
      if (
        config.domainRestriction &&
        !email.endsWith(config.domainRestriction)
      ) {
        throw new UnauthorizedException(
          `Email domain not allowed. Must end with ${config.domainRestriction}`,
        );
      }

      // Find or create user
      let user = await this.userRepository.findOne({
        where: { tenantId: tenant.id, email },
      });

      if (!user) {
        if (!config.autoProvisionUsers) {
          throw new UnauthorizedException(
            'User not found and auto-provisioning is disabled',
          );
        }

        user = this.userRepository.create({
          tenantId: tenant.id,
          email,
          name: name || email.split('@')[0],
          passwordHash: '', // SSO users don't have passwords
          role: config.defaultRole,
          status: 'active',
        });
        await this.userRepository.save(user);
        this.logger.log(`Auto-provisioned new SSO user: ${email}`);
      }

      // Update last login
      await this.userRepository.update(user.id, { lastLoginAt: new Date() });

      // Generate JWT tokens
      const { accessToken, refreshToken } = this.generateSsoTokens(user);

      return { user, token: accessToken, refreshToken };
    } catch (error) {
      this.logger.error(`SAML callback failed: ${error.message}`);
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new UnauthorizedException('SAML authentication failed');
    }
  }

  async initiateOidcLogin(
    tenantSlug: string,
  ): Promise<{ redirectUrl: string }> {
    const tenant = await this.tenantRepository.findOne({
      where: { slug: tenantSlug },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const config = await this.getConfiguration(tenant.id);
    if (!config || !config.isEnabled || config.providerType !== 'oidc') {
      throw new BadRequestException('OIDC SSO not enabled for this tenant');
    }

    const state = crypto.randomBytes(16).toString('hex');
    const nonce = crypto.randomBytes(16).toString('hex');
    const callbackUrl = `${this.configService.get('API_URL')}/sso/oidc/callback`;

    // Determine authorization URL
    let authUrl = config.oidcAuthorizationUrl;
    if (!authUrl) {
      // Try well-known endpoint
      authUrl = `${config.oidcIssuer}/authorize`;
    }

    if (!config.oidcClientId) {
      throw new BadRequestException('OIDC client ID not configured');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.oidcClientId,
      redirect_uri: callbackUrl,
      scope: config.oidcScopes,
      state: `${tenant.slug}:${state}`,
      nonce,
    });

    // Add PKCE parameters if enabled
    if (config.pkceRequired) {
      const pkce = generatePKCEPair();

      // Store code_verifier in Redis with state as key (5-min TTL)
      const pkceKey = `${PKCE_KEY_PREFIX}${tenant.slug}:${state}`;
      await this.redisService.set(pkceKey, pkce.codeVerifier, PKCE_TTL_SECONDS);

      // Add PKCE parameters to authorization URL
      params.append('code_challenge', pkce.codeChallenge);
      params.append('code_challenge_method', pkce.codeChallengeMethod);

      this.logger.debug(
        `PKCE enabled for OIDC login: tenant=${tenantSlug}, state=${state}`,
      );
    }

    this.logger.log(
      `OIDC login initiated for tenant: ${tenantSlug}, pkce=${config.pkceRequired}`,
    );

    return { redirectUrl: `${authUrl}?${params.toString()}` };
  }

  async handleOidcCallback(
    code: string,
    state: string,
  ): Promise<{ user: User; token: string; refreshToken: string }> {
    const [tenantSlug] = state.split(':');

    const tenant = await this.tenantRepository.findOne({
      where: { slug: tenantSlug },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const config = await this.getConfiguration(tenant.id);
    if (!config || !config.isEnabled) {
      throw new UnauthorizedException('SSO not enabled');
    }

    try {
      // Exchange code for tokens
      let tokenUrl = config.oidcTokenUrl;
      if (!tokenUrl) {
        // Try to discover from well-known endpoint
        try {
          const discoveryResponse = await fetch(
            `${config.oidcIssuer}/.well-known/openid-configuration`,
          );
          if (discoveryResponse.ok) {
            const discovery = await discoveryResponse.json();
            tokenUrl = discovery.token_endpoint;
          }
        } catch {
          // Fall back to standard path
        }
        tokenUrl = tokenUrl || `${config.oidcIssuer}/oauth/token`;
      }

      if (!config.oidcClientId || !config.oidcClientSecretEncrypted) {
        throw new BadRequestException('OIDC not properly configured');
      }

      const callbackUrl = `${this.configService.get('API_URL')}/sso/oidc/callback`;
      const originalEncrypted = config.oidcClientSecretEncrypted;
      const clientSecret = this.decryptSecret(originalEncrypted);

      // Opportunistically re-encrypt if legacy format
      await this.reEncryptIfLegacy(
        config,
        'oidcClientSecretEncrypted',
        clientSecret,
        originalEncrypted,
      );

      this.logger.log(`OIDC token exchange for tenant: ${tenantSlug}`);

      // Build token request parameters
      const tokenParams: Record<string, string> = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
        client_id: config.oidcClientId,
        client_secret: clientSecret,
      };

      // Retrieve and include PKCE code_verifier if PKCE is enabled
      if (config.pkceRequired) {
        const pkceKey = `${PKCE_KEY_PREFIX}${state}`;
        const codeVerifier = await this.redisService.get(pkceKey);

        if (!codeVerifier) {
          this.logger.error(
            `PKCE code verifier not found or expired for state: ${state}`,
          );
          throw new UnauthorizedException(
            'PKCE verification failed: code verifier not found or expired',
          );
        }

        tokenParams.code_verifier = codeVerifier;

        // Delete the code_verifier from Redis after retrieval (one-time use)
        await this.redisService.del(pkceKey);

        this.logger.debug(
          `PKCE code_verifier included in token exchange for state: ${state}`,
        );
      }

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(tokenParams),
      });

      if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.text();
        this.logger.error(`OIDC token exchange failed: ${errorBody}`);
        throw new UnauthorizedException('Failed to exchange code for tokens');
      }

      const tokens = await tokenResponse.json();

      // Get user info
      let userinfoUrl = config.oidcUserinfoUrl;
      if (!userinfoUrl) {
        userinfoUrl = `${config.oidcIssuer}/userinfo`;
      }

      const userinfoResponse = await fetch(userinfoUrl, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userinfoResponse.ok) {
        throw new UnauthorizedException('Failed to get user info');
      }

      const userinfo = await userinfoResponse.json();

      // Extract email with fallbacks for common OIDC providers
      const email =
        userinfo[config.attributeMapping?.email || 'email'] ||
        userinfo.email ||
        userinfo.preferred_username;

      const name =
        userinfo[config.attributeMapping?.name || 'name'] ||
        userinfo.name ||
        `${userinfo.given_name || ''} ${userinfo.family_name || ''}`.trim() ||
        email?.split('@')[0];

      if (!email) {
        this.logger.error(
          'Email not found in OIDC userinfo. Available claims:',
          Object.keys(userinfo),
        );
        throw new BadRequestException('Email not found in user info');
      }

      this.logger.log(
        `OIDC callback: extracted email ${email} for tenant ${tenant.slug}`,
      );

      // Check domain restriction
      if (
        config.domainRestriction &&
        !email.endsWith(config.domainRestriction)
      ) {
        throw new UnauthorizedException(`Email domain not allowed`);
      }

      // Find or create user
      let user = await this.userRepository.findOne({
        where: { tenantId: tenant.id, email },
      });

      if (!user) {
        if (!config.autoProvisionUsers) {
          throw new UnauthorizedException(
            'User not found and auto-provisioning is disabled',
          );
        }

        user = this.userRepository.create({
          tenantId: tenant.id,
          email,
          name: name || email.split('@')[0],
          passwordHash: '',
          role: config.defaultRole,
          status: 'active',
        });
        await this.userRepository.save(user);
        this.logger.log(`Auto-provisioned new OIDC user: ${email}`);
      }

      // Update last login
      await this.userRepository.update(user.id, { lastLoginAt: new Date() });

      // Generate JWT tokens
      const { accessToken, refreshToken } = this.generateSsoTokens(user);

      return { user, token: accessToken, refreshToken };
    } catch (error) {
      this.logger.error(`OIDC callback failed: ${error.message}`);
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new UnauthorizedException('OIDC authentication failed');
    }
  }

  async getSpMetadata(tenantId?: string): Promise<string> {
    const entityId = this.configService.get(
      'SAML_SP_ENTITY_ID',
      'nebuladns-sp',
    );
    const acsUrl = `${this.configService.get('API_URL')}/sso/saml/callback`;
    const sloUrl = `${this.configService.get('API_URL')}/sso/saml/logout`;

    // Get tenant-specific signing certificate if available
    let signingCertBlock = '';
    let authnRequestsSigned = 'false';

    if (tenantId) {
      const config = await this.getConfiguration(tenantId);
      if (config?.samlSignRequests && config?.samlSigningCert) {
        const certBase64 = extractCertificateBase64(config.samlSigningCert);
        authnRequestsSigned = 'true';
        signingCertBlock = `
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>${certBase64}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>`;
      }
    }

    return `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="${authnRequestsSigned}" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">${signingCertBlock}
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${acsUrl}" index="0"/>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${sloUrl}"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
  }

  /**
   * Get the SP signing certificate for a tenant configuration
   * Returns the certificate in PEM format
   */
  async getSigningCertificate(configId: string): Promise<string | null> {
    const config = await this.ssoConfigRepository.findOne({
      where: { id: configId },
    });

    if (!config || !config.samlSigningCert) {
      return null;
    }

    return config.samlSigningCert;
  }

  /**
   * Get the SP signing certificate by tenant ID
   */
  async getSigningCertificateByTenant(
    tenantId: string,
  ): Promise<string | null> {
    const config = await this.getConfiguration(tenantId);

    if (!config || !config.samlSigningCert) {
      return null;
    }

    return config.samlSigningCert;
  }

  /**
   * Rotate SAML signing keys for a tenant configuration
   * The old certificate is kept valid for a grace period (24 hours)
   * to allow IdP administrators time to update their configurations
   */
  async rotateSamlSigningKeys(
    tenantId: string,
  ): Promise<{ newCertificate: string; previousCertExpiresAt: Date }> {
    const config = await this.getConfiguration(tenantId);
    if (!config) {
      throw new NotFoundException('SSO configuration not found');
    }

    if (config.providerType !== 'saml') {
      throw new BadRequestException(
        'Key rotation is only applicable to SAML configurations',
      );
    }

    this.logger.log(`Rotating SAML signing keys for tenant: ${tenantId}`);

    // Store the current certificate as previous (for grace period)
    if (config.samlSigningCert) {
      config.samlPreviousSigningCert = config.samlSigningCert;
      config.samlPreviousCertExpiresAt = new Date(
        Date.now() + KEY_ROTATION_GRACE_PERIOD_MS,
      );
    }

    // Generate new key pair
    const keyPair = generateSigningKeyPair({
      commonName: `Nebula DNS SP - ${tenantId}`,
      organization: 'Nebula DNS',
      country: 'US',
    });

    config.samlSigningCert = keyPair.certificate;
    config.samlSigningKeyEncrypted = this.encryptSecret(keyPair.privateKey);

    await this.ssoConfigRepository.save(config);

    this.logger.log(
      `SAML signing keys rotated for tenant: ${tenantId}. Previous certificate valid until: ${config.samlPreviousCertExpiresAt?.toISOString()}`,
    );

    return {
      newCertificate: keyPair.certificate,
      previousCertExpiresAt: config.samlPreviousCertExpiresAt!,
    };
  }

  /**
   * Clean up expired previous certificates
   * This should be called periodically (e.g., via a scheduled job)
   */
  async cleanupExpiredPreviousCertificates(): Promise<number> {
    const result = await this.ssoConfigRepository
      .createQueryBuilder()
      .update(SsoConfiguration)
      .set({
        samlPreviousSigningCert: null,
        samlPreviousCertExpiresAt: null,
      })
      .where('saml_previous_cert_expires_at IS NOT NULL')
      .andWhere('saml_previous_cert_expires_at < :now', { now: new Date() })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(
        `Cleaned up ${result.affected} expired previous SAML certificates`,
      );
    }

    return result.affected || 0;
  }

  /**
   * Build a signed SAML AuthnRequest
   * Returns both the signed XML and the redirect URL
   */
  async buildSignedAuthnRequest(
    tenantId: string,
    relayState: string,
  ): Promise<{ signedXml: string; redirectUrl: string }> {
    const config = await this.getConfiguration(tenantId);
    if (!config || config.providerType !== 'saml') {
      throw new BadRequestException('SAML configuration not found');
    }

    if (!config.samlSsoUrl) {
      throw new BadRequestException('SAML SSO URL not configured');
    }

    const entityId = this.configService.get(
      'SAML_SP_ENTITY_ID',
      'nebuladns-sp',
    );
    const acsUrl = `${this.configService.get('API_URL')}/sso/saml/callback`;

    // Build the AuthnRequest XML
    const requestId = generateSamlId();
    const issueInstant = getSamlTimestamp();
    const authnRequest = buildAuthnRequest({
      id: requestId,
      issueInstant,
      destination: config.samlSsoUrl,
      issuer: entityId,
      assertionConsumerServiceUrl: acsUrl,
    });

    let signedXml = authnRequest;

    // Sign the request if signing is enabled and keys are available
    if (
      config.samlSignRequests &&
      config.samlSigningCert &&
      config.samlSigningKeyEncrypted
    ) {
      const privateKey = this.decryptSecret(config.samlSigningKeyEncrypted);
      signedXml = signXMLWithCertificate(
        authnRequest,
        privateKey,
        config.samlSigningCert,
      );
    }

    // Build redirect URL with base64-encoded request
    const encodedRequest = Buffer.from(signedXml).toString('base64');
    const params = new URLSearchParams({
      SAMLRequest: encodedRequest,
      RelayState: relayState,
    });

    const redirectUrl = `${config.samlSsoUrl}?${params.toString()}`;

    return { signedXml, redirectUrl };
  }

  /**
   * Build a signed SAML LogoutRequest
   */
  async buildSignedLogoutRequest(
    tenantId: string,
    nameId: string,
    sessionIndex?: string,
  ): Promise<{ signedXml: string; redirectUrl: string }> {
    const config = await this.getConfiguration(tenantId);
    if (!config || config.providerType !== 'saml') {
      throw new BadRequestException('SAML configuration not found');
    }

    if (!config.samlSloUrl) {
      throw new BadRequestException('SAML SLO URL not configured');
    }

    const entityId = this.configService.get(
      'SAML_SP_ENTITY_ID',
      'nebuladns-sp',
    );

    // Build the LogoutRequest XML
    const requestId = generateSamlId();
    const issueInstant = getSamlTimestamp();
    const logoutRequest = buildLogoutRequest({
      id: requestId,
      issueInstant,
      destination: config.samlSloUrl,
      issuer: entityId,
      nameId,
      sessionIndex,
    });

    let signedXml = logoutRequest;

    // Sign the request if signing is enabled and keys are available
    if (
      config.samlSignRequests &&
      config.samlSigningCert &&
      config.samlSigningKeyEncrypted
    ) {
      const privateKey = this.decryptSecret(config.samlSigningKeyEncrypted);
      signedXml = signXMLWithCertificate(
        logoutRequest,
        privateKey,
        config.samlSigningCert,
      );
    }

    // Build redirect URL with base64-encoded request
    const encodedRequest = Buffer.from(signedXml).toString('base64');
    const params = new URLSearchParams({
      SAMLRequest: encodedRequest,
    });

    const redirectUrl = `${config.samlSloUrl}?${params.toString()}`;

    return { signedXml, redirectUrl };
  }

  async importIdpMetadata(
    tenantId: string,
    metadataUrl: string,
  ): Promise<{ entityId: string; ssoUrl: string; certificate: string }> {
    this.logger.log(`Importing IdP metadata from: ${metadataUrl}`);

    try {
      const response = await fetch(metadataUrl);
      if (!response.ok) {
        throw new BadRequestException('Failed to fetch IdP metadata');
      }

      const metadataXml = await response.text();

      // Parse the SAML metadata XML to extract IdP configuration
      // Extract EntityID
      const entityIdMatch = metadataXml.match(/entityID=["']([^"']+)["']/);
      if (!entityIdMatch) {
        throw new BadRequestException('Could not find entityID in metadata');
      }
      const entityId = entityIdMatch[1];

      // Extract SSO URL (HTTP-Redirect or HTTP-POST binding)
      const ssoUrlMatch =
        metadataXml.match(
          /<(?:md:)?SingleSignOnService[^>]*Binding="urn:oasis:names:tc:SAML:2\.0:bindings:HTTP-(?:Redirect|POST)"[^>]*Location="([^"]+)"/,
        ) ||
        metadataXml.match(
          /<(?:md:)?SingleSignOnService[^>]*Location="([^"]+)"[^>]*Binding="urn:oasis:names:tc:SAML:2\.0:bindings:HTTP-(?:Redirect|POST)"/,
        );

      if (!ssoUrlMatch) {
        throw new BadRequestException(
          'Could not find SingleSignOnService URL in metadata',
        );
      }
      const ssoUrl = ssoUrlMatch[1];

      // Extract X.509 certificate
      const certMatch = metadataXml.match(
        /<(?:ds:)?X509Certificate>([^<]+)<\/(?:ds:)?X509Certificate>/,
      );
      if (!certMatch) {
        throw new BadRequestException(
          'Could not find X509 certificate in metadata',
        );
      }
      // Clean up the certificate (remove whitespace)
      const certificate = certMatch[1].replace(/\s/g, '');

      this.logger.log(
        `Successfully parsed IdP metadata: entityId=${entityId}, ssoUrl=${ssoUrl}`,
      );

      return { entityId, ssoUrl, certificate };
    } catch (error) {
      this.logger.error(`Failed to import IdP metadata: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to parse IdP metadata');
    }
  }

  async configureFromMetadataUrl(
    tenantId: string,
    metadataUrl: string,
    options?: {
      autoProvisionUsers?: boolean;
      defaultRole?: 'owner' | 'admin' | 'analyst' | 'readonly';
      domainRestriction?: string;
    },
  ): Promise<SsoConfiguration> {
    const metadata = await this.importIdpMetadata(tenantId, metadataUrl);

    const dto: ConfigureSamlDto = {
      entityId: metadata.entityId,
      ssoUrl: metadata.ssoUrl,
      certificate: metadata.certificate,
      autoProvisionUsers: options?.autoProvisionUsers ?? true,
      defaultRole: options?.defaultRole || 'readonly',
      domainRestriction: options?.domainRestriction,
    };

    return this.configureSaml(tenantId, dto);
  }

  async discoverOidcConfiguration(issuerUrl: string): Promise<{
    authorizationUrl: string;
    tokenUrl: string;
    userinfoUrl: string;
  }> {
    this.logger.log(`Discovering OIDC configuration from: ${issuerUrl}`);

    try {
      const wellKnownUrl = issuerUrl.endsWith('/')
        ? `${issuerUrl}.well-known/openid-configuration`
        : `${issuerUrl}/.well-known/openid-configuration`;

      const response = await fetch(wellKnownUrl);
      if (!response.ok) {
        throw new BadRequestException(
          'Failed to fetch OIDC discovery document',
        );
      }

      const discovery = await response.json();

      if (!discovery.authorization_endpoint || !discovery.token_endpoint) {
        throw new BadRequestException('Invalid OIDC discovery document');
      }

      return {
        authorizationUrl: discovery.authorization_endpoint,
        tokenUrl: discovery.token_endpoint,
        userinfoUrl: discovery.userinfo_endpoint || `${issuerUrl}/userinfo`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to discover OIDC configuration: ${error.message}`,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to discover OIDC configuration');
    }
  }

  /**
   * Check if OIDC provider supports PKCE (S256 method)
   *
   * Fetches the well-known configuration and checks if 'S256' is included
   * in code_challenge_methods_supported. Logs a warning if PKCE is not supported.
   *
   * @param issuerUrl - The OIDC issuer URL
   * @returns Promise resolving to true if S256 is supported, false otherwise
   */
  async checkPkceSupport(issuerUrl: string): Promise<boolean> {
    this.logger.log(`Checking PKCE support for OIDC provider: ${issuerUrl}`);

    try {
      const wellKnownUrl = issuerUrl.endsWith('/')
        ? `${issuerUrl}.well-known/openid-configuration`
        : `${issuerUrl}/.well-known/openid-configuration`;

      const response = await fetch(wellKnownUrl);
      if (!response.ok) {
        this.logger.warn(
          `Could not fetch OIDC discovery document to check PKCE support: ${issuerUrl}`,
        );
        return false;
      }

      const discovery = await response.json();

      // Check for code_challenge_methods_supported
      const supportedMethods: string[] =
        discovery.code_challenge_methods_supported || [];

      const supportsS256 = supportedMethods.includes('S256');

      if (!supportsS256) {
        this.logger.warn(
          `OIDC provider ${issuerUrl} does not advertise S256 PKCE support. ` +
            `Supported methods: ${supportedMethods.join(', ') || 'none'}. ` +
            `PKCE may still work if the provider accepts S256 without advertising it.`,
        );
      } else {
        this.logger.log(
          `OIDC provider ${issuerUrl} supports PKCE with S256 method`,
        );
      }

      return supportsS256;
    } catch (error) {
      this.logger.warn(
        `Failed to check PKCE support for ${issuerUrl}: ${error.message}. ` +
          `Continuing with PKCE enabled - provider may still support it.`,
      );
      return false;
    }
  }
}
