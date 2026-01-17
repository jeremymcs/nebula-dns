// Nebula DNS - Audit Logs Service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
  DataSource,
} from 'typeorm';
import { createHash } from 'crypto';
import {
  AuditLog,
  AuditAction,
  AuditResourceType,
} from './entities/audit-log.entity';
import {
  QueryAuditLogsDto,
  AuditLogResponseDto,
  CreateAuditLogDto,
} from './dto/audit-log.dto';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private dataSource: DataSource,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    // Use a transaction to ensure atomic read-then-write for hash chain
    return await this.dataSource.transaction(async (manager) => {
      // Get the hash of the previous record (most recent by created_at)
      const previousLog = await manager.findOne(AuditLog, {
        where: { tenantId: dto.tenantId },
        order: { createdAt: 'DESC' },
        select: ['recordHash'],
      });

      const previousHash = previousLog?.recordHash || null;
      const timestamp = new Date();

      // Calculate hash of new record
      const recordHash = this.calculateRecordHash(
        previousHash,
        dto.action,
        dto.resourceType,
        dto.resourceId || '',
        timestamp.toISOString(),
        dto.userId || '',
      );

      const auditLog = manager.create(AuditLog, {
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
        previousHash,
        recordHash,
        createdAt: timestamp,
      });

      const saved = await manager.save(AuditLog, auditLog);
      this.logger.debug(
        `Audit log: ${dto.action} on ${dto.resourceType}${dto.resourceId ? ` (${dto.resourceId})` : ''} [hash: ${recordHash.substring(0, 8)}...]`,
      );
      return saved;
    });
  }

  /**
   * Calculate SHA256 hash of record data for hash chain integrity
   */
  calculateRecordHash(
    previousHash: string | null,
    action: string,
    resourceType: string,
    resourceId: string,
    timestamp: string,
    userId: string,
  ): string {
    const data = `${previousHash || ''}|${action}|${resourceType}|${resourceId}|${timestamp}|${userId}`;
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify the integrity of a single audit log record
   */
  verifyRecordHash(log: AuditLog, previousHash: string | null): boolean {
    const expectedHash = this.calculateRecordHash(
      previousHash,
      log.action,
      log.resourceType,
      log.resourceId || '',
      log.createdAt.toISOString(),
      log.userId || '',
    );
    return log.recordHash === expectedHash;
  }

  /**
   * Verify the entire hash chain for a tenant within an optional date range
   */
  async verifyIntegrity(
    tenantId: string,
    startId?: string,
    endId?: string,
  ): Promise<{
    valid: boolean;
    totalRecords: number;
    verifiedRecords: number;
    brokenAt?: { id: string; expectedHash: string; actualHash: string };
    firstRecordId?: string;
    lastRecordId?: string;
  }> {
    // Build query to get records in order
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId })
      .orderBy('log.createdAt', 'ASC');

    if (startId) {
      const startLog = await this.auditLogRepository.findOne({
        where: { id: startId, tenantId },
      });
      if (startLog) {
        queryBuilder.andWhere('log.createdAt >= :startTime', {
          startTime: startLog.createdAt,
        });
      }
    }

    if (endId) {
      const endLog = await this.auditLogRepository.findOne({
        where: { id: endId, tenantId },
      });
      if (endLog) {
        queryBuilder.andWhere('log.createdAt <= :endTime', {
          endTime: endLog.createdAt,
        });
      }
    }

    const logs = await queryBuilder.getMany();

    if (logs.length === 0) {
      return {
        valid: true,
        totalRecords: 0,
        verifiedRecords: 0,
      };
    }

    let verifiedRecords = 0;
    let previousHash: string | null = null;

    // For the first record in range, get the actual previous hash if not starting from beginning
    if (startId) {
      const firstLog = logs[0];
      previousHash = firstLog.previousHash;
    }

    for (const log of logs) {
      // Verify the chain link
      if (log.previousHash !== previousHash) {
        this.logger.error(
          `Hash chain broken at record ${log.id}: expected previousHash ${previousHash}, got ${log.previousHash}`,
        );
        return {
          valid: false,
          totalRecords: logs.length,
          verifiedRecords,
          brokenAt: {
            id: log.id,
            expectedHash: previousHash || '(genesis)',
            actualHash: log.previousHash || '(null)',
          },
          firstRecordId: logs[0].id,
          lastRecordId: logs[logs.length - 1].id,
        };
      }

      // Verify the record hash
      const expectedRecordHash = this.calculateRecordHash(
        log.previousHash,
        log.action,
        log.resourceType,
        log.resourceId || '',
        log.createdAt.toISOString(),
        log.userId || '',
      );

      if (log.recordHash !== expectedRecordHash) {
        this.logger.error(
          `Record hash mismatch at ${log.id}: expected ${expectedRecordHash}, got ${log.recordHash}`,
        );
        return {
          valid: false,
          totalRecords: logs.length,
          verifiedRecords,
          brokenAt: {
            id: log.id,
            expectedHash: expectedRecordHash,
            actualHash: log.recordHash,
          },
          firstRecordId: logs[0].id,
          lastRecordId: logs[logs.length - 1].id,
        };
      }

      previousHash = log.recordHash;
      verifiedRecords++;
    }

    return {
      valid: true,
      totalRecords: logs.length,
      verifiedRecords,
      firstRecordId: logs[0].id,
      lastRecordId: logs[logs.length - 1].id,
    };
  }

  async findAll(
    tenantId: string,
    query: QueryAuditLogsDto,
  ): Promise<{
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
      where.createdAt = Between(
        new Date(query.startTime),
        new Date(query.endTime),
      );
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
    const data = logs.slice(0, limit).map((log) => this.toResponse(log));

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

    return logs.map((log) => this.toResponse(log));
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
        data: JSON.stringify(
          logs.map((log) => this.toResponse(log)),
          null,
          2,
        ),
        contentType: 'application/json',
        filename: `audit-logs-${timestamp}.json`,
      };
    }

    // CSV format
    const headers = [
      'Timestamp',
      'User',
      'Email',
      'Action',
      'Resource Type',
      'Resource ID',
      'Resource Name',
      'IP Address',
    ];
    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.user?.name || 'System',
      log.user?.email || '',
      log.action,
      log.resourceType,
      log.resourceId || '',
      log.resourceName || '',
      log.ipAddress || '',
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');

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
      previousHash: log.previousHash,
      recordHash: log.recordHash,
      createdAt: log.createdAt,
    };
  }
}
