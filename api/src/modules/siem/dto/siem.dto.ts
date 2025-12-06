import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsObject, IsArray } from 'class-validator';

export class CreateSplunkIntegrationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  hecUrl: string;

  @IsString()
  @IsNotEmpty()
  hecToken: string;

  @IsString()
  @IsOptional()
  index?: string;

  @IsString()
  @IsOptional()
  sourceType?: string;

  @IsArray()
  @IsOptional()
  logTypes?: string[];

  @IsBoolean()
  @IsOptional()
  includeAllowed?: boolean;

  @IsString()
  @IsOptional()
  minSeverity?: string;
}

export class CreateElasticIntegrationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsString()
  @IsOptional()
  indexPattern?: string;

  @IsArray()
  @IsOptional()
  logTypes?: string[];

  @IsBoolean()
  @IsOptional()
  includeAllowed?: boolean;
}

export class CreateSentinelIntegrationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  sharedKey: string;

  @IsString()
  @IsOptional()
  logType?: string;

  @IsArray()
  @IsOptional()
  logTypes?: string[];
}

export class CreateSyslogIntegrationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  host: string;

  @IsString()
  @IsNotEmpty()
  port: string;

  @IsEnum(['tcp', 'udp', 'tls'])
  protocol: 'tcp' | 'udp' | 'tls';

  @IsEnum(['cef', 'leef', 'json', 'rfc5424'])
  @IsOptional()
  format?: string;

  @IsArray()
  @IsOptional()
  logTypes?: string[];
}

export class UpdateSiemIntegrationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsArray()
  @IsOptional()
  logTypes?: string[];

  @IsBoolean()
  @IsOptional()
  includeAllowed?: boolean;

  @IsString()
  @IsOptional()
  minSeverity?: string;
}

export class SiemTestResultDto {
  success: boolean;
  message: string;
  responseTime?: number;
}

export class SiemIntegrationResponseDto {
  id: string;
  name: string;
  integrationType: string;
  isEnabled: boolean;
  logTypes: string[];
  includeAllowed: boolean;
  minSeverity: string;
  lastSentAt?: Date | null;
  lastError?: string | null;
  errorCount: number;
  createdAt: Date;
}
