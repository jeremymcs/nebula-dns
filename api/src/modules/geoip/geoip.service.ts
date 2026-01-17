// Nebula DNS - GeoIP Service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { GeoIPStatus, RefreshResult } from './dto/geoip.dto';

export interface GeoLocation {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isp?: string;
  org?: string;
}

@Injectable()
export class GeoIPService implements OnModuleInit {
  private readonly logger = new Logger(GeoIPService.name);
  private reader: any = null;
  private readonly dbPath: string;
  private databaseMetadata: {
    version: string;
    lastUpdate: Date;
    recordCount: number;
    databaseType: string;
  } | null = null;

  constructor(private configService: ConfigService) {
    this.dbPath =
      this.configService.get<string>('GEOIP_DB_PATH') ||
      '/usr/share/GeoIP/GeoLite2-City.mmdb';
  }

  async onModuleInit() {
    await this.loadDatabase();
  }

  private async loadDatabase() {
    try {
      // Check if maxmind reader is available
      const maxmind = await import('maxmind').catch(() => null);

      if (!maxmind) {
        this.logger.warn(
          'maxmind library not available, using mock GeoIP data',
        );
        this.initializeMockMetadata();
        return;
      }

      if (fs.existsSync(this.dbPath)) {
        this.reader = await maxmind.open(this.dbPath);
        this.logger.log(`GeoIP database loaded from ${this.dbPath}`);

        // Extract metadata from the database
        await this.extractDatabaseMetadata();
      } else {
        this.logger.warn(
          `GeoIP database not found at ${this.dbPath}, using mock data`,
        );
        this.initializeMockMetadata();
      }
    } catch (error) {
      this.logger.error(`Failed to load GeoIP database: ${error.message}`);
      this.initializeMockMetadata();
    }
  }

  private async extractDatabaseMetadata() {
    try {
      if (this.reader && this.reader.metadata) {
        const metadata = this.reader.metadata;
        this.databaseMetadata = {
          version: metadata.buildEpoch
            ? new Date(metadata.buildEpoch * 1000).toISOString().split('T')[0]
            : 'unknown',
          lastUpdate: metadata.buildEpoch
            ? new Date(metadata.buildEpoch * 1000)
            : new Date(),
          recordCount: metadata.nodeCount || 0,
          databaseType: metadata.databaseType || 'GeoLite2-City',
        };
      } else {
        // Fallback: use file stats
        const stats = fs.statSync(this.dbPath);
        this.databaseMetadata = {
          version: stats.mtime.toISOString().split('T')[0],
          lastUpdate: stats.mtime,
          recordCount: 3500000, // Approximate for GeoLite2-City
          databaseType: 'GeoLite2-City',
        };
      }
    } catch (error) {
      this.logger.debug(
        `Failed to extract database metadata: ${error.message}`,
      );
      this.initializeMockMetadata();
    }
  }

  private initializeMockMetadata() {
    this.databaseMetadata = {
      version: '2026.01.15',
      lastUpdate: new Date(),
      recordCount: 3500000,
      databaseType: 'Mock Database',
    };
  }

  lookup(ip: string): GeoLocation | null {
    // Skip private/local IPs
    if (this.isPrivateIP(ip)) {
      return {
        country: 'Local Network',
        countryCode: 'LO',
        region: '',
        city: 'Private',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
      };
    }

    if (this.reader) {
      try {
        const result = this.reader.get(ip);
        if (result) {
          return {
            country: result.country?.names?.en || 'Unknown',
            countryCode: result.country?.iso_code || 'XX',
            region: result.subdivisions?.[0]?.names?.en || '',
            city: result.city?.names?.en || '',
            latitude: result.location?.latitude || 0,
            longitude: result.location?.longitude || 0,
            timezone: result.location?.time_zone || 'UTC',
            isp: result.traits?.isp,
            org: result.traits?.organization,
          };
        }
      } catch (error) {
        this.logger.debug(`GeoIP lookup failed for ${ip}: ${error.message}`);
      }
    }

    // Return mock data based on IP patterns for demo purposes
    return this.getMockLocation(ip);
  }

  /**
   * Get the current status of the GeoIP database
   */
  async getDatabaseStatus(): Promise<GeoIPStatus> {
    const isLoaded = this.reader !== null;

    return {
      databaseVersion: this.databaseMetadata?.version || 'unknown',
      lastUpdate:
        this.databaseMetadata?.lastUpdate?.toISOString() ||
        new Date().toISOString(),
      recordCount: this.databaseMetadata?.recordCount || 0,
      databaseType: this.databaseMetadata?.databaseType || 'Unknown',
      isLoaded,
      databasePath: this.dbPath,
    };
  }

