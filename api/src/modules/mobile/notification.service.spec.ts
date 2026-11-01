import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationDelivery } from './entities/notification-delivery.entity';
import { MobileDevice } from './entities/mobile-device.entity';
import { ExpoPushService } from './expo-push.service';
import { RedisService } from '../redis/redis.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let expoPushService: { send: jest.Mock };

  beforeEach(async () => {
    expoPushService = {
      send: jest.fn().mockResolvedValue([{ status: 'ok', id: 'ticket-1' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(NotificationPreference),
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(NotificationDelivery),
          useValue: {
            create: jest.fn((data) => data),
            save: jest.fn(async (data) => ({ id: 'delivery-1', ...data })),
          },
        },
        {
          provide: getRepositoryToken(MobileDevice),
          useValue: {
            find: jest.fn().mockResolvedValue([
              {
                id: 'device-1',
                expoPushToken: 'ExponentPushToken[test]',
              },
            ]),
          },
        },
        {
          provide: ExpoPushService,
          useValue: expoPushService,
        },
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue({
              lpush: jest.fn(),
              rpop: jest.fn(),
            }),
          },
        },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  it('dispatches push notifications through Expo client', async () => {
    await service.dispatch({
      eventType: 'dns_health',
      title: 'DNS health',
      body: 'DoH degraded',
      adminId: 'admin-1',
    });

    expect(expoPushService.send).toHaveBeenCalledWith([
      expect.objectContaining({
        to: 'ExponentPushToken[test]',
        title: 'DNS health',
      }),
    ]);
  });
});
