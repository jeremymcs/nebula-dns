// Flux Shield - Admin MFA Service
// TOTP enrollment and verification for admin accounts
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

import { AdminMfa } from './entities/admin-mfa.entity';
import { Admin } from './entities/admin.entity';
import { AdminMfaEnrollStartResponseDto } from './dto/admin-mfa.dto';
import {
  DEFAULT_ADMIN_PORTAL_NAME,
  DEFAULT_PRODUCT_NAME,
} from '../../common/product-branding';
import { encrypt, decrypt, deriveKey } from '../../common/utils/encryption.util';
import { getEncryptionKey } from '../../config/encryption.config';

interface HashedBackupCode {
  hash: string;
}

@Injectable()
export class AdminMfaService {
  private readonly logger = new Logger(AdminMfaService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(AdminMfa)
    private readonly adminMfaRepository: Repository<AdminMfa>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly configService: ConfigService,
  ) {
    const key = getEncryptionKey('MFA_ENCRYPTION_KEY');
    this.encryptionKey = deriveKey(key, 'mfa-gcm-salt');
  }

  private generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    const bytes = crypto.randomBytes(32);
    for (let i = 0; i < 32; i++) {
      secret += chars[bytes[i] % 32];
    }
    return secret;
  }

  private encryptSecret(text: string): string {
    return encrypt(text, this.encryptionKey);
  }

  private decryptSecret(encryptedText: string): string {
    return decrypt(encryptedText, this.encryptionKey);
  }

  private generateTOTP(secret: string, time?: number): string {
    const counter = Math.floor((time || Date.now()) / 30000);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const secretBytes: number[] = [];
    let bits = 0;
    let value = 0;

    for (const char of secret.toUpperCase()) {
      const index = base32Chars.indexOf(char);
      if (index === -1) continue;
      value = (value << 5) | index;
      bits += 5;
      if (bits >= 8) {
        secretBytes.push((value >> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    const keyBuffer = Buffer.from(secretBytes);
    const hmac = crypto.createHmac('sha1', keyBuffer);
    hmac.update(counterBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0xf;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  private verifyTOTP(secret: string, code: string): boolean {
    const normalized = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(normalized)) {
      return false;
    }
    const now = Date.now();
    for (let i = -1; i <= 1; i++) {
      const time = now + i * 30000;
      if (this.generateTOTP(secret, time) === normalized) {
        return true;
      }
    }
    return false;
  }

  private async generateBackupCodes(count = 10): Promise<{
    plain: string[];
    stored: HashedBackupCode[];
  }> {
    const plain: string[] = [];
    const stored: HashedBackupCode[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      plain.push(code);
      stored.push({ hash: await bcrypt.hash(code, 10) });
    }
    return { plain, stored };
  }

  async startEnrollment(adminId: string): Promise<AdminMfaEnrollStartResponseDto> {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });
    if (!admin) {
      throw new BadRequestException('Admin not found');
    }
    if (admin.mfaSetupComplete) {
      throw new BadRequestException('MFA is already configured');
    }

    const secret = this.generateSecret();
    const { plain, stored } = await this.generateBackupCodes();

    let record = await this.adminMfaRepository.findOne({
      where: { adminId },
    });
    if (!record) {
      record = this.adminMfaRepository.create({ adminId });
    }

    record.secret = this.encryptSecret(secret);
    record.backupCodes = stored as unknown as string[];
    record.isVerified = false;
    await this.adminMfaRepository.save(record);

    const productName =
      this.configService.get('PRODUCT_NAME') || DEFAULT_PRODUCT_NAME;
    const issuer = `${productName} ${DEFAULT_ADMIN_PORTAL_NAME}`;
    const qrCodeUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(admin.email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    return {
      secret,
      qrCodeUrl,
      backupCodes: plain,
    };
  }

  async completeEnrollment(adminId: string, code: string): Promise<void> {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });
    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    const record = await this.adminMfaRepository.findOne({ where: { adminId } });
    if (!record) {
      throw new BadRequestException(
        'MFA setup not started. Call enroll/start first.',
      );
    }

    const secret = this.decryptSecret(record.secret);
    if (!this.verifyTOTP(secret, code)) {
      throw new UnauthorizedException('Invalid verification code');
    }

    record.isVerified = true;
    record.lastUsedAt = new Date();
    await this.adminMfaRepository.save(record);

    await this.adminRepository.update(adminId, {
      mfaSetupComplete: true,
      status: admin.status === 'pending_mfa' ? 'active' : admin.status,
    });
  }

  async verifyChallenge(adminId: string, code: string): Promise<boolean> {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });
    if (!admin?.mfaSetupComplete) {
      throw new BadRequestException('MFA enrollment required');
    }

    const record = await this.adminMfaRepository.findOne({ where: { adminId } });
    if (!record?.isVerified) {
      throw new BadRequestException('MFA is not configured');
    }

    const secret = this.decryptSecret(record.secret);
    if (this.verifyTOTP(secret, code)) {
      record.lastUsedAt = new Date();
      await this.adminMfaRepository.save(record);
      return true;
    }

    const backupCodes = (record.backupCodes || []) as unknown as HashedBackupCode[];
    for (let i = 0; i < backupCodes.length; i++) {
      const entry = backupCodes[i];
      if (!entry?.hash) continue;
      if (await bcrypt.compare(code.toUpperCase(), entry.hash)) {
        backupCodes.splice(i, 1);
        record.backupCodes = backupCodes as unknown as string[];
        record.lastUsedAt = new Date();
        await this.adminMfaRepository.save(record);
        return true;
      }
    }

    return false;
  }
}
