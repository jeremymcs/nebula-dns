import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { ShieldCaIntermediate } from './entities/shield-ca-intermediate.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';
import { User } from '../users/entities/user.entity';
import { encrypt, decrypt, deriveKey } from '@/common/utils/encryption.util';
import {
  buildAppleMobileconfig,
  generateIntermediateCa,
  issueLeafCertificate,
} from './shield-ca-pki.util';
import { normalizeDomain } from '../block-pages/block-page-html.util';

const BLOCK_DOMAIN_SNI_PREFIX = 'blockdomainsni:';
const BLOCK_DOMAIN_TENANT_PREFIX = 'blockdomain:';
const LEAF_CACHE_PREFIX = 'shieldleaf:';
const LEAF_VALIDITY_HOURS = 24;
const ROTATION_ALERT_REDIS_PREFIX = 'shield-ca-rotation-alert:';
const ROTATION_ALERT_DEDUPE_SECONDS = 7 * 86400;

@Injectable()
export class ShieldCaService {
  private readonly logger = new Logger(ShieldCaService.name);
  private readonly encryptionKey: Buffer;
  private readonly internalSecret: string;

  constructor(
    @InjectRepository(ShieldCaIntermediate)
    private readonly caRepository: Repository<ShieldCaIntermediate>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    const master = this.configService.get<string>('SHIELD_CA_MASTER_KEY') || 'dev-shield-ca-master-key-32bytes!!';
    this.encryptionKey = deriveKey(master, 'shield-ca-gcm');
    this.internalSecret =
      this.configService.get<string>('SHIELD_BLOCKPAGE_INTERNAL_SECRET') ||
      'dev-blockpage-internal-secret';
  }

  assertInternalSecret(header?: string): void {
    if (!header || header !== this.internalSecret) {
      throw new ForbiddenException('Invalid internal credentials');
    }
  }

