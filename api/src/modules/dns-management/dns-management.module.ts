// Nebula DNS - DNS Management Module
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DnsPlatformConnection } from './entities/dns-platform-connection.entity';
import { DnsZoneAssignment } from './entities/dns-zone-assignment.entity';
import { DnsManagementService } from './dns-management.service';
import { DnsManagementController } from './dns-management.controller';
import { CloudflareDnsProvider } from './providers/cloudflare-dns.provider';
import { DNS_PROVIDER } from './providers/dns-provider.interface';
import { CfFairQueueService } from './queue/cf-fair-queue.service';
import { LimitsModule } from '../limits/limits.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Tenant } from '../tenants/entities/tenant.entity';
import { RedisModule } from '../redis/redis.module';
import { AdminActivityModule } from '../admin/admin-activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DnsPlatformConnection,
      DnsZoneAssignment,
      Tenant,
    ]),
    LimitsModule,
    AuditLogsModule,
    RedisModule,
    AdminActivityModule,
  ],
  controllers: [DnsManagementController],
  providers: [
    DnsManagementService,
    CfFairQueueService,
    CloudflareDnsProvider,
    {
      provide: DNS_PROVIDER,
      useExisting: CloudflareDnsProvider,
    },
  ],
  exports: [DnsManagementService],
})
export class DnsManagementModule {}
