import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SetPlatformConnectionDto {
  @ApiProperty({ example: 'Flux Labs production CF' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label: string;

  @ApiProperty({
    description: 'Cloudflare API token (never returned after save)',
  })
  @IsString()
  @MinLength(10)
  apiToken: string;

  @ApiPropertyOptional({
    description:
      'Cloudflare account id (required when the token can access multiple accounts)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  accountId?: string;
}

export class DiscoverPlatformAccountsDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  apiToken: string;
}

export class PlatformAccountOptionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class RotatePlatformConnectionDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  apiToken: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  accountId?: string;
}

export class RevokePlatformConnectionDto {
  @ApiProperty({ description: 'Must be true to revoke' })
  @IsBoolean()
  confirm: boolean;
}

export class PlatformConnectionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  provider: string;

  @ApiProperty()
  purpose: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ nullable: true })
  verifiedAt: Date | null;

  @ApiProperty()
  tokenFingerprint: string;

  @ApiPropertyOptional()
  accountId?: string;

  @ApiPropertyOptional()
  inventorySyncedAt?: string;
}

export class PlatformConnectionStatusEnvelopeDto {
  @ApiProperty({
    type: PlatformConnectionResponseDto,
    nullable: true,
    description: 'Active platform connection, or null when not configured',
  })
  connection: PlatformConnectionResponseDto | null;
}

export class AssignZoneDto {
  @ApiProperty()
  @IsUUID()
  tenantId: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  canEditRecords?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  canToggleProxy?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  canDeleteRecords?: boolean;
}

export class UpdateZonePermissionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canEditRecords?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canToggleProxy?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canDeleteRecords?: boolean;
}

export class CreatePlatformZoneDto {
  @ApiProperty({ example: 'customer.example.com' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  canEditRecords?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  canToggleProxy?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  canDeleteRecords?: boolean;
}

export class AdminZoneListItemDto {
  @ApiProperty()
  providerZoneId: string;

  @ApiProperty()
  zoneName: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ type: [String] })
  nameServers: string[];

  @ApiPropertyOptional()
  assignmentId?: string;

  @ApiPropertyOptional()
  tenantId?: string;

  @ApiPropertyOptional()
  tenantName?: string;
}

export class TenantZoneResponseDto {
  @ApiProperty({ description: 'Assignment UUID exposed as zoneId' })
  id: string;

  @ApiProperty()
  zoneName: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ type: [String] })
  nameServers: string[];

  @ApiProperty()
  canEditRecords: boolean;

  @ApiProperty()
  canToggleProxy: boolean;

  @ApiProperty()
  canDeleteRecords: boolean;
}

export class DnsRecordResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  ttl: number;

  @ApiPropertyOptional()
  proxied?: boolean;

  @ApiPropertyOptional()
  priority?: number;
}
