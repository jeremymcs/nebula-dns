# Phase 5: MSP Drill-down - Research

**Researched:** 2026-01-17
**Domain:** Admin API endpoints for viewing MSP details, client organizations, and usage metrics
**Confidence:** HIGH

## Summary

Phase 5 implements the MSP drill-down functionality for the admin panel. This builds directly on Phase 4's MSP listing endpoint, allowing admins to dive into a specific MSP to see all their client organizations and usage metrics.

The codebase already has all necessary patterns and infrastructure:
1. **Tenant entity with managedByMspId** - Self-referential FK links clients to their managing MSP
2. **MspClient junction table** - Formal relationship with status tracking
3. **ClickHouse for query metrics** - `getSummaryStats()` returns totalQueries, blockedQueries, threatsBlocked per tenant
4. **MspBillingService** - Already has `getUsageByTenant()` and `getRealTimeUsage()` methods that aggregate across MSP clients
5. **MspClientsService** - Has `findAllForMsp()` with location and user counts via JOIN aggregations

The key technical challenge is aggregating usage metrics across multiple client tenants efficiently. The existing patterns from MspBillingService show how to do this - iterate over managed tenants and sum ClickHouse stats, or query the msp_usage table for historical data.

**Primary recommendation:** Add three admin endpoints:
1. `GET /admin/msp/tenants/:mspId` - MSP detail with aggregated usage
2. `GET /admin/msp/tenants/:mspId/clients` - List all client organizations with individual usage
3. `GET /admin/msp/tenants/:mspId/usage` - Historical usage breakdown with period selection

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeORM | 0.3.x | Query builder with joins and aggregations | Already used for MSP client counts |
| @clickhouse/client | 1.x | Query analytics from ClickHouse | Already integrated via ClickHouseService |
| class-validator | 0.14.x | DTO validation | Existing validation patterns |
| class-transformer | 0.5.x | Type transformation | Query param transformation |
| @nestjs/swagger | 10.x | API documentation | Existing Swagger patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | 9.x | UUID validation | Path param validation for mspId |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ClickHouse for metrics | PostgreSQL msp_usage table | ClickHouse has real-time data, msp_usage is daily aggregated |
| Per-client ClickHouse queries | Single aggregated query | Multiple queries simpler to implement, can be optimized later |
| Cursor pagination for clients | Offset pagination | Cursor already established in Phase 4, maintain consistency |

**Installation:**
```bash
# No new packages needed - all dependencies already in place
```

## Architecture Patterns

### Recommended Project Structure
```
api/src/modules/admin/
├── admin.controller.ts        # Add MSP drill-down endpoints here
├── admin.service.ts          # Add MSP detail methods here
├── dto/
│   ├── msp-detail.dto.ts     # NEW: DTOs for MSP detail and client listing
│   ├── msp-listing.dto.ts    # Existing - can extend MspTenantDto
│   └── ...existing...
└── ...existing files...
```

### Pattern 1: MSP Detail with Aggregated Metrics
**What:** Fetch MSP tenant with usage metrics aggregated from all client tenants
**When to use:** MSP detail endpoint that shows overview stats
**Example:**
```typescript
// Pattern from MspBillingService.getRealTimeUsage()
async getMspDetail(mspId: string): Promise<MspDetailResponseDto> {
  // 1. Get MSP tenant
  const msp = await this.tenantRepository.findOne({
    where: { id: mspId, tier: 'msp' },
  });

  if (!msp) {
    throw new NotFoundException('MSP tenant not found');
  }

  // 2. Count clients using self-referential join (from Phase 4 pattern)
  const clientCount = await this.tenantRepository.count({
    where: { managedByMspId: mspId },
  });

  // 3. Count locations across all clients
  const locationCount = await this.locationRepository
    .createQueryBuilder('location')
    .innerJoin('location.tenant', 'tenant')
    .where('tenant.managed_by_msp_id = :mspId', { mspId })
    .getCount();

  // 4. Count users across all clients
  const userCount = await this.userRepository
    .createQueryBuilder('user')
    .innerJoin('user.tenant', 'tenant')
    .where('tenant.managed_by_msp_id = :mspId', { mspId })
    .getCount();

  // 5. Aggregate query metrics from ClickHouse (current period)
  const usage = await this.aggregateUsageForMsp(mspId, '30d');

  return {
    id: msp.id,
    name: msp.name,
    status: msp.status,
    contactEmail: msp.contactEmail,
    clientCount,
    locationCount,
    userCount,
    usage,
    createdAt: msp.createdAt.toISOString(),
  };
}
```

