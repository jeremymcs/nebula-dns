import { IsString, IsOptional, IsEmail, IsEnum, IsObject, MinLength, MaxLength } from 'class-validator';
import { PartnerStatus, PartnerPlan, PartnerBranding, PartnerSettings } from '../entities/partner.entity';
import { PartnerUserRole, PartnerUserStatus } from '../entities/partner-user.entity';

// Partner DTOs
export class CreatePartnerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  slug: string;

  @IsOptional()
  @IsEnum(['active', 'suspended', 'cancelled'])
  status?: PartnerStatus;

  @IsOptional()
  @IsEnum(['starter', 'professional', 'enterprise'])
  plan?: PartnerPlan;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsObject()
  branding?: PartnerBranding;

  @IsOptional()
  @IsObject()
  settings?: PartnerSettings;
}

export class UpdatePartnerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEnum(['active', 'suspended', 'cancelled'])
  status?: PartnerStatus;

  @IsOptional()
  @IsEnum(['starter', 'professional', 'enterprise'])
  plan?: PartnerPlan;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsObject()
  branding?: PartnerBranding;

  @IsOptional()
  @IsObject()
  settings?: PartnerSettings;
}

// Partner User DTOs
export class CreatePartnerUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(['partner_owner', 'partner_admin', 'partner_support', 'partner_billing'])
  role: PartnerUserRole;
}

export class UpdatePartnerUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEnum(['partner_owner', 'partner_admin', 'partner_support', 'partner_billing'])
  role?: PartnerUserRole;

  @IsOptional()
  @IsEnum(['active', 'suspended', 'pending'])
  status?: PartnerUserStatus;
}

export class PartnerLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  mfaCode?: string;
}

export class ImpersonateOrganizationDto {
  @IsString()
  organizationId: string;
}

// Organization DTOs (for partner to manage sub-clients)
export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsEnum(['free', 'starter', 'pro', 'enterprise'])
  plan?: 'free' | 'starter' | 'pro' | 'enterprise';

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  companySize?: string;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEnum(['active', 'suspended', 'cancelled'])
  status?: 'active' | 'suspended' | 'cancelled';

  @IsOptional()
  @IsEnum(['free', 'starter', 'pro', 'enterprise'])
  plan?: 'free' | 'starter' | 'pro' | 'enterprise';

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  companySize?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

