import { Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogsDto, ExportAuditLogsDto } from './dto/audit-log.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'owner')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryAuditLogsDto,
  ) {
    const result = await this.auditLogsService.findAll(tenantId, query);
    return {
      data: result.data,
      pagination: {
        cursor: result.cursor,
        hasMore: result.hasMore,
      },
    };
  }

  @Get('export')
  @Roles('owner')
  async export(
    @CurrentTenant() tenantId: string,
    @Query() query: ExportAuditLogsDto,
    @Res() res: Response,
  ) {
    const result = await this.auditLogsService.export(
      tenantId,
      query.format || 'csv',
      query.startTime ? new Date(query.startTime) : undefined,
      query.endTime ? new Date(query.endTime) : undefined,
      query.resourceType,
    );

    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.data);
  }
}