### Pattern 2: Client List with Individual Usage
**What:** List all client tenants under an MSP with per-client metrics
**When to use:** Admin viewing client breakdown
**Example:**
```typescript
// Pattern from MspClientsService.findAllForMsp() + ClickHouse metrics
async getMspClients(
  mspId: string,
  query: MspClientListQueryDto,
): Promise<MspClientListResponseDto> {
  // Verify MSP exists
  const msp = await this.verifyMspTenant(mspId);

  const limit = query.limit ?? 20;
  const offset = query.cursor ? parseInt(query.cursor, 10) : 0;

  // Query clients with location/user counts
  const queryBuilder = this.tenantRepository
    .createQueryBuilder('client')
    .leftJoin('client.locations', 'location')
    .leftJoin('client.users', 'user')
    .select([
      'client.id AS id',
      'client.name AS name',
      'client.status AS status',
      'client.tier AS tier',
      'client.contact_email AS "contactEmail"',
      'client.created_at AS "createdAt"',
    ])
    .addSelect('COUNT(DISTINCT location.id)', 'locationCount')
    .addSelect('COUNT(DISTINCT user.id)', 'userCount')
    .where('client.managed_by_msp_id = :mspId', { mspId })
    .groupBy('client.id');

  // Apply search filter if provided
  if (query.q) {
    queryBuilder.andWhere('client.name ILIKE :search', {
      search: `%${query.q}%`
    });
  }

  // Apply status filter if provided
  if (query.status) {
    queryBuilder.andWhere('client.status = :status', { status: query.status });
  }

  // Get total count (separate query)
  const countBuilder = this.tenantRepository
    .createQueryBuilder('client')
    .where('client.managed_by_msp_id = :mspId', { mspId });
  // Apply same filters to count query...
  const total = await countBuilder.getCount();

  // Apply pagination
  queryBuilder
    .orderBy('client.name', 'ASC')
    .offset(offset)
    .limit(limit + 1);

  const rawResults = await queryBuilder.getRawMany();
  const hasMore = rawResults.length > limit;

  // Fetch usage metrics for each client
  const clients = await Promise.all(
    rawResults.slice(0, limit).map(async (row) => {
      const usage = await this.getClientUsage(row.id, query.period || '30d');
      return {
        id: row.id,
        name: row.name,
        status: row.status,
        tier: row.tier,
        contactEmail: row.contactEmail,
        locationCount: parseInt(row.locationCount, 10) || 0,
        userCount: parseInt(row.userCount, 10) || 0,
        usage,
        createdAt: row.createdAt,
      };
    }),
  );

  return {
    data: clients,
    pagination: {
      cursor: hasMore ? String(offset + limit) : null,
      hasMore,
      total,
    },
  };
}
```

### Pattern 3: Historical Usage with Period Selection
**What:** Return usage data broken down by period (day/week/month)
**When to use:** Usage history endpoint with charts
**Example:**
```typescript
// Pattern from MspBillingService.getUsageSummary()
async getMspUsageHistory(
  mspId: string,
  query: UsageHistoryQueryDto,
): Promise<UsageHistoryResponseDto> {
  const startDate = query.startDate
    ? new Date(query.startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = query.endDate
    ? new Date(query.endDate)
    : new Date();
  const groupBy = query.groupBy || 'day';

  // Get tenants managed by this MSP
  const clients = await this.tenantRepository.find({
    where: { managedByMspId: mspId },
    select: ['id', 'name'],
  });

  // Two options:
  // A) Use msp_usage table (historical, daily aggregated)
  // B) Use ClickHouse directly (real-time but slower for long periods)

  // Option A - from msp_usage table
  const usage = await this.mspUsageRepository.find({
    where: {
      partnerId: mspId,
      usageDate: Between(startDate, endDate),
    },
    order: { usageDate: 'ASC' },
  });

  // Group and aggregate as needed...
  return this.groupUsageByPeriod(usage, groupBy);
}
```

