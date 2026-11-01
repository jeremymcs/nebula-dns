// Flux Shield - TLS certificate expiry DTOs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CertificateExpiryEntryDto {
  @ApiProperty({ description: 'Public hostname probed' })
  hostname: string;

  @ApiProperty({ description: 'Service label (e.g. DoT, DoH)' })
  service: string;

  @ApiProperty()
  port: number;

  @ApiPropertyOptional()
  notAfter: string | null;

  @ApiPropertyOptional()
  daysRemaining: number | null;

  @ApiProperty({ enum: ['ok', 'warning', 'critical', 'unknown', 'error'] })
  status: 'ok' | 'warning' | 'critical' | 'unknown' | 'error';

  @ApiPropertyOptional()
  errorMessage: string | null;
}

export class CertificateExpiryResponseDto {
  @ApiProperty({ type: [CertificateExpiryEntryDto] })
  certificates: CertificateExpiryEntryDto[];

  @ApiProperty()
  checkedAt: string;
}
