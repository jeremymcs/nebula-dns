import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ConfigService } from '@nestjs/config';
import { BlockPagesService } from './block-pages.service';
import { CreateAccessRequestDto } from './dto/block-page.dto';

function resolveClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

@ApiTags('block-pages')
@Controller('block-pages/public')
export class BlockPagesPublicController {
  private readonly uploadRoot: string;

  constructor(
    private readonly blockPagesService: BlockPagesService,
    configService: ConfigService,
  ) {
    this.uploadRoot =
      configService.get<string>('BLOCK_PAGE_UPLOAD_DIR') ||
      path.join(process.cwd(), 'uploads', 'block-pages');
  }

  @Get('logos/:tenantId/:filename')
  @ApiOperation({ summary: 'Serve tenant block page logo uploads' })
  async logo(
    @Param('tenantId') tenantId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const safeName = path.basename(filename);
    const filePath = path.join(this.uploadRoot, tenantId, safeName);
    try {
      await fs.access(filePath);
      return res.sendFile(filePath);
    } catch {
      throw new NotFoundException('Logo not found');
    }
  }

  @Get('serve')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Render branded block page for sinkholed HTTP traffic' })
  async serve(
    @Req() req: Request,
    @Query('tenantSlug') tenantSlug?: string,
    @Query('domain') domain?: string,
    @Query('category') category?: string,
  ) {
    const host =
      (req.headers['x-forwarded-host'] as string) ||
      req.headers.host ||
      domain ||
      'unknown';
    return this.blockPagesService.servePublicBlockPage({
      host,
      clientIp: resolveClientIp(req),
      tenantSlug,
      domain,
      category,
    });
  }

  @Post('access-requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit unblock request from block page form' })
  async submit(@Body() dto: CreateAccessRequestDto, @Req() req: Request) {
    const result = await this.blockPagesService.createPublicAccessRequest(
      dto,
      resolveClientIp(req),
    );
    return {
      success: true,
      message: 'Your request has been submitted for review',
      requestId: result.requestId,
    };
  }
}
