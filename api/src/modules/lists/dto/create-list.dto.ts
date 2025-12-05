import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ListType } from '../entities/custom-list.entity';

export class CreateListDto {
  @ApiProperty({ example: 'Corporate Blocklist' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Domains blocked for all employees' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['allowlist', 'blocklist'] })
  @IsEnum(['allowlist', 'blocklist'])
  type: ListType;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
