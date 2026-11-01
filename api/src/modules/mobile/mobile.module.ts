import { Module, MiddlewareConsumer, NestModule, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MobileDevice } from './entities/mobile-device.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationDelivery } from './entities/notification-delivery.entity';
import { MobileDevicesService } from './mobile-devices.service';
import { ExpoPushService } from './expo-push.service';
import { NotificationService } from './notification.service';
import { AuthMobileController, NotificationsController } from './auth-mobile.controller';
import {
  AdminMobileController,
  AdminNotificationsController,
} from './admin-mobile.controller';
import { MobileClientMiddleware } from './mobile-client.middleware';
import { AdminModule } from '../admin/admin.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MobileDevice,
      NotificationPreference,
      NotificationDelivery,
    ]),
    forwardRef(() => AdminModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [
    AuthMobileController,
    NotificationsController,
    AdminMobileController,
    AdminNotificationsController,
  ],
  providers: [
    MobileDevicesService,
    ExpoPushService,
    NotificationService,
    MobileClientMiddleware,
  ],
  exports: [
    MobileDevicesService,
    NotificationService,
    ExpoPushService,
  ],
})
export class MobileModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MobileClientMiddleware).forRoutes('*');
  }
}
