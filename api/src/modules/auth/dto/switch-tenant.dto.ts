import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwitchTenantDto {
  @ApiProperty({
    description: 'The ID of the tenant/organization to switch to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;
}

