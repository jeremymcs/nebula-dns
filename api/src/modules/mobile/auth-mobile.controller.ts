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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MobileDevicesService } from './mobile-devices.service';
import { NotificationService } from './notification.service';
import {
  MobileDeviceResponseDto,
  NotificationPreferenceDto,
  RegisterMobileDeviceDto,
} from './dto/mobile.dto';
import { MobileDevice } from './entities/mobile-device.entity';

@ApiTags('Auth Mobile')
@Controller('auth/mobile')
export class AuthMobileController {
  constructor(private readonly mobileDevicesService: MobileDevicesService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register or update a tenant/MSP mobile device' })
  async register(
    @Req() req: Request,
    @Body() dto: RegisterMobileDeviceDto,
  ): Promise<MobileDeviceResponseDto> {
    const user = req.user as {
      id: string;
      tenantId: string;
    };
    const device = await this.mobileDevicesService.registerForUser(
      user.id,
      user.tenantId,
      dto,
    );
    return this.toResponse(device, dto.deviceId);
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async list(
    @Req() req: Request,
  ): Promise<{ data: MobileDeviceResponseDto[] }> {
    const user = req.user as { id: string };
    const devices = await this.mobileDevicesService.listForUser(user.id);
    return {
      data: devices.map((d) => this.toResponse(d, d.externalDeviceId)),
    };
  }

  @Delete('devices/:deviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Req() req: Request,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
  ): Promise<void> {
    const user = req.user as { id: string };
    await this.mobileDevicesService.revokeUserDevice(user.id, deviceId);
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

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getUserPreferences(@Req() req: Request) {
    const user = req.user as { id: string };
    const prefs = await this.notificationService.getPreferencesForUser(
      user.id,
    );
    return { data: prefs };
  }

  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async patchUserPreferences(
    @Req() req: Request,
    @Body() dto: NotificationPreferenceDto,
  ) {
    const user = req.user as { id: string; tenantId: string };
    const pref = await this.notificationService.upsertUserPreference(
      user.id,
      user.tenantId,
      dto.channel,
      dto.enabled,
    );
    return { data: pref };
  }
}
