import { PartialType, OmitType } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePolicyDto } from './create-policy.dto';

export class UpdatePolicyDto extends PartialType(
  OmitType(CreatePolicyDto, ['isDefault'] as const),
) {
  @ApiPropertyOptional({ example: 'Updated blocklist' })
  @IsOptional()
  @IsString()
  changelog?: string;
}