### Pattern 4: Path Parameter Validation
**What:** Validate mspId is a valid UUID and refers to an MSP-tier tenant
**When to use:** All MSP drill-down endpoints
**Example:**
```typescript
// Reuse pattern from Phase 3 impersonation
private async verifyMspTenant(mspId: string): Promise<Tenant> {
  // UUID format check happens via class-validator on DTO
  const tenant = await this.tenantRepository.findOne({
    where: { id: mspId },
  });

  if (!tenant) {
    throw new NotFoundException('Tenant not found');
  }

  if (tenant.tier !== 'msp') {
    throw new BadRequestException('Tenant is not an MSP');
  }

  return tenant;
}
```

### Anti-Patterns to Avoid
- **N+1 for usage metrics:** Don't fetch ClickHouse stats one-by-one in a loop; batch where possible or accept latency
- **Ignoring msp_usage table:** For historical data, use the pre-aggregated msp_usage table instead of querying ClickHouse
- **Missing tier validation:** Always verify the mspId refers to a tier='msp' tenant before querying clients
- **Inconsistent pagination:** Use same cursor-based pagination as Phase 4
- **Raw tenant data exposure:** Only return fields needed for admin view, not internal fields

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Aggregate queries per MSP | Custom aggregation | ClickHouseService.getSummaryStats per tenant | Already handles mock data fallback |
| Historical usage | ClickHouse raw queries | msp_usage table via TypeORM | Pre-aggregated daily, faster for long periods |
| Client count | Manual COUNT query | tenant.managed_by_msp_id filter | Self-referential FK already indexed |
| Location/user counts | Separate queries | Single query with JOINs | MspClientsService already has this pattern |
| Period calculations | Custom date math | getPeriodFilter from ClickHouseService | Handles 24h/7d/30d consistently |

**Key insight:** The codebase has two usage data sources: ClickHouse for real-time and msp_usage table for historical. Use the right one based on the use case.

## Common Pitfalls

### Pitfall 1: Slow Usage Aggregation for Large MSPs
**What goes wrong:** MSP with 100+ clients causes timeout aggregating ClickHouse stats
**Why it happens:** Sequential ClickHouse queries per client
**How to avoid:**
- For client listing: Consider not including per-client usage (separate lazy load)
- For MSP overview: Query ClickHouse once with `tenant_id IN (...)` filter
- For historical: Use msp_usage table which is pre-aggregated
**Warning signs:** API timeout errors, slow response times > 5s

### Pitfall 2: Missing MSP Tier Validation
**What goes wrong:** Admin queries non-MSP tenant and gets confusing empty results
**Why it happens:** Only checking if tenant exists, not if tier='msp'
**How to avoid:** Create `verifyMspTenant()` helper that checks both existence and tier
**Warning signs:** Empty client lists for valid tenant IDs

### Pitfall 3: Inconsistent Usage Periods
**What goes wrong:** MSP overview shows 30d, client list shows 7d, charts show 24h
**Why it happens:** Different defaults in different endpoints
**How to avoid:** Accept period param on all usage endpoints, use consistent default (30d)
**Warning signs:** Numbers don't add up across views

### Pitfall 4: Missing Pagination on Client List
**What goes wrong:** Large MSPs crash the endpoint with hundreds of clients
**Why it happens:** Returning all clients without pagination
**How to avoid:** Use same cursor pagination pattern as Phase 4 MSP listing
**Warning signs:** Response size > 1MB, memory issues

### Pitfall 5: ClickHouse Mock Data in Production
**What goes wrong:** Usage shows fake data when ClickHouse is temporarily unavailable
**Why it happens:** ClickHouseService returns mock data on connection failure
**How to avoid:** Check `clickhouseService.isUsingMockData()` and add indicator to response
**Warning signs:** Consistent "round" numbers, no variation over time

### Pitfall 6: Counting Suspended Clients Differently
**What goes wrong:** Overview shows 15 clients, client list shows 12 active
**Why it happens:** Overview counts all, list filters by status
**How to avoid:** Document clearly what each count means; show breakdown (12 active, 3 suspended)
**Warning signs:** Discrepancy between overview and detail views

## Code Examples

Verified patterns from codebase:

### MSP Detail Query DTO
```typescript
// Based on msp-listing.dto.ts pattern
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MspDetailQueryDto {
  @ApiPropertyOptional({
    enum: ['24h', '7d', '30d', '90d'],
    description: 'Period for usage metrics',
    default: '30d',
  })
  @IsOptional()
  @IsEnum(['24h', '7d', '30d', '90d'])
  period?: '24h' | '7d' | '30d' | '90d';
}
```

