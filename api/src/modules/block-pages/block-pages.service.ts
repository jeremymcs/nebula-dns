import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockPage } from './entities/block-page.entity';
import { AccessRequest } from './entities/access-request.entity';
import {
  CreateBlockPageDto,
  UpdateBlockPageDto,
  CreateAccessRequestDto,
  ReviewAccessRequestDto,
} from './dto/block-page.dto';

@Injectable()
export class BlockPagesService {
  constructor(
    @InjectRepository(BlockPage)
    private blockPageRepository: Repository<BlockPage>,
    @InjectRepository(AccessRequest)
    private accessRequestRepository: Repository<AccessRequest>,
  ) {}

  // ==================== BLOCK PAGES ====================

  async create(tenantId: string, dto: CreateBlockPageDto): Promise<BlockPage> {
    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.blockPageRepository.update(
        { tenantId, isDefault: true },
        { isDefault: false },
      );
    }

    const blockPage = this.blockPageRepository.create({
      tenantId,
      ...dto,
    });

    return this.blockPageRepository.save(blockPage);
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
      where: { tenantId, isDefault: true },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateBlockPageDto,
  ): Promise<BlockPage> {
    const blockPage = await this.findOne(tenantId, id);

    // If setting as default, unset other defaults
    if (dto.isDefault && !blockPage.isDefault) {
      await this.blockPageRepository.update(
        { tenantId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(blockPage, dto);
    return this.blockPageRepository.save(blockPage);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const blockPage = await this.findOne(tenantId, id);

    if (blockPage.isDefault) {
      throw new BadRequestException('Cannot delete the default block page');
    }

    await this.blockPageRepository.remove(blockPage);
  }

  async setDefault(tenantId: string, id: string): Promise<BlockPage> {
    const blockPage = await this.findOne(tenantId, id);

    // Unset other defaults
    await this.blockPageRepository.update(
      { tenantId, isDefault: true },
      { isDefault: false },
    );

    blockPage.isDefault = true;
    return this.blockPageRepository.save(blockPage);
  }

  // Generate HTML for block page with optional partner branding
  generateBlockPageHtml(
    blockPage: BlockPage,
    context: {
      domain: string;
      category?: string;
      timestamp?: string;
      requestId?: string;
      partnerBranding?: {
        logoUrl?: string;
        primaryColor?: string;
        companyName?: string;
        supportEmail?: string;
        supportUrl?: string;
      };
    },
  ): string {
    const { domain, category, timestamp, requestId, partnerBranding } = context;

    // Apply partner branding overrides if available and block page doesn't have custom values
    const effectiveLogoUrl =
      blockPage.logoUrl || partnerBranding?.logoUrl || '';
    const effectivePrimaryColor =
      blockPage.primaryColor || partnerBranding?.primaryColor || '#4f46e5';
    const effectiveSupportEmail =
      blockPage.supportEmail || partnerBranding?.supportEmail || '';
    const effectiveSupportUrl =
      blockPage.supportUrl || partnerBranding?.supportUrl || '';
    const effectiveFooterText =
      blockPage.footerText ||
      (partnerBranding?.companyName
        ? `Protected by ${partnerBranding.companyName}`
        : 'Protected by Nebula DNS');

    // If custom HTML is provided, use it with variable substitution
    if (blockPage.customHtml) {
      return blockPage.customHtml
        .replace(/\{\{domain\}\}/g, domain)
        .replace(/\{\{category\}\}/g, category || 'Unknown')
        .replace(/\{\{timestamp\}\}/g, timestamp || new Date().toISOString())
        .replace(/\{\{title\}\}/g, blockPage.title)
        .replace(/\{\{message\}\}/g, blockPage.message);
    }

    // Default template
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${blockPage.title}</title>
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
      max-width: 500px;
      width: 100%;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: ${effectivePrimaryColor};
      padding: 30px;
      text-align: center;
    }
    .logo { max-height: 50px; margin-bottom: 15px; }
    .icon {
      width: 60px;
      height: 60px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 15px;
    }
    .icon svg { width: 30px; height: 30px; fill: white; }
    .header h1 { color: white; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; }
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
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #6b7280; font-size: 14px; }
    .detail-value { font-weight: 500; font-size: 14px; word-break: break-all; }
    .request-form { margin-top: 20px; }
    .request-form textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      resize: vertical;
      min-height: 80px;
      font-family: inherit;
    }
    .request-form button {
      margin-top: 10px;
      width: 100%;
      padding: 12px;
      background: ${effectivePrimaryColor};
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
    }
    .request-form button:hover { opacity: 0.9; }
    .footer {
      padding: 20px 30px;
      background: #f9fafb;
      text-align: center;
      font-size: 13px;
      color: #6b7280;
    }
    .footer a { color: ${effectivePrimaryColor}; text-decoration: none; }
    ${blockPage.customCss || ''}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${effectiveLogoUrl ? `<img src="${effectiveLogoUrl}" alt="Logo" class="logo">` : ''}
      <div class="icon">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
      </div>
      <h1>${blockPage.title}</h1>
    </div>
    <div class="content">
      <p class="message">${blockPage.message}</p>
      <div class="details">
        ${
          blockPage.showDomain
            ? `
        <div class="detail-row">
          <span class="detail-label">Blocked Domain</span>
          <span class="detail-value">${domain}</span>
        </div>`
            : ''
        }
        ${
          blockPage.showCategory && category
            ? `
        <div class="detail-row">
          <span class="detail-label">Category</span>
          <span class="detail-value">${category}</span>
        </div>`
            : ''
        }
        ${
          blockPage.showTimestamp
            ? `
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${timestamp || new Date().toLocaleString()}</span>
        </div>`
            : ''
        }
      </div>
      ${
        blockPage.showRequestAccess
          ? `
      <div class="request-form">
        <form action="/api/access-requests" method="POST">
          <input type="hidden" name="domain" value="${domain}">
          <input type="hidden" name="category" value="${category || ''}">
          ${requestId ? `<input type="hidden" name="requestId" value="${requestId}">` : ''}
          <textarea name="reason" placeholder="Why do you need access to this site?"></textarea>
          <button type="submit">Request Access</button>
        </form>
      </div>`
          : ''
      }
    </div>
    <div class="footer">
      ${effectiveFooterText}
      ${effectiveSupportEmail ? `<br><a href="mailto:${effectiveSupportEmail}">Contact Support</a>` : ''}
      ${effectiveSupportUrl ? `<br><a href="${effectiveSupportUrl}" target="_blank">Help Center</a>` : ''}
    </div>
  </div>
</body>
</html>`;
  }

  // ==================== ACCESS REQUESTS ====================

  async createAccessRequest(
    tenantId: string,
    dto: CreateAccessRequestDto,
    ip?: string,
  ): Promise<AccessRequest> {
    const request = this.accessRequestRepository.create({
      tenantId,
      domain: dto.domain,
      category: dto.category,
      reason: dto.reason,
      requesterEmail: dto.requesterEmail,
      requesterIp: ip,
      status: 'pending',
    });

    return this.accessRequestRepository.save(request);
  }

  async getAccessRequests(
    tenantId: string,
    status?: string,
  ): Promise<AccessRequest[]> {
    const where: any = { tenantId };
    if (status) where.status = status;

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

    if (dto.status === 'approved' && dto.expiresInHours) {
      request.expiresAt = new Date(
        Date.now() + dto.expiresInHours * 60 * 60 * 1000,
      );
    }

    return this.accessRequestRepository.save(request);
  }
}
