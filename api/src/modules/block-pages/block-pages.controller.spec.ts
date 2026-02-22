// Nebula DNS - Block Pages Controller Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BlockPagesController } from './block-pages.controller';
import { BlockPagesService } from './block-pages.service';
import {
  CreateBlockPageDto,
  UpdateBlockPageDto,
  CreateAccessRequestDto,
  ReviewAccessRequestDto,
} from './dto/block-page.dto';

describe('BlockPagesController', () => {
  let controller: BlockPagesController;
  let service: BlockPagesService;

  const mockTenantId = 'tenant-123';
  const mockBlockPageId = 'block-page-123';
  const mockRequestId = 'request-123';
  const mockUser = {
    id: 'user-123',
    email: 'admin@example.com',
    role: 'admin',
    tenantId: mockTenantId,
  };

  const mockBlockPage = {
    id: mockBlockPageId,
    tenantId: mockTenantId,
    title: 'Access Blocked',
    message: 'This website has been blocked',
    backgroundColor: '#f3f4f6',
    primaryColor: '#4f46e5',
    textColor: '#1f2937',
    showCategory: true,
    showDomain: true,
    showTimestamp: true,
    showRequestAccess: true,
    isDefault: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockAccessRequest = {
    id: mockRequestId,
    tenantId: mockTenantId,
    domain: 'blocked-site.com',
    category: 'malware',
    requesterEmail: 'user@example.com',
    reason: 'Need access for work',
    status: 'pending',
    createdAt: new Date('2024-01-01'),
  };

  const mockRequest = {
    ip: '192.168.1.100',
    socket: { remoteAddress: '192.168.1.100' },
  } as any;

  const mockBlockPagesService = {
    generateBlockPageHtml: jest.fn(),
    createAccessRequest: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    setDefault: jest.fn(),
    getAccessRequests: jest.fn(),
    reviewAccessRequest: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockPagesController],
      providers: [
        {
          provide: BlockPagesService,
          useValue: mockBlockPagesService,
        },
      ],
    }).compile();

    controller = module.get<BlockPagesController>(BlockPagesController);
    service = module.get<BlockPagesService>(BlockPagesService);

    jest.clearAllMocks();
  });

  describe('GET /block-pages/render/:tenantSlug (Public)', () => {
    it('should render block page HTML', async () => {
      const mockHtml = '<html><body>Access Blocked</body></html>';
      mockBlockPagesService.generateBlockPageHtml.mockReturnValue(mockHtml);

      const result = await controller.renderBlockPage(
        'tenant-slug',
        'blocked-site.com',
        'malware',
        mockBlockPageId,
      );

      expect(service.generateBlockPageHtml).toHaveBeenCalled();
      expect(result).toContain('Access Blocked');
    });

    it('should include domain in block page', async () => {
      const mockHtml = '<html><body>blocked-site.com</body></html>';
      mockBlockPagesService.generateBlockPageHtml.mockReturnValue(mockHtml);

      const result = await controller.renderBlockPage(
        'tenant-slug',
        'blocked-site.com',
        'malware',
        mockBlockPageId,
      );

      expect(result).toContain('blocked-site.com');
    });

    it('should include category when specified', async () => {
      const mockHtml = '<html><body>Category: malware</body></html>';
      mockBlockPagesService.generateBlockPageHtml.mockReturnValue(mockHtml);

      const result = await controller.renderBlockPage(
        'tenant-slug',
        'blocked-site.com',
        'malware',
        mockBlockPageId,
      );

      expect(service.generateBlockPageHtml).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          domain: 'blocked-site.com',
          category: 'malware',
        }),
      );
    });

    it('should handle missing query parameters', async () => {
      const mockHtml = '<html><body>Access Blocked</body></html>';
      mockBlockPagesService.generateBlockPageHtml.mockReturnValue(mockHtml);

      const result = await controller.renderBlockPage(
        'tenant-slug',
        '',
        '',
        '',
      );

      expect(service.generateBlockPageHtml).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          domain: 'unknown',
        }),
      );
    });
  });

  describe('POST /block-pages/access-requests/public (Public)', () => {
    it('should create public access request', async () => {
      const createDto: CreateAccessRequestDto = {
        domain: 'blocked-site.com',
        category: 'malware',
        requesterEmail: 'user@example.com',
        reason: 'Need access for work',
      };

      mockBlockPagesService.createAccessRequest.mockResolvedValue(
        mockAccessRequest,
      );

      const result = await controller.createPublicAccessRequest(
        createDto,
        mockRequest,
      );

      expect(service.createAccessRequest).toHaveBeenCalledWith(
        expect.any(String),
        createDto,
        expect.any(String),
      );
      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
    });

    it('should capture client IP address', async () => {
      const createDto: CreateAccessRequestDto = {
        domain: 'blocked-site.com',
        category: 'malware',
        requesterEmail: 'user@example.com',
        reason: 'Need access for work',
      };

      mockBlockPagesService.createAccessRequest.mockResolvedValue(
        mockAccessRequest,
      );

      await controller.createPublicAccessRequest(createDto, mockRequest);

      expect(service.createAccessRequest).toHaveBeenCalledWith(
        expect.any(String),
        createDto,
        '192.168.1.100',
      );
    });

    it('should validate email format', async () => {
      const createDto: CreateAccessRequestDto = {
        domain: 'blocked-site.com',
        category: 'malware',
        requesterEmail: 'invalid-email',
        reason: 'Need access',
      };

      mockBlockPagesService.createAccessRequest.mockRejectedValue(
        new BadRequestException('Invalid email format'),
      );

      await expect(
        controller.createPublicAccessRequest(createDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST /block-pages (Authenticated)', () => {
    it('should create block page with valid data', async () => {
      const createDto: CreateBlockPageDto = {
        name: 'Test Block Page',
        title: 'Custom Block Page',
        message: 'Access denied',
        backgroundColor: '#ffffff',
        primaryColor: '#000000',
        textColor: '#333333',
        showCategory: true,
        showDomain: true,
        showTimestamp: true,
        showRequestAccess: true,
      };

      const expectedBlockPage = { ...mockBlockPage, ...createDto };
      mockBlockPagesService.create.mockResolvedValue(expectedBlockPage);

      const result = await controller.create(mockTenantId, createDto);

      expect(service.create).toHaveBeenCalledWith(mockTenantId, createDto);
      expect(result.data.title).toBe(createDto.title);
    });

    it('should validate color format', async () => {
      const createDto: CreateBlockPageDto = {
        name: 'Test Block Page',
        title: 'Test Page',
        message: 'Test',
        backgroundColor: 'invalid-color',
        primaryColor: '#000000',
        textColor: '#333333',
        showCategory: true,
        showDomain: true,
        showTimestamp: true,
        showRequestAccess: true,
      };

      mockBlockPagesService.create.mockRejectedValue(
        new BadRequestException('Invalid color format'),
      );

      await expect(controller.create(mockTenantId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('GET /block-pages (Authenticated)', () => {
    it('should return all block pages for tenant', async () => {
      const mockBlockPages = [mockBlockPage];
      mockBlockPagesService.findAll.mockResolvedValue(mockBlockPages);

      const result = await controller.findAll(mockTenantId);

      expect(service.findAll).toHaveBeenCalledWith(mockTenantId);
      expect(result.data).toEqual(mockBlockPages);
    });

    it('should return empty array when no block pages exist', async () => {
      mockBlockPagesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockTenantId);

      expect(result.data).toEqual([]);
    });
  });

  describe('GET /block-pages/:id (Authenticated)', () => {
    it('should return block page by ID', async () => {
      mockBlockPagesService.findOne.mockResolvedValue(mockBlockPage);

      const result = await controller.findOne(mockTenantId, mockBlockPageId);

      expect(service.findOne).toHaveBeenCalledWith(
        mockTenantId,
        mockBlockPageId,
      );
      expect(result.data).toEqual(mockBlockPage);
    });

    it('should throw NotFoundException for non-existent block page', async () => {
      mockBlockPagesService.findOne.mockRejectedValue(
        new NotFoundException('Block page not found'),
      );

      await expect(
        controller.findOne(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /block-pages/:id/preview (Authenticated)', () => {
    it('should return preview HTML', async () => {
      const mockHtml = '<html><body>Preview</body></html>';
      mockBlockPagesService.findOne.mockResolvedValue(mockBlockPage);
      mockBlockPagesService.generateBlockPageHtml.mockReturnValue(mockHtml);

      const result = await controller.preview(
        mockTenantId,
        mockBlockPageId,
        'example.com',
        'Malware',
      );

      expect(service.findOne).toHaveBeenCalledWith(
        mockTenantId,
        mockBlockPageId,
      );
      expect(service.generateBlockPageHtml).toHaveBeenCalled();
      expect(result).toContain('Preview');
    });

    it('should use default values when query params missing', async () => {
      const mockHtml = '<html><body>Preview</body></html>';
      mockBlockPagesService.findOne.mockResolvedValue(mockBlockPage);
      mockBlockPagesService.generateBlockPageHtml.mockReturnValue(mockHtml);

      await controller.preview(mockTenantId, mockBlockPageId, '', '');

      expect(service.generateBlockPageHtml).toHaveBeenCalledWith(
        mockBlockPage,
        expect.objectContaining({
          domain: 'example-blocked-site.com',
          category: 'Malware',
        }),
      );
    });
  });

  describe('PATCH /block-pages/:id (Authenticated)', () => {
    it('should update block page with valid data', async () => {
      const updateDto: UpdateBlockPageDto = {
        name: 'Test Block Page',
        title: 'Updated Title',
      };

      const updatedBlockPage = { ...mockBlockPage, ...updateDto };
      mockBlockPagesService.update.mockResolvedValue(updatedBlockPage);

      const result = await controller.update(
        mockTenantId,
        mockBlockPageId,
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockTenantId,
        mockBlockPageId,
        updateDto,
      );
      expect(result.data.title).toBe(updateDto.title);
    });

    it('should update colors', async () => {
      const updateDto: UpdateBlockPageDto = {
        name: 'Test Block Page',
        backgroundColor: '#123456',
        primaryColor: '#654321',
      };

      const updatedBlockPage = { ...mockBlockPage, ...updateDto };
      mockBlockPagesService.update.mockResolvedValue(updatedBlockPage);

      const result = await controller.update(
        mockTenantId,
        mockBlockPageId,
        updateDto,
      );

      expect(result.data.backgroundColor).toBe(updateDto.backgroundColor);
      expect(result.data.primaryColor).toBe(updateDto.primaryColor);
    });

    it('should throw NotFoundException for non-existent block page', async () => {
      const updateDto: UpdateBlockPageDto = {
        name: 'Test Block Page',
        title: 'Updated',
      };

      mockBlockPagesService.update.mockRejectedValue(
        new NotFoundException('Block page not found'),
      );

      await expect(
        controller.update(mockTenantId, 'nonexistent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /block-pages/:id (Authenticated)', () => {
    it('should delete block page successfully', async () => {
      mockBlockPagesService.delete.mockResolvedValue(undefined);

      const result = await controller.delete(mockTenantId, mockBlockPageId);

      expect(service.delete).toHaveBeenCalledWith(
        mockTenantId,
        mockBlockPageId,
      );
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException for non-existent block page', async () => {
      mockBlockPagesService.delete.mockRejectedValue(
        new NotFoundException('Block page not found'),
      );

      await expect(
        controller.delete(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent deleting default block page', async () => {
      mockBlockPagesService.delete.mockRejectedValue(
        new BadRequestException('Cannot delete default block page'),
      );

      await expect(
        controller.delete(mockTenantId, mockBlockPageId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST /block-pages/:id/set-default (Authenticated)', () => {
    it('should set block page as default', async () => {
      const defaultBlockPage = { ...mockBlockPage, isDefault: true };
      mockBlockPagesService.setDefault.mockResolvedValue(defaultBlockPage);

      const result = await controller.setDefault(mockTenantId, mockBlockPageId);

      expect(service.setDefault).toHaveBeenCalledWith(
        mockTenantId,
        mockBlockPageId,
      );
      expect(result.data.isDefault).toBe(true);
    });

    it('should throw NotFoundException for non-existent block page', async () => {
      mockBlockPagesService.setDefault.mockRejectedValue(
        new NotFoundException('Block page not found'),
      );

      await expect(
        controller.setDefault(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /block-pages/access-requests (Authenticated)', () => {
    it('should return all access requests', async () => {
      const mockRequests = [mockAccessRequest];
      mockBlockPagesService.getAccessRequests.mockResolvedValue(mockRequests);

      const result = await controller.getAccessRequests(mockTenantId, '');

      expect(service.getAccessRequests).toHaveBeenCalledWith(mockTenantId, '');
      expect(result.data).toEqual(mockRequests);
    });

    it('should filter by status', async () => {
      const mockRequests = [mockAccessRequest];
      mockBlockPagesService.getAccessRequests.mockResolvedValue(mockRequests);

      const result = await controller.getAccessRequests(
        mockTenantId,
        'pending',
      );

      expect(service.getAccessRequests).toHaveBeenCalledWith(
        mockTenantId,
        'pending',
      );
      expect(result.data).toHaveLength(1);
    });

    it('should return empty array when no requests exist', async () => {
      mockBlockPagesService.getAccessRequests.mockResolvedValue([]);

      const result = await controller.getAccessRequests(mockTenantId, '');

      expect(result.data).toEqual([]);
    });
  });

  describe('POST /block-pages/access-requests/:id/review (Authenticated)', () => {
    it('should approve access request', async () => {
      const reviewDto: ReviewAccessRequestDto = {
        status: 'approved',
        reviewNote: 'Approved for work purposes',
      };

      const reviewedRequest = {
        ...mockAccessRequest,
        status: 'approved',
        reviewedBy: mockUser.id,
        reviewedAt: new Date(),
      };

      mockBlockPagesService.reviewAccessRequest.mockResolvedValue(
        reviewedRequest,
      );

      const result = await controller.reviewAccessRequest(
        mockTenantId,
        mockUser,
        mockRequestId,
        reviewDto,
      );

      expect(service.reviewAccessRequest).toHaveBeenCalledWith(
        mockTenantId,
        mockRequestId,
        mockUser.id,
        reviewDto,
      );
      expect(result.data.status).toBe('approved');
    });

    it('should reject access request', async () => {
      const reviewDto: ReviewAccessRequestDto = {
        status: 'denied',
        reviewNote: 'Security policy violation',
      };

      const reviewedRequest = {
        ...mockAccessRequest,
        status: 'denied',
        reviewedBy: mockUser.id,
        reviewedAt: new Date(),
      };

      mockBlockPagesService.reviewAccessRequest.mockResolvedValue(
        reviewedRequest,
      );

      const result = await controller.reviewAccessRequest(
        mockTenantId,
        mockUser,
        mockRequestId,
        reviewDto,
      );

      expect(result.data.status).toBe('denied');
    });

    it('should throw NotFoundException for non-existent request', async () => {
      const reviewDto: ReviewAccessRequestDto = {
        status: 'approved',
      };

      mockBlockPagesService.reviewAccessRequest.mockRejectedValue(
        new NotFoundException('Access request not found'),
      );

      await expect(
        controller.reviewAccessRequest(
          mockTenantId,
          mockUser,
          'nonexistent-id',
          reviewDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject invalid status', async () => {
      const reviewDto = {
        status: 'invalid-status',
      } as any;

      mockBlockPagesService.reviewAccessRequest.mockRejectedValue(
        new BadRequestException('Invalid status'),
      );

      await expect(
        controller.reviewAccessRequest(
          mockTenantId,
          mockUser,
          mockRequestId,
          reviewDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Authorization', () => {
    it('should require ADMIN or OWNER for create', () => {
      const roles = Reflect.getMetadata('roles', controller.create);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });

    it('should require ADMIN or OWNER for delete', () => {
      const roles = Reflect.getMetadata('roles', controller.delete);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });

    it('should require ADMIN or OWNER for setDefault', () => {
      const roles = Reflect.getMetadata('roles', controller.setDefault);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });

    it('should require ADMIN or OWNER for reviewAccessRequest', () => {
      const roles = Reflect.getMetadata(
        'roles',
        controller.reviewAccessRequest,
      );
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });
  });

  describe('Public vs Authenticated Endpoints', () => {
    it('should allow public access to render endpoint', async () => {
      const mockHtml = '<html><body>Access Blocked</body></html>';
      mockBlockPagesService.generateBlockPageHtml.mockReturnValue(mockHtml);

      const result = await controller.renderBlockPage(
        'tenant-slug',
        'blocked-site.com',
        'malware',
        mockBlockPageId,
      );

      expect(result).toBeDefined();
    });

    it('should allow public access to access request submission', async () => {
      const createDto: CreateAccessRequestDto = {
        domain: 'blocked-site.com',
        category: 'malware',
        requesterEmail: 'user@example.com',
        reason: 'Need access',
      };

      mockBlockPagesService.createAccessRequest.mockResolvedValue(
        mockAccessRequest,
      );

      const result = await controller.createPublicAccessRequest(
        createDto,
        mockRequest,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockBlockPagesService.findAll.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.findAll(mockTenantId)).rejects.toThrow(Error);
    });

    it('should propagate validation errors', async () => {
      const createDto: CreateBlockPageDto = {
        name: 'Test Block Page',
        title: 'Test',
        message: 'Test',
        backgroundColor: '#ffffff',
        primaryColor: '#000000',
        textColor: '#333333',
        showCategory: true,
        showDomain: true,
        showTimestamp: true,
        showRequestAccess: true,
      };

      mockBlockPagesService.create.mockRejectedValue(
        new BadRequestException('Validation failed'),
      );

      await expect(controller.create(mockTenantId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
