import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

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
        return;
      }

      if (fs.existsSync(this.dbPath)) {
        this.reader = await maxmind.open(this.dbPath);
        this.logger.log(`GeoIP database loaded from ${this.dbPath}`);
      } else {
        this.logger.warn(
          `GeoIP database not found at ${this.dbPath}, using mock data`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to load GeoIP database: ${error.message}`);
    }
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
          };
        }
      } catch (error) {
        this.logger.debug(`GeoIP lookup failed for ${ip}: ${error.message}`);
      }
    }

    // Return mock data based on IP patterns for demo purposes
    return this.getMockLocation(ip);
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
    const hash = ip.split('.').reduce((acc, part) => acc + parseInt(part), 0);
    const locations = [
      {
        country: 'United States',
        countryCode: 'US',
        city: 'New York',
        lat: 40.7128,
        lng: -74.006,
      },
      {
        country: 'United Kingdom',
        countryCode: 'GB',
        city: 'London',
        lat: 51.5074,
        lng: -0.1278,
      },
      {
        country: 'Germany',
        countryCode: 'DE',
        city: 'Berlin',
        lat: 52.52,
        lng: 13.405,
      },
      {
        country: 'Japan',
        countryCode: 'JP',
        city: 'Tokyo',
        lat: 35.6762,
        lng: 139.6503,
      },
      {
        country: 'Australia',
        countryCode: 'AU',
        city: 'Sydney',
        lat: -33.8688,
        lng: 151.2093,
      },
    ];

    const loc = locations[hash % locations.length];
    return {
      country: loc.country,
      countryCode: loc.countryCode,
      region: '',
      city: loc.city,
      latitude: loc.lat,
      longitude: loc.lng,
      timezone: 'UTC',
    };
  }
}
