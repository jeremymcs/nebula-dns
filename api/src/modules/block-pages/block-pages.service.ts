import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BlockPage } from './entities/block-page.entity';
import {
  AccessRequest,
  AccessRequestStatus,
} from './entities/access-request.entity';
import {
  CreateBlockPageDto,
  UpdateBlockPageDto,
  CreateAccessRequestDto,
  ReviewAccessRequestDto,
  UpdatePlatformBlockPageDto,
} from './dto/block-page.dto';
import { ACCESS_REQUEST_RATE_LIMIT,
  BLOCK_CONTEXT_REDIS_PREFIX,
  FLUX_SHIELD_PLATFORM_DEFAULTS,
} from './block-pages.constants';
import {
  escapeHtml,
  normalizeDomain,
  sanitizeCss,
  sanitizeCustomHtml,
} from './block-page-html.util';
import { renderSafeMarkdown } from './block-page-markdown.util';
import { TenantsService } from '../tenants/tenants.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { ListsService } from '../lists/lists.service';
import { PolicyCompilerService } from '../policies/policy-compiler.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';
import { Location } from '../locations/entities/location.entity';

export interface BlockContextPayload {
  tenantId: string;
  locationId: string;
  category?: string;
  reason?: string;
  blockPageId?: string;
}

export interface RenderContext {
  domain: string;
  category?: string;
  reason?: string;
  timestamp?: string;
  tenantId?: string;
  submitUrl?: string;
}

@Injectable()
export class BlockPagesService {
  private readonly logger = new Logger(BlockPagesService.name);
  private readonly uploadRoot: string;

  constructor(
    @InjectRepository(BlockPage)
    private blockPageRepository: Repository<BlockPage>,
    @InjectRepository(AccessRequest)
    private accessRequestRepository: Repository<AccessRequest>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private tenantsService: TenantsService,
    private listsService: ListsService,
    private policyCompilerService: PolicyCompilerService,
    private auditLogsService: AuditLogsService,
    private redisService: RedisService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    this.uploadRoot =
      this.configService.get<string>('BLOCK_PAGE_UPLOAD_DIR') ||
      path.join(process.cwd(), 'uploads', 'block-pages');
  }

  // ==================== BLOCK PAGES ====================

  async create(tenantId: string, dto: CreateBlockPageDto): Promise<BlockPage> {
    const scope = dto.scope ?? 'tenant';
    if (scope === 'msp') {
      await this.assertMspTenant(tenantId);
    }

    if (dto.isDefault) {
      await this.blockPageRepository.update(
        { tenantId, scope, isDefault: true },
        { isDefault: false },
      );
    }

    const blockPage = this.blockPageRepository.create({
      tenantId,
      scope,
      ...dto,
    });

    const saved = await this.blockPageRepository.save(blockPage);
    await this.auditLogsService.log({
      tenantId,
      action: 'create',
      resourceType: 'block_page',
      resourceId: saved.id,
      resourceName: saved.name,
    });
    return saved;
  }

