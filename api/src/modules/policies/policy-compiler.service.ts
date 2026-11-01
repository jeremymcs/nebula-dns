import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from './entities/policy.entity';
import { PolicyVersion, PolicyConfig } from './entities/policy-version.entity';
import { Location } from '../locations/entities/location.entity';
import { CustomList } from '../lists/entities/custom-list.entity';
import { CustomListEntry } from '../lists/entities/custom-list-entry.entity';
import { RedisService } from '../redis/redis.service';
import { Tenant } from '../tenants/entities/tenant.entity';

export interface CompiledPolicy {
  tenantId: string;
  locationId: string;
  policyVersion: number;
  allowlistExact: Record<string, boolean>;
  allowlistWildcardPatterns: string[];
  blocklistExact: Record<string, boolean>;
  blocklistWildcardPatterns: string[];
  blockedCategories: Record<string, boolean>;
  threatFeeds: string[];
  safesearchEnabled: boolean;
  safesearchRules: Record<string, SafeSearchRule>;
  schedules: Schedule[];
  blockResponseType: string;
  updatedAt: string;
}

export interface SafeSearchRule {
  cname: string;
  type: string;
}

export interface Schedule {
  name: string;
  days: number[];
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  timezone: string;
  additionalCategories: string[];
}

@Injectable()
export class PolicyCompilerService {
  private readonly logger = new Logger(PolicyCompilerService.name);

