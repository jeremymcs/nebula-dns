// Nebula DNS - Admin User Management Service
// Core service for admin user listing, profile viewing, suspend/reactivate, and MFA reset
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Admin } from './entities/admin.entity';
import { AdminMfa } from './entities/admin-mfa.entity';
import { AdminRole } from './enums/admin-role.enum';
import { AdminSessionService } from './admin-session.service';
import { AdminActivityService } from './admin-activity.service';
import { EmailService } from '../email/email.service';
import { resolveAdminUrl } from '../../common/public-urls';
import {
  ListAdminsQueryDto,
  ListAdminsResponseDto,
  AdminListItemDto,
  AdminDetailDto,
  SuspendAdminDto,
} from './dto/admin-user.dto';

/**
 * AdminUsersService
 *
 * Provides core admin user management functionality:
 * - USER-01: List all admins with pagination and filters (role, status)
 * - USER-05: View admin profile details
 * - USER-06: Suspend admin accounts (blocks login, invalidates sessions)
 * - USER-07: Reactivate suspended admins
 * - USER-08: Reset another admin's MFA (force re-setup)
 * - USER-09: Send notification email on MFA reset
 *
 * All management actions are logged to AdminActivityService for audit trail.
 *
 * Business Rules:
 * - Cannot suspend yourself
 * - Cannot suspend another super_admin (must demote first)
 * - Cannot reset your own MFA through this service
 * - Reactivated admins go to pending_mfa if MFA not complete, else active
 * - MFA reset invalidates all sessions and requires re-setup on next login
 */