  async resolveCaOwner(tenantId: string): Promise<{
    ownerTenantId: string;
    scope: 'msp' | 'tenant';
  }> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    if (tenant.managedByMspId) {
      const msp = await this.tenantRepository.findOne({
        where: { id: tenant.managedByMspId },
      });
      if (msp?.tier === 'msp') {
        return { ownerTenantId: msp.id, scope: 'msp' };
      }
    }
    if (tenant.tier === 'msp') {
      return { ownerTenantId: tenant.id, scope: 'msp' };
    }
    return { ownerTenantId: tenant.id, scope: 'tenant' };
  }

  async getCertificateMetadata(tenantId: string) {
    const { ownerTenantId, scope } = await this.resolveCaOwner(tenantId);
    const ca = await this.ensureIntermediate(ownerTenantId, scope);
    const daysUntilExpiry = Math.floor(
      (ca.notAfter.getTime() - Date.now()) / 86400000,
    );
    return {
      scope,
      ownerTenantId,
      subjectCn: ca.subjectCn,
      notBefore: ca.notBefore,
      notAfter: ca.notAfter,
      daysUntilExpiry,
      status: ca.status,
      rotationRecommended: daysUntilExpiry < 30,
    };
  }

  async getCertificatePem(tenantId: string): Promise<string> {
    const { ownerTenantId, scope } = await this.resolveCaOwner(tenantId);
    const ca = await this.ensureIntermediate(ownerTenantId, scope);
    return ca.certificatePem;
  }

  async getMobileconfig(tenantId: string, organizationName: string): Promise<string> {
    const pem = await this.getCertificatePem(tenantId);
    return buildAppleMobileconfig({
      organizationName,
      profileDisplayName: 'Flux Shield Certificate',
      certificatePem: pem,
      profileUuid: randomUUID(),
    });
  }

  async caddyAskAllowed(domain: string): Promise<boolean> {
    const normalized = normalizeDomain(domain);
    const tenantId = await this.redisService.get(
      `${BLOCK_DOMAIN_SNI_PREFIX}${normalized}`,
    );
    if (!tenantId) {
      return false;
    }
    return this.isDomainBlockedForTenant(tenantId, normalized);
  }

  async issueLeafForDomain(domain: string): Promise<{
    certificatePem: string;
    privateKeyPem: string;
    tenantId: string;
  }> {
    const normalized = normalizeDomain(domain);
    const tenantId = await this.redisService.get(
      `${BLOCK_DOMAIN_SNI_PREFIX}${normalized}`,
    );
    if (!tenantId) {
      throw new ForbiddenException('Domain is not an active blocked sinkhole host');
    }
    if (!(await this.isDomainBlockedForTenant(tenantId, normalized))) {
      throw new ForbiddenException('Domain is not blocked for this organization');
    }

    const { ownerTenantId, scope } = await this.resolveCaOwner(tenantId);
    const cacheKey = `${LEAF_CACHE_PREFIX}${ownerTenantId}:${normalized}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as {
        certificatePem: string;
        privateKeyPem: string;
      };
      return { ...parsed, tenantId };
    }

    const intermediate = await this.ensureIntermediate(ownerTenantId, scope);
    const privateKeyPem = decrypt(
      intermediate.privateKeyEncrypted,
      this.encryptionKey,
    );
    const leaf = issueLeafCertificate({
      intermediateCertPem: intermediate.certificatePem,
      intermediateKeyPem: privateKeyPem,
      domain: normalized,
      validityHours: LEAF_VALIDITY_HOURS,
    });

    await this.redisService.set(
      cacheKey,
      JSON.stringify({
        certificatePem: leaf.certificatePem,
        privateKeyPem: leaf.privateKeyPem,
      }),
      LEAF_VALIDITY_HOURS * 3600,
    );

    return {
      certificatePem: leaf.certificatePem,
      privateKeyPem: leaf.privateKeyPem,
      tenantId,
    };
  }

  /** Agent / location token resolves tenant via location — simplified: tenantId passed from agents API */
  async getCertificatePemForTenant(tenantId: string): Promise<string> {
    return this.getCertificatePem(tenantId);
  }

  /** Intermediates expiring within 30 days (for cron + tests) */
  async listIntermediatesExpiringWithinDays(days: number): Promise<ShieldCaIntermediate[]> {
    const cutoff = new Date(Date.now() + days * 86400000);
    return this.caRepository.find({
      where: {
        status: 'active',
        notAfter: LessThan(cutoff),
      },
    });
  }

  /** Email owner/admin users once per intermediate expiry window (deduped in Redis) */
  async sendRotationAlertEmails(): Promise<number> {
    const expiring = await this.listIntermediatesExpiringWithinDays(30);
    const frontend =
      this.configService.get<string>('FRONTEND_URL') || 'https://app.nebuladns.io';
    let sent = 0;

    for (const ca of expiring) {
      const dedupeKey = `${ROTATION_ALERT_REDIS_PREFIX}${ca.id}:${ca.notAfter.toISOString().slice(0, 10)}`;
      const already = await this.redisService.get(dedupeKey);
      if (already) {
        continue;
      }

      const owner = await this.tenantRepository.findOne({
        where: { id: ca.ownerTenantId },
      });
      const admins = await this.userRepository.find({
        where: { tenantId: ca.ownerTenantId, role: In(['owner', 'admin']) },
      });
      const recipients = [...new Set(admins.map((u) => u.email).filter(Boolean))];
      if (recipients.length === 0) {
        this.logger.warn(
          `Shield CA ${ca.id} expiring soon but no admin emails for tenant ${ca.ownerTenantId}`,
        );
        continue;
      }

      const daysLeft = Math.max(
        0,
        Math.floor((ca.notAfter.getTime() - Date.now()) / 86400000),
      );
      const subject = `[Flux Shield] Certificate rotation required (${daysLeft} days)`;
      const html = `<p>The Flux Shield intermediate CA for <strong>${owner?.name || ca.ownerTenantId}</strong> expires on <strong>${ca.notAfter.toUTCString()}</strong>.</p>
<p>Redeploy the updated CA to Intune, GPO, RMM, Apple profiles, and Windows agents before expiry so HTTPS block pages keep working.</p>
<p><a href="${frontend}/dashboard/shield-certificate">Open Shield Certificate</a></p>`;

      for (const email of recipients) {
        await this.emailService.sendTransactionalHtml(email, subject, html);
      }
      await this.redisService.set(dedupeKey, '1', ROTATION_ALERT_DEDUPE_SECONDS);
      sent += recipients.length;
    }
    return sent;
  }

  private async isDomainBlockedForTenant(
    tenantId: string,
    domain: string,
  ): Promise<boolean> {
    const key = `${BLOCK_DOMAIN_TENANT_PREFIX}${tenantId}:${domain}`;
    const val = await this.redisService.get(key);
    return val === '1' || val === tenantId;
  }

  private async ensureIntermediate(
    ownerTenantId: string,
    scope: 'msp' | 'tenant',
  ): Promise<ShieldCaIntermediate> {
    let ca = await this.caRepository.findOne({
      where: { ownerTenantId, scope, status: 'active' },
      order: { notAfter: 'DESC' },
    });
    if (ca && ca.notAfter.getTime() > Date.now() + 86400000) {
      return ca;
    }

    const rootCert = this.configService.get<string>('SHIELD_ROOT_CERT_PEM');
    const rootKey = this.configService.get<string>('SHIELD_ROOT_KEY_PEM');
    if (!rootCert || !rootKey) {
      throw new NotFoundException(
        'Shield CA is not configured on this deployment (missing root signing material)',
      );
    }

    const owner = await this.tenantRepository.findOne({
      where: { id: ownerTenantId },
    });
    const subjectCn = `Flux Shield ${scope.toUpperCase()} ${owner?.slug || ownerTenantId}`;

    const generated = generateIntermediateCa({
      rootCertPem: rootCert,
      rootKeyPem: rootKey,
      subjectCn,
      validityDays: 825,
    });

    ca = this.caRepository.create({
      ownerTenantId,
      scope,
      certificatePem: generated.certificatePem,
      privateKeyEncrypted: encrypt(generated.privateKeyPem, this.encryptionKey),
      serialNumber: generated.serialNumber,
      notBefore: generated.notBefore,
      notAfter: generated.notAfter,
      status: 'active',
      subjectCn: generated.subjectCn,
    });
    return this.caRepository.save(ca);
  }
}