  async findAll(tenantId: string): Promise<BlockPage[]> {
    return this.blockPageRepository.find({
      where: { tenantId },
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<BlockPage> {
    const blockPage = await this.blockPageRepository.findOne({
      where: { id, tenantId },
    });

    if (!blockPage) {
      throw new NotFoundException('Block page not found');
    }

    return blockPage;
  }

  async findDefault(tenantId: string): Promise<BlockPage | null> {
    return this.blockPageRepository.findOne({
      where: { tenantId, scope: 'tenant', isDefault: true },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateBlockPageDto,
  ): Promise<BlockPage> {
    const blockPage = await this.findOne(tenantId, id);

    if (dto.isDefault && !blockPage.isDefault) {
      await this.blockPageRepository.update(
        { tenantId, scope: blockPage.scope, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(blockPage, dto);
    const saved = await this.blockPageRepository.save(blockPage);
    await this.auditLogsService.log({
      tenantId,
      action: 'update',
      resourceType: 'block_page',
      resourceId: saved.id,
      resourceName: saved.name,
    });
    return saved;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const blockPage = await this.findOne(tenantId, id);

    if (blockPage.isDefault) {
      throw new BadRequestException('Cannot delete the default block page');
    }

    await this.blockPageRepository.remove(blockPage);
    await this.auditLogsService.log({
      tenantId,
      action: 'delete',
      resourceType: 'block_page',
      resourceId: id,
      resourceName: blockPage.name,
    });
  }

  async setDefault(tenantId: string, id: string): Promise<BlockPage> {
    const blockPage = await this.findOne(tenantId, id);

    await this.blockPageRepository.update(
      { tenantId, scope: blockPage.scope, isDefault: true },
      { isDefault: false },
    );

    blockPage.isDefault = true;
    return this.blockPageRepository.save(blockPage);
  }

  async getPlatformDefault(): Promise<BlockPage> {
    const page = await this.blockPageRepository.findOne({
      where: { scope: 'platform' },
    });
    if (!page) {
      throw new NotFoundException('Platform block page is not configured');
    }
    return page;
  }

  async updatePlatformDefault(
    dto: UpdatePlatformBlockPageDto,
  ): Promise<BlockPage> {
    const page = await this.getPlatformDefault();
    Object.assign(page, dto, { showPoweredBy: dto.showPoweredBy ?? true });
    return this.blockPageRepository.save(page);
  }

  async resolveEffectiveBlockPage(
    tenantId: string,
    explicitPageId?: string,
    locationId?: string,
  ): Promise<{ page: BlockPage; tenant: Tenant }> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (explicitPageId) {
      const explicit = await this.blockPageRepository.findOne({
        where: { id: explicitPageId, tenantId },
      });
      if (explicit) {
        return { page: explicit, tenant };
      }
    }

    if (locationId) {
      const location = await this.locationRepository.findOne({
        where: { id: locationId, tenantId },
      });
      if (location?.blockPageId) {
        const locPage = await this.blockPageRepository.findOne({
          where: { id: location.blockPageId, tenantId },
        });
        if (locPage) {
          return { page: locPage, tenant };
        }
      }
    }

    const tenantDefault = await this.findDefault(tenantId);
    if (tenantDefault) {
      return { page: tenantDefault, tenant };
    }

    if (tenant.managedByMspId) {
      const mspDefault = await this.blockPageRepository.findOne({
        where: {
          tenantId: tenant.managedByMspId,
          scope: 'msp',
          isDefault: true,
        },
      });
      if (mspDefault) {
        return { page: mspDefault, tenant };
      }
    }

    const platform = await this.getPlatformDefault();
    return { page: platform, tenant };
  }

  async getBlockContext(
    clientIp: string,
    domain: string,
  ): Promise<BlockContextPayload | null> {
    const key = this.blockContextKey(clientIp, domain);
    const raw = await this.redisService.get(key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as BlockContextPayload;
    } catch {
      return null;
    }
  }

  async servePublicBlockPage(options: {
    host: string;
    clientIp: string;
    tenantSlug?: string;
    domain?: string;
    category?: string;
  }): Promise<string> {
    const hostDomain = normalizeDomain(options.host.split(':')[0]);
    const domain = normalizeDomain(options.domain || hostDomain);

    let context = await this.getBlockContext(options.clientIp, domain);
    if (!context && options.tenantSlug) {
      const tenant = await this.tenantsService.findBySlug(options.tenantSlug);
      context = {
        tenantId: tenant.id,
        locationId: '',
        category: options.category,
      };
    }

    if (!context) {
      const platform = await this.getPlatformDefault();
      return this.generateBlockPageHtml(platform, {
        domain,
        category: options.category,
        timestamp: new Date().toISOString(),
        submitUrl: '/block-pages/public/access-requests',
      });
    }

    const { page, tenant } = await this.resolveEffectiveBlockPage(
      context.tenantId,
      context.blockPageId,
      context.locationId,
    );

    const mspBranding = await this.getMspBranding(tenant);

    return this.generateBlockPageHtml(page, {
      domain,
      category: context.category || options.category,
      reason: context.reason,
      timestamp: new Date().toISOString(),
      tenantId: context.tenantId,
      submitUrl: '/block-pages/public/access-requests',
      partnerBranding: mspBranding,
    });
  }

  generateBlockPageHtml(
    blockPage: BlockPage,
    context: RenderContext & {
      partnerBranding?: {
        logoUrl?: string;
        primaryColor?: string;
        companyName?: string;
        supportEmail?: string;
        supportUrl?: string;
      };
    },
  ): string {
    const {
      domain,
      category,
      reason,
      timestamp,
      tenantId,
      submitUrl,
      partnerBranding,
    } = context;

    const effectiveLogoUrl =
      blockPage.logoUrl || partnerBranding?.logoUrl || '';
    const effectivePrimaryColor =
      blockPage.primaryColor ||
      partnerBranding?.primaryColor ||
      FLUX_SHIELD_PLATFORM_DEFAULTS.primaryColor;
    const effectiveSecondaryColor =
      blockPage.secondaryColor || FLUX_SHIELD_PLATFORM_DEFAULTS.secondaryColor;
    const effectiveAccentColor =
      blockPage.accentColor || FLUX_SHIELD_PLATFORM_DEFAULTS.accentColor;
    const effectiveSupportEmail =
      blockPage.supportEmail || partnerBranding?.supportEmail || '';
    const effectiveSupportUrl =
      blockPage.supportUrl || partnerBranding?.supportUrl || '';
    const effectiveFooterText =
      blockPage.footerText ||
      (partnerBranding?.companyName
        ? `Protected by ${partnerBranding.companyName}`
        : blockPage.showPoweredBy
          ? FLUX_SHIELD_PLATFORM_DEFAULTS.footerText
          : 'Protected by Flux Shield');

    const safeDomain = escapeHtml(domain);
    const safeCategory = escapeHtml(category || 'Unknown');
    const safeReason = escapeHtml(reason || 'Policy');
    const safeTimestamp = escapeHtml(timestamp || new Date().toISOString());
    const safeTitle = escapeHtml(blockPage.title);
    const safeMessage = blockPage.messageMarkdown
      ? renderSafeMarkdown(blockPage.message)
      : escapeHtml(blockPage.message);

    if (blockPage.customHtml) {
      return sanitizeCustomHtml(blockPage.customHtml)
        .replace(/\{\{domain\}\}/g, safeDomain)
        .replace(/\{\{category\}\}/g, safeCategory)
        .replace(/\{\{reason\}\}/g, safeReason)
        .replace(/\{\{timestamp\}\}/g, safeTimestamp)
        .replace(/\{\{title\}\}/g, safeTitle)
        .replace(/\{\{message\}\}/g, safeMessage);
    }

    const safeCustomCss = blockPage.customCss
      ? sanitizeCss(blockPage.customCss)
      : '';
    const safeLogoUrl = escapeHtml(effectiveLogoUrl);
    const safeFooterText = escapeHtml(effectiveFooterText);
    const safeSupportEmail = escapeHtml(effectiveSupportEmail);
    const safeSupportUrl = escapeHtml(effectiveSupportUrl);
    const formAction = escapeHtml(submitUrl || '/block-pages/public/access-requests');

    return `<!DOCTYPE html>
<html lang="${escapeHtml(blockPage.language || 'en')}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${blockPage.backgroundColor};
      color: ${blockPage.textColor};
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 520px;
      width: 100%;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(30, 59, 120, 0.12);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, ${effectivePrimaryColor}, ${effectiveSecondaryColor});
      padding: 28px;
      text-align: center;
    }
    .logo { max-height: 48px; margin-bottom: 12px; }
    .header h1 { color: white; font-size: 24px; font-weight: 600; }
    .content { padding: 28px; }
    .message { font-size: 16px; line-height: 1.6; margin-bottom: 20px; }
    .details {
      background: #f9fafb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #6b7280; font-size: 14px; }
    .detail-value { font-weight: 500; font-size: 14px; word-break: break-all; text-align: right; }
    .request-form label { display: block; font-size: 14px; margin-bottom: 6px; color: #374151; }
    .request-form input, .request-form textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-family: inherit;
      margin-bottom: 12px;
    }
    .request-form textarea { resize: vertical; min-height: 80px; }
    .request-form button {
      width: 100%;
      padding: 12px;
      background: ${effectiveAccentColor};
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
    .hp { position: absolute; left: -9999px; opacity: 0; height: 0; width: 0; }
    .footer {
      padding: 18px 28px;
      background: #f9fafb;
      text-align: center;
      font-size: 13px;
      color: #6b7280;
    }
    .footer a { color: ${effectivePrimaryColor}; text-decoration: none; }
    ${safeCustomCss}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${safeLogoUrl ? `<img src="${safeLogoUrl}" alt="Logo" class="logo">` : ''}
      <h1>${safeTitle}</h1>
    </div>
    <div class="content">
      <div class="message">${safeMessage}</div>
      <div class="details">
        ${
          blockPage.showDomain
            ? `<div class="detail-row"><span class="detail-label">Blocked domain</span><span class="detail-value">${safeDomain}</span></div>`
            : ''
        }
        ${
          blockPage.showCategory && category
            ? `<div class="detail-row"><span class="detail-label">Category</span><span class="detail-value">${safeCategory}</span></div>`
            : ''
        }
        ${
          blockPage.showReason && reason
            ? `<div class="detail-row"><span class="detail-label">Reason</span><span class="detail-value">${safeReason}</span></div>`
            : ''
        }
        ${
          blockPage.showTimestamp
            ? `<div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${safeTimestamp}</span></div>`
            : ''
        }
      </div>
      ${
        blockPage.showRequestAccess
          ? `
      <form class="request-form" method="POST" action="${formAction}">
        <input type="hidden" name="domain" value="${safeDomain}">
        <input type="hidden" name="category" value="${safeCategory}">
        ${tenantId ? `<input type="hidden" name="tenantId" value="${escapeHtml(tenantId)}">` : ''}
        <div class="hp" aria-hidden="true">
          <label>Company website</label>
          <input type="text" name="companyWebsite" tabindex="-1" autocomplete="off">
        </div>
        <label>Your name</label>
        <input type="text" name="requesterName" required maxlength="255">
        <label>Email</label>
        <input type="email" name="requesterEmail" required maxlength="255">
        <label>Why do you need access?</label>
        <textarea name="reason" required maxlength="2000" placeholder="Business justification"></textarea>
        <button type="submit">Request unblock</button>
      </form>`
          : ''
      }
    </div>
    <div class="footer">
      ${safeFooterText}
      ${safeSupportEmail ? `<br><a href="mailto:${safeSupportEmail}">Contact support</a>` : ''}
      ${safeSupportUrl ? `<br><a href="${safeSupportUrl}" target="_blank" rel="noopener">Help center</a>` : ''}
    </div>
  </div>
</body>
</html>`;
  }

  async saveLogoUpload(
    tenantId: string,
    blockPageId: string,
    file: {
      buffer: Buffer;
      mimetype: string;
      size: number;
      originalname: string;
    },
  ): Promise<BlockPage> {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Logo must be PNG, JPEG, WebP, or SVG');
    }
    if (file.size > 512 * 1024) {
      throw new BadRequestException('Logo must be 512KB or smaller');
    }

    const page = await this.findOne(tenantId, blockPageId);
    const ext = path.extname(file.originalname) || '.png';
    const key = `${tenantId}/${blockPageId}${ext}`;
    const dir = path.join(this.uploadRoot, tenantId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(this.uploadRoot, key), file.buffer);

    page.logoStorageKey = key;
    page.logoUrl = `/block-pages/public/logos/${tenantId}/${path.basename(key)}`;
    return this.blockPageRepository.save(page);
  }

  // ==================== ACCESS REQUESTS ====================

  async createPublicAccessRequest(
    dto: CreateAccessRequestDto,
    ip: string,
  ): Promise<{ success: true; requestId: string }> {
    if (dto.companyWebsite) {
      return { success: true, requestId: 'accepted' };
    }

    await this.assertAccessRequestRateLimits(ip, dto.domain);

    const domain = normalizeDomain(dto.domain);
    let tenantId = dto.tenantId;

    const context = await this.getBlockContext(ip, domain);
    if (context) {
      tenantId = context.tenantId;
    }

    if (!tenantId) {
      throw new BadRequestException('Unable to verify block context');
    }

    if (dto.turnstileToken) {
      await this.verifyTurnstile(dto.turnstileToken, ip);
    }

    const request = await this.createAccessRequest(
      tenantId,
      {
        ...dto,
        domain,
        blockReason: dto.blockReason || context?.reason,
      },
      ip,
      context?.locationId,
    );

    await this.auditLogsService.log({
      tenantId,
      action: 'create',
      resourceType: 'access_request',
      resourceId: request.id,
      metadata: { domain },
    });

    return {
      success: true,
      requestId: request.id,
    };
  }

  async createAccessRequest(
    tenantId: string,
    dto: CreateAccessRequestDto,
    ip?: string,
    locationId?: string,
  ): Promise<AccessRequest> {
    const request = this.accessRequestRepository.create({
      tenantId,
      locationId: locationId || null,
      domain: normalizeDomain(dto.domain),
      category: dto.category,
      blockReason: dto.blockReason,
      reason: dto.reason,
      requesterEmail: dto.requesterEmail,
      requesterName: dto.requesterName,
      requesterIp: ip,
      status: 'pending',
    });

    return this.accessRequestRepository.save(request);
  }

  async getAccessRequests(
    tenantId: string,
    status?: AccessRequestStatus,
  ): Promise<AccessRequest[]> {
    const where: { tenantId: string; status?: AccessRequestStatus } = {
      tenantId,
    };
    if (status) {
      where.status = status;
    }

    return this.accessRequestRepository.find({
      where,
      relations: ['location', 'reviewedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async reviewAccessRequest(
    tenantId: string,
    id: string,
    userId: string,
    dto: ReviewAccessRequestDto,
  ): Promise<AccessRequest> {
    const request = await this.accessRequestRepository.findOne({
      where: { id, tenantId },
    });

    if (!request) {
      throw new NotFoundException('Access request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('This request has already been reviewed');
    }

    request.status = dto.status;
    request.reviewedById = userId;
    request.reviewedAt = new Date();
    request.reviewNote = dto.reviewNote || null;

    if (dto.status === 'approved') {
      if (dto.expiresInHours) {
        request.expiresAt = new Date(
          Date.now() + dto.expiresInHours * 60 * 60 * 1000,
        );
      }

      if (dto.addToAllowList !== false) {
        const listId =
          dto.allowListId ||
          (await this.ensureUnblockAllowListId(tenantId));
        await this.listsService.addEntries(tenantId, listId, {
          entries: [
            {
              domain: request.domain,
              type: 'exact',
              comment: `Unblock request ${request.id}${
                request.expiresAt
                  ? ` expires ${request.expiresAt.toISOString()}`
                  : ''
              }`,
            },
          ],
        });
        request.allowListId = listId;
        const locations = await this.locationRepository.find({
          where: { tenantId },
        });
        for (const location of locations) {
          if (location.policyId) {
            await this.policyCompilerService.compile(
              tenantId,
              location.policyId,
              location.id,
            );
          }
        }
      }
    }

    const saved = await this.accessRequestRepository.save(request);

    await this.auditLogsService.log({
      tenantId,
      userId,
      action: 'update',
      resourceType: 'access_request',
      resourceId: saved.id,
      resourceName: saved.domain,
      metadata: { decision: dto.status, reviewNote: dto.reviewNote },
    });

    if (saved.requesterEmail) {
      try {
        await this.emailService.sendTransactionalHtml(
          saved.requesterEmail,
          dto.status === 'approved'
            ? 'Your unblock request was approved'
            : 'Your unblock request was denied',
          `<p>Your request for <strong>${escapeHtml(saved.domain)}</strong> was ${dto.status}.</p>${
            dto.reviewNote
              ? `<p>Note: ${escapeHtml(dto.reviewNote)}</p>`
              : ''
          }`,
        );
      } catch (err) {
        this.logger.warn(`Failed to send access request email: ${err}`);
      }
    }

    return saved;
  }

  private blockContextKey(clientIp: string, domain: string): string {
    return `${BLOCK_CONTEXT_REDIS_PREFIX}${clientIp}:${normalizeDomain(domain)}`;
  }

  private async assertMspTenant(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant || tenant.tier !== 'msp') {
      throw new ForbiddenException('MSP scope requires an MSP tier tenant');
    }
  }

  private async getMspBranding(tenant: Tenant) {
    if (!tenant.managedByMspId) {
      return undefined;
    }
    const msp = await this.tenantRepository.findOne({
      where: { id: tenant.managedByMspId },
    });
    if (!msp?.settings) {
      return undefined;
    }
    return {
      companyName: msp.settings.mspDisplayName || msp.name,
      supportEmail: msp.settings.mspSupportEmail,
      supportUrl: msp.settings.mspSupportUrl,
    };
  }

  private async ensureUnblockAllowListId(tenantId: string): Promise<string> {
    const lists = await this.listsService.findAll(tenantId, { limit: 100 });
    const existing = lists.data.find(
      (l) => l.type === 'allowlist' && l.name === 'Unblock requests',
    );
    if (existing) {
      return existing.id;
    }
    const created = await this.listsService.create(tenantId, {
      name: 'Unblock requests',
      type: 'allowlist',
      description: 'Approved end-user unblock requests',
    });
    return created.id;
  }

  private async assertAccessRequestRateLimits(
    ip: string,
    domain: string,
  ): Promise<void> {
    try {
      const ipKey = `accessreq:ip:${ip}:${new Date().getUTCHours()}`;
      const ipCount = await this.redisService
        .getClient()
        .incr(ipKey);
      if (ipCount === 1) {
        await this.redisService.getClient().expire(ipKey, 3600);
      }
      if (ipCount > ACCESS_REQUEST_RATE_LIMIT.perIpPerHour) {
        throw new BadRequestException('Too many requests from this network');
      }

      const ctx = await this.getBlockContext(ip, domain);
      if (ctx?.tenantId) {
        const tenantKey = `accessreq:tenant:${ctx.tenantId}:${new Date().getUTCHours()}`;
        const tenantCount = await this.redisService.getClient().incr(tenantKey);
        if (tenantCount === 1) {
          await this.redisService.getClient().expire(tenantKey, 3600);
        }
        if (tenantCount > ACCESS_REQUEST_RATE_LIMIT.perTenantPerHour) {
          throw new BadRequestException('Too many requests for this organization');
        }
      }
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.warn(`Rate limit check skipped: ${err}`);
    }
  }

  private async verifyTurnstile(token: string, ip: string): Promise<void> {
    const secret = this.configService.get<string>('TURNSTILE_SECRET_KEY');
    if (!secret) {
      return;
    }
    const params = new URLSearchParams({
      secret,
      response: token,
      remoteip: ip,
    });
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: params },
    );
    const body = (await response.json()) as { success?: boolean };
    if (!body.success) {
      throw new BadRequestException('Captcha verification failed');
    }
  }
}
