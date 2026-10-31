import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin/guards/admin-roles.guard';
import { AdminRoles } from '../admin/decorators/admin-roles.decorator';
import { AdminRole } from '../admin/enums/admin-role.enum';
import { SkipAdminMfa } from '../admin/decorators/skip-admin-mfa.decorator';
import { AdminUser } from '../admin/dto/admin-jwt-payload.dto';
import { MobileDevicesService } from './mobile-devices.service';
import { NotificationService } from './notification.service';
import {
  MobileDeviceResponseDto,
  NotificationPreferenceDto,
  RegisterMobileDeviceDto,
} from './dto/mobile.dto';
import { MobileDevice } from './entities/mobile-device.entity';

@ApiTags('Admin Mobile')
@Controller('admin/mobile')
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@ApiBearerAuth('admin-jwt')
export class AdminMobileController {
  constructor(private readonly mobileDevicesService: MobileDevicesService) {}

  @Post('register')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  @ApiOperation({ summary: 'Register or update a platform admin mobile device' })
  async register(
    @Req() req: Request,
    @Body() dto: RegisterMobileDeviceDto,
  ): Promise<MobileDeviceResponseDto> {
    const user = req.user as AdminUser;
    const device = await this.mobileDevicesService.registerForAdmin(
      user.adminId,
      dto,
    );
    return this.toResponse(device, dto.deviceId);
  }

  @Get('devices')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  async list(
    @Req() req: Request,
  ): Promise<{ data: MobileDeviceResponseDto[] }> {
    const user = req.user as AdminUser;
    const devices = await this.mobileDevicesService.listForAdmin(user.adminId);
    return {
      data: devices.map((d) => this.toResponse(d, d.externalDeviceId)),
    };
  }

  @Delete('devices/:deviceId')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Req() req: Request,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
  ): Promise<void> {
    const user = req.user as AdminUser;
    await this.mobileDevicesService.revokeAdminDevice(user.adminId, deviceId);
  }

  private toResponse(
    device: MobileDevice,
    externalDeviceId: string,
  ): MobileDeviceResponseDto {
    return {
      id: device.id,
      deviceId: externalDeviceId,
      platform: device.platform,
      appVersion: device.appVersion,
      deviceName: device.deviceName,
      isJailbroken: device.isJailbroken,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    };
  }
}

@ApiTags('Admin Notifications')
@Controller('admin/notifications')
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@ApiBearerAuth('admin-jwt')
export class AdminNotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('preferences')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  async getPreferences(@Req() req: Request) {
    const user = req.user as AdminUser;
    const prefs = await this.notificationService.getPreferencesForAdmin(
      user.adminId,
    );
    return { data: prefs };
  }

  @Patch('preferences')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  async patchPreferences(
    @Req() req: Request,
    @Body() dto: NotificationPreferenceDto,
  ) {
    const user = req.user as AdminUser;
    const pref = await this.notificationService.upsertAdminPreference(
      user.adminId,
      dto.channel,
      dto.enabled,
    );
    return { data: pref };
  }

  @Post('test')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  async testPush(@Req() req: Request, @Body() body: { title?: string; body?: string }) {
    const user = req.user as AdminUser;
    await this.notificationService.enqueue({
      eventType: 'dns_health',
      title: body.title ?? 'Flux Shield test notification',
      body: body.body ?? 'Push delivery test from admin API',
      adminId: user.adminId,
    });
    return { message: 'Notification queued' };
  }
}
