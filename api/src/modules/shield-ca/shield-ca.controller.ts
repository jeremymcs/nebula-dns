import {
  Controller,
  Get,
  Header,
  UseGuards,
  Res,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { ShieldCaService } from './shield-ca.service';
import { TenantsService } from '../tenants/tenants.service';

@ApiTags('shield-ca')
@Controller('shield-ca')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ShieldCaController {
  constructor(
    private readonly shieldCaService: ShieldCaService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Get('metadata')
  @ApiOperation({ summary: 'Shield CA expiry and rotation metadata' })
  async metadata(@CurrentTenant() tenantId: string) {
    const data = await this.shieldCaService.getCertificateMetadata(tenantId);
    return { data };
  }

  @Get('certificate.pem')
  @Header('Content-Type', 'application/x-pem-file')
  @ApiOperation({ summary: 'Download Shield intermediate CA certificate' })
  async certificate(@CurrentTenant() tenantId: string, @Res() res: Response) {
    try {
      const pem = await this.shieldCaService.getCertificatePem(tenantId);
      res.send(pem);
    } catch {
      throw new ForbiddenException(
        'Shield CA is not available until block pages and PKI are configured',
      );
    }
  }

  @Get('certificate.cer')
  @Header('Content-Type', 'application/pkix-cert')
  @ApiOperation({ summary: 'Download Shield CA as DER (.cer)' })
  async certificateCer(@CurrentTenant() tenantId: string, @Res() res: Response) {
    const pem = await this.shieldCaService.getCertificatePem(tenantId);
    const body = pem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s/g, '');
    const der = Buffer.from(body, 'base64');
    res.send(der);
  }

  @Get('flux-shield.mobileconfig')
  @Header('Content-Type', 'application/x-apple-aspen-config')
  @ApiOperation({ summary: 'Apple configuration profile installing Shield CA' })
  async mobileconfig(@CurrentTenant() tenantId: string, @Res() res: Response) {
    const tenant = await this.tenantsService.findById(tenantId);
    const profile = await this.shieldCaService.getMobileconfig(
      tenantId,
      tenant.name,
    );
    res.send(profile);
  }

  @Get('install-guide')
  @ApiOperation({ summary: 'Platform install instructions (markdown)' })
  installGuide(@Query('platform') platform?: string) {
    const guides: Record<string, string> = {
      windows:
        'Deploy via Intune (Trusted Root), GPO (Computer Config → Windows Settings → Security → PKI), RMM script, or `certutil -addstore -f Root flux-shield-ca.cer`. Enable agent `install_shield_ca` for automatic install.',
      macos:
        'Install `.cer` into System keychain as trusted root, or deploy `.mobileconfig` via MDM (Profile Manager, Jamf).',
      ios: 'AirDrop or MDM-install the `.mobileconfig` profile.',
      android:
        'Settings → Security → Install from storage (CA certificate). Requires device admin / work profile on managed devices.',
      chromeos: 'Admin console → Devices → Networks → Certificates → Trusted roots.',
      firefox:
        'Import into Windows/macOS trust store AND enable `security.enterprise_roots.enabled` on Windows, or use policies/certificates on Firefox ESR.',
    };
    const limitations =
      '**HSTS / HSTS preload:** Works once the Shield CA is trusted (browsers accept locally installed roots for HSTS).\n\n' +
      '**Still breaks:** Certificate-pinned applications; Firefox without enterprise root trust; any device without the CA installed.';
    return {
      data: {
        platform: platform || 'all',
        markdown:
          Object.entries(guides)
            .filter(([key]) => !platform || key === platform)
            .map(([key, text]) => `### ${key}\n${text}`)
            .join('\n\n') +
          (platform ? '' : `\n\n### Limitations\n${limitations}`),
      },
    };
  }
}
