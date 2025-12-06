import { IsString, IsNotEmpty, Length, IsOptional, IsBoolean } from 'class-validator';

export class SetupMfaResponseDto {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export class VerifyMfaDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

export class VerifyMfaLoginDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 8) // 6 for TOTP, 8 for backup code
  code: string;

  @IsString()
  @IsNotEmpty()
  tempToken: string;

  @IsBoolean()
  @IsOptional()
  trustDevice?: boolean;
}

export class DisableMfaDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