@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(AdminMfa)
    private readonly adminMfaRepository: Repository<AdminMfa>,
    private readonly adminSessionService: AdminSessionService,
    private readonly activityService: AdminActivityService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * List all admins with pagination and optional filters
   * USER-01: Super Admin can view list of all admin users with roles
   *
   * Supports filtering by role and status, with cursor-based pagination.
   * Returns admin list items with key fields for display in admin UI.
   *
   * @param query - Query parameters with optional role/status filters
   * @returns Paginated list of admin users
   */
  async listAdmins(query: ListAdminsQueryDto): Promise<ListAdminsResponseDto> {
    const limit = query.limit ?? 20;
    const offset = query.cursor ? parseInt(query.cursor, 10) : 0;

    const queryBuilder = this.adminRepository
      .createQueryBuilder('admin')
      .select([
        'admin.id',
        'admin.email',
        'admin.name',
        'admin.role',
        'admin.status',
        'admin.mfaSetupComplete',
        'admin.lastLoginAt',
        'admin.createdAt',
      ]);

    // Apply role filter
    if (query.role) {
      queryBuilder.andWhere('admin.role = :role', { role: query.role });
    }

    // Apply status filter
    if (query.status) {
      queryBuilder.andWhere('admin.status = :status', { status: query.status });
    }

    const total = await queryBuilder.getCount();

    const admins = await queryBuilder
      .orderBy('admin.name', 'ASC')
      .skip(offset)
      .take(limit + 1)
      .getMany();

    const hasMore = admins.length > limit;
    const data = admins.slice(0, limit).map((admin) => this.toListItem(admin));

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
   * Get admin profile by ID
   * USER-05: Super Admin can view admin profile details
   *
   * Returns full admin details including invitation information.
   * Used for admin detail views in the UI.
   *
   * @param adminId - Admin ID to retrieve
   * @returns Full admin profile
   * @throws NotFoundException if admin not found
   */
  async getAdminById(adminId: string): Promise<AdminDetailDto> {
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
      relations: ['invitedByAdmin'],
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return {
      ...this.toListItem(admin),
      invitedByAdminId: admin.invitedByAdminId,
      invitedByAdminEmail: admin.invitedByAdmin?.email || null,
    };
  }

  /**
   * Suspend an admin account
   * USER-06: Super Admin can suspend admin (blocks login)
   *
   * Suspending an admin:
   * 1. Sets status to 'suspended'
   * 2. Invalidates all active sessions (blocks immediate access)
   * 3. Logs the action with optional reason
   * 4. Blocks future login attempts until reactivated
   *
   * Business Rules:
   * - Cannot suspend yourself (security)
   * - Cannot suspend another super_admin (must demote first)
   * - Cannot suspend already suspended admin
   *
   * @param requesterId - Admin performing the suspension
   * @param targetId - Admin to suspend
   * @param dto - Optional reason for suspension
   * @param ipAddress - Source IP for audit log
   * @throws ForbiddenException if attempting to suspend self or another super_admin
   * @throws NotFoundException if target admin not found
   * @throws BadRequestException if admin already suspended
   */
  async suspendAdmin(
    requesterId: string,
    targetId: string,
    dto?: SuspendAdminDto,
    ipAddress?: string,
  ): Promise<void> {
    // 1. Cannot suspend yourself
    if (requesterId === targetId) {
      throw new ForbiddenException('Cannot suspend yourself');
    }

    // 2. Find target admin
    const target = await this.adminRepository.findOne({
      where: { id: targetId },
    });
    if (!target) {
      throw new NotFoundException('Admin not found');
    }

    // 3. Cannot suspend another super_admin (must demote first)
    if (target.role === AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Cannot suspend a super_admin. Demote them first.',
      );
    }

    // 4. Check if already suspended
    if (target.status === 'suspended') {
      throw new BadRequestException('Admin is already suspended');
    }

    // 5. Update status
    await this.adminRepository.update(targetId, { status: 'suspended' });

    // 6. Invalidate all sessions
    await this.adminSessionService.revokeAllSessions(targetId);

    // 7. Log activity
    await this.activityService.log({
      adminId: requesterId,
      action: 'admin_suspended',
      targetAdminId: targetId,
      metadata: dto?.reason ? { reason: dto.reason } : undefined,
      ipAddress,
    });

    this.logger.log(`Admin ${targetId} suspended by ${requesterId}`);
  }

  /**
   * Reactivate a suspended admin account
   * USER-07: Super Admin can reactivate suspended admin
   *
   * Reactivating an admin:
   * 1. Sets status back to 'active' or 'pending_mfa' based on MFA setup state
   * 2. Logs the reactivation action
   * 3. Allows admin to login again
   *
   * The new status depends on mfaSetupComplete:
   * - If MFA complete → status = 'active' (can login immediately)
   * - If MFA not complete → status = 'pending_mfa' (must setup MFA on login)
   *
   * @param requesterId - Admin performing the reactivation
   * @param targetId - Admin to reactivate
   * @param ipAddress - Source IP for audit log
   * @throws NotFoundException if admin not found
   * @throws BadRequestException if admin not suspended
   */
  async reactivateAdmin(
    requesterId: string,
    targetId: string,
    ipAddress?: string,
  ): Promise<void> {
    const target = await this.adminRepository.findOne({
      where: { id: targetId },
    });
    if (!target) {
      throw new NotFoundException('Admin not found');
    }

    if (target.status !== 'suspended') {
      throw new BadRequestException('Admin is not suspended');
    }

    // Reactivate - set to pending_mfa if MFA not complete, otherwise active
    const newStatus = target.mfaSetupComplete ? 'active' : 'pending_mfa';
    await this.adminRepository.update(targetId, { status: newStatus });

    await this.activityService.log({
      adminId: requesterId,
      action: 'admin_reactivated',
      targetAdminId: targetId,
      ipAddress,
    });

    this.logger.log(`Admin ${targetId} reactivated by ${requesterId}`);
  }

  /**
   * Reset another admin's MFA
   * USER-08: Super Admin can reset another admin's MFA
   * USER-09: MFA reset sends notification email to target admin
   *
   * MFA reset process:
   * 1. Deletes existing MFA record (TOTP secret, backup codes)
   * 2. Sets mfaSetupComplete = false and status = 'pending_mfa'
   * 3. Invalidates all active sessions (forces re-login)
   * 4. Logs the action with session revocation count
   * 5. Sends email notification to affected admin
   *
   * This is a security action typically used when:
   * - Admin loses access to their MFA device
   * - Admin reports MFA device compromise
   * - Admin locked out due to failed MFA attempts
   *
   * Business Rules:
   * - Cannot reset your own MFA through this method (must use self-service)
   * - Email failure does NOT block the operation (logged as warning)
   *
   * @param requesterId - Admin performing the MFA reset
   * @param targetId - Admin whose MFA to reset
   * @param ipAddress - Source IP for audit log
   * @throws ForbiddenException if attempting to reset own MFA
   * @throws NotFoundException if target admin not found
   */
  async resetAdminMfa(
    requesterId: string,
    targetId: string,
    ipAddress?: string,
  ): Promise<void> {
    // 1. Cannot reset own MFA through this method
    // (Must have working MFA to be logged in as super_admin)
    if (requesterId === targetId) {
      throw new ForbiddenException(
        'Cannot reset your own MFA through this endpoint',
      );
    }

    // 2. Find target admin
    const target = await this.adminRepository.findOne({
      where: { id: targetId },
    });
    if (!target) {
      throw new NotFoundException('Admin not found');
    }

    // 3. Delete existing MFA record
    await this.adminMfaRepository.delete({ adminId: targetId });

    // 4. Update admin status to require MFA setup
    await this.adminRepository.update(targetId, {
      mfaSetupComplete: false,
      status: 'pending_mfa',
    });

    // 5. Invalidate all sessions (force re-login)
    const revokedCount =
      await this.adminSessionService.revokeAllSessions(targetId);

    // 6. Log activity
    await this.activityService.log({
      adminId: requesterId,
      action: 'admin_mfa_reset',
      targetAdminId: targetId,
      metadata: { sessionsRevoked: revokedCount },
      ipAddress,
    });

    // 7. Send notification email to target admin
    const requester = await this.adminRepository.findOne({
      where: { id: requesterId },
    });
    const adminUrl = resolveAdminUrl(this.configService);

    try {
      await this.emailService.sendMfaResetNotification({
        to: target.email,
        name: target.name,
        resetByEmail: requester?.email || 'Unknown',
        loginUrl: `${adminUrl}/login`,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send MFA reset notification to ${target.email}: ${(error as Error).message}`,
      );
      // Don't fail the operation if email fails
    }

    this.logger.log(
      `Admin ${targetId} MFA reset by ${requesterId}, ${revokedCount} sessions revoked`,
    );
  }

  /**
   * Transform Admin entity to AdminListItemDto
   *
   * Converts database entity to DTO for API responses.
   * Used by both listAdmins and getAdminById.
   *
   * @param admin - Admin entity
   * @returns Admin list item DTO
   */
  private toListItem(admin: Admin): AdminListItemDto {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      status: admin.status,
      mfaSetupComplete: admin.mfaSetupComplete,
      lastLoginAt: admin.lastLoginAt?.toISOString() || null,
      createdAt: admin.createdAt.toISOString(),
    };
  }
}
