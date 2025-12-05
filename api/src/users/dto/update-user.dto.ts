import { IsEnum, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(['owner', 'admin', 'analyst', 'read_only'])
  role?: 'owner' | 'admin' | 'analyst' | 'read_only';

  @IsOptional()
  @IsEnum(['active', 'locked', 'suspended'])
  status?: 'active' | 'locked' | 'suspended';
}
