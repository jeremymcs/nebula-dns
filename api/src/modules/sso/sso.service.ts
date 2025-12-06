import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { SsoConfiguration } from './entities/sso-configuration.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { ConfigureSamlDto, ConfigureOidcDto } from './dto/sso.dto';

@Injectable()
export class SsoService {
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(SsoConfiguration)
    private ssoConfigRepository: Repository<SsoConfiguration>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
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
    config.samlSloUrl = dto.sloUrl;
    config.samlCertificate = dto.certificate;
    config.autoProvisionUsers = dto.autoProvisionUsers ?? true;
    config.defaultRole = dto.defaultRole || 'readonly';
    config.domainRestriction = dto.domainRestriction;
    config.attributeMapping = dto.attributeMapping || { email: 'email', name: 'name' };

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
    config.oidcAuthorizationUrl = dto.authorizationUrl;
    config.oidcTokenUrl = dto.tokenUrl;
    config.oidcUserinfoUrl = dto.userinfoUrl;
    config.oidcScopes = dto.scopes || 'openid profile email';
    config.autoProvisionUsers = dto.autoProvisionUsers ?? true;
    config.defaultRole = dto.defaultRole || 'readonly';
    config.domainRestriction = dto.domainRestriction;
    config.attributeMapping = dto.attributeMapping || { email: 'email', name: 'name' };

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

    // Generate SAML AuthnRequest
    const requestId = '_' + crypto.randomBytes(16).toString('hex');
    const issueInstant = new Date().toISOString();
    const callbackUrl = `${this.configService.get('API_URL')}/sso/saml/callback`;

    // In production, use a proper SAML library like saml2-js or passport-saml
    const samlRequest = `
      <samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        ID="${requestId}"
        Version="2.0"
        IssueInstant="${issueInstant}"
        Destination="${config.samlSsoUrl}"
        AssertionConsumerServiceURL="${callbackUrl}">
        <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          ${this.configService.get('SAML_SP_ENTITY_ID', 'safedns-sp')}
        </saml:Issuer>
      </samlp:AuthnRequest>
    `.replace(/\s+/g, ' ').trim();

    const encodedRequest = Buffer.from(samlRequest).toString('base64');
    const redirectUrl = `${config.samlSsoUrl}?SAMLRequest=${encodeURIComponent(encodedRequest)}&RelayState=${tenant.slug}`;

    return { redirectUrl };
  }

  async handleSamlCallback(samlResponse: string, relayState: string): Promise<{ user: User; token: string }> {
    // Decode and validate SAML response
    // In production, use a proper SAML library
    const decodedResponse = Buffer.from(samlResponse, 'base64').toString('utf8');
    
    // Extract tenant from RelayState
    const tenant = await this.tenantRepository.findOne({ where: { slug: relayState } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const config = await this.getConfiguration(tenant.id);
    if (!config || !config.isEnabled) {
      throw new UnauthorizedException('SSO not enabled');
    }

    // Parse SAML assertion and extract user attributes
    // This is simplified - use a real SAML library in production
    const emailMatch = decodedResponse.match(/<saml:Attribute Name="email"[^>]*>.*?<saml:AttributeValue[^>]*>([^<]+)/s);
    const nameMatch = decodedResponse.match(/<saml:Attribute Name="name"[^>]*>.*?<saml:AttributeValue[^>]*>([^<]+)/s);
    
    const email = emailMatch?.[1];
    const name = nameMatch?.[1] || email?.split('@')[0];

    if (!email) {
      throw new BadRequestException('Email not found in SAML response');
    }

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
    }

    // Generate JWT token
    // In production, this would use the AuthService
    const token = 'sso-jwt-token-placeholder';

    return { user, token };
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

  async handleOidcCallback(code: string, state: string): Promise<{ user: User; token: string }> {
    const [tenantSlug] = state.split(':');
    
    const tenant = await this.tenantRepository.findOne({ where: { slug: tenantSlug } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const config = await this.getConfiguration(tenant.id);
    if (!config || !config.isEnabled) {
      throw new UnauthorizedException('SSO not enabled');
    }

    // Exchange code for tokens
    let tokenUrl = config.oidcTokenUrl;
    if (!tokenUrl) {
      tokenUrl = `${config.oidcIssuer}/token`;
    }

    const callbackUrl = `${this.configService.get('API_URL')}/sso/oidc/callback`;
    const clientSecret = this.decrypt(config.oidcClientSecretEncrypted);

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
    const email = userinfo[config.attributeMapping.email || 'email'];
    const name = userinfo[config.attributeMapping.name || 'name'] || 
                 `${userinfo[config.attributeMapping.firstName || 'given_name'] || ''} ${userinfo[config.attributeMapping.lastName || 'family_name'] || ''}`.trim();

    if (!email) {
      throw new BadRequestException('Email not found in user info');
    }

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
    }

    const token = 'oidc-jwt-token-placeholder';

    return { user, token };
  }

  async getSpMetadata(): Promise<string> {
    const entityId = this.configService.get('SAML_SP_ENTITY_ID', 'safedns-sp');
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
}
