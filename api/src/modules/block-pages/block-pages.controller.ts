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
  UseGuards,
  Header,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { BlockPagesService } from './block-pages.service';
import {
  CreateBlockPageDto,
  UpdateBlockPageDto,
  ReviewAccessRequestDto,
} from './dto/block-page.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { AccessRequestStatus } from './entities/access-request.entity';

@ApiTags('block-pages')
@Controller('block-pages')
export class BlockPagesController {
  constructor(private readonly blockPagesService: BlockPagesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateBlockPageDto,
  ) {
    const blockPage = await this.blockPagesService.create(tenantId, dto);
    return { data: blockPage };
  }

  @Get('access-requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getAccessRequests(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: AccessRequestStatus,
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
  async reviewAccessRequest(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
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

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findAll(@CurrentTenant() tenantId: string) {
    const blockPages = await this.blockPagesService.findAll(tenantId);
    return { data: blockPages };
  }

  @Get(':id/preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
      category: category || 'Security policy',
      reason: 'category:security',
      timestamp: new Date().toISOString(),
      tenantId,
      submitUrl: '/block-pages/public/access-requests',
    });
  }

  @Post(':id/logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 512 * 1024 }),
          new FileTypeValidator({ fileType: /(png|jpeg|jpg|webp|svg\+xml)/ }),
        ],
      }),
    )
    file: {
      buffer: Buffer;
      mimetype: string;
      size: number;
      originalname: string;
    },
  ) {
    const page = await this.blockPagesService.saveLogoUpload(
      tenantId,
      id,
      file,
    );
    return { data: page };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const blockPage = await this.blockPagesService.findOne(tenantId, id);
    return { data: blockPage };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth()
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
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.blockPagesService.delete(tenantId, id);
    return { success: true };
  }

  @Post(':id/set-default')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  async setDefault(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const blockPage = await this.blockPagesService.setDefault(tenantId, id);
    return { data: blockPage };
  }
}
