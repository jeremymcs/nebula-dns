import { IsEmail, IsString, IsEnum, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(['owner', 'admin', 'analyst', 'read_only'])
  role: 'owner' | 'admin' | 'analyst' | 'read_only';
}
