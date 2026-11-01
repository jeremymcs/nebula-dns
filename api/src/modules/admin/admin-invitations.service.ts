// Nebula DNS - Admin Invitations Service
// Manages admin invitation workflow with secure token-based acceptance
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

import { AdminInvitation } from './entities/admin-invitation.entity';
import { Admin } from './entities/admin.entity';
import { AdminActivityService } from './admin-activity.service';
import { EmailService } from '../email/email.service';
import {
  CreateAdminInvitationDto,
  AcceptAdminInvitationDto,
  AdminInvitationResponseDto,
  CreateAdminInvitationResponseDto,
  ListInvitationsQueryDto,
  ListInvitationsResponseDto,
} from './dto/admin-invitation.dto';

/**
 * AdminInvitationsService
 *
 * Provides admin invitation management functionality:
 * - Creating invitations with secure token generation (USER-02, USER-03)
 * - Accepting invitations and creating admin accounts (USER-04)
 * - Listing invitations with expiry status (USER-11)
 * - Revoking pending invitations (USER-12)
 *
 * Security features:
 * - Token hashing: Only SHA256 hashes stored in database (not plaintext tokens)
 * - Time-limited: 7-day expiry on all invitations
 * - Status tracking: pending -> accepted/expired/revoked
 * - Activity logging: All operations logged for audit trail
 *
 * Workflow:
 * 1. Super Admin creates invitation -> email sent with token
 * 2. Invitee clicks link -> accepts invitation with password
 * 3. Admin account created with pending_mfa status
 * 4. Invitation marked as accepted
 */
@Injectable()
export class AdminInvitationsService {
  private readonly logger = new Logger(AdminInvitationsService.name);

