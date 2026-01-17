// Nebula DNS - GeoIP DTOs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * GeoIP lookup result - location data response
 */
export class GeoIPResult {
  @ApiProperty({ description: 'Country name', example: 'United States' })
  country: string;

  @ApiProperty({ description: 'ISO country code', example: 'US' })
  countryCode: string;

  @ApiProperty({ description: 'Region/state name', example: 'California' })
  region: string;

  @ApiProperty({ description: 'City name', example: 'San Francisco' })
  city: string;

  @ApiProperty({ description: 'Timezone', example: 'America/Los_Angeles' })
  timezone: string;

  @ApiProperty({
    description: 'Geographic coordinates',
    example: { latitude: 37.7749, longitude: -122.4194 },
  })
  coordinates: {
    latitude: number;
    longitude: number;
  };

  @ApiPropertyOptional({
    description: 'Internet Service Provider',
    example: 'Comcast Cable',
  })
  isp?: string;

  @ApiPropertyOptional({
    description: 'Organization name',
    example: 'Acme Corp',
  })
  org?: string;
}

/**
 * GeoIP lookup response wrapper
 */
export class GeoIPLookupResponse {
  @ApiProperty({ description: 'The IP address that was looked up' })
  ip: string;

  @ApiProperty({ description: 'Location data for the IP', type: GeoIPResult })
  data: GeoIPResult;

  @ApiProperty({
    description: 'Timestamp of the lookup',
    example: '2026-01-16T10:30:00.000Z',
  })
  timestamp: string;
}

/**
 * GeoIP database status response
 */
export class GeoIPStatus {
  @ApiProperty({
    description: 'Database version or build date',
    example: '2026.01.15',
  })
  databaseVersion: string;

  @ApiProperty({
    description: 'Last database update timestamp',
    example: '2026-01-15T00:00:00.000Z',
  })
  lastUpdate: string;

  @ApiProperty({
    description: 'Total number of records in the database',
    example: 3500000,
  })
  recordCount: number;

  @ApiProperty({
    description: 'Database type (e.g., GeoLite2-City, GeoIP2-City)',
    example: 'GeoLite2-City',
  })
  databaseType: string;

  @ApiProperty({ description: 'Whether the database is loaded', example: true })
  isLoaded: boolean;

  @ApiPropertyOptional({
    description: 'Path to the database file',
    example: '/usr/share/GeoIP/GeoLite2-City.mmdb',
  })
  databasePath?: string;
}

/**
 * GeoIP database refresh result
 */
export class RefreshResult {
  @ApiProperty({ description: 'Whether the refresh was successful' })
  success: boolean;

  @ApiProperty({
    description: 'New database version after refresh',
    example: '2026.01.16',
  })
  newVersion: string;

  @ApiProperty({
    description: 'Previous database version',
    example: '2026.01.15',
  })
  previousVersion: string;

  @ApiProperty({
    description: 'Number of records updated',
    example: 15000,
  })
  recordsUpdated: number;

  @ApiProperty({
    description: 'Timestamp of the refresh operation',
    example: '2026-01-16T10:30:00.000Z',
  })
  refreshedAt: string;

  @ApiPropertyOptional({
    description: 'Error message if refresh failed',
    example: 'Failed to download database',
  })
  error?: string;
}

/**
 * Error response for GeoIP operations
 */
export class GeoIPErrorResponse {
  @ApiProperty({ description: 'HTTP status code', example: 400 })
  statusCode: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Invalid IP address format',
  })
  message: string;

  @ApiProperty({ description: 'Error type', example: 'Bad Request' })
  error: string;
}
