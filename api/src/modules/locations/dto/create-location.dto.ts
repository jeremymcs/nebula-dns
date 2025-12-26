import { IsString, IsOptional, IsUUID, IsInt, Min, Max, ValidateIf, IsFQDN, Matches } from 'class-validator';
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

  @ApiPropertyOptional({
    example: '192.168.1.0/24',
    description: 'Static IP address or CIDR range. Required if dyndns is not provided.'
  })
  @ValidateIf((o) => !o.dyndns)
  @IsString()
  @Matches(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/, {
    message: 'ipRange must be a valid IP address or CIDR notation (e.g., 192.168.1.0/24)',
  })
  ipRange?: string;

  @ApiPropertyOptional({
    example: 'office.dyndns.org',
    description: 'Dynamic DNS hostname. Required if ipRange is not provided.'
  })
  @ValidateIf((o) => !o.ipRange)
  @IsString()
  @IsFQDN({}, { message: 'dyndns must be a valid fully qualified domain name' })
  dyndns?: string;

  @ApiPropertyOptional({ example: 5000, default: 1000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(100000)
  rateLimit?: number;
}
