// Nebula DNS - Family Members Service
// Handles family member invitations and management for Home tier
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { FamilyInvitation } from './entities/family-invitation.entity';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import {
  CreateFamilyInvitationDto,
  AcceptFamilyInvitationDto,
  FamilyInvitationResponseDto,
  FamilyInvitationInfoDto,
  FamilyMemberUserDto,
  FamilyOverviewDto,
} from './dto/family-invitation.dto';
import { EmailService } from '../email/email.service';
import { LimitsService } from '../limits/limits.service';

/** Maximum family members allowed for Home tier */
const MAX_FAMILY_MEMBERS = 5;

/** Invitation expiration in days */
const INVITATION_EXPIRY_DAYS = 7;

@Injectable()
export class FamilyMembersService {
  private readonly logger = new Logger(FamilyMembersService.name);

  constructor(
    @InjectRepository(FamilyInvitation)
    private readonly invitationRepository: Repository<FamilyInvitation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
    private readonly limitsService: LimitsService,
  ) {}

  /**
   * Generate a secure invitation token
   */
  private generateToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  /**
   * Check if tenant is Home tier
   */
  private async validateHomeTier(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.tier !== 'home') {
      throw new ForbiddenException(
        'Family member invitations are only available for Home tier accounts',
      );
    }

