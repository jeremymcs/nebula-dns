import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTokenDto {
  @ApiPropertyOptional({ example: 'Primary Router Token' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    example: 90,
    description: 'Token expiration in days. If not set, token does not expire.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number;
}
