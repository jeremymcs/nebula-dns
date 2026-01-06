import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AuditLog, AuditAction, AuditResourceType } from './entities/audit-log.entity';
import { QueryAuditLogsDto, AuditLogResponseDto, CreateAuditLogDto } from './dto/audit-log.dto';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      tenantId: dto.tenantId,
      userId: dto.userId || null,
      action: dto.action,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId || null,
      resourceName: dto.resourceName || null,
      oldValue: dto.oldValue || null,
      newValue: dto.newValue || null,
      ipAddress: dto.ipAddress || null,
      userAgent: dto.userAgent || null,
      metadata: dto.metadata || null,
    });

    const saved = await this.auditLogRepository.save(auditLog);
    this.logger.debug(`Audit log: ${dto.action} on ${dto.resourceType}${dto.resourceId ? ` (${dto.resourceId})` : ''}`);
    return saved;
  }

  async findAll(tenantId: string, query: QueryAuditLogsDto): Promise<{
    data: AuditLogResponseDto[];
    cursor: string | null;
    hasMore: boolean;
  }> {
    const limit = query.limit || 50;
    const offset = query.cursor ? parseInt(query.cursor, 10) : 0;

    const where: any = { tenantId };

    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action;
    if (query.resourceType) where.resourceType = query.resourceType;
    if (query.resourceId) where.resourceId = query.resourceId;

    if (query.startTime && query.endTime) {
      where.createdAt = Between(new Date(query.startTime), new Date(query.endTime));
    } else if (query.startTime) {
      where.createdAt = MoreThanOrEqual(new Date(query.startTime));
    } else if (query.endTime) {
      where.createdAt = LessThanOrEqual(new Date(query.endTime));
    }

    const [logs, total] = await this.auditLogRepository.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit + 1,
      skip: offset,
    });

    const hasMore = logs.length > limit;
    const data = logs.slice(0, limit).map(log => this.toResponse(log));

    return {
      data,
      cursor: hasMore ? String(offset + limit) : null,
      hasMore,
    };
  }

  async findByResource(
    tenantId: string,
    resourceType: AuditResourceType,
    resourceId: string,
    limit = 20,
  ): Promise<AuditLogResponseDto[]> {
    const logs = await this.auditLogRepository.find({
      where: { tenantId, resourceType, resourceId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return logs.map(log => this.toResponse(log));
  }

  async export(
    tenantId: string,
    format: 'csv' | 'json',
    startTime?: Date,
    endTime?: Date,
    resourceType?: AuditResourceType,
  ): Promise<{ data: string; contentType: string; filename: string }> {
    const where: any = { tenantId };

    if (startTime && endTime) {
      where.createdAt = Between(startTime, endTime);
    } else if (startTime) {
      where.createdAt = MoreThanOrEqual(startTime);
    } else if (endTime) {
      where.createdAt = LessThanOrEqual(endTime);
    }

    if (resourceType) where.resourceType = resourceType;

    const logs = await this.auditLogRepository.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 10000, // Max export limit
    });

    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      return {
        data: JSON.stringify(logs.map(log => this.toResponse(log)), null, 2),
        contentType: 'application/json',
        filename: `audit-logs-${timestamp}.json`,
      };
    }

    // CSV format
    const headers = ['Timestamp', 'User', 'Email', 'Action', 'Resource Type', 'Resource ID', 'Resource Name', 'IP Address'];
    const rows = logs.map(log => [
      log.createdAt.toISOString(),
      log.user?.name || 'System',
      log.user?.email || '',
      log.action,
      log.resourceType,
      log.resourceId || '',
      log.resourceName || '',
      log.ipAddress || '',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    return {
      data: csv,
      contentType: 'text/csv',
      filename: `audit-logs-${timestamp}.csv`,
    };
  }

  private toResponse(log: AuditLog): AuditLogResponseDto {
    return {
      id: log.id,
      userId: log.userId,
      userName: log.user?.name,
      userEmail: log.user?.email,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      resourceName: log.resourceName,
      oldValue: log.oldValue,
      newValue: log.newValue,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata,
      createdAt: log.createdAt,
    };
  }
}
