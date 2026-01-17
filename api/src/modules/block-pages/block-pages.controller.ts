// Nebula DNS - Block Pages Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Header,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { BlockPagesService } from './block-pages.service';
import {
  CreateBlockPageDto,
  UpdateBlockPageDto,
  CreateAccessRequestDto,
  ReviewAccessRequestDto,
} from './dto/block-page.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/common/decorators/user.decorator';

@ApiTags('block-pages')
@Controller('block-pages')
export class BlockPagesController {
  constructor(private readonly blockPagesService: BlockPagesService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get('render/:tenantSlug')
  @Header('Content-Type', 'text/html')
  @ApiOperation({
    summary: 'Render block page HTML',
    description:
      'Renders the block page HTML for display when a domain is blocked. Called by the DNS resolver when redirecting blocked requests. No authentication required.',
  })
  @ApiParam({ name: 'tenantSlug', description: 'Tenant identifier slug' })
  @ApiQuery({
    name: 'domain',
    required: false,
    description: 'Blocked domain name',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Block category',
  })
  @ApiQuery({
    name: 'pageId',
    required: false,
    description: 'Specific block page ID to use',
  })
  @ApiResponse({ status: 200, description: 'Block page HTML content' })
  async renderBlockPage(
    @Param('tenantSlug') tenantSlug: string,
    @Query('domain') domain: string,
    @Query('category') category: string,
    @Query('pageId') pageId: string,
  ) {
    // In production, look up tenant by slug and get block page
    // For now, return a default page
    const mockBlockPage = {
      title: 'Access Blocked',
      message:
        "This website has been blocked by your organization's security policy.",
      backgroundColor: '#f3f4f6',
      primaryColor: '#4f46e5',
      textColor: '#1f2937',
      showCategory: true,
      showDomain: true,
      showTimestamp: true,
      showRequestAccess: true,
    } as any;

    return this.blockPagesService.generateBlockPageHtml(mockBlockPage, {
      domain: domain || 'unknown',
      category,
      timestamp: new Date().toISOString(),
    });
  }

  @Post('access-requests/public')
  @ApiOperation({
    summary: 'Submit access request from block page',
    description:
      'Allows users to request access to a blocked domain. This endpoint is called from the block page form. No authentication required - uses location token.',
  })
  @ApiResponse({
    status: 201,
    description: 'Access request submitted successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async createPublicAccessRequest(
    @Body() dto: CreateAccessRequestDto,
    @Req() req: Request,
  ) {
    // In production, validate location token and get tenant
    const tenantId = 'demo-tenant-id';
    const ip = req.ip || req.socket.remoteAddress;

    const request = await this.blockPagesService.createAccessRequest(
      tenantId,
      dto,
      ip,
    );
    return {
      success: true,
      message: 'Your request has been submitted for review',
      requestId: request.id,
    };
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a block page',
    description:
      'Creates a new custom block page template with branding and messaging options.',
  })
  @ApiResponse({ status: 201, description: 'Block page created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid block page configuration' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateBlockPageDto,
  ) {
    const blockPage = await this.blockPagesService.create(tenantId, dto);
    return { data: blockPage };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all block pages',
    description: 'Returns all block page templates for the current tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Block pages retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(@CurrentTenant() tenantId: string) {
    const blockPages = await this.blockPagesService.findAll(tenantId);
    return { data: blockPages };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get block page by ID',
    description:
      'Returns detailed information about a specific block page template.',
  })
  @ApiParam({ name: 'id', description: 'Block page UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Block page retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Block page not found' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const blockPage = await this.blockPagesService.findOne(tenantId, id);
    return { data: blockPage };
  }

  @Get(':id/preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Header('Content-Type', 'text/html')
  @ApiOperation({
    summary: 'Preview block page',
    description:
      'Renders a preview of the block page with sample data for testing.',
  })
  @ApiParam({ name: 'id', description: 'Block page UUID', type: 'string' })
  @ApiQuery({
    name: 'domain',
    required: false,
    description: 'Sample domain for preview',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Sample category for preview',
  })
  @ApiResponse({ status: 200, description: 'Block page HTML preview' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Block page not found' })
  async preview(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query('domain') domain: string,
    @Query('category') category: string,
  ) {
    const blockPage = await this.blockPagesService.findOne(tenantId, id);
    return this.blockPagesService.generateBlockPageHtml(blockPage, {
      domain: domain || 'example-blocked-site.com',
      category: category || 'Malware',
      timestamp: new Date().toISOString(),
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update block page',
    description: 'Updates an existing block page template.',
  })
  @ApiParam({ name: 'id', description: 'Block page UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Block page updated successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Block page not found' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBlockPageDto,
  ) {
    const blockPage = await this.blockPagesService.update(tenantId, id, dto);
    return { data: blockPage };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete block page',
    description:
      'Permanently deletes a block page template. Cannot delete the default block page.',
  })
  @ApiParam({ name: 'id', description: 'Block page UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Block page deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete default block page' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Block page not found' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.blockPagesService.delete(tenantId, id);
    return { success: true };
  }

  @Post(':id/set-default')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Set block page as default',
    description:
      'Sets this block page as the default template for all blocked requests.',
  })
  @ApiParam({ name: 'id', description: 'Block page UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Block page set as default' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Block page not found' })
  async setDefault(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const blockPage = await this.blockPagesService.setDefault(tenantId, id);
    return { data: blockPage };
  }

  // ==================== ACCESS REQUESTS ====================

  @Get('access-requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List access requests',
    description:
      'Returns all user requests to access blocked domains. Can be filtered by status.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
    enum: ['pending', 'approved', 'denied'],
  })
  @ApiResponse({
    status: 200,
    description: 'Access requests retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getAccessRequests(
    @CurrentTenant() tenantId: string,
    @Query('status') status: string,
  ) {
    const requests = await this.blockPagesService.getAccessRequests(
      tenantId,
      status,
    );
    return { data: requests };
  }

  @Post('access-requests/:id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Review access request',
    description:
      'Approves or denies a user access request. If approved, can optionally whitelist the domain.',
  })
  @ApiParam({ name: 'id', description: 'Access request UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Access request reviewed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Access request not found' })
  async reviewAccessRequest(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReviewAccessRequestDto,
  ) {
    const request = await this.blockPagesService.reviewAccessRequest(
      tenantId,
      id,
      user.id,
      dto,
    );
    return { data: request };
  }
}
