import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsBoolean,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AttributeMappingDto {
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  role?: string;
}

export class ConfigureSamlDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsUrl()
  @IsNotEmpty()
  ssoUrl: string;

  @IsUrl()
  @IsOptional()
  sloUrl?: string;

  @IsString()
  @IsNotEmpty()
  certificate: string; // Base64 encoded X.509 certificate

  @IsBoolean()
  @IsOptional()
  autoProvisionUsers?: boolean;

  @IsString()
  @IsIn(['owner', 'admin', 'analyst', 'readonly'])
  @IsOptional()
  defaultRole?: 'owner' | 'admin' | 'analyst' | 'readonly';

  @IsString()
  @IsOptional()
  domainRestriction?: string;

  @ValidateNested()
  @Type(() => AttributeMappingDto)
  @IsOptional()
  attributeMapping?: AttributeMappingDto;
}

export class ConfigureOidcDto {
  @IsUrl()
  @IsNotEmpty()
  issuer: string;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  clientSecret: string;

  @IsUrl()
  @IsOptional()
  authorizationUrl?: string;

  @IsUrl()
  @IsOptional()
  tokenUrl?: string;

  @IsUrl()
  @IsOptional()
  userinfoUrl?: string;

  @IsString()
  @IsOptional()
  scopes?: string;

  @IsBoolean()
  @IsOptional()
  autoProvisionUsers?: boolean;

  @IsString()
  @IsIn(['owner', 'admin', 'analyst', 'readonly'])
  @IsOptional()
  defaultRole?: 'owner' | 'admin' | 'analyst' | 'readonly';

  @IsString()
  @IsOptional()
  domainRestriction?: string;

  @ValidateNested()
  @Type(() => AttributeMappingDto)
  @IsOptional()
  attributeMapping?: AttributeMappingDto;
}

export class SsoLoginDto {
  @IsString()
  @IsNotEmpty()
  tenantSlug: string;
}

export class SamlCallbackDto {
  @IsString()
  @IsNotEmpty()
  SAMLResponse: string;

  @IsString()
  @IsOptional()
  RelayState?: string;
}

export class OidcCallbackDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  state: string;
}
