import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class MfaVerifyLoginDto {
  @ApiProperty({ description: 'Temporary token from initial login' })
  @IsString()
  tempToken: string;

  @ApiProperty({
    description: 'MFA code from authenticator app or backup code',
  })
  @IsString()
  @Length(6, 8) // 6 for TOTP, 8 for backup code
  code: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ example: 900 })
  expiresIn: number;

  @ApiProperty()
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  };
}

export class MfaRequiredResponseDto {
  @ApiProperty({ example: true })
  mfaRequired: boolean;

  @ApiProperty({ description: 'Temporary token to use for MFA verification' })
  tempToken: string;

  @ApiProperty({ example: 'MFA verification required' })
  message: string;
}
