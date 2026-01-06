import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateDownloadLinkDto {
  @IsString()
  @IsIn(['windows', 'macos', 'linux', 'ios', 'android'])
  platform: 'windows' | 'macos' | 'linux' | 'ios' | 'android';

  @IsUUID()
  @IsOptional()
  locationId?: string;
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
}

export class UpdateAgentDto {
  @IsString()
  @IsOptional()
  deviceName?: string;

  @IsUUID()
  @IsOptional()
  locationId?: string;
}
