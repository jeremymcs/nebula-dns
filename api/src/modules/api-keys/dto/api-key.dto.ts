import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsArray, IsDateString, Min, Max, ArrayMinSize } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsOptional()
  scopes?: ('read' | 'write' | 'admin')[];

  @IsNumber()
  @Min(10)
  @Max(10000)
  @IsOptional()
  rateLimit?: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class UpdateApiKeyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  scopes?: ('read' | 'write' | 'admin')[];

  @IsNumber()
  @Min(10)
  @Max(10000)
  @IsOptional()
  rateLimit?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class ApiKeyResponseDto {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export class NewApiKeyResponseDto extends ApiKeyResponseDto {
  // Only returned once when creating
  apiKey: string;
}

export class ApiKeyUsageStatsDto {
  totalRequests: number;
  requestsToday: number;
  requestsThisWeek: number;
  averageResponseTime: number;
  topEndpoints: { endpoint: string; count: number }[];
  errorRate: number;
}