### MSP Usage Metrics DTO
```typescript
// Based on ReportSummary from reports.service.ts
export class MspUsageMetricsDto {
  @ApiProperty({ description: 'Total DNS queries in period' })
  totalQueries: number;

  @ApiProperty({ description: 'Blocked queries in period' })
  blockedQueries: number;

  @ApiProperty({ description: 'Threats blocked in period' })
  threatsBlocked: number;

  @ApiProperty({ description: 'Block rate percentage' })
  blockRate: number;

  @ApiProperty({ description: 'Period start date' })
  periodStart: string;

  @ApiProperty({ description: 'Period end date' })
  periodEnd: string;
}
```

### MSP Detail Response DTO
```typescript
// Extends MspTenantDto from msp-listing.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus } from '../../tenants/entities/tenant.entity';

export class MspDetailResponseDto {
  @ApiProperty({ description: 'MSP tenant ID' })
  id: string;

  @ApiProperty({ description: 'MSP name' })
  name: string;

  @ApiProperty({ enum: ['active', 'suspended', 'cancelled'] })
  status: TenantStatus;

  @ApiPropertyOptional({ description: 'Contact email' })
  contactEmail?: string;

  @ApiProperty({ description: 'Number of client organizations' })
  clientCount: number;

  @ApiProperty({ description: 'Total locations across all clients' })
  locationCount: number;

  @ApiProperty({ description: 'Total users across all clients' })
  userCount: number;

  @ApiProperty({ description: 'Usage metrics for the requested period' })
  usage: MspUsageMetricsDto;

  @ApiProperty({ description: 'MSP creation date' })
  createdAt: string;
}
```

### Client Listing DTO
```typescript
// Extends pattern from msp-clients.dto.ts
export class MspClientWithUsageDto {
  @ApiProperty({ description: 'Client tenant ID' })
  id: string;

  @ApiProperty({ description: 'Client organization name' })
  name: string;

  @ApiProperty({ enum: ['active', 'suspended', 'cancelled'] })
  status: TenantStatus;

  @ApiProperty({ enum: ['home', 'enterprise', 'msp'] })
  tier: TenantTier;

  @ApiPropertyOptional({ description: 'Contact email' })
  contactEmail?: string;

  @ApiProperty({ description: 'Number of locations' })
  locationCount: number;

  @ApiProperty({ description: 'Number of users' })
  userCount: number;

  @ApiProperty({ description: 'Total queries in period' })
  totalQueries: number;

  @ApiProperty({ description: 'Blocked queries in period' })
  blockedQueries: number;

  @ApiProperty({ description: 'Client creation date' })
  createdAt: string;
}

export class MspClientListResponseDto {
  @ApiProperty({ type: [MspClientWithUsageDto] })
  data: MspClientWithUsageDto[];

  @ApiProperty({ description: 'Pagination info' })
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}
```

### Controller Endpoints
```typescript
// Following pattern from admin.controller.ts
@Get('msp/tenants/:mspId')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('admin-jwt')
@ApiOperation({
  summary: 'Get MSP tenant details',
  description: 'Get detailed information about an MSP including aggregated usage metrics.',
})
@ApiParam({ name: 'mspId', description: 'MSP tenant UUID' })
@ApiResponse({ status: 200, type: MspDetailResponseDto })
@ApiResponse({ status: 404, description: 'MSP tenant not found' })
async getMspDetail(
  @Param('mspId', ParseUUIDPipe) mspId: string,
  @Query() query: MspDetailQueryDto,
): Promise<MspDetailResponseDto> {
  return this.adminService.getMspDetail(mspId, query);
}

@Get('msp/tenants/:mspId/clients')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('admin-jwt')
@ApiOperation({
  summary: 'List MSP client organizations',
  description: 'List all client organizations under an MSP with usage metrics.',
})
@ApiParam({ name: 'mspId', description: 'MSP tenant UUID' })
@ApiResponse({ status: 200, type: MspClientListResponseDto })
async getMspClients(
  @Param('mspId', ParseUUIDPipe) mspId: string,
  @Query() query: MspClientListQueryDto,
): Promise<MspClientListResponseDto> {
  return this.adminService.getMspClients(mspId, query);
}
```

