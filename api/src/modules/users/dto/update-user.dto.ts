import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description:
      'Password must be at least 12 characters with uppercase, lowercase, number, and special character',
  })
  @IsOptional()
  @IsString()
  @MinLength(12)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  password?: string;

  @ApiPropertyOptional({ enum: ['owner', 'admin', 'analyst', 'readonly'] })
  @IsOptional()
  @IsEnum(['owner', 'admin', 'analyst', 'readonly'])
  role?: UserRole;
}