    return tenant;
  }

  /**
   * Get the family overview for a tenant (members + pending invitations)
   */
  async getFamilyOverview(tenantId: string): Promise<FamilyOverviewDto> {
    await this.validateHomeTier(tenantId);

    // Get all users with member role + the owner
    const members = await this.userRepository.find({
      where: [
        { tenantId, role: 'member' },
        { tenantId, role: 'owner' },
      ],
      order: { createdAt: 'ASC' },
    });

    // Get pending invitations
    const pendingInvitations = await this.invitationRepository.find({
      where: { tenantId, status: 'pending' },
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });

    // Calculate counts (members only, not owner)
    const memberCount = members.filter((m) => m.role === 'member').length;
    const pendingCount = pendingInvitations.length;
    const totalCount = memberCount + pendingCount;

    return {
      members: members.map((m) => this.toMemberDto(m)),
      pendingInvitations: pendingInvitations.map((i) =>
        this.toInvitationResponseDto(i),
      ),
      totalMembers: totalCount,
      maxMembers: MAX_FAMILY_MEMBERS,
      remainingSlots: Math.max(0, MAX_FAMILY_MEMBERS - totalCount),
    };
  }

  /**
   * Get all family members (users with member role)
   */
  async getMembers(tenantId: string): Promise<FamilyMemberUserDto[]> {
    await this.validateHomeTier(tenantId);

    const members = await this.userRepository.find({
      where: [
        { tenantId, role: 'member' },
        { tenantId, role: 'owner' },
      ],
      order: { createdAt: 'ASC' },
    });

    return members.map((m) => this.toMemberDto(m));
  }

  /**
   * Get all pending family invitations
   */
  async getPendingInvitations(
    tenantId: string,
  ): Promise<FamilyInvitationResponseDto[]> {
    await this.validateHomeTier(tenantId);

    const invitations = await this.invitationRepository.find({
      where: { tenantId, status: 'pending' },
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });

    return invitations.map((i) => this.toInvitationResponseDto(i));
  }

  /**
   * Create a new family member invitation
   */
  async createInvitation(
    tenantId: string,
    invitedById: string,
    dto: CreateFamilyInvitationDto,
  ): Promise<{ invitation: FamilyInvitation; sent: boolean }> {
    const tenant = await this.validateHomeTier(tenantId);

    // Check if we can invite more members
    try {
      await this.limitsService.canInviteFamilyMember(tenantId);
    } catch {
      // Also count pending invitations for the limit check
      const overview = await this.getFamilyOverview(tenantId);
      if (overview.totalMembers >= MAX_FAMILY_MEMBERS) {
        throw new BadRequestException(
          `Family member limit reached (${overview.totalMembers}/${MAX_FAMILY_MEMBERS})`,
        );
      }
    }

    // Check for existing user with this email in the tenant
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email, tenantId },
    });

    if (existingUser) {
      throw new ConflictException(
        'A user with this email already exists in your family',
      );
    }

    // Check for existing pending invitation
    const existingInvitation = await this.invitationRepository.findOne({
      where: { email: dto.email, tenantId, status: 'pending' },
    });

    if (existingInvitation) {
      throw new ConflictException(
        'An invitation has already been sent to this email',
      );
    }

    const { token, hash } = this.generateToken();

    // Set expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const invitation = this.invitationRepository.create({
      tenantId,
      invitedById,
      email: dto.email,
      displayName: dto.displayName || null,
      tokenHash: hash,
      status: 'pending',
      expiresAt,
    });

    const saved = await this.invitationRepository.save(invitation);

    // Get inviter info for email
    const inviter = await this.userRepository.findOne({
      where: { id: invitedById },
    });

    // Send invitation email
    const inviteUrl = `${process.env.APP_URL || 'http://localhost:4011'}/invite/family/accept?token=${token}`;
    const sent = await this.emailService.sendFamilyInviteEmail({
      to: dto.email,
      familyName: tenant.name,
      inviterName: inviter?.name || 'A family member',
      inviterEmail: inviter?.email || '',
      inviteUrl,
      expiresAt,
    });

    this.logger.log(
      `Family invitation created for ${dto.email} in tenant ${tenantId}`,
    );

    return { invitation: saved, sent };
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvitation(
    tenantId: string,
    invitationId: string,
  ): Promise<void> {
    await this.validateHomeTier(tenantId);

    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId, tenantId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException(
        'Only pending invitations can be cancelled',
      );
    }

    invitation.status = 'cancelled';
    await this.invitationRepository.save(invitation);

    this.logger.log(`Family invitation ${invitationId} cancelled`);
  }

  /**
   * Resend a pending invitation
   */
  async resendInvitation(
    tenantId: string,
    invitationId: string,
    userId: string,
  ): Promise<{ sent: boolean }> {
    const tenant = await this.validateHomeTier(tenantId);

    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId, tenantId },
      relations: ['invitedBy'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Only pending invitations can be resent');
    }

    // Generate new token and extend expiration
    const { token, hash } = this.generateToken();
    invitation.tokenHash = hash;
    invitation.expiresAt = new Date();
    invitation.expiresAt.setDate(
      invitation.expiresAt.getDate() + INVITATION_EXPIRY_DAYS,
    );

    await this.invitationRepository.save(invitation);

    // Get current user info
    const currentUser = await this.userRepository.findOne({
      where: { id: userId },
    });

    // Resend email
    const inviteUrl = `${process.env.APP_URL || 'http://localhost:4011'}/invite/family/accept?token=${token}`;
    const sent = await this.emailService.sendFamilyInviteEmail({
      to: invitation.email,
      familyName: tenant.name,
      inviterName:
        currentUser?.name || invitation.invitedBy?.name || 'A family member',
      inviterEmail: currentUser?.email || invitation.invitedBy?.email || '',
      inviteUrl,
      expiresAt: invitation.expiresAt,
    });

    this.logger.log(
      `Family invitation ${invitationId} resent to ${invitation.email}`,
    );

    return { sent };
  }

  /**
   * Get invitation info by token (public endpoint for accept page)
   */
  async getInvitationByToken(token: string): Promise<FamilyInvitationInfoDto> {
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    const invitation = await this.invitationRepository.findOne({
      where: { tokenHash: hash },
      relations: ['tenant', 'invitedBy'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    const isExpired =
      invitation.status !== 'pending' || new Date() > invitation.expiresAt;

    return {
      tenantName: invitation.tenant?.name || 'Unknown Family',
      email: invitation.email,
      displayName: invitation.displayName,
      invitedByName: invitation.invitedBy?.name || 'Unknown',
      expiresAt: invitation.expiresAt,
      isExpired,
    };
  }

  /**
   * Accept a family invitation
   */
  async acceptInvitation(
    dto: AcceptFamilyInvitationDto,
  ): Promise<{ user: User; tenant: Tenant }> {
    const hash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const invitation = await this.invitationRepository.findOne({
      where: { tokenHash: hash },
      relations: ['tenant'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException(
        'This invitation has already been used or cancelled',
      );
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('This invitation has expired');
    }

    // Check if user already exists globally
    const existingUser = await this.userRepository.findOne({
      where: { email: invitation.email },
    });

    if (existingUser) {
      throw new ConflictException(
        'An account with this email already exists. Please log in to your existing account.',
      );
    }

    // Use transaction for atomicity
    return await this.dataSource.transaction(async (manager) => {
      // Create new user with member role
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const user = manager.create(User, {
        tenantId: invitation.tenantId,
        email: invitation.email,
        name: dto.name,
        passwordHash: hashedPassword,
        role: 'member',
        status: 'active',
      });

      await manager.save(user);

      // Mark invitation as accepted
      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();
      invitation.acceptedByUserId = user.id;
      await manager.save(invitation);

      this.logger.log(
        `Family invitation accepted: ${invitation.email} joined tenant ${invitation.tenantId}`,
      );

      return { user, tenant: invitation.tenant };
    });
  }

  /**
   * Remove a family member (user with member role)
   */
  async removeMember(tenantId: string, memberId: string): Promise<void> {
    await this.validateHomeTier(tenantId);

    const member = await this.userRepository.findOne({
      where: { id: memberId, tenantId },
    });

    if (!member) {
      throw new NotFoundException('Family member not found');
    }

    if (member.role === 'owner') {
      throw new BadRequestException('Cannot remove the family owner');
    }

    if (member.role !== 'member') {
      throw new BadRequestException('User is not a family member');
    }

    await this.userRepository.remove(member);

    // Invalidate limits cache
    await this.limitsService.invalidateLimitsCache(tenantId);

    this.logger.log(
      `Family member ${memberId} removed from tenant ${tenantId}`,
    );
  }

  /**
   * Convert User to FamilyMemberUserDto
   */
  private toMemberDto(user: User): FamilyMemberUserDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  /**
   * Convert FamilyInvitation to FamilyInvitationResponseDto
   */
  private toInvitationResponseDto(
    invitation: FamilyInvitation,
  ): FamilyInvitationResponseDto {
    return {
      id: invitation.id,
      email: invitation.email,
      displayName: invitation.displayName,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      invitedBy: invitation.invitedBy
        ? {
            id: invitation.invitedBy.id,
            name: invitation.invitedBy.name,
            email: invitation.invitedBy.email,
          }
        : null,
    };
  }
}
