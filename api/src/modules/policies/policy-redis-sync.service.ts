import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { PolicyCompilerService } from './policy-compiler.service';
import { Location } from '../locations/entities/location.entity';
import { LocationToken } from '../locations/entities/location-token.entity';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class PolicyRedisSyncService implements OnModuleInit {
  private readonly logger = new Logger(PolicyRedisSyncService.name);
  private refreshInFlight = false;

  constructor(
    private readonly policyCompilerService: PolicyCompilerService,
    private readonly redisService: RedisService,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(LocationToken)
    private readonly tokenRepository: Repository<LocationToken>,
  ) {}

  onModuleInit(): void {
    setTimeout(() => {
      this.refreshAll('startup').catch((err) =>
        this.logger.error(`Startup policy Redis sync failed: ${err.message}`),
      );
    }, 8_000);
  }

  @Cron('*/10 * * * *')
  async scheduledRefresh(): Promise<void> {
    await this.refreshAll('scheduled');
  }

  async refreshAll(trigger: string): Promise<void> {
    if (this.refreshInFlight) {
      this.logger.warn(`Policy Redis sync already running (${trigger})`);
      return;
    }
    this.refreshInFlight = true;
    try {
      const compiled =
        await this.policyCompilerService.compileAllActiveLocations();
      const tokens = await this.syncAllActiveTokens();
      const ipRanges = await this.syncAllIpRanges();
      this.logger.log(
        `Policy Redis sync (${trigger}): compiled=${compiled.compiled} tokenKeys=${tokens} ipRangeKeys=${ipRanges}`,
      );
    } finally {
      this.refreshInFlight = false;
    }
  }

  private async syncAllActiveTokens(): Promise<number> {
    const tokens = await this.tokenRepository.find({
      where: { isActive: true },
      relations: ['location'],
    });

    let synced = 0;
    for (const token of tokens) {
      if (!token.location) continue;
      if (token.expiresAt && token.expiresAt.getTime() <= Date.now()) {
        continue;
      }

      const ttlSeconds = token.expiresAt
        ? Math.max(
            60,
            Math.ceil((token.expiresAt.getTime() - Date.now()) / 1000),
          )
        : undefined;

      await this.redisService.storeToken(
        token.tokenHash,
        {
          tenantId: token.location.tenantId,
          locationId: token.locationId,
          label: token.label,
          expiresAt: token.expiresAt?.toISOString() ?? null,
        },
        ttlSeconds,
      );
      synced++;
    }
    return synced;
  }

  private async syncAllIpRanges(): Promise<number> {
    const locations = await this.locationRepository.find({
      where: { status: 'active' },
    });

    let synced = 0;
    for (const location of locations) {
      if (!location.ipRange) continue;
      await this.redisService.storeIPRange(location.id, {
        tenant_id: location.tenantId,
        location_id: location.id,
        ip_range: location.ipRange,
        rate_limit: location.rateLimit,
      });
      synced++;
    }
    return synced;
  }
}
