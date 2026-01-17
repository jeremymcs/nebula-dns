// Nebula DNS - SSO Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Header,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { SsoService } from './sso.service';
import {
  ConfigureSamlDto,
  ConfigureOidcDto,
  SamlCallbackDto,
  OidcCallbackDto,
  SigningCertificateResponseDto,
  KeyRotationResponseDto,
} from './dto/sso.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { extractCertificateBase64 } from './utils/saml-keys.util';

@ApiTags('sso')
@Controller('sso')
export class SsoController {
  constructor(private readonly ssoService: SsoService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get('saml/metadata')
  @Header('Content-Type', 'application/xml')
  @ApiOperation({
    summary: 'Get SAML SP metadata',
    description:
      'Returns the SAML Service Provider metadata XML. Use this to configure your Identity Provider.',
  })
  @ApiResponse({ status: 200, description: 'SAML metadata XML' })
  async getSamlMetadata() {
    return this.ssoService.getSpMetadata();
  }

  @Get('saml/login/:tenantSlug')
  @ApiOperation({
    summary: 'Initiate SAML login',
    description: 'Redirects to the SAML Identity Provider for authentication.',
  })
  @ApiParam({
    name: 'tenantSlug',
    description: 'Tenant slug identifier',
    type: 'string',
  })
  @ApiResponse({ status: 302, description: 'Redirect to IdP' })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found or SSO not configured',
  })
  async initiateSamlLogin(
    @Param('tenantSlug') tenantSlug: string,
    @Res() res: Response,
  ) {
    const { redirectUrl } = await this.ssoService.initiateSamlLogin(tenantSlug);
    res.redirect(redirectUrl);
  }

  @Post('saml/callback')
  @ApiOperation({
    summary: 'Handle SAML callback',
    description:
      'Processes the SAML response from the IdP and redirects to the frontend with tokens.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to frontend with tokens' })
  @ApiResponse({ status: 401, description: 'Invalid SAML response' })
  async handleSamlCallback(
    @Body() body: SamlCallbackDto,
    @Res() res: Response,
  ) {
    const { token, refreshToken } = await this.ssoService.handleSamlCallback(
      body.SAMLResponse,
      body.RelayState || '',
    );

    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4001';
    res.redirect(
      `${frontendUrl}/sso/callback?token=${encodeURIComponent(token)}&refreshToken=${encodeURIComponent(refreshToken)}`,
    );
  }

  @Get('oidc/login/:tenantSlug')
  @ApiOperation({
    summary: 'Initiate OIDC login',
    description: 'Redirects to the OIDC Identity Provider for authentication.',
  })
  @ApiParam({
    name: 'tenantSlug',
    description: 'Tenant slug identifier',
    type: 'string',
  })
  @ApiResponse({ status: 302, description: 'Redirect to IdP' })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found or SSO not configured',
  })
  async initiateOidcLogin(
    @Param('tenantSlug') tenantSlug: string,
    @Res() res: Response,
  ) {
    const { redirectUrl } = await this.ssoService.initiateOidcLogin(tenantSlug);
    res.redirect(redirectUrl);
  }

  @Get('oidc/callback')
  @ApiOperation({
    summary: 'Handle OIDC callback',
    description:
      'Processes the OIDC authorization code and redirects to the frontend with tokens.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to frontend with tokens' })
  @ApiResponse({
    status: 401,
    description: 'Invalid authorization code or state',
  })
  async handleOidcCallback(
    @Query() query: OidcCallbackDto,
    @Res() res: Response,
  ) {
    const { token, refreshToken } = await this.ssoService.handleOidcCallback(
      query.code,
      query.state,
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4001';
    res.redirect(
      `${frontendUrl}/sso/callback?token=${encodeURIComponent(token)}&refreshToken=${encodeURIComponent(refreshToken)}`,
    );
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get SSO configuration',
    description:
      'Returns the current SSO configuration for the tenant (sensitive fields are redacted).',
  })
  @ApiResponse({ status: 200, description: 'SSO configuration retrieved' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getConfiguration(@CurrentTenant() tenantId: string) {
    const config = await this.ssoService.getConfiguration(tenantId);
    if (!config) {
      return { data: null };
    }

    // Don't return sensitive fields
    const safeConfig = {
      id: config.id,
      providerType: config.providerType,
      isEnabled: config.isEnabled,
      samlEntityId: config.samlEntityId,
      samlSsoUrl: config.samlSsoUrl,
      samlSloUrl: config.samlSloUrl,
      hasCertificate: !!config.samlCertificate,
      samlSignRequests: config.samlSignRequests,
      hasSigningCertificate: !!config.samlSigningCert,
      oidcIssuer: config.oidcIssuer,
      oidcClientId: config.oidcClientId,
      oidcScopes: config.oidcScopes,
      autoProvisionUsers: config.autoProvisionUsers,
      defaultRole: config.defaultRole,
      domainRestriction: config.domainRestriction,
      attributeMapping: config.attributeMapping,
    };

    return { data: safeConfig };
  }

  @Post('saml/configure')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Configure SAML SSO',
    description: 'Configures SAML-based single sign-on. Owner role required.',
  })
  @ApiResponse({ status: 201, description: 'SAML configuration saved' })
  @ApiResponse({ status: 400, description: 'Invalid SAML configuration' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires owner role' })
  async configureSaml(
    @CurrentTenant() tenantId: string,
    @Body() dto: ConfigureSamlDto,
  ) {
    const config = await this.ssoService.configureSaml(tenantId, dto);
    return {
      success: true,
      message: 'SAML configuration saved',
      data: { id: config.id },
    };
  }

  @Post('oidc/configure')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Configure OIDC SSO',
    description: 'Configures OIDC-based single sign-on. Owner role required.',
  })
  @ApiResponse({ status: 201, description: 'OIDC configuration saved' })
  @ApiResponse({ status: 400, description: 'Invalid OIDC configuration' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires owner role' })
  async configureOidc(
    @CurrentTenant() tenantId: string,
    @Body() dto: ConfigureOidcDto,
  ) {
    const config = await this.ssoService.configureOidc(tenantId, dto);
    return {
      success: true,
      message: 'OIDC configuration saved',
      data: { id: config.id },
    };
  }

  @Post('enable')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Enable SSO',
    description: 'Enables SSO for the tenant. Users can then log in via the configured identity provider.',
  })
  @ApiResponse({ status: 200, description: 'SSO enabled' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires owner role' })
  async enableSso(@CurrentTenant() tenantId: string) {
    await this.ssoService.enableSso(tenantId);
    return { success: true, message: 'SSO enabled' };
  }

  @Post('disable')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Disable SSO',
    description: 'Disables SSO for the tenant. Users will need to log in with username/password.',
  })
  @ApiResponse({ status: 200, description: 'SSO disabled' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires owner role' })
  async disableSso(@CurrentTenant() tenantId: string) {
    await this.ssoService.disableSso(tenantId);
    return { success: true, message: 'SSO disabled' };
  }

  @Delete('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete SSO configuration',
    description: 'Deletes all SSO configuration for the tenant.',
  })
  @ApiResponse({ status: 200, description: 'SSO configuration deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires owner role' })
  async deleteConfig(@CurrentTenant() tenantId: string) {
    await this.ssoService.deleteSsoConfig(tenantId);
    return { success: true, message: 'SSO configuration deleted' };
  }

  @Post('saml/import-metadata')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  async importIdpMetadata(
    @CurrentTenant() tenantId: string,
    @Body()
    body: {
      metadataUrl: string;
      autoProvisionUsers?: boolean;
      defaultRole?: 'owner' | 'admin' | 'analyst' | 'readonly';
      domainRestriction?: string;
    },
  ) {
    const config = await this.ssoService.configureFromMetadataUrl(
      tenantId,
      body.metadataUrl,
      {
        autoProvisionUsers: body.autoProvisionUsers,
        defaultRole: body.defaultRole,
        domainRestriction: body.domainRestriction,
      },
    );
    return {
      success: true,
      message: 'SAML configuration imported from IdP metadata',
      data: {
        id: config.id,
        entityId: config.samlEntityId,
        ssoUrl: config.samlSsoUrl,
      },
    };
  }

  @Post('oidc/discover')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  async discoverOidcConfig(@Body() body: { issuerUrl: string }) {
    const discovery = await this.ssoService.discoverOidcConfiguration(
      body.issuerUrl,
    );
    return {
      success: true,
      message: 'OIDC configuration discovered',
      data: discovery,
    };
  }

  // ==================== SAML SIGNING CERTIFICATE ENDPOINTS ====================

  /**
   * Get tenant-specific SAML SP metadata with signing certificate
   */
  @Get('saml/metadata/:tenantId')
  @Header('Content-Type', 'application/xml')
  async getSamlMetadataForTenant(@Param('tenantId') tenantId: string) {
    return this.ssoService.getSpMetadata(tenantId);
  }

  /**
   * Get the SAML signing certificate for the current tenant
   * Returns the certificate in PEM format
   */
  @Get('saml/certificate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @Header('Content-Type', 'application/json')
  async getSigningCertificate(
    @CurrentTenant() tenantId: string,
  ): Promise<{ data: SigningCertificateResponseDto | null }> {
    const config = await this.ssoService.getConfiguration(tenantId);
    if (!config || !config.samlSigningCert) {
      return { data: null };
    }

    return {
      data: {
        certificate: config.samlSigningCert,
        certificateBase64: extractCertificateBase64(config.samlSigningCert),
        signRequestsEnabled: config.samlSignRequests ?? false,
      },
    };
  }

  /**
   * Download the SAML signing certificate in PEM format
   */
  @Get('saml/certificate/download')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @Header('Content-Type', 'application/x-pem-file')
  @Header('Content-Disposition', 'attachment; filename="sp-signing-cert.pem"')
  async downloadSigningCertificate(@CurrentTenant() tenantId: string) {
    const cert = await this.ssoService.getSigningCertificateByTenant(tenantId);
    if (!cert) {
      throw new NotFoundException('Signing certificate not found');
    }
    return cert;
  }

  /**
   * Public endpoint to get the signing certificate by config ID
   * This is used by IdPs to verify signed requests
   */
  @Get('saml/:configId/certificate')
  @Header('Content-Type', 'application/x-pem-file')
  async getPublicSigningCertificate(@Param('configId') configId: string) {
    const cert = await this.ssoService.getSigningCertificate(configId);
    if (!cert) {
      throw new NotFoundException('Signing certificate not found');
    }
    return cert;
  }

  /**
   * Rotate SAML signing keys
   * Generates a new key pair and keeps the old certificate valid for 24 hours
   */
  @Post('saml/rotate-keys')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  async rotateSamlSigningKeys(@CurrentTenant() tenantId: string): Promise<{
    success: boolean;
    message: string;
    data: KeyRotationResponseDto;
  }> {
    const result = await this.ssoService.rotateSamlSigningKeys(tenantId);

    return {
      success: true,
      message:
        'SAML signing keys rotated. The previous certificate remains valid for 24 hours.',
      data: {
        newCertificate: result.newCertificate,
        newCertificateBase64: extractCertificateBase64(result.newCertificate),
        previousCertExpiresAt: result.previousCertExpiresAt.toISOString(),
        gracePeriodHours: 24,
      },
    };
  }
}
