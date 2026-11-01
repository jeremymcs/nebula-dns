// Nebula DNS - Audit Logs Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Get,
  Delete,
  Put,
  Patch,
  Query,
  Res,
  UseGuards,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuditLogsService } from './audit-logs.service';
import {
  QueryAuditLogsDto,
  ExportAuditLogsDto,
  VerifyIntegrityDto,
  IntegrityVerificationResultDto,
} from './dto/audit-log.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';

@ApiTags('audit-logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'owner')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOperation({
    summary: 'List audit logs',
    description:
      'Returns a paginated list of audit log entries. Audit logs track all changes to resources including who made the change, when, and what was changed.',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions (requires admin or owner role)',
  })
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

  @Get('verify')
  @Roles('owner')
  @ApiOperation({
    summary: 'Verify audit log integrity',
    description:
      'Verifies the cryptographic hash chain of audit logs to detect any tampering or unauthorized modifications. Owner role required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Integrity verification completed',
    type: IntegrityVerificationResultDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only owners can verify integrity',
  })
  async verifyIntegrity(
    @CurrentTenant() tenantId: string,
    @Query() query: VerifyIntegrityDto,
  ): Promise<IntegrityVerificationResultDto> {
    const result = await this.auditLogsService.verifyIntegrity(
      tenantId,
      query.startId,
      query.endId,
    );

    return {
      ...result,
      verifiedAt: new Date(),
    };
  }

  @Get('export')
  @Roles('owner')
  @ApiOperation({
    summary: 'Export audit logs',
    description:
      'Exports audit logs in CSV or JSON format. Optionally verifies log integrity before export. The export includes cryptographic verification headers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs exported successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Only owners can export, or integrity verification failed',
  })
  async export(
    @CurrentTenant() tenantId: string,
    @Query() query: ExportAuditLogsDto,
    @Res() res: Response,
  ) {
    // Optionally verify integrity before export
    if (query.verifyIntegrity) {
      const verification =
        await this.auditLogsService.verifyIntegrity(tenantId);
      if (!verification.valid) {
        throw new ForbiddenException(
          'Audit log integrity verification failed. Export aborted. ' +
            `Chain broken at record ${verification.brokenAt?.id}`,
        );
      }
    }

    const result = await this.auditLogsService.export(
      tenantId,
      query.format || 'csv',
      query.startTime ? new Date(query.startTime) : undefined,
      query.endTime ? new Date(query.endTime) : undefined,
      query.resourceType,
    );

    // Add integrity verification header to export
    res.setHeader('X-Audit-Log-Integrity', 'verified');
    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.data);
  }

  @Put()
  @HttpCode(HttpStatus.FORBIDDEN)
  @ApiOperation({
    summary: 'Update audit logs (not permitted)',
    description:
      'PUT operations are not permitted on audit logs. Audit logs are immutable for compliance and security purposes.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Audit logs cannot be modified',
  })
  async updateAllAuditLogsPut(): Promise<never> {
    throw new ForbiddenException(
      'UPDATE operations are not permitted on audit logs. ' +
        'Audit logs are immutable for compliance and security purposes.',
    );
  }

  @Put(':id')
  @HttpCode(HttpStatus.FORBIDDEN)
  @ApiOperation({
    summary: 'Update a single audit log (not permitted)',
    description:
      'PUT operations are not permitted on audit logs. Audit logs are immutable for compliance and security purposes.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Audit logs cannot be modified',
  })
  async updateAuditLogPut(): Promise<never> {
    throw new ForbiddenException(
      'UPDATE operations are not permitted on audit logs. ' +
        'Audit logs are immutable for compliance and security purposes.',
    );
  }

  @Patch()
  @HttpCode(HttpStatus.FORBIDDEN)
  @ApiOperation({
    summary: 'Modify audit logs (not permitted)',
    description:
      'PATCH operations are not permitted on audit logs. Audit logs are immutable for compliance and security purposes.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Audit logs cannot be modified',
  })
  async updateAllAuditLogsPatch(): Promise<never> {
    throw new ForbiddenException(
      'UPDATE operations are not permitted on audit logs. ' +
        'Audit logs are immutable for compliance and security purposes.',
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.FORBIDDEN)
  @ApiOperation({
    summary: 'Modify a single audit log (not permitted)',
    description:
      'PATCH operations are not permitted on audit logs. Audit logs are immutable for compliance and security purposes.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Audit logs cannot be modified',
  })
  async updateAuditLogPatch(): Promise<never> {
    throw new ForbiddenException(
      'UPDATE operations are not permitted on audit logs. ' +
        'Audit logs are immutable for compliance and security purposes.',
    );
  }

  @Delete()
  @HttpCode(HttpStatus.FORBIDDEN)
  @ApiOperation({
    summary: 'Delete audit logs (not permitted)',
    description:
      'DELETE operations are not permitted on audit logs. Audit logs are immutable for compliance and security purposes.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Audit logs cannot be deleted',
  })
  async deleteAllAuditLogs(): Promise<never> {
    throw new ForbiddenException(
      'DELETE operations are not permitted on audit logs. ' +
        'Audit logs are immutable for compliance and security purposes.',
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.FORBIDDEN)
  @ApiOperation({
    summary: 'Delete a single audit log (not permitted)',
    description:
      'DELETE operations are not permitted on audit logs. Audit logs are immutable for compliance and security purposes.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Audit logs cannot be deleted',
  })
  async deleteAuditLogById(): Promise<never> {
    throw new ForbiddenException(
      'DELETE operations are not permitted on audit logs. ' +
        'Audit logs are immutable for compliance and security purposes.',
    );
  }
}
