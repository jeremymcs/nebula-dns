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
} from '@nestjs/common';
import { Request } from 'express';
import { BlockPagesService } from './block-pages.service';
import { CreateBlockPageDto, UpdateBlockPageDto, CreateAccessRequestDto, ReviewAccessRequestDto } from './dto/block-page.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/common/decorators/user.decorator';

@Controller('block-pages')
export class BlockPagesController {
  constructor(private readonly blockPagesService: BlockPagesService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  // Serve block page HTML (called by DNS resolver)
  @Get('render/:tenantSlug')
  @Header('Content-Type', 'text/html')
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
      message: "This website has been blocked by your organization's security policy.",
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

  // Submit access request (from block page)
  @Post('access-requests/public')
  async createPublicAccessRequest(
    @Body() dto: CreateAccessRequestDto,
    @Req() req: Request,
  ) {
    // In production, validate location token and get tenant
    const tenantId = 'demo-tenant-id';
    const ip = req.ip || req.socket.remoteAddress;

    const request = await this.blockPagesService.createAccessRequest(tenantId, dto, ip);
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
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateBlockPageDto,
  ) {
    const blockPage = await this.blockPagesService.create(tenantId, dto);
    return { data: blockPage };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentTenant() tenantId: string) {
    const blockPages = await this.blockPagesService.findAll(tenantId);
    return { data: blockPages };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    const blockPage = await this.blockPagesService.findOne(tenantId, id);
    return { data: blockPage };
  }

  @Get(':id/preview')
  @UseGuards(JwtAuthGuard)
  @Header('Content-Type', 'text/html')
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
  async delete(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.blockPagesService.delete(tenantId, id);
    return { success: true };
  }

  @Post(':id/set-default')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  async setDefault(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    const blockPage = await this.blockPagesService.setDefault(tenantId, id);
    return { data: blockPage };
  }

  // ==================== ACCESS REQUESTS ====================

  @Get('access-requests')
  @UseGuards(JwtAuthGuard)
  async getAccessRequests(
    @CurrentTenant() tenantId: string,
    @Query('status') status: string,
  ) {
    const requests = await this.blockPagesService.getAccessRequests(tenantId, status);
    return { data: requests };
  }

  @Post('access-requests/:id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  async reviewAccessRequest(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReviewAccessRequestDto,
  ) {
    const request = await this.blockPagesService.reviewAccessRequest(tenantId, id, user.id, dto);
    return { data: request };
  }
}
