import { IsString, IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLocationDto {
  @ApiProperty({ example: 'Main Office' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Primary office network' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  policyId?: string;

  @ApiPropertyOptional({ example: '192.168.1.0/24' })
  @IsOptional()
  @IsString()
  ipRange?: string;

  @ApiPropertyOptional({ example: 5000, default: 1000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(100000)
  rateLimit?: number;
}
