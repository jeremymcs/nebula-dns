// Nebula DNS - MSP Context Switch DTOs
// DTOs for MSP client context switching (US-007)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for successful context switch to client tenant
 */
export class ContextSwitchResponseDto {
  @ApiProperty({ description: 'New JWT access token scoped to client tenant' })
  accessToken: string;

  @ApiProperty({ description: 'Client organization name' })
  clientName: string;

  @ApiProperty({ description: 'Client tenant ID' })
  clientTenantId: string;

  @ApiProperty({ description: 'Client tier (home, enterprise, msp)' })
  tier: string;
}

/**
 * Response DTO for switch-back to MSP tenant
 */
export class SwitchBackResponseDto {
  @ApiProperty({ description: 'New JWT access token scoped to MSP tenant' })
  accessToken: string;

  @ApiProperty({ description: 'MSP organization name' })
  mspName: string;

  @ApiProperty({ description: 'MSP tenant ID' })
  mspTenantId: string;
}
