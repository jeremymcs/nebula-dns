import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { MobileDevice } from './entities/mobile-device.entity';
import { AdminRefreshTokenService } from './admin-refresh-token.service';
import { SessionService } from '../auth/session.service';

export interface RegisterMobileDeviceDto {
  deviceId: string;
  platform: string;
  appVersion?: string;
  deviceName?: string;
  expoPushToken?: string;
  isJailbroken?: boolean;
}

@Injectable()
export class MobileDevicesService {
  private readonly logger = new Logger(MobileDevicesService.name);

  constructor(
    @InjectRepository(MobileDevice)
    private readonly deviceRepository: Repository<MobileDevice>,
    private readonly adminRefreshTokenService: AdminRefreshTokenService,
    private readonly sessionService: SessionService,
  ) {}

  async registerForAdmin(
    adminId: string,
    dto: RegisterMobileDeviceDto,
  ): Promise<MobileDevice> {
    let device = await this.deviceRepository.findOne({
      where: {
        adminId,
        externalDeviceId: dto.deviceId,
        revokedAt: IsNull(),
      },
    });

    if (device) {
      device.platform = dto.platform;
      device.appVersion = dto.appVersion ?? device.appVersion;
      device.deviceName = dto.deviceName ?? device.deviceName;
      device.expoPushToken = dto.expoPushToken ?? device.expoPushToken;
      device.isJailbroken = dto.isJailbroken ?? device.isJailbroken;
      return this.deviceRepository.save(device);
    }

    device = this.deviceRepository.create({
      adminId,
      externalDeviceId: dto.deviceId,
      platform: dto.platform,
      appVersion: dto.appVersion ?? null,
      deviceName: dto.deviceName ?? null,
      expoPushToken: dto.expoPushToken ?? null,
      isJailbroken: dto.isJailbroken ?? false,
    });

    return this.deviceRepository.save(device);
  }

  async registerForUser(
    userId: string,
    tenantId: string,
    dto: RegisterMobileDeviceDto,
  ): Promise<MobileDevice> {
    let device = await this.deviceRepository.findOne({
      where: {
        userId,
        externalDeviceId: dto.deviceId,
        revokedAt: IsNull(),
      },
    });

    if (device) {
      device.platform = dto.platform;
      device.appVersion = dto.appVersion ?? device.appVersion;
      device.deviceName = dto.deviceName ?? device.deviceName;
      device.expoPushToken = dto.expoPushToken ?? device.expoPushToken;
      device.isJailbroken = dto.isJailbroken ?? device.isJailbroken;
      device.tenantId = tenantId;
      return this.deviceRepository.save(device);
    }

    device = this.deviceRepository.create({
      userId,
      tenantId,
      externalDeviceId: dto.deviceId,
      platform: dto.platform,
      appVersion: dto.appVersion ?? null,
      deviceName: dto.deviceName ?? null,
      expoPushToken: dto.expoPushToken ?? null,
      isJailbroken: dto.isJailbroken ?? false,
    });

    return this.deviceRepository.save(device);
  }

  async listForAdmin(adminId: string): Promise<MobileDevice[]> {
    return this.deviceRepository.find({
      where: { adminId, revokedAt: IsNull() },
      order: { updatedAt: 'DESC' },
    });
  }

  async listForUser(userId: string): Promise<MobileDevice[]> {
    return this.deviceRepository.find({
      where: { userId, revokedAt: IsNull() },
      order: { updatedAt: 'DESC' },
    });
  }

  async revokeAdminDevice(adminId: string, deviceId: string): Promise<void> {
    const device = await this.findActiveAdminDevice(adminId, deviceId);
    await this.revokeDevice(device);
  }

  async revokeUserDevice(userId: string, deviceId: string): Promise<void> {
    const device = await this.findActiveUserDevice(userId, deviceId);
    await this.revokeDevice(device);
  }

  async findActiveByExternalIdForAdmin(
    adminId: string,
    externalDeviceId: string,
  ): Promise<MobileDevice | null> {
    return this.deviceRepository.findOne({
      where: { adminId, externalDeviceId, revokedAt: IsNull() },
    });
  }

  async findActiveByExternalIdForUser(
    userId: string,
    externalDeviceId: string,
  ): Promise<MobileDevice | null> {
    return this.deviceRepository.findOne({
      where: { userId, externalDeviceId, revokedAt: IsNull() },
    });
  }

  async updateLastRefreshJti(
    deviceInternalId: string,
    jti: string,
  ): Promise<void> {
    await this.deviceRepository.update(deviceInternalId, {
      lastRefreshJti: jti,
    });
  }

  async isJailbrokenDevice(
    owner: { adminId?: string; userId?: string },
    externalDeviceId: string | undefined,
  ): Promise<boolean> {
    if (!externalDeviceId) {
      return false;
    }

    if (owner.adminId) {
      const device = await this.findActiveByExternalIdForAdmin(
        owner.adminId,
        externalDeviceId,
      );
      return device?.isJailbroken ?? false;
    }

    if (owner.userId) {
      const device = await this.findActiveByExternalIdForUser(
        owner.userId,
        externalDeviceId,
      );
      return device?.isJailbroken ?? false;
    }

    return false;
  }

  private async findActiveAdminDevice(
    adminId: string,
    deviceId: string,
  ): Promise<MobileDevice> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId, adminId, revokedAt: IsNull() },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    return device;
  }

  private async findActiveUserDevice(
    userId: string,
    deviceId: string,
  ): Promise<MobileDevice> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId, userId, revokedAt: IsNull() },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    return device;
  }

  private async revokeDevice(device: MobileDevice): Promise<void> {
    device.revokedAt = new Date();
    await this.deviceRepository.save(device);

    if (device.adminId) {
      await this.adminRefreshTokenService.revokeTokensForDevice(device.id);
    }

    if (device.userId && device.lastRefreshJti) {
      await this.sessionService.blacklistToken(device.lastRefreshJti);
    }

    this.logger.log(`Revoked mobile device ${device.id}`);
  }
}
