// Nebula DNS - Admin Activity Service
// Centralized activity logging for all admin management actions
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AdminActivityLog,
  AdminActivityAction,
} from './entities/admin-activity-log.entity';
import { Admin } from './entities/admin.entity';
import {
  AdminActivityQueryDto,
  AdminActivityResponseDto,
  AdminActivityItemDto,
} from './dto/admin-activity.dto';

/**
 * AdminActivityService
 *
 * Provides centralized activity logging for all admin management actions.
 * This service is used by other admin services to create audit trails of:
 * - Authentication events (login, logout, failed attempts)
 * - User management (invited, created, suspended, reactivated, deleted)
 * - Security events (role changes, MFA resets, password changes)
 * - Invitation management (invite revocation)
 *
 * All activity logs are immutable append-only records that capture:
 * - Who performed the action (adminId)
 * - What action was performed (action)
 * - Who was affected (targetAdminId, optional)
 * - Additional context (metadata, JSON)
 * - Where it came from (ipAddress)
 * - When it occurred (createdAt)
 *
 * The service provides:
 * - log(): Create activity log entries
 * - query(): Paginated query with filtering by admin, target, action, date range
 * - getActivityForAdmin(): Quick lookup for admin detail views
 */
@Injectable()
export class AdminActivityService {
  private readonly logger = new Logger(AdminActivityService.name);

  constructor(
    @InjectRepository(AdminActivityLog)
    private readonly activityRepository: Repository<AdminActivityLog>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  /**
   * Log an admin activity
   *
   * Called by other services when admin actions occur.
   * Creates an immutable audit log entry.
   *
   * @param params - Activity log parameters
   * @param params.adminId - Who performed the action (actor)
   * @param params.action - What type of action was performed
   * @param params.targetAdminId - Who was affected (optional)
   * @param params.metadata - Additional context (optional)
   * @param params.ipAddress - Source IP address (optional)
   * @returns Created activity log entry
   */
  async log(params: {
    adminId: string;
    action: AdminActivityAction;
    targetAdminId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
  }): Promise<AdminActivityLog> {
    try {
      const activityLog = this.activityRepository.create({
        adminId: params.adminId,
        action: params.action,
        targetAdminId: params.targetAdminId || null,
        metadata: params.metadata || null,
        ipAddress: params.ipAddress || null,
      });

      const saved = await this.activityRepository.save(activityLog);

      this.logger.debug(
        `Activity logged: ${params.action} by admin ${params.adminId}${params.targetAdminId ? ` on ${params.targetAdminId}` : ''}`,
      );

      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to log activity: ${params.action} by admin ${params.adminId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Query activity logs with pagination and filters
   *
   * Used by the GET /admin/activity endpoint to provide filtered,
   * paginated activity logs with admin details joined.
   *
   * @param params - Query parameters with optional filters
   * @returns Paginated activity logs with admin email/name joined
   */
  async query(
    params: AdminActivityQueryDto,
  ): Promise<AdminActivityResponseDto> {
    const limit = params.limit || 50;
    const offset = params.cursor ? parseInt(params.cursor, 10) : 0;

    // Build query with joins to get admin details for both actor and target
    const queryBuilder = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.admin', 'admin')
      .leftJoin('activity.targetAdmin', 'targetAdmin')
      .addSelect(['targetAdmin.id', 'targetAdmin.email', 'targetAdmin.name'])
      .orderBy('activity.createdAt', 'DESC');

    // Apply optional filters
    if (params.adminId) {
      queryBuilder.andWhere('activity.adminId = :adminId', {
        adminId: params.adminId,
      });
    }

    if (params.targetAdminId) {
      queryBuilder.andWhere('activity.targetAdminId = :targetAdminId', {
        targetAdminId: params.targetAdminId,
      });
    }

    if (params.action) {
      queryBuilder.andWhere('activity.action = :action', {
        action: params.action,
      });
    }

    if (params.startDate && params.endDate) {
      queryBuilder.andWhere(
        'activity.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate: new Date(params.startDate),
          endDate: new Date(params.endDate),
        },
      );
    } else if (params.startDate) {
      queryBuilder.andWhere('activity.createdAt >= :startDate', {
        startDate: new Date(params.startDate),
      });
    } else if (params.endDate) {
      queryBuilder.andWhere('activity.createdAt <= :endDate', {
        endDate: new Date(params.endDate),
      });
    }

    // Get total count for pagination metadata
    const total = await queryBuilder.getCount();

    // Apply pagination (cursor-based using offset)
    queryBuilder.skip(offset).take(limit + 1);

    const activities = await queryBuilder.getMany();

    // Check if there are more results
    const hasMore = activities.length > limit;
    const data = activities
      .slice(0, limit)
      .map((activity) => this.toActivityItemDto(activity));

    return {
      data,
      pagination: {
        cursor: hasMore ? String(offset + limit) : null,
        hasMore,
        total,
      },
    };
  }

  /**
   * Get activity for a specific admin (as actor or target)
   *
   * Used for admin detail views to show recent activity involving
   * a specific admin (either as the one performing actions or being
   * affected by actions).
   *
   * @param adminId - Admin ID to filter by
   * @param limit - Maximum number of results (default: 20)
   * @returns Array of activity log items
   */
  async getActivityForAdmin(
    adminId: string,
    limit: number = 20,
  ): Promise<AdminActivityItemDto[]> {
    const activities = await this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.admin', 'admin')
      .leftJoin('activity.targetAdmin', 'targetAdmin')
      .addSelect(['targetAdmin.id', 'targetAdmin.email', 'targetAdmin.name'])
      .where(
        'activity.adminId = :adminId OR activity.targetAdminId = :adminId',
        {
          adminId,
        },
      )
      .orderBy('activity.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return activities.map((activity) => this.toActivityItemDto(activity));
  }

  /**
   * Transform AdminActivityLog entity to AdminActivityItemDto
   *
   * Maps database entity to response DTO with admin details.
   * Handles null targetAdmin gracefully (LEFT JOIN results).
   *
   * @param activity - Activity log entity with admin relations loaded
   * @returns Activity item DTO
   */
  private toActivityItemDto(activity: AdminActivityLog): AdminActivityItemDto {
    return {
      id: activity.id,
      adminId: activity.adminId,
      adminEmail: activity.admin?.email || 'unknown',
      adminName: activity.admin?.name || 'Unknown Admin',
      action: activity.action,
      targetAdminId: activity.targetAdminId,
      targetAdminEmail: activity.targetAdmin?.email || null,
      metadata: activity.metadata,
      ipAddress: activity.ipAddress,
      createdAt: activity.createdAt.toISOString(),
    };
  }
}
