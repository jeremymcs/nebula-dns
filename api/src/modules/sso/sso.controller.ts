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
} from '@nestjs/common';
import { Response } from 'express';
import { SsoService } from './sso.service';
import {
  ConfigureSamlDto,
  ConfigureOidcDto,
  SamlCallbackDto,
  OidcCallbackDto,
} from './dto/sso.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';

@Controller('sso')
export class SsoController {
  constructor(private readonly ssoService: SsoService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get('saml/metadata')
  @Header('Content-Type', 'application/xml')
  async getSamlMetadata() {
    return this.ssoService.getSpMetadata();
  }

  @Get('saml/login/:tenantSlug')
  async initiateSamlLogin(
    @Param('tenantSlug') tenantSlug: string,
    @Res() res: Response,
  ) {
    const { redirectUrl } = await this.ssoService.initiateSamlLogin(tenantSlug);
    res.redirect(redirectUrl);
  }

  @Post('saml/callback')
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
  async initiateOidcLogin(
    @Param('tenantSlug') tenantSlug: string,
    @Res() res: Response,
  ) {
    const { redirectUrl } = await this.ssoService.initiateOidcLogin(tenantSlug);
    res.redirect(redirectUrl);
  }

  @Get('oidc/callback')
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
  async enableSso(@CurrentTenant() tenantId: string) {
    await this.ssoService.enableSso(tenantId);
    return { success: true, message: 'SSO enabled' };
  }

  @Post('disable')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  async disableSso(@CurrentTenant() tenantId: string) {
    await this.ssoService.disableSso(tenantId);
    return { success: true, message: 'SSO disabled' };
  }

  @Delete('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
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
}
