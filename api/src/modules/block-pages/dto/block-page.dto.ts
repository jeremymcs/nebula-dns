import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUrl, IsEmail, Matches } from 'class-validator';

export class CreateBlockPageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  // Branding
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @Matches(/^#[0-9A-Fa-f]{6}$/)
  @IsOptional()
  backgroundColor?: string;

  @Matches(/^#[0-9A-Fa-f]{6}$/)
  @IsOptional()
  primaryColor?: string;

  @Matches(/^#[0-9A-Fa-f]{6}$/)
  @IsOptional()
  textColor?: string;

  // Content
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsBoolean()
  @IsOptional()
  showCategory?: boolean;

  @IsBoolean()
  @IsOptional()
  showDomain?: boolean;

  @IsBoolean()
  @IsOptional()
  showTimestamp?: boolean;

  @IsBoolean()
  @IsOptional()
  showRequestAccess?: boolean;

  @IsString()
  @IsOptional()
  customCss?: string;

  @IsString()
  @IsOptional()
  customHtml?: string;

  // Footer
  @IsString()
  @IsOptional()
  footerText?: string;

  @IsEmail()
  @IsOptional()
  supportEmail?: string;

  @IsUrl()
  @IsOptional()
  supportUrl?: string;
}

export class UpdateBlockPageDto extends CreateBlockPageDto {}

export class CreateAccessRequestDto {
  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsEmail()
  @IsOptional()
  requesterEmail?: string;

  @IsString()
  @IsOptional()
  locationToken?: string;
}

export class ReviewAccessRequestDto {
  @IsString()
  @IsNotEmpty()
  status: 'approved' | 'denied';

  @IsString()
  @IsOptional()
  reviewNote?: string;

  @IsString()
  @IsOptional()
  expiresInHours?: number; // For approved requests, how long to allow
}
