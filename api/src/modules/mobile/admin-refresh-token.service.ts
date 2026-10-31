import { createHash, randomBytes } from 'crypto';
import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { AdminRefreshToken } from './entities/admin-refresh-token.entity';
import { AdminSessionService } from '../admin/admin-session.service';

export interface IssuedAdminRefreshToken {
  token: string;
  recordId: string;
  familyId: string;
  sessionJti: string;
  expiresAt: Date;
}

export interface AdminRefreshResult {
  adminId: string;
  mfaVerified: boolean;
  sessionJti: string;
  familyId: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AdminRefreshTokenService {
  private readonly logger = new Logger(AdminRefreshTokenService.name);
  private readonly refreshTtlDays: number;

  constructor(
    @InjectRepository(AdminRefreshToken)
    private readonly refreshRepository: Repository<AdminRefreshToken>,
    private readonly adminSessionService: AdminSessionService,
    private readonly configService: ConfigService,
  ) {
    this.refreshTtlDays = this.configService.get<number>(
      'ADMIN_REFRESH_TOKEN_TTL_DAYS',
      30,
    );
  }

  hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  async issueToken(params: {
    adminId: string;
    sessionJti: string;
    mfaVerified: boolean;
    deviceId?: string | null;
    familyId?: string;
  }): Promise<IssuedAdminRefreshToken> {
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const familyId = params.familyId ?? uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTtlDays);

    const record = this.refreshRepository.create({
      adminId: params.adminId,
      tokenHash,
      familyId,
      deviceId: params.deviceId ?? null,
      sessionJti: params.sessionJti,
      mfaVerified: params.mfaVerified,
      expiresAt,
    });
    const saved = await this.refreshRepository.save(record);

    return {
      token: rawToken,
      recordId: saved.id,
      familyId,
      sessionJti: params.sessionJti,
      expiresAt,
    };
  }

  async rotateRefreshToken(rawToken: string): Promise<AdminRefreshResult> {
    const tokenHash = this.hashToken(rawToken);
    const existing = await this.refreshRepository.findOne({
      where: { tokenHash },
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.revokedAt) {
      await this.revokeTokenFamily(existing.familyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (existing.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (existing.replacedById) {
      await this.revokeTokenFamily(existing.familyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const newSessionJti = uuidv4();
    const issued = await this.issueToken({
      adminId: existing.adminId,
      sessionJti: newSessionJti,
      mfaVerified: existing.mfaVerified,
      deviceId: existing.deviceId,
      familyId: existing.familyId,
    });

    existing.replacedById = issued.recordId;
    existing.revokedAt = new Date();
    await this.refreshRepository.save(existing);

    await this.adminSessionService.blacklistToken(existing.sessionJti);

    return {
      adminId: existing.adminId,
      mfaVerified: existing.mfaVerified,
      sessionJti: newSessionJti,
      familyId: existing.familyId,
      refreshToken: issued.token,
      refreshExpiresAt: issued.expiresAt,
    };
  }

  async revokeTokenFamily(familyId: string): Promise<void> {
    const tokens = await this.refreshRepository.find({
      where: { familyId, revokedAt: IsNull() },
    });

    for (const token of tokens) {
      token.revokedAt = new Date();
      await this.refreshRepository.save(token);
      await this.adminSessionService.blacklistToken(token.sessionJti);
    }

    this.logger.warn(`Revoked admin refresh token family ${familyId}`);
  }

  async revokeTokensForDevice(deviceId: string): Promise<void> {
    const tokens = await this.refreshRepository.find({
      where: { deviceId, revokedAt: IsNull() },
    });

    for (const token of tokens) {
      token.revokedAt = new Date();
      await this.refreshRepository.save(token);
      await this.adminSessionService.blacklistToken(token.sessionJti);
    }
  }

  async revokeAllForAdmin(adminId: string): Promise<void> {
    const tokens = await this.refreshRepository.find({
      where: { adminId, revokedAt: IsNull() },
    });

    for (const token of tokens) {
      token.revokedAt = new Date();
      await this.refreshRepository.save(token);
    }
  }
}
