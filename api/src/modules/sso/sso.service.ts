import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
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
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(SsoConfiguration)
    private ssoConfigRepository: Repository<SsoConfiguration>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {
    const key = this.configService.get('SSO_ENCRYPTION_KEY', 'default-sso-key-change-me!');
    this.encryptionKey = crypto.scryptSync(key, 'salt', 32);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private createSamlInstance(config: SsoConfiguration): SAML {
    const callbackUrl = `${this.configService.get('API_URL')}/sso/saml/callback`;
    const entityId = this.configService.get('SAML_SP_ENTITY_ID', 'nebuladns-sp');

    const samlConfig: SamlConfig = {
      callbackUrl,
      entryPoint: config.samlSsoUrl || undefined,
      issuer: entityId,
      idpCert: config.samlCertificate || '',
      wantAssertionsSigned: true,
      wantAuthnResponseSigned: false,
      signatureAlgorithm: 'sha256',
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    };

    return new SAML(samlConfig);
  }

  private generateSsoTokens(user: User): { accessToken: string; refreshToken: string } {
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
      { expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d' },
    );

    return { accessToken, refreshToken };
  }

  async getConfiguration(tenantId: string): Promise<SsoConfiguration | null> {
    return this.ssoConfigRepository.findOne({ where: { tenantId } });
  }

  async configureSaml(tenantId: string, dto: ConfigureSamlDto): Promise<SsoConfiguration> {
    let config = await this.ssoConfigRepository.findOne({ where: { tenantId } });

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
    config.attributeMapping = (dto.attributeMapping as Record<string, string>) || { email: 'email', name: 'name' };

    return this.ssoConfigRepository.save(config);
  }

  async configureOidc(tenantId: string, dto: ConfigureOidcDto): Promise<SsoConfiguration> {
    let config = await this.ssoConfigRepository.findOne({ where: { tenantId } });

    if (!config) {
      config = this.ssoConfigRepository.create({ tenantId });
    }

    config.providerType = 'oidc';
    config.oidcIssuer = dto.issuer;
    config.oidcClientId = dto.clientId;
    config.oidcClientSecretEncrypted = this.encrypt(dto.clientSecret);
    config.oidcAuthorizationUrl = dto.authorizationUrl || null;
    config.oidcTokenUrl = dto.tokenUrl || null;
    config.oidcUserinfoUrl = dto.userinfoUrl || null;
    config.oidcScopes = dto.scopes || 'openid profile email';
    config.autoProvisionUsers = dto.autoProvisionUsers ?? true;
    config.defaultRole = dto.defaultRole || 'readonly';
    config.domainRestriction = dto.domainRestriction || null;
    config.attributeMapping = (dto.attributeMapping as Record<string, string>) || { email: 'email', name: 'name' };

    return this.ssoConfigRepository.save(config);
  }

  async enableSso(tenantId: string): Promise<SsoConfiguration> {
    const config = await this.getConfiguration(tenantId);
    if (!config) {
      throw new NotFoundException('SSO not configured');
    }

    // Validate configuration is complete
    if (config.providerType === 'saml') {
      if (!config.samlEntityId || !config.samlSsoUrl || !config.samlCertificate) {
        throw new BadRequestException('SAML configuration incomplete');
      }
    } else if (config.providerType === 'oidc') {
      if (!config.oidcIssuer || !config.oidcClientId || !config.oidcClientSecretEncrypted) {
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

  async deleteSsoConfig(tenantId: string): Promise<void> {
    await this.ssoConfigRepository.delete({ tenantId });
    await this.tenantRepository.update(tenantId, { ssoEnabled: false, ssoEnforced: false } as any);
  }

  async initiateSamlLogin(tenantSlug: string): Promise<{ redirectUrl: string }> {
    const tenant = await this.tenantRepository.findOne({ where: { slug: tenantSlug } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const config = await this.getConfiguration(tenant.id);
    if (!config || !config.isEnabled || config.providerType !== 'saml') {
      throw new BadRequestException('SAML SSO not enabled for this tenant');
    }

    try {
      const saml = this.createSamlInstance(config);
      const redirectUrl = await saml.getAuthorizeUrlAsync(tenant.slug, undefined, {});
      this.logger.log(`SAML login initiated for tenant: ${tenantSlug}`);
      return { redirectUrl };
    } catch (error) {
      this.logger.error(`SAML login initiation failed: ${error.message}`);
      throw new BadRequestException('Failed to initiate SAML login');
    }
  }

  async handleSamlCallback(samlResponse: string, relayState: string): Promise<{ user: User; token: string; refreshToken: string }> {
    // Extract tenant from RelayState
    const tenant = await this.tenantRepository.findOne({ where: { slug: relayState } });
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
      const profile = await saml.validatePostResponseAsync({ SAMLResponse: samlResponse });

      if (!profile || !profile.profile) {
        throw new UnauthorizedException('Invalid SAML response');
      }

      const samlProfile = profile.profile;

      // Extract user attributes based on attribute mapping
      const emailAttr = config.attributeMapping?.email || 'email';
      const nameAttr = config.attributeMapping?.name || 'name';

      // Try multiple common email attributes
      const email = samlProfile[emailAttr] ||
                    samlProfile.email ||
                    samlProfile.nameID ||
                    (samlProfile as any)['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];

      const name = samlProfile[nameAttr] ||
                   samlProfile.displayName ||
                   (samlProfile as any)['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
                   (samlProfile as any)['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'];

      if (!email) {
        this.logger.error('Email not found in SAML response. Available attributes:', Object.keys(samlProfile));
        throw new BadRequestException('Email not found in SAML response');
      }

      this.logger.log(`SAML callback: extracted email ${email} for tenant ${tenant.slug}`);

      // Check domain restriction
      if (config.domainRestriction && !email.endsWith(config.domainRestriction)) {
        throw new UnauthorizedException(`Email domain not allowed. Must end with ${config.domainRestriction}`);
      }

      // Find or create user
      let user = await this.userRepository.findOne({ where: { tenantId: tenant.id, email } });

      if (!user) {
        if (!config.autoProvisionUsers) {
          throw new UnauthorizedException('User not found and auto-provisioning is disabled');
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
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new UnauthorizedException('SAML authentication failed');
    }
  }

  async initiateOidcLogin(tenantSlug: string): Promise<{ redirectUrl: string }> {
    const tenant = await this.tenantRepository.findOne({ where: { slug: tenantSlug } });
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

    return { redirectUrl: `${authUrl}?${params.toString()}` };
  }

  async handleOidcCallback(code: string, state: string): Promise<{ user: User; token: string; refreshToken: string }> {
    const [tenantSlug] = state.split(':');

    const tenant = await this.tenantRepository.findOne({ where: { slug: tenantSlug } });
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
          const discoveryResponse = await fetch(`${config.oidcIssuer}/.well-known/openid-configuration`);
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
      const clientSecret = this.decrypt(config.oidcClientSecretEncrypted);

      this.logger.log(`OIDC token exchange for tenant: ${tenantSlug}`);

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: callbackUrl,
          client_id: config.oidcClientId,
          client_secret: clientSecret,
        }),
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
      const email = userinfo[config.attributeMapping?.email || 'email'] ||
                    userinfo.email ||
                    userinfo.preferred_username;

      const name = userinfo[config.attributeMapping?.name || 'name'] ||
                   userinfo.name ||
                   `${userinfo.given_name || ''} ${userinfo.family_name || ''}`.trim() ||
                   email?.split('@')[0];

      if (!email) {
        this.logger.error('Email not found in OIDC userinfo. Available claims:', Object.keys(userinfo));
        throw new BadRequestException('Email not found in user info');
      }

      this.logger.log(`OIDC callback: extracted email ${email} for tenant ${tenant.slug}`);

      // Check domain restriction
      if (config.domainRestriction && !email.endsWith(config.domainRestriction)) {
        throw new UnauthorizedException(`Email domain not allowed`);
      }

      // Find or create user
      let user = await this.userRepository.findOne({ where: { tenantId: tenant.id, email } });

      if (!user) {
        if (!config.autoProvisionUsers) {
          throw new UnauthorizedException('User not found and auto-provisioning is disabled');
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
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new UnauthorizedException('OIDC authentication failed');
    }
  }

  async getSpMetadata(): Promise<string> {
    const entityId = this.configService.get('SAML_SP_ENTITY_ID', 'nebuladns-sp');
    const acsUrl = `${this.configService.get('API_URL')}/sso/saml/callback`;
    const sloUrl = `${this.configService.get('API_URL')}/sso/saml/logout`;

    return `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${acsUrl}" index="0"/>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${sloUrl}"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
  }

  async importIdpMetadata(tenantId: string, metadataUrl: string): Promise<{ entityId: string; ssoUrl: string; certificate: string }> {
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
      const ssoUrlMatch = metadataXml.match(
        /<(?:md:)?SingleSignOnService[^>]*Binding="urn:oasis:names:tc:SAML:2\.0:bindings:HTTP-(?:Redirect|POST)"[^>]*Location="([^"]+)"/
      ) || metadataXml.match(
        /<(?:md:)?SingleSignOnService[^>]*Location="([^"]+)"[^>]*Binding="urn:oasis:names:tc:SAML:2\.0:bindings:HTTP-(?:Redirect|POST)"/
      );

      if (!ssoUrlMatch) {
        throw new BadRequestException('Could not find SingleSignOnService URL in metadata');
      }
      const ssoUrl = ssoUrlMatch[1];

      // Extract X.509 certificate
      const certMatch = metadataXml.match(/<(?:ds:)?X509Certificate>([^<]+)<\/(?:ds:)?X509Certificate>/);
      if (!certMatch) {
        throw new BadRequestException('Could not find X509 certificate in metadata');
      }
      // Clean up the certificate (remove whitespace)
      const certificate = certMatch[1].replace(/\s/g, '');

      this.logger.log(`Successfully parsed IdP metadata: entityId=${entityId}, ssoUrl=${ssoUrl}`);

      return { entityId, ssoUrl, certificate };
    } catch (error) {
      this.logger.error(`Failed to import IdP metadata: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to parse IdP metadata');
    }
  }

  async configureFromMetadataUrl(tenantId: string, metadataUrl: string, options?: { autoProvisionUsers?: boolean; defaultRole?: 'owner' | 'admin' | 'analyst' | 'readonly'; domainRestriction?: string }): Promise<SsoConfiguration> {
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

  async discoverOidcConfiguration(issuerUrl: string): Promise<{ authorizationUrl: string; tokenUrl: string; userinfoUrl: string }> {
    this.logger.log(`Discovering OIDC configuration from: ${issuerUrl}`);

    try {
      const wellKnownUrl = issuerUrl.endsWith('/')
        ? `${issuerUrl}.well-known/openid-configuration`
        : `${issuerUrl}/.well-known/openid-configuration`;

      const response = await fetch(wellKnownUrl);
      if (!response.ok) {
        throw new BadRequestException('Failed to fetch OIDC discovery document');
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
      this.logger.error(`Failed to discover OIDC configuration: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to discover OIDC configuration');
    }
  }
}
