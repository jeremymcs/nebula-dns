import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlaybookTrigger, PlaybookAction } from '../entities/playbook.entity';

export class PlaybookActionDto {
  @IsEnum(PlaybookAction)
  type: PlaybookAction;

  @IsOptional()
  config?: Record<string, any>;
}

export class CreatePlaybookDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PlaybookTrigger)
  trigger: PlaybookTrigger;

  @IsOptional()
  triggerConditions?: Record<string, any>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaybookActionDto)
  actions: PlaybookActionDto[];

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdatePlaybookDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PlaybookTrigger)
  trigger?: PlaybookTrigger;

  @IsOptional()
  triggerConditions?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaybookActionDto)
  actions?: PlaybookActionDto[];

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