  /**
   * Refresh the GeoIP database
   * In production, this would download a new database from MaxMind
   */
  async refreshDatabase(): Promise<RefreshResult> {
    const previousVersion = this.databaseMetadata?.version || 'unknown';
    const startTime = new Date();

    try {
      this.logger.log('Starting GeoIP database refresh...');

      // Close existing reader if present
      if (this.reader) {
        // Note: maxmind reader doesn't have a close method, but we can null it
        this.reader = null;
      }

      // In a production environment, you would:
      // 1. Download the new database from MaxMind using their API
      // 2. Verify the download integrity
      // 3. Replace the existing database file
      // 4. Reload the database

      // For now, we simulate a refresh by reloading the existing database
      await this.loadDatabase();

      const newVersion = this.databaseMetadata?.version || 'unknown';
      const recordsUpdated = this.databaseMetadata?.recordCount || 0;

      this.logger.log(
        `GeoIP database refresh completed. Version: ${newVersion}`,
      );

      return {
        success: true,
        newVersion,
        previousVersion,
        recordsUpdated,
        refreshedAt: startTime.toISOString(),
      };
    } catch (error) {
      this.logger.error(`GeoIP database refresh failed: ${error.message}`);

      return {
        success: false,
        newVersion: previousVersion,
        previousVersion,
        recordsUpdated: 0,
        refreshedAt: startTime.toISOString(),
        error: error.message,
      };
    }
  }

  async getQueryLocations(
    tenantId: string,
    queries: Array<{ clientIp: string; count: number }>,
  ): Promise<
    Array<{
      location: GeoLocation;
      queryCount: number;
      percentage: number;
    }>
  > {
    const totalQueries = queries.reduce((sum, q) => sum + q.count, 0);
    const locationMap = new Map<
      string,
      { location: GeoLocation; count: number }
    >();

    for (const query of queries) {
      const geo = this.lookup(query.clientIp);
      if (geo) {
        const key = `${geo.countryCode}-${geo.city}`;
        const existing = locationMap.get(key);
        if (existing) {
          existing.count += query.count;
        } else {
          locationMap.set(key, { location: geo, count: query.count });
        }
      }
    }

    return Array.from(locationMap.values())
      .map(({ location, count }) => ({
        location,
        queryCount: count,
        percentage: totalQueries > 0 ? (count / totalQueries) * 100 : 0,
      }))
      .sort((a, b) => b.queryCount - a.queryCount);
  }

  private isPrivateIP(ip: string): boolean {
    // Handle IPv6 localhost
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
      return true;
    }

    // Handle IPv4
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;

    return (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 127
    );
  }

  private getMockLocation(ip: string): GeoLocation {
    // Generate deterministic mock data based on IP
    let hash: number;

    if (ip.includes(':')) {
      // IPv6: use first few segments
      hash = ip
        .split(':')
        .slice(0, 4)
        .reduce((acc, part) => acc + parseInt(part || '0', 16), 0);
    } else {
      // IPv4
      hash = ip.split('.').reduce((acc, part) => acc + parseInt(part), 0);
    }

    const locations = [
      {
        country: 'United States',
        countryCode: 'US',
        city: 'New York',
        region: 'New York',
        lat: 40.7128,
        lng: -74.006,
        timezone: 'America/New_York',
      },
      {
        country: 'United Kingdom',
        countryCode: 'GB',
        city: 'London',
        region: 'England',
        lat: 51.5074,
        lng: -0.1278,
        timezone: 'Europe/London',
      },
      {
        country: 'Germany',
        countryCode: 'DE',
        city: 'Berlin',
        region: 'Berlin',
        lat: 52.52,
        lng: 13.405,
        timezone: 'Europe/Berlin',
      },
      {
        country: 'Japan',
        countryCode: 'JP',
        city: 'Tokyo',
        region: 'Tokyo',
        lat: 35.6762,
        lng: 139.6503,
        timezone: 'Asia/Tokyo',
      },
      {
        country: 'Australia',
        countryCode: 'AU',
        city: 'Sydney',
        region: 'New South Wales',
        lat: -33.8688,
        lng: 151.2093,
        timezone: 'Australia/Sydney',
      },
    ];

    const loc = locations[hash % locations.length];
    return {
      country: loc.country,
      countryCode: loc.countryCode,
      region: loc.region,
      city: loc.city,
      latitude: loc.lat,
      longitude: loc.lng,
      timezone: loc.timezone,
    };
  }
}
