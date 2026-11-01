// Flux Shield - Platform audit log aggregation for admin console
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminActivityService } from './admin-activity.service';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import {
  AdminPlatformAuditEntryDto,
  AdminPlatformAuditQueryDto,
  AdminPlatformAuditResponseDto,
} from './dto/admin-platform-audit.dto';
import { AdminActivityQueryDto } from './dto/admin-activity.dto';

@Injectable()
export class AdminPlatformAuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly adminActivityService: AdminActivityService,
  ) {}

  async queryLogs(
    query: AdminPlatformAuditQueryDto,
  ): Promise<AdminPlatformAuditResponseDto> {
    const source = query.source ?? 'all';
    const limit = query.limit ?? 50;
    const offset = query.cursor ? parseInt(query.cursor, 10) : 0;

    const entries: AdminPlatformAuditEntryDto[] = [];

    if (source === 'admin' || source === 'all') {
      const adminQuery: AdminActivityQueryDto = {
        limit: source === 'all' ? limit + offset : limit,
        cursor: source === 'all' ? '0' : query.cursor,
        action: query.action as AdminActivityQueryDto['action'],
        startDate: query.startDate,
        endDate: query.endDate,
        adminId: query.actorId,
      };
      const adminResult = await this.adminActivityService.query(adminQuery);
      entries.push(
        ...adminResult.data.map((row) => ({
          id: row.id,
          source: 'admin' as const,
          action: row.action,
          tenantId:
            (row.metadata?.tenantId as string | undefined) ?? null,
          tenantName:
            (row.metadata?.tenantName as string | undefined) ?? null,
          actorId: row.adminId,
          actorEmail: row.adminEmail,
          actorName: row.adminName,
          resourceType: null,
          resourceId: row.targetAdminId,
          metadata: row.metadata,
          ipAddress: row.ipAddress,
          createdAt: row.createdAt,
        })),
      );
    }

    if (source === 'tenant' || source === 'all') {
      const qb = this.auditLogRepository
        .createQueryBuilder('log')
        .leftJoinAndSelect('log.user', 'user')
        .leftJoin(Tenant, 'tenant', 'tenant.id = log.tenantId')
        .addSelect(['tenant.id', 'tenant.name'])
        .orderBy('log.createdAt', 'DESC');

      if (query.tenantId) {
        qb.andWhere('log.tenantId = :tenantId', {
          tenantId: query.tenantId,
        });
      }
      if (query.actorId) {
        qb.andWhere('log.userId = :userId', { userId: query.actorId });
      }
      if (query.action) {
        qb.andWhere('log.action = :action', { action: query.action });
      }
      if (query.startDate && query.endDate) {
        qb.andWhere('log.createdAt BETWEEN :start AND :end', {
          start: new Date(query.startDate),
          end: new Date(query.endDate),
        });
      } else if (query.startDate) {
        qb.andWhere('log.createdAt >= :start', {
          start: new Date(query.startDate),
        });
      } else if (query.endDate) {
        qb.andWhere('log.createdAt <= :end', {
          end: new Date(query.endDate),
        });
      }

      const fetchLimit = source === 'all' ? limit + offset + 50 : limit + 1;
      qb.skip(source === 'all' ? 0 : offset).take(fetchLimit);

      const { entities, raw } = await qb.getRawAndEntities();
      entities.forEach((log, index) => {
        const rawRow = raw[index] as Record<string, unknown>;
        entries.push({
          id: log.id,
          source: 'tenant',
          action: log.action,
          tenantId: log.tenantId,
          tenantName: (rawRow['tenant_name'] as string) ?? null,
          actorId: log.userId,
          actorEmail: log.user?.email ?? null,
          actorName: log.user?.name ?? null,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          metadata: log.metadata,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt.toISOString(),
        });
      });
    }

    entries.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total = entries.length;
    const page = entries.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      data: page,
      pagination: {
        cursor: hasMore ? String(offset + limit) : null,
        hasMore,
        total,
      },
    };
  }
}