  constructor(
    @InjectRepository(AdminInvitation)
    private readonly invitationRepository: Repository<AdminInvitation>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly dataSource: DataSource,
    private readonly activityService: AdminActivityService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate cryptographically secure invite token
   * USER-03: Invite tokens are hashed, expire after 7 days
   *
   * Returns both the raw token (for email link) and SHA256 hash (for database storage).
   * The raw token is never stored - only the hash is persisted.
   *
   * @returns Object with token (64 hex chars) and hash (64 hex chars SHA256)
   */
  private generateInviteToken(): { token: string; hash: string } {
    // Generate 32 random bytes = 64 hex characters
    const token = crypto.randomBytes(32).toString('hex');
    // Store only the SHA256 hash in database
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  /**
   * Create and send admin invitation
   * USER-02: Super Admin can invite new admin via email with role assignment
   * USER-03: Invite tokens are hashed, expire after 7 days
   *
   * Workflow:
   * 1. Validate email is not already an admin
   * 2. Check for existing pending invitation
   * 3. Generate secure token and hash
   * 4. Create invitation with 7-day expiry
   * 5. Log activity
   * 6. Send email with invitation link
   *
   * @param invitedByAdminId - ID of admin creating the invitation
   * @param dto - Invitation details (email, role)
   * @param ipAddress - IP address of requester (for activity log)
   * @returns Created invitation details and email status
   */
  async createInvitation(
    invitedByAdminId: string,
    dto: CreateAdminInvitationDto,
    ipAddress?: string,
  ): Promise<CreateAdminInvitationResponseDto> {
    const normalizedEmail = dto.email.toLowerCase();

    // 1. Check if email already exists as admin
    const existingAdmin = await this.adminRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (existingAdmin) {
      throw new ConflictException('An admin with this email already exists');
    }

    // 2. Check for existing pending invitation
    const existingInvite = await this.invitationRepository.findOne({
      where: { email: normalizedEmail, status: 'pending' },
    });
    if (existingInvite) {
      throw new ConflictException(
        'An invitation has already been sent to this email',
      );
    }

    // 3. Generate token and hash
    const { token, hash } = this.generateInviteToken();

    // 4. Set 7-day expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 5. Create invitation
    const invitation = this.invitationRepository.create({
      invitedByAdminId,
      email: normalizedEmail,
      role: dto.role,
      tokenHash: hash,
      expiresAt,
      status: 'pending',
    });
    const saved = await this.invitationRepository.save(invitation);

    // 6. Log activity
    await this.activityService.log({
      adminId: invitedByAdminId,
      action: 'admin_invited',
      metadata: {
        email: normalizedEmail,
        role: dto.role,
        invitationId: saved.id,
      },
      ipAddress,
    });

    // 7. Send invitation email
    const inviter = await this.adminRepository.findOne({
      where: { id: invitedByAdminId },
    });
    const adminUrl = this.configService.get<string>(
      'ADMIN_URL',
      'https://admin.nebuladns.com',
    );
    const inviteUrl = `${adminUrl}/invite/accept?token=${token}`;

    let emailSent = false;
    try {
      emailSent = await this.emailService.sendAdminInviteEmail({
        to: normalizedEmail,
        inviterName: inviter?.name || 'Nebula DNS Admin',
        inviterEmail: inviter?.email || '',
        role: dto.role,
        inviteUrl,
        expiresAt,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send invitation email: ${(error as Error).message}`,
      );
    }

    return {
      invitation: this.toResponseDto(saved, inviter?.email || ''),
      emailSent,
      ...(emailSent ? {} : { inviteUrl }),
    };
  }

  /**
   * Accept an invitation and create admin account
   * USER-04: Invited admin can accept and set password/MFA
   *
   * Workflow:
   * 1. Hash provided token to find invitation
   * 2. Validate invitation status and expiry
   * 3. Create admin account with password (transaction)
   * 4. Mark invitation as accepted (transaction)
   * 5. Log activity (async, non-blocking)
   *
   * Transaction ensures atomicity - both admin creation and invitation
   * status update must succeed together.
   *
   * @param dto - Acceptance details (token, name, password)
   * @returns Created admin entity
   */
  async acceptInvitation(dto: AcceptAdminInvitationDto): Promise<Admin> {
    // 1. Hash the provided token to find invitation
    const hash = crypto.createHash('sha256').update(dto.token).digest('hex');

    // 2. Find invitation by hash
    const invitation = await this.invitationRepository.findOne({
      where: { tokenHash: hash },
      relations: ['invitedBy'],
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid');
    }

    // 3. Check status
    if (invitation.status !== 'pending') {
      throw new BadRequestException(
        'This invitation has already been used or revoked',
      );
    }

    // 4. Check expiry
    if (new Date() > invitation.expiresAt) {
      // Mark as expired
      invitation.status = 'expired';
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('This invitation has expired');
    }

    // 5. Create admin account (transaction)
    return await this.dataSource.transaction(async (manager) => {
      const passwordHash = await bcrypt.hash(dto.password, 12);

      const admin = manager.create(Admin, {
        email: invitation.email,
        name: dto.name,
        passwordHash,
        role: invitation.role,
        status: 'pending_mfa', // Must set up MFA
        mfaSetupComplete: false,
        invitedByAdminId: invitation.invitedByAdminId,
      });
      const savedAdmin = await manager.save(admin);

      // Mark invitation as accepted
      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();
      await manager.save(invitation);

      // Log activity (outside transaction since activity log is separate concern)
      // Using setImmediate to not block the transaction
      setImmediate(async () => {
        try {
          await this.activityService.log({
            adminId: savedAdmin.id,
            action: 'admin_created',
            metadata: {
              invitedBy: invitation.invitedByAdminId,
              invitedByEmail: invitation.invitedBy?.email,
              role: invitation.role,
            },
          });
        } catch (error) {
          this.logger.warn(
            `Failed to log admin creation: ${(error as Error).message}`,
          );
        }
      });

      this.logger.log(
        `Admin ${savedAdmin.email} created from invitation ${invitation.id}`,
      );
      return savedAdmin;
    });
  }

  /**
   * List invitations with pagination and filters
   * USER-11: Super Admin can view pending invites with expiry status
   *
   * Supports:
   * - Cursor-based pagination
   * - Status filtering (pending, accepted, expired, revoked)
   * - Ordered by creation date (most recent first)
   * - Includes inviter email for context
   *
   * @param query - Query parameters (limit, cursor, status filter)
   * @returns Paginated invitation list with metadata
   */
  async listInvitations(
    query: ListInvitationsQueryDto,
  ): Promise<ListInvitationsResponseDto> {
    const limit = query.limit ?? 20;
    const offset = query.cursor ? parseInt(query.cursor, 10) : 0;

    const queryBuilder = this.invitationRepository
      .createQueryBuilder('inv')
      .leftJoin('inv.invitedBy', 'inviter')
      .select([
        'inv.id',
        'inv.email',
        'inv.role',
        'inv.status',
        'inv.expiresAt',
        'inv.createdAt',
        'inv.acceptedAt',
        'inviter.email',
      ]);

    // Apply status filter
    if (query.status) {
      queryBuilder.where('inv.status = :status', { status: query.status });
    }

    const total = await queryBuilder.getCount();

    const invitations = await queryBuilder
      .orderBy('inv.createdAt', 'DESC')
      .skip(offset)
      .take(limit + 1)
      .getMany();

    const hasMore = invitations.length > limit;
    const data = invitations
      .slice(0, limit)
      .map((inv) => this.toResponseDto(inv, inv.invitedBy?.email || ''));

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
   * Revoke a pending invitation
   * USER-12: Super Admin can revoke pending invites
   *
   * Only pending invitations can be revoked.
   * Accepted/expired/revoked invitations cannot be revoked again.
   *
   * @param requesterId - ID of admin revoking the invitation
   * @param invitationId - ID of invitation to revoke
   * @param ipAddress - IP address of requester (for activity log)
   */
  async revokeInvitation(
    requesterId: string,
    invitationId: string,
    ipAddress?: string,
  ): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Only pending invitations can be revoked');
    }

    // Mark as revoked
    invitation.status = 'revoked';
    await this.invitationRepository.save(invitation);

    // Log activity
    await this.activityService.log({
      adminId: requesterId,
      action: 'invite_revoked',
      metadata: {
        invitationId,
        email: invitation.email,
        role: invitation.role,
      },
      ipAddress,
    });

    this.logger.log(`Invitation ${invitationId} revoked by ${requesterId}`);
  }

  /**
   * Get invitation by ID (for detail view)
   *
   * Used for displaying invitation details in admin UI.
   *
   * @param invitationId - ID of invitation to retrieve
   * @returns Invitation details with inviter email
   */
  async getInvitationById(
    invitationId: string,
  ): Promise<AdminInvitationResponseDto> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['invitedBy'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return this.toResponseDto(invitation, invitation.invitedBy?.email || '');
  }

  /**
   * Transform AdminInvitation entity to AdminInvitationResponseDto
   *
   * Maps database entity to response DTO with computed fields:
   * - isExpired: Computed from status and expiresAt
   * - ISO date strings for timestamps
   * - Inviter email from relation
   *
   * @param inv - Invitation entity
   * @param invitedByEmail - Email of inviting admin
   * @returns Invitation response DTO
   */
  private toResponseDto(
    inv: AdminInvitation,
    invitedByEmail: string,
  ): AdminInvitationResponseDto {
    const now = new Date();
    return {
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt.toISOString(),
      invitedByAdminEmail: invitedByEmail,
      createdAt: inv.createdAt.toISOString(),
      isExpired: inv.status === 'pending' && inv.expiresAt < now,
    };
  }
}
