import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUrl,
  IsEmail,
  Matches,
  IsIn,
  IsInt,
  Min,
  Max,
  ValidateIf,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBlockPageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(['tenant', 'msp'])
  @IsOptional()
  scope?: 'tenant' | 'msp';

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ValidateIf((o) => o.logoUrl !== undefined && o.logoUrl !== '')
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
  secondaryColor?: string;

  @Matches(/^#[0-9A-Fa-f]{6}$/)
  @IsOptional()
  accentColor?: string;

  @Matches(/^#[0-9A-Fa-f]{6}$/)
  @IsOptional()
  textColor?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsBoolean()
  @IsOptional()
  messageMarkdown?: boolean;

  @IsBoolean()
  @IsOptional()
  showCategory?: boolean;

  @IsBoolean()
  @IsOptional()
  showDomain?: boolean;

  @IsBoolean()
  @IsOptional()
  showReason?: boolean;

  @IsBoolean()
  @IsOptional()
  showTimestamp?: boolean;

  @IsBoolean()
  @IsOptional()
  showRequestAccess?: boolean;

  @IsBoolean()
  @IsOptional()
  showPoweredBy?: boolean;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  customCss?: string;

  @IsString()
  @IsOptional()
  customHtml?: string;

  @IsString()
  @IsOptional()
  footerText?: string;

  @IsEmail()
  @IsOptional()
  supportEmail?: string;

  @ValidateIf((o) => o.supportUrl !== undefined && o.supportUrl !== '')
  @IsUrl()
  @IsOptional()
  supportUrl?: string;
}

export class UpdateBlockPageDto extends CreateBlockPageDto {}

export class UpdatePlatformBlockPageDto extends CreateBlockPageDto {}

export class CreateAccessRequestDto {
  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  blockReason?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  reason?: string;

  @IsEmail()
  @IsOptional()
  requesterEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  requesterName?: string;

  @IsString()
  @IsOptional()
  locationToken?: string;

  @IsString()
  @IsOptional()
  tenantId?: string;

  /** Honeypot — must be empty */
  @IsOptional()
  @IsString()
  companyWebsite?: string;

  @IsOptional()
  @IsString()
  turnstileToken?: string;
}

export class ReviewAccessRequestDto {
  @IsString()
  @IsNotEmpty()
  status: 'approved' | 'denied';

  @IsString()
  @IsOptional()
  reviewNote?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8760)
  expiresInHours?: number;

  @IsBoolean()
  @IsOptional()
  addToAllowList?: boolean;

  @IsString()
  @IsOptional()
  allowListId?: string;
}