### Usage Aggregation Service Method
```typescript
// Pattern from MspBillingService.getRealTimeUsage()
async aggregateUsageForMsp(
  mspId: string,
  period: '24h' | '7d' | '30d' | '90d',
): Promise<MspUsageMetricsDto> {
  // Get all client tenant IDs
  const clients = await this.tenantRepository.find({
    where: { managedByMspId: mspId },
    select: ['id'],
  });

  const { startDate, endDate } = this.getPeriodDates(period);

  let totalQueries = 0;
  let blockedQueries = 0;
  let threatsBlocked = 0;

  // Aggregate across all clients
  for (const client of clients) {
    try {
      const stats = await this.clickhouseService.getSummaryStats(
        client.id,
        period,
      );
      totalQueries += stats.totalQueries || 0;
      blockedQueries += stats.blockedQueries || 0;
      threatsBlocked += stats.threatsBlocked || 0;
    } catch (error) {
      this.logger.warn(`Failed to get stats for client ${client.id}`);
    }
  }

  return {
    totalQueries,
    blockedQueries,
    threatsBlocked,
    blockRate: totalQueries > 0
      ? Math.round((blockedQueries / totalQueries) * 1000) / 10
      : 0,
    periodStart: startDate.toISOString(),
    periodEnd: endDate.toISOString(),
  };
}

private getPeriodDates(period: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { startDate, endDate: now };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Partner entity for MSPs | Tenant with tier='msp' | US-001 implementation | Unified tenant model |
| partner_id on tenant | managed_by_msp_id self-referential FK | Recent refactor | Cleaner relationship model |
| Separate MSP billing tables | Reused for MSP-tier tenants | Migration scripts | partnerId = mspTenantId |

**Deprecated/outdated:**
- `Partner` and `PartnerUser` entities - deleted, use Tenant with tier='msp'
- `partner_id` column - replaced by `managed_by_msp_id`

## Open Questions

Things that couldn't be fully resolved:

1. **Usage Metric Performance**
   - What we know: Aggregating ClickHouse stats across 100+ clients may be slow
   - What's unclear: Acceptable latency threshold for admin dashboard
   - Recommendation: Start with simple per-client queries; add batch optimization if > 3s response time

2. **Historical vs Real-time Data**
   - What we know: msp_usage table has daily aggregated data; ClickHouse has real-time
   - What's unclear: Which periods should use which source
   - Recommendation: Use ClickHouse for <= 7d, msp_usage for > 7d; document in API response

3. **Client Status in Counts**
   - What we know: Clients can be active, suspended, or cancelled
   - What's unclear: Should suspended clients be included in usage aggregations
   - Recommendation: Include all in counts, but show status breakdown in UI; usage only for active

4. **Usage Breakdown Granularity**
   - What we know: VIS-03/VIS-04 require "queries, locations, users" per MSP/client
   - What's unclear: Should locations/users be shown as current snapshot or period average
   - Recommendation: Show current count (snapshot), not historical average

## Sources

### Primary (HIGH confidence)
- `api/src/modules/admin/admin.service.ts` - listMspTenants pattern, detectQueryType
- `api/src/modules/admin/admin.controller.ts` - Endpoint structure, guards
- `api/src/modules/admin/dto/msp-listing.dto.ts` - DTO patterns for MSP listing
- `api/src/modules/msp-clients/msp-clients.service.ts` - findAllForMsp with counts
- `api/src/modules/msp-billing/msp-billing.service.ts` - getUsageByTenant, getRealTimeUsage
- `api/src/modules/clickhouse/clickhouse.service.ts` - getSummaryStats, period handling
- `api/src/modules/tenants/entities/tenant.entity.ts` - managedByMspId FK, tier enum
- `api/src/modules/msp-clients/entities/msp-client.entity.ts` - Junction table structure
- `api/src/modules/reports/reports.service.ts` - ReportSummary interface

### Secondary (MEDIUM confidence)
- `.planning/phases/04-msp-listing/04-RESEARCH.md` - Phase 4 patterns (verified)
- `.planning/phases/04-msp-listing/04-01-SUMMARY.md` - Client count aggregation (implemented)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, verified in codebase
- Architecture: HIGH - Follows exact patterns from Phase 4 and msp-billing module
- Pitfalls: HIGH - Based on real patterns and existing service implementations

**Research date:** 2026-01-17
**Valid until:** 60 days (stable NestJS/TypeORM patterns, minimal external dependencies)
