import {
  IsArray,
  ValidateNested,
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntryType } from '../entities/custom-list-entry.entity';

class ListEntryDto {
  @ApiProperty({ example: 'example.com' })
  @IsString()
  domain: string;

  @ApiPropertyOptional({ enum: ['exact', 'wildcard'], default: 'exact' })
  @IsOptional()
  @IsEnum(['exact', 'wildcard'])
  type?: EntryType;

  @ApiPropertyOptional({ example: 'Blocked per policy' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class AddEntriesDto {
  @ApiProperty({ type: [ListEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListEntryDto)
  entries: ListEntryDto[];
}
