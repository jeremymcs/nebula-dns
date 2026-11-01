import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterMobileDeviceDto {
  @ApiProperty({ description: 'Stable device identifier from the mobile app' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  deviceId: string;

  @ApiProperty({ example: 'ios' })
  @IsString()
  @MaxLength(32)
  platform: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  appVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  expoPushToken?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isJailbroken?: boolean;
}

export class MobileDeviceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  deviceId: string;

  @ApiProperty()
  platform: string;

  @ApiPropertyOptional()
  appVersion?: string | null;

  @ApiPropertyOptional()
  deviceName?: string | null;

  @ApiProperty()
  isJailbroken: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AdminRefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class NotificationPreferenceDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  channel: string;

  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}

export class StartImpersonationBodyDto {
  @ApiPropertyOptional({
    description:
      'Required when X-Device-Id is sent (mobile impersonation audit trail)',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}