  constructor(
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
    @InjectRepository(PolicyVersion)
    private readonly versionRepository: Repository<PolicyVersion>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(CustomList)
    private readonly listRepository: Repository<CustomList>,
    @InjectRepository(CustomListEntry)
    private readonly listEntryRepository: Repository<CustomListEntry>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Compile and store a policy for a specific location
   */
  async compileForLocation(locationId: string): Promise<CompiledPolicy | null> {
    const location = await this.locationRepository.findOne({
      where: { id: locationId },
    });

    if (!location || !location.policyId) {
      this.logger.warn(`No policy found for location ${locationId}`);
      return null;
    }

    return this.compile(location.tenantId, location.policyId, locationId);
  }

  /**
   * Compile a policy and store it in Redis
   */
  async compile(
    tenantId: string,
    policyId: string,
    locationId: string,
  ): Promise<CompiledPolicy | null> {
    // Get policy and current version
    const policy = await this.policyRepository.findOne({
      where: { id: policyId, tenantId },
    });

    if (!policy) {
      this.logger.warn(`Policy ${policyId} not found for tenant ${tenantId}`);
      return null;
    }

    const version = await this.versionRepository.findOne({
      where: { policyId, version: policy.currentVersion },
    });

    if (!version) {
      this.logger.warn(
        `Version ${policy.currentVersion} not found for policy ${policyId}`,
      );
      return null;
    }

    const config = version.config;

    // Get custom lists for this tenant
    const lists = await this.listRepository.find({
      where: { tenantId },
      relations: ['entries'],
    });

    // Build allowlist and blocklist
    const allowlistExact: Record<string, boolean> = {};
    const allowlistWildcardPatterns: string[] = [];
    const blocklistExact: Record<string, boolean> = {};
    const blocklistWildcardPatterns: string[] = [];

    for (const list of lists) {
      if (!list.isEnabled) continue;

      const entries = list.entries || [];
      for (const entry of entries) {
        const domain = entry.domain.toLowerCase();
        const isWildcard = entry.type === 'wildcard' || domain.startsWith('*.');
        const cleanDomain = domain.startsWith('*.') ? domain.slice(2) : domain;

        if (list.type === 'allowlist') {
          if (isWildcard) {
            allowlistWildcardPatterns.push(cleanDomain);
          } else {
            allowlistExact[cleanDomain] = true;
          }
        } else if (list.type === 'blocklist') {
          if (isWildcard) {
            blocklistWildcardPatterns.push(cleanDomain);
          } else {
            blocklistExact[cleanDomain] = true;
          }
        }
      }
    }

    // Build blocked categories map
    const blockedCategories: Record<string, boolean> = {};
    if (config.blockCategories) {
      for (const category of config.blockCategories) {
        blockedCategories[category] = true;
      }
    }

    // Build threat feeds
    const threatFeeds = config.threatBlocking?.enabled
      ? config.threatBlocking.feeds || ['malware', 'phishing', 'c2']
      : [];

    // Build SafeSearch rules based on per-engine settings
    const safesearchRules: Record<string, SafeSearchRule> = {};
    if (config.safesearch?.enabled) {
      const settings = config.safesearch.settings || {};
      // Process each engine based on its individual setting
      const engines = ['google', 'bing', 'youtube', 'duckduckgo'] as const;
      for (const engine of engines) {
        const level = settings[engine] || 'off';
        if (level !== 'off') {
          const rules = this.getSafeSearchRulesForService(engine, level);
          Object.assign(safesearchRules, rules);
        }
      }
    }

    const schedules: Schedule[] = (config.schedules || []).map((s) => ({
      name: s.name,
      days: this.parseDays(s.days),
      startHour: parseInt(s.startTime.split(':')[0], 10),
      startMinute: parseInt(s.startTime.split(':')[1], 10),
      endHour: parseInt(s.endTime.split(':')[0], 10),
      endMinute: parseInt(s.endTime.split(':')[1], 10),
      timezone: s.timezone || 'UTC',
      additionalCategories: s.additionalCategories || [],
    }));

    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    const blockResponseType =
      config.blockResponseType ||
      (tenant?.settings?.blockPageEnabled ? 'blockpage' : 'NXDOMAIN');

    const compiled: CompiledPolicy = {
      tenantId,
      locationId,
      policyVersion: policy.currentVersion,
      allowlistExact,
      allowlistWildcardPatterns,
      blocklistExact,
      blocklistWildcardPatterns,
      blockedCategories,
      threatFeeds,
      safesearchEnabled: config.safesearch?.enabled || false,
      safesearchRules,
      schedules,
      blockResponseType,
      updatedAt: new Date().toISOString(),
    };

    // Store in Redis
    await this.redisService.storeCompiledPolicy(locationId, compiled);

    this.logger.log(
      `Compiled policy for location ${locationId} (version ${policy.currentVersion})`,
    );
    return compiled;
  }

  /**
   * Store compiled policy in Redis (no TTL — refreshed on edit and by PolicyRedisSyncService).
   */
  private async storeCompiledPolicy(
    locationId: string,
    policy: CompiledPolicy,
  ): Promise<void> {
    await this.redisService.storeCompiledPolicy(locationId, policy);
  }

  /**
   * Recompile Redis policies for every active location that has a policy assigned.
   */
  async compileAllActiveLocations(): Promise<{
    compiled: number;
    skipped: number;
    failed: number;
  }> {
    const locations = await this.locationRepository.find({
      where: { status: 'active' },
    });

    let compiled = 0;
    let skipped = 0;
    let failed = 0;

    for (const location of locations) {
      if (!location.policyId) {
        skipped++;
        continue;
      }
      try {
        const result = await this.compile(
          location.tenantId,
          location.policyId,
          location.id,
        );
        if (result) compiled++;
        else failed++;
      } catch (err) {
        failed++;
        this.logger.warn(
          `Failed to compile policy for location ${location.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    return { compiled, skipped, failed };
  }

  /**
   * Compile policies for all locations of a tenant
   */
  async compileAllForTenant(tenantId: string): Promise<void> {
    const locations = await this.locationRepository.find({
      where: { tenantId },
    });

    for (const location of locations) {
      if (location.policyId) {
        await this.compile(tenantId, location.policyId, location.id);
      }
    }

    this.logger.log(
      `Compiled policies for ${locations.length} locations in tenant ${tenantId}`,
    );
  }

  /**
   * Get SafeSearch CNAME rules for a service with level support
   * @param service - The search engine (google, bing, youtube, duckduckgo)
   * @param level - The restriction level (moderate or strict)
   */
  private getSafeSearchRulesForService(
    service: string,
    level: 'moderate' | 'strict' = 'strict',
  ): Record<string, SafeSearchRule> {
    // Google SafeSearch rules - same CNAME for both levels (Google only has on/off)
    const googleRules: Record<string, SafeSearchRule> = {
      'www.google.com': { cname: 'forcesafesearch.google.com', type: 'CNAME' },
      'www.google.co.uk': {
        cname: 'forcesafesearch.google.com',
        type: 'CNAME',
      },
      'www.google.ca': { cname: 'forcesafesearch.google.com', type: 'CNAME' },
      'www.google.de': { cname: 'forcesafesearch.google.com', type: 'CNAME' },
      'www.google.fr': { cname: 'forcesafesearch.google.com', type: 'CNAME' },
      'www.google.es': { cname: 'forcesafesearch.google.com', type: 'CNAME' },
      'www.google.it': { cname: 'forcesafesearch.google.com', type: 'CNAME' },
      'www.google.com.au': {
        cname: 'forcesafesearch.google.com',
        type: 'CNAME',
      },
      'www.google.com.br': {
        cname: 'forcesafesearch.google.com',
        type: 'CNAME',
      },
      'www.google.co.jp': {
        cname: 'forcesafesearch.google.com',
        type: 'CNAME',
      },
    };

    // Bing SafeSearch rules - strict.bing.com for both levels
    const bingRules: Record<string, SafeSearchRule> = {
      'www.bing.com': { cname: 'strict.bing.com', type: 'CNAME' },
    };

    // YouTube Restricted Mode - different CNAMEs for moderate vs strict
    const youtubeTarget =
      level === 'strict'
        ? 'restrict.youtube.com'
        : 'restrictmoderate.youtube.com';
    const youtubeRules: Record<string, SafeSearchRule> = {
      'www.youtube.com': { cname: youtubeTarget, type: 'CNAME' },
      'm.youtube.com': { cname: youtubeTarget, type: 'CNAME' },
      'youtube.com': { cname: youtubeTarget, type: 'CNAME' },
      'youtubei.googleapis.com': { cname: youtubeTarget, type: 'CNAME' },
      'youtube.googleapis.com': { cname: youtubeTarget, type: 'CNAME' },
      'www.youtube-nocookie.com': { cname: youtubeTarget, type: 'CNAME' },
    };

    // DuckDuckGo SafeSearch
    const duckduckgoRules: Record<string, SafeSearchRule> = {
      'duckduckgo.com': { cname: 'safe.duckduckgo.com', type: 'CNAME' },
      'www.duckduckgo.com': { cname: 'safe.duckduckgo.com', type: 'CNAME' },
    };

    const rulesMap: Record<string, Record<string, SafeSearchRule>> = {
      google: googleRules,
      bing: bingRules,
      youtube: youtubeRules,
      duckduckgo: duckduckgoRules,
    };

    return rulesMap[service] || {};
  }

  /**
   * Parse day names to day numbers (0 = Sunday)
   */
  private parseDays(days: string[]): number[] {
    const dayMap: Record<string, number> = {
      sunday: 0,
      sun: 0,
      monday: 1,
      mon: 1,
      tuesday: 2,
      tue: 2,
      wednesday: 3,
      wed: 3,
      thursday: 4,
      thu: 4,
      friday: 5,
      fri: 5,
      saturday: 6,
      sat: 6,
    };
    return days.map((d) => dayMap[d.toLowerCase()] ?? 0);
  }
}
