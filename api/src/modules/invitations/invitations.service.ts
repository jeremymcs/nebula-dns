import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, LessThan, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { Invitation, InvitationStatus } from './entities/invitation.entity';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import {
  CreateInvitationDto,
  AcceptInvitationDto,
  InvitationResponseDto,
  InvitationInfoDto,
} from './dto/invitation.dto';
import { EmailService } from '../email/email.service';
import {
  defaultTenantDisplayName,
  resolveAppUrl,
} from '../../common/public-urls';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectDataSource()
    private dataSource: DataSource,
    private emailService: EmailService,
  ) {}

  // Generate invitation token
  private generateToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  async create(
    tenantId: string,
    invitedById: string,
    dto: CreateInvitationDto,
  ): Promise<{ invitation: Invitation; sent: boolean }> {
    // Check if user already exists in this tenant
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email, tenantId },
    });

    if (existingUser) {
      throw new ConflictException(
        'A user with this email already exists in your organization',
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

    // Set expiration (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = this.invitationRepository.create({
      tenantId,
      invitedById,
      email: dto.email,
      role: dto.role,
      tokenHash: hash,
      message: dto.message,
      expiresAt,
    });

    const saved = await this.invitationRepository.save(invitation);

    // Get tenant and inviter info for email
    const [tenant, inviter] = await Promise.all([
      this.tenantRepository.findOne({ where: { id: tenantId } }),
      this.userRepository.findOne({ where: { id: invitedById } }),
    ]);

    // Send invitation email
    const inviteUrl = `${resolveAppUrl(process.env)}/invite/accept?token=${token}`;
    const sent = await this.emailService.sendInviteUserEmail({
      to: dto.email,
      tenantName: tenant?.name || defaultTenantDisplayName(),
      inviterName: inviter?.name || 'A team member',
      inviterEmail: inviter?.email || '',
      role: dto.role,
      message: dto.message,
      inviteUrl,
      expiresAt,
    });

    return { invitation: saved, sent };
  }

  async bulkInvite(
    tenantId: string,
    invitedById: string,
    invitations: CreateInvitationDto[],
  ): Promise<{
    successful: string[];
    failed: { email: string; reason: string }[];
  }> {
    const successful: string[] = [];
    const failed: { email: string; reason: string }[] = [];

    for (const dto of invitations) {
      try {
        await this.create(tenantId, invitedById, dto);
        successful.push(dto.email);
      } catch (error) {
        failed.push({
          email: dto.email,
          reason: error.message || 'Failed to send invitation',
        });
      }
    }

    return { successful, failed };
  }

  async findAll(tenantId: string): Promise<InvitationResponseDto[]> {
    const invitations = await this.invitationRepository.find({
      where: { tenantId },
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });

    return invitations.map((inv) => this.toResponseDto(inv));
  }

  async findPending(tenantId: string): Promise<InvitationResponseDto[]> {
    const invitations = await this.invitationRepository.find({
      where: { tenantId, status: 'pending' },
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });

    return invitations.map((inv) => this.toResponseDto(inv));
  }

  async findByToken(token: string): Promise<InvitationInfoDto> {
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
      tenantName: invitation.tenant?.name || 'Unknown',
      tenantSlug: invitation.tenant?.slug || '',
      email: invitation.email,
      role: invitation.role,
      invitedByName: invitation.invitedBy?.name || 'Unknown',
      message: invitation.message,
      expiresAt: invitation.expiresAt,
      isExpired,
    };
  }

  async accept(
    dto: AcceptInvitationDto,
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
        'This invitation has already been used or revoked',
      );
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('This invitation has expired');
    }

    // Check if user already exists (globally)
    const existingUser = await this.userRepository.findOne({
      where: { email: invitation.email },
    });

    if (existingUser) {
      throw new ConflictException(
        'An account with this email already exists. Please log in to join this organization.',
      );
    }

    // Use transaction to ensure atomicity of user creation and invitation update
    return await this.dataSource.transaction(async (manager) => {
      // Create new user
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const user = manager.create(User, {
        tenantId: invitation.tenantId,
        email: invitation.email,
        name: dto.name,
        passwordHash: hashedPassword,
        role: invitation.role as any,
      });

      await manager.save(user);

      // Mark invitation as accepted
      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();
      await manager.save(invitation);

      return { user, tenant: invitation.tenant };
    });
  }

  async revoke(tenantId: string, id: string): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id, tenantId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Only pending invitations can be revoked');
    }

    invitation.status = 'revoked';
    await this.invitationRepository.save(invitation);
  }

  async resend(
    tenantId: string,
    id: string,
    userId: string,
  ): Promise<{ sent: boolean }> {
    const invitation = await this.invitationRepository.findOne({
      where: { id, tenantId },
      relations: ['tenant', 'invitedBy'],
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
    invitation.expiresAt.setDate(invitation.expiresAt.getDate() + 7);

    await this.invitationRepository.save(invitation);

    // Get current user info
    const currentUser = await this.userRepository.findOne({
      where: { id: userId },
    });

    // Resend email
    const inviteUrl = `${resolveAppUrl(process.env)}/invite/accept?token=${token}`;
    const sent = await this.emailService.sendInviteUserEmail({
      to: invitation.email,
      tenantName: invitation.tenant?.name || defaultTenantDisplayName(),
      inviterName:
        currentUser?.name || invitation.invitedBy?.name || 'A team member',
      inviterEmail: currentUser?.email || invitation.invitedBy?.email || '',
      role: invitation.role,
      message: invitation.message,
      inviteUrl,
      expiresAt: invitation.expiresAt,
    });

    return { sent };
  }

  // Clean up expired invitations (can be called from cron)
  async cleanupExpired(): Promise<number> {
    const result = await this.invitationRepository.update(
      { status: 'pending', expiresAt: LessThan(new Date()) },
      { status: 'expired' },
    );
    return result.affected || 0;
  }

  private toResponseDto(invitation: Invitation): InvitationResponseDto {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      message: invitation.message,
      invitedBy: invitation.invitedBy
        ? {
            id: invitation.invitedBy.id,
            name: invitation.invitedBy.name,
            email: invitation.invitedBy.email,
          }
        : null,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
  }
}
