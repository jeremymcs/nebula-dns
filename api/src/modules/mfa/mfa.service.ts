import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserMfa } from './entities/user-mfa.entity';
import { MfaBackupCode } from './entities/mfa-backup-code.entity';
import { User } from '../users/entities/user.entity';
import { SetupMfaResponseDto } from './dto/mfa.dto';

@Injectable()
export class MfaService {
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(UserMfa)
    private userMfaRepository: Repository<UserMfa>,
    @InjectRepository(MfaBackupCode)
    private backupCodeRepository: Repository<MfaBackupCode>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {
    // Use a 32-byte key for AES-256
    const key = this.configService.get(
      'MFA_ENCRYPTION_KEY',
      'default-key-change-in-production!',
    );
    this.encryptionKey = crypto.scryptSync(key, 'salt', 32);
  }

  // Generate a TOTP secret
  private generateSecret(): string {
    // Generate a random secret for TOTP (base32 encoding done manually)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    const bytes = crypto.randomBytes(32);
    for (let i = 0; i < 32; i++) {
      secret += chars[bytes[i] % 32];
    }
    return secret;
  }

  // Encrypt the secret for storage
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  // Decrypt the secret
  private decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      this.encryptionKey,
      iv,
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Generate TOTP code for a given secret and time
  private generateTOTP(secret: string, time?: number): string {
    const counter = Math.floor((time || Date.now()) / 30000);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    // Decode base32 secret
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

  // Verify TOTP code (with window for clock drift)
  private verifyTOTP(secret: string, code: string): boolean {
    const now = Date.now();
    // Check current time and ±1 interval for clock drift
    for (let i = -1; i <= 1; i++) {
      const time = now + i * 30000;
      if (this.generateTOTP(secret, time) === code) {
        return true;
      }
    }
    return false;
  }

  // Generate backup codes
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  async setupMfa(userId: string): Promise<SetupMfaResponseDto> {
    // Check if MFA is already enabled
    let userMfa = await this.userMfaRepository.findOne({ where: { userId } });

    if (userMfa?.isEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    const secret = this.generateSecret();
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Create or update MFA record
    if (!userMfa) {
      userMfa = this.userMfaRepository.create({
        userId,
        secretEncrypted: this.encrypt(secret),
        isEnabled: false,
      });
    } else {
      userMfa.secretEncrypted = this.encrypt(secret);
      userMfa.isEnabled = false;
    }

    await this.userMfaRepository.save(userMfa);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Clear existing backup codes
    await this.backupCodeRepository.delete({ userId });

    // Save hashed backup codes
    for (const code of backupCodes) {
      const backupCode = this.backupCodeRepository.create({
        userId,
        codeHash: await bcrypt.hash(code, 10),
      });
      await this.backupCodeRepository.save(backupCode);
    }

    // Generate QR code URL (otpauth format)
    const issuer = this.configService.get('APP_NAME', 'Nebula DNS');
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    return {
      secret,
      qrCodeUrl: otpauthUrl,
      backupCodes,
    };
  }

  async verifyAndEnableMfa(userId: string, code: string): Promise<boolean> {
    const userMfa = await this.userMfaRepository.findOne({ where: { userId } });

    if (!userMfa) {
      throw new BadRequestException(
        'MFA setup not found. Please start setup first.',
      );
    }

    if (userMfa.isEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    const secret = this.decrypt(userMfa.secretEncrypted);

    if (!this.verifyTOTP(secret, code)) {
      throw new BadRequestException('Invalid verification code');
    }

    // Enable MFA
    userMfa.isEnabled = true;
    userMfa.verifiedAt = new Date();
    await this.userMfaRepository.save(userMfa);

    // Update user
    await this.userRepository.update(userId, { mfaEnabled: true } as any);

    return true;
  }

  async verifyMfaCode(userId: string, code: string): Promise<boolean> {
    const userMfa = await this.userMfaRepository.findOne({ where: { userId } });

    if (!userMfa?.isEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    const secret = this.decrypt(userMfa.secretEncrypted);

    // Try TOTP first
    if (this.verifyTOTP(secret, code)) {
      userMfa.lastUsedAt = new Date();
      await this.userMfaRepository.save(userMfa);
      return true;
    }

    // Try backup code
    const backupCodes = await this.backupCodeRepository.find({
      where: { userId, usedAt: null as any },
    });

    for (const backupCode of backupCodes) {
      if (await bcrypt.compare(code.toUpperCase(), backupCode.codeHash)) {
        backupCode.usedAt = new Date();
        await this.backupCodeRepository.save(backupCode);
        return true;
      }
    }

    return false;
  }

  async disableMfa(
    userId: string,
    password: string,
    code: string,
  ): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify MFA code
    const isCodeValid = await this.verifyMfaCode(userId, code);
    if (!isCodeValid) {
      throw new BadRequestException('Invalid MFA code');
    }

    // Disable MFA
    await this.userMfaRepository.delete({ userId });
    await this.backupCodeRepository.delete({ userId });
    await this.userRepository.update(userId, { mfaEnabled: false } as any);

    return true;
  }

  async isMfaEnabled(userId: string): Promise<boolean> {
    const userMfa = await this.userMfaRepository.findOne({ where: { userId } });
    return userMfa?.isEnabled ?? false;
  }

  async regenerateBackupCodes(userId: string, code: string): Promise<string[]> {
    // Verify current MFA code first
    const isValid = await this.verifyMfaCode(userId, code);
    if (!isValid) {
      throw new BadRequestException('Invalid MFA code');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes();

    // Clear existing backup codes
    await this.backupCodeRepository.delete({ userId });

    // Save new hashed backup codes
    for (const newCode of backupCodes) {
      const backupCode = this.backupCodeRepository.create({
        userId,
        codeHash: await bcrypt.hash(newCode, 10),
      });
      await this.backupCodeRepository.save(backupCode);
    }

    return backupCodes;
  }

  async getBackupCodesCount(
    userId: string,
  ): Promise<{ total: number; remaining: number }> {
    const allCodes = await this.backupCodeRepository.count({
      where: { userId },
    });
    const usedCodes = await this.backupCodeRepository.count({
      where: { userId },
      // Find codes where usedAt is not null - TypeORM workaround
    });
    const unusedCodes = await this.backupCodeRepository
      .createQueryBuilder('code')
      .where('code.user_id = :userId', { userId })
      .andWhere('code.used_at IS NULL')
      .getCount();

    return {
      total: allCodes,
      remaining: unusedCodes,
    };
  }
}
