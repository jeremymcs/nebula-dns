// Nebula DNS - Family Invitation DTOs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO for creating a family invitation
 */
export class CreateFamilyInvitationDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;
}

/**
 * DTO for accepting a family invitation
 */
export class AcceptFamilyInvitationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

/**
 * Response DTO for family invitation
 */
export class FamilyInvitationResponseDto {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  invitedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

/**
 * Response DTO for family invitation info (public, for accept page)
 */
export class FamilyInvitationInfoDto {
  tenantName: string;
  email: string;
  displayName: string | null;
  invitedByName: string;
  expiresAt: Date;
  isExpired: boolean;
}

/**
 * Response DTO for family member (user with member role)
 */
export class FamilyMemberUserDto {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
}

/**
 * Response for the family overview endpoint
 */
export class FamilyOverviewDto {
  members: FamilyMemberUserDto[];
  pendingInvitations: FamilyInvitationResponseDto[];
  totalMembers: number;
  maxMembers: number;
  remainingSlots: number;
}
