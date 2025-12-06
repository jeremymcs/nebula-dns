import { IsString, IsNotEmpty, IsOptional, IsEmail, IsArray, ArrayMinSize, IsEnum } from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(['owner', 'admin', 'analyst', 'readonly'])
  role: 'owner' | 'admin' | 'analyst' | 'readonly';

  @IsString()
  @IsOptional()
  message?: string;
}

export class BulkInviteDto {
  @IsArray()
  @ArrayMinSize(1)
  invitations: CreateInvitationDto[];
}

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class InvitationResponseDto {
  id: string;
  email: string;
  role: string;
  status: string;
  message?: string;
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };
  expiresAt: Date;
  createdAt: Date;
}

export class InvitationInfoDto {
  tenantName: string;
  tenantSlug: string;
  email: string;
  role: string;
  invitedByName: string;
  message?: string;
  expiresAt: Date;
  isExpired: boolean;
}
