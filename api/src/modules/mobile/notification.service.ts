import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationDelivery } from './entities/notification-delivery.entity';
import { MobileDevice } from './entities/mobile-device.entity';
import { ExpoPushService } from './expo-push.service';
import { RedisService } from '../redis/redis.service';

export type NotificationEventType =
  | 'agent_offline'
  | 'threat_spike'
  | 'cert_expiry'
  | 'dns_health'
  | 'failed_admin_login'
  | 'msp_signup';

export interface NotificationEnqueuePayload {
  eventType: NotificationEventType;
  title: string;
  body: string;
  adminId?: string;
  userId?: string;
  tenantId?: string;
}

const QUEUE_KEY = 'notifications:push:queue';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(NotificationDelivery)
    private readonly deliveryRepository: Repository<NotificationDelivery>,
    @InjectRepository(MobileDevice)
    private readonly deviceRepository: Repository<MobileDevice>,
    private readonly expoPushService: ExpoPushService,
    private readonly redisService: RedisService,
  ) {}

  async getPreferencesForAdmin(
    adminId: string,
  ): Promise<NotificationPreference[]> {
    return this.preferenceRepository.find({ where: { adminId } });
  }

  async getPreferencesForUser(
    userId: string,
  ): Promise<NotificationPreference[]> {
    return this.preferenceRepository.find({ where: { userId } });
  }

  async upsertAdminPreference(
    adminId: string,
    channel: string,
    enabled: boolean,
  ): Promise<NotificationPreference> {
    let pref = await this.preferenceRepository.findOne({
      where: { adminId, channel },
    });
    if (!pref) {
      pref = this.preferenceRepository.create({ adminId, channel, enabled });
    } else {
      pref.enabled = enabled;
    }
    return this.preferenceRepository.save(pref);
  }

  async upsertUserPreference(
    userId: string,
    tenantId: string,
    channel: string,
    enabled: boolean,
  ): Promise<NotificationPreference> {
    let pref = await this.preferenceRepository.findOne({
      where: { userId, channel },
    });
    if (!pref) {
      pref = this.preferenceRepository.create({
        userId,
        tenantId,
        channel,
        enabled,
      });
    } else {
      pref.enabled = enabled;
    }
    return this.preferenceRepository.save(pref);
  }

  async enqueue(payload: NotificationEnqueuePayload): Promise<void> {
    const client = this.redisService.getClient();
    await client.lpush(QUEUE_KEY, JSON.stringify(payload));
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processQueueBatch(): Promise<void> {
    const client = this.redisService.getClient();
    for (let i = 0; i < 20; i++) {
      const raw = await client.rpop(QUEUE_KEY);
      if (!raw) {
        break;
      }
      try {
        const payload = JSON.parse(raw) as NotificationEnqueuePayload;
        await this.dispatch(payload);
      } catch (error) {
        this.logger.error(
          `Failed to process notification job: ${(error as Error).message}`,
        );
      }
    }
  }

  async dispatch(payload: NotificationEnqueuePayload): Promise<void> {
    const enabled = await this.isChannelEnabled(payload);
    if (!enabled) {
      return;
    }

    const devices = await this.resolveTargetDevices(payload);
    if (devices.length === 0) {
      return;
    }

    for (const device of devices) {
      if (!device.expoPushToken) {
        continue;
      }

      const delivery = this.deliveryRepository.create({
        adminId: payload.adminId ?? null,
        userId: payload.userId ?? null,
        deviceId: device.id,
        eventType: payload.eventType,
        title: payload.title,
        body: payload.body,
        status: 'pending',
      });
      const saved = await this.deliveryRepository.save(delivery);

      const tickets = await this.expoPushService.send([
        {
          to: device.expoPushToken,
          title: payload.title,
          body: payload.body,
          data: { eventType: payload.eventType },
        },
      ]);

      const ticket = tickets[0];
      if (ticket?.status === 'ok') {
        saved.status = 'sent';
        saved.expoTicketId = ticket.id ?? null;
        saved.sentAt = new Date();
      } else {
        saved.status = 'failed';
        saved.errorMessage = ticket?.message ?? 'Unknown Expo error';
      }
      await this.deliveryRepository.save(saved);
    }
  }

  private async isChannelEnabled(
    payload: NotificationEnqueuePayload,
  ): Promise<boolean> {
    const channel = payload.eventType;
    if (payload.adminId) {
      const pref = await this.preferenceRepository.findOne({
        where: { adminId: payload.adminId, channel },
      });
      return pref ? pref.enabled : true;
    }
    if (payload.userId) {
      const pref = await this.preferenceRepository.findOne({
        where: { userId: payload.userId, channel },
      });
      return pref ? pref.enabled : true;
    }
    return true;
  }

  private async resolveTargetDevices(
    payload: NotificationEnqueuePayload,
  ): Promise<MobileDevice[]> {
    if (payload.adminId) {
      return this.deviceRepository.find({
        where: { adminId: payload.adminId, revokedAt: IsNull() },
      });
    }
    if (payload.userId) {
      return this.deviceRepository.find({
        where: { userId: payload.userId, revokedAt: IsNull() },
      });
    }
    return [];
  }
}
