import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsArray,
  IsIP,
  ValidateIf,
} from 'class-validator';
import { AgentRole } from '../entities/agent-installation.entity';

export class CreateDownloadLinkDto {
  @IsString()
  @IsIn(['windows', 'macos', 'linux', 'ios', 'android'])
  platform: 'windows' | 'macos' | 'linux' | 'ios' | 'android';

  @IsUUID()
  @IsOptional()
  locationId?: string;

  @IsArray()
  @IsIn(['site-updater', 'dns-enforce'], { each: true })
  @IsOptional()
  roles?: AgentRole[];
}

export class RegisterAgentDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsOptional()
  deviceName?: string;

  @IsString()
  @IsIn(['windows', 'macos', 'linux', 'ios', 'android'])
  platform: 'windows' | 'macos' | 'linux' | 'ios' | 'android';

  @IsString()
  @IsOptional()
  osVersion?: string;

  @IsString()
  @IsNotEmpty()
  agentVersion: string;

  @IsString()
  @IsNotEmpty()
  installationToken: string;

  @IsArray()
  @IsIn(['site-updater', 'dns-enforce'], { each: true })
  @IsOptional()
  roles?: AgentRole[];
}

export class AgentHeartbeatDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsNotEmpty()
  agentVersion: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  status?: 'active' | 'error';

  @IsString()
  @IsOptional()
  errorMessage?: string;

  @IsBoolean()
  @IsOptional()
  dnsEnforced?: boolean;

  @IsArray()
  @IsIn(['site-updater', 'dns-enforce'], { each: true })
  @IsOptional()
  roles?: AgentRole[];

  @IsBoolean()
  @IsOptional()
  tamperDetected?: boolean;

  @IsString()
  @IsOptional()
  tamperDetail?: string;
}

export class UpdateAgentDto {
  @IsString()
  @IsOptional()
  deviceName?: string;

  @IsUUID()
  @IsOptional()
  locationId?: string;
}

export class AgentSiteIpUpdateDto {
  @ValidateIf((o) => !o.publicIpv6)
  @IsIP('4')
  @IsOptional()
  publicIpv4?: string;

  @ValidateIf((o) => !o.publicIpv4)
  @IsIP('6')
  @IsOptional()
  publicIpv6?: string;

  @IsString()
  @IsOptional()
  source?: string;
}

export interface AgentRegistrationResult {
  agent: AgentInstallationResponse;
  deviceSecret: string;
  dohToken: string;
  config: AgentRuntimeConfig;
}

export interface AgentInstallationResponse {
  id: string;
  deviceName: string;
  locationId: string | null;
  roles: AgentRole[];
}

export interface AgentRuntimeConfig {
  apiEndpoint: string;
  dohEndpoint: string;
  dnsServers: string[];
  roles: AgentRole[];
  tenantId: string;
  locationId: string | null;
  internalDnsZones?: string[];
}
