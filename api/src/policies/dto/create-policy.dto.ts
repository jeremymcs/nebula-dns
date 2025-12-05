import { IsString, IsObject, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreatePolicyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  config: {
    block_categories?: string[];
    block_threats?: boolean;
    safe_search_enabled?: boolean;
    schedule?: any;
    allowlist_enabled?: boolean;
    blocklist_enabled?: boolean;
  };
}
