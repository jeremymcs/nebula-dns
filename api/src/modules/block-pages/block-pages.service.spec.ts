// Nebula DNS - Block Pages Service Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BlockPagesService } from './block-pages.service';
import { BlockPage } from './entities/block-page.entity';
import { AccessRequest } from './entities/access-request.entity';
import {
  CreateBlockPageDto,
  UpdateBlockPageDto,
  CreateAccessRequestDto,
  ReviewAccessRequestDto,
} from './dto/block-page.dto';

describe('BlockPagesService', () => {
  let service: BlockPagesService;
  let blockPageRepository: jest.Mocked<Repository<BlockPage>>;
  let accessRequestRepository: jest.Mocked<Repository<AccessRequest>>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockBlockPage: Partial<BlockPage> = {
    id: 'page-123',
    tenantId: mockTenantId,
    name: 'Default Block Page',
    title: 'Access Blocked',
    message: 'This site has been blocked',
    isDefault: true,
    backgroundColor: '#f9fafb',
    textColor: '#111827',
    primaryColor: '#4f46e5',
    showDomain: true,
    showCategory: true,
    showTimestamp: true,
    showRequestAccess: true,
    customCss: undefined,
    customHtml: undefined,
    logoUrl: undefined,
    supportEmail: 'support@example.com',
    supportUrl: undefined,
    footerText: 'Protected by Nebula DNS',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockAccessRequest: Partial<AccessRequest> = {
    id: 'request-123',
    tenantId: mockTenantId,
    domain: 'blocked.com',
    category: 'malware',
    reason: 'Need for work',
    requesterEmail: 'user@example.com',
    requesterIp: '192.168.1.100',
    status: 'pending',
    reviewedById: undefined,
    reviewedAt: undefined,
    reviewNote: undefined,
    expiresAt: undefined,
    locationId: undefined,
    createdAt: new Date('2024-01-01'),
  };

  const mockBlockPageRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };

  const mockAccessRequestRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockPagesService,
        {
          provide: getRepositoryToken(BlockPage),
          useValue: mockBlockPageRepository,
        },
        {
          provide: getRepositoryToken(AccessRequest),
          useValue: mockAccessRequestRepository,
        },
      ],
    }).compile();

    service = module.get<BlockPagesService>(BlockPagesService);
    blockPageRepository = module.get(getRepositoryToken(BlockPage));
    accessRequestRepository = module.get(getRepositoryToken(AccessRequest));

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a block page', async () => {
      const dto: CreateBlockPageDto = {
        name: 'New Block Page',
        title: 'Access Denied',
        message: 'Site blocked by policy',
        isDefault: false,
      };

      mockBlockPageRepository.create.mockReturnValue(
        mockBlockPage as BlockPage,
      );
      mockBlockPageRepository.save.mockResolvedValue(
        mockBlockPage as BlockPage,
      );

      const result = await service.create(mockTenantId, dto);

      expect(result).toEqual(mockBlockPage);
      expect(mockBlockPageRepository.create).toHaveBeenCalled();
    });

    it('should unset other defaults when setting as default', async () => {
      const dto: CreateBlockPageDto = {
        name: 'New Default',
        title: 'Blocked',
        message: 'Site blocked',
        isDefault: true,
      };

      mockBlockPageRepository.update.mockResolvedValue(undefined as any);
      mockBlockPageRepository.create.mockReturnValue(
        mockBlockPage as BlockPage,
      );
      mockBlockPageRepository.save.mockResolvedValue(
        mockBlockPage as BlockPage,
      );

      await service.create(mockTenantId, dto);

      expect(mockBlockPageRepository.update).toHaveBeenCalledWith(
        { tenantId: mockTenantId, isDefault: true },
        { isDefault: false },
      );
    });
  });

  describe('findAll', () => {
    it('should return all block pages for tenant', async () => {
      const pages = [mockBlockPage, { ...mockBlockPage, id: 'page-456' }];
      mockBlockPageRepository.find.mockResolvedValue(pages as BlockPage[]);

      const result = await service.findAll(mockTenantId);

      expect(result).toHaveLength(2);
      expect(mockBlockPageRepository.find).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        order: { isDefault: 'DESC', name: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a block page by id', async () => {
      mockBlockPageRepository.findOne.mockResolvedValue(
        mockBlockPage as BlockPage,
      );

      const result = await service.findOne(mockTenantId, 'page-123');

      expect(result).toEqual(mockBlockPage);
    });

    it('should throw NotFoundException when not found', async () => {
      mockBlockPageRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockTenantId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findDefault', () => {
    it('should return default block page', async () => {
      mockBlockPageRepository.findOne.mockResolvedValue(
        mockBlockPage as BlockPage,
      );

      const result = await service.findDefault(mockTenantId);

      expect(result).toEqual(mockBlockPage);
      expect(mockBlockPageRepository.findOne).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, isDefault: true },
      });
    });

    it('should return null if no default page', async () => {
      mockBlockPageRepository.findOne.mockResolvedValue(null);

      const result = await service.findDefault(mockTenantId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update block page properties', async () => {
      const dto: UpdateBlockPageDto = {
        name: 'Updated Page',
        message: 'Updated message',
      };

      mockBlockPageRepository.findOne.mockResolvedValue(
        mockBlockPage as BlockPage,
      );
      mockBlockPageRepository.save.mockResolvedValue({
        ...mockBlockPage,
        ...dto,
      } as BlockPage);

      const result = await service.update(mockTenantId, 'page-123', dto);

      expect(result.name).toBe('Updated Page');
    });

    it('should unset other defaults when updating to default', async () => {
      const nonDefaultPage = { ...mockBlockPage, isDefault: false };

      mockBlockPageRepository.findOne.mockResolvedValue(
        nonDefaultPage as BlockPage,
      );
      mockBlockPageRepository.update.mockResolvedValue(undefined as any);
      mockBlockPageRepository.save.mockResolvedValue({
        ...nonDefaultPage,
        isDefault: true,
      } as BlockPage);

      await service.update(mockTenantId, 'page-123', {
        name: nonDefaultPage.name!,
        title: nonDefaultPage.title!,
        message: nonDefaultPage.message!,
        isDefault: true,
      });

      expect(mockBlockPageRepository.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete non-default block page', async () => {
      const nonDefaultPage = { ...mockBlockPage, isDefault: false };

      mockBlockPageRepository.findOne.mockResolvedValue(
        nonDefaultPage as BlockPage,
      );
      mockBlockPageRepository.remove.mockResolvedValue(
        nonDefaultPage as BlockPage,
      );

      await service.delete(mockTenantId, 'page-123');

      expect(mockBlockPageRepository.remove).toHaveBeenCalled();
    });

    it('should throw error when deleting default page', async () => {
      mockBlockPageRepository.findOne.mockResolvedValue(
        mockBlockPage as BlockPage,
      );

      await expect(service.delete(mockTenantId, 'page-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('setDefault', () => {
    it('should set page as default', async () => {
      const nonDefaultPage = { ...mockBlockPage, isDefault: false };

      mockBlockPageRepository.findOne.mockResolvedValue(
        nonDefaultPage as BlockPage,
      );
      mockBlockPageRepository.update.mockResolvedValue(undefined as any);
      mockBlockPageRepository.save.mockResolvedValue({
        ...nonDefaultPage,
        isDefault: true,
      } as BlockPage);

      const result = await service.setDefault(mockTenantId, 'page-123');

      expect(result.isDefault).toBe(true);
      expect(mockBlockPageRepository.update).toHaveBeenCalledWith(
        { tenantId: mockTenantId, isDefault: true },
        { isDefault: false },
      );
    });
  });

  describe('generateBlockPageHtml', () => {
    it('should generate HTML with default template', () => {
      const context = {
        domain: 'blocked.com',
        category: 'malware',
        timestamp: new Date().toISOString(),
      };

      const html = service.generateBlockPageHtml(
        mockBlockPage as BlockPage,
        context,
      );

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Access Blocked');
      expect(html).toContain('blocked.com');
      expect(html).toContain('malware');
    });

    it('should escape user-provided values to prevent XSS', () => {
      const context = {
        domain: '<script>alert("xss")</script>',
        category: '<img src=x onerror=alert(1)>',
        timestamp: new Date().toISOString(),
      };

      const html = service.generateBlockPageHtml(
        mockBlockPage as BlockPage,
        context,
      );

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('onerror=alert'); // The = is escaped
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&#x3D;'); // = should be escaped
    });

    it('should use custom HTML when provided', () => {
      const customBlockPage = {
        ...mockBlockPage,
        customHtml: '<html><body>Custom: {{domain}}</body></html>',
      };

      const context = {
        domain: 'test.com',
      };

      const html = service.generateBlockPageHtml(
        customBlockPage as BlockPage,
        context,
      );

      expect(html).toContain('Custom:');
      expect(html).toContain('test.com');
    });

    it('should sanitize custom HTML to remove scripts', () => {
      const customBlockPage = {
        ...mockBlockPage,
        customHtml: '<script>malicious()</script><div>Safe content</div>',
      };

      const context = {
        domain: 'test.com',
      };

      const html = service.generateBlockPageHtml(
        customBlockPage as BlockPage,
        context,
      );

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('malicious()');
      expect(html).toContain('Safe content');
    });

    it('should apply partner branding when provided', () => {
      const context = {
        domain: 'test.com',
        partnerBranding: {
          logoUrl: 'https://partner.com/logo.png',
          primaryColor: '#ff0000',
          companyName: 'Partner Corp',
        },
      };

      const blockPageWithoutBranding = {
        ...mockBlockPage,
        logoUrl: '',
        primaryColor: '',
        footerText: '', // Must be empty for partner branding to show
      };

      const html = service.generateBlockPageHtml(
        blockPageWithoutBranding as unknown as BlockPage,
        context,
      );

      expect(html).toContain('partner.com');
      expect(html).toContain('#ff0000');
      expect(html).toContain('Partner Corp');
    });

    it('should include request access form when enabled', () => {
      const context = {
        domain: 'blocked.com',
        requestId: 'req-123',
      };

      const html = service.generateBlockPageHtml(
        mockBlockPage as BlockPage,
        context,
      );

      expect(html).toContain('Request Access');
      expect(html).toContain('textarea');
      expect(html).toContain('req-123');
    });

    it('should hide request access form when disabled', () => {
      const pageWithoutRequestAccess = {
        ...mockBlockPage,
        showRequestAccess: false,
      };

      const context = {
        domain: 'blocked.com',
      };

      const html = service.generateBlockPageHtml(
        pageWithoutRequestAccess as BlockPage,
        context,
      );

      expect(html).not.toContain('Request Access');
      expect(html).not.toContain('<textarea name="reason"'); // The actual form textarea element
      expect(html).not.toContain('<div class="request-form">');
    });
  });

  describe('createAccessRequest', () => {
    it('should create access request', async () => {
      const dto: CreateAccessRequestDto = {
        domain: 'blocked.com',
        category: 'malware',
        reason: 'Need for work project',
        requesterEmail: 'user@example.com',
      };

      mockAccessRequestRepository.create.mockReturnValue(
        mockAccessRequest as AccessRequest,
      );
      mockAccessRequestRepository.save.mockResolvedValue(
        mockAccessRequest as AccessRequest,
      );

      const result = await service.createAccessRequest(
        mockTenantId,
        dto,
        '192.168.1.100',
      );

      expect(result).toEqual(mockAccessRequest);
      expect(mockAccessRequestRepository.create).toHaveBeenCalledWith({
        tenantId: mockTenantId,
        domain: dto.domain,
        category: dto.category,
        reason: dto.reason,
        requesterEmail: dto.requesterEmail,
        requesterIp: '192.168.1.100',
        status: 'pending',
      });
    });
  });

  describe('getAccessRequests', () => {
    it('should return all access requests for tenant', async () => {
      const requests = [
        mockAccessRequest,
        { ...mockAccessRequest, id: 'req-456' },
      ];
      mockAccessRequestRepository.find.mockResolvedValue(
        requests as AccessRequest[],
      );

      const result = await service.getAccessRequests(mockTenantId);

      expect(result).toHaveLength(2);
    });

    it('should filter by status', async () => {
      mockAccessRequestRepository.find.mockResolvedValue([
        mockAccessRequest,
      ] as AccessRequest[]);

      await service.getAccessRequests(mockTenantId, 'pending');

      expect(mockAccessRequestRepository.find).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, status: 'pending' },
        relations: ['location', 'reviewedBy'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('reviewAccessRequest', () => {
    it('should approve access request', async () => {
      const dto: ReviewAccessRequestDto = {
        status: 'approved',
        reviewNote: 'Approved for business use',
        expiresInHours: 24,
      };

      const pendingRequest = { ...mockAccessRequest, status: 'pending' };

      mockAccessRequestRepository.findOne.mockResolvedValue(
        pendingRequest as AccessRequest,
      );
      mockAccessRequestRepository.save.mockResolvedValue({
        ...pendingRequest,
        status: 'approved',
        reviewedById: mockUserId,
        reviewedAt: expect.any(Date),
        expiresAt: expect.any(Date),
      } as AccessRequest);

      const result = await service.reviewAccessRequest(
        mockTenantId,
        'request-123',
        mockUserId,
        dto,
      );

      expect(result.status).toBe('approved');
      expect(result.reviewedById).toBe(mockUserId);
    });

    it('should deny access request', async () => {
      const dto: ReviewAccessRequestDto = {
        status: 'denied',
        reviewNote: 'Malware domain',
      };

      const pendingRequest = { ...mockAccessRequest, status: 'pending' };

      mockAccessRequestRepository.findOne.mockResolvedValue(
        pendingRequest as AccessRequest,
      );
      mockAccessRequestRepository.save.mockResolvedValue({
        ...pendingRequest,
        status: 'denied',
      } as AccessRequest);

      const result = await service.reviewAccessRequest(
        mockTenantId,
        'request-123',
        mockUserId,
        dto,
      );

      expect(result.status).toBe('denied');
    });

    it('should throw NotFoundException for non-existent request', async () => {
      mockAccessRequestRepository.findOne.mockResolvedValue(null);

      await expect(
        service.reviewAccessRequest(mockTenantId, 'nonexistent', mockUserId, {
          status: 'approved',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error when reviewing already-reviewed request', async () => {
      const reviewedRequest = {
        ...mockAccessRequest,
        status: 'approved',
      };

      mockAccessRequestRepository.findOne.mockResolvedValue(
        reviewedRequest as AccessRequest,
      );

      await expect(
        service.reviewAccessRequest(mockTenantId, 'request-123', mockUserId, {
          status: 'approved',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set expiration when approved with hours', async () => {
      const dto: ReviewAccessRequestDto = {
        status: 'approved',
        expiresInHours: 48,
      };

      const pendingRequest = { ...mockAccessRequest, status: 'pending' };

      mockAccessRequestRepository.findOne.mockResolvedValue(
        pendingRequest as AccessRequest,
      );

      let savedRequest: any;
      mockAccessRequestRepository.save.mockImplementation((req) => {
        savedRequest = req;
        return Promise.resolve(req as AccessRequest);
      });

      await service.reviewAccessRequest(
        mockTenantId,
        'request-123',
        mockUserId,
        dto,
      );

      expect(savedRequest.expiresAt).toBeDefined();
      const expectedExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const actualExpiry = new Date(savedRequest.expiresAt);
      expect(
        Math.abs(actualExpiry.getTime() - expectedExpiry.getTime()),
      ).toBeLessThan(1000);
    });
  });
});
