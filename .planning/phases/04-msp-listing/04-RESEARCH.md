# Phase 4: MSP Listing - Research

**Researched:** 2026-01-17
**Domain:** NestJS admin endpoint for listing MSP tenants with aggregated client counts
**Confidence:** HIGH

## Summary

Phase 4 implements an admin endpoint for listing all MSP-tier tenants in the system. This builds on the existing admin authentication from Phase 1 and follows similar patterns to the tenant search endpoint from Phase 2.

The key technical considerations are:
1. **Filtering by tier='msp'** - Simple WHERE clause on the tenant entity
2. **Aggregating client counts** - COUNT of tenants where `managed_by_msp_id` equals the MSP tenant ID
3. **Status filtering** - WHERE clause on tenant status (active, suspended, trial)
4. **Search by name/ID** - Reuse query type detection pattern from Phase 2

The codebase already has all necessary patterns:
- `TenantSearchResponseDto` from Phase 2 shows pagination structure
- `MspClientsService.findAllForMsp()` shows how to count related entities with TypeORM
- `AdminAuthGuard` from Phase 1 for authentication
- Tenant entity has `tier` column with enum `['home', 'enterprise', 'msp']`

**Primary recommendation:** Add `GET /admin/msp/tenants` endpoint that queries tenants with `tier='msp'`, joins to count managed clients, and supports status filtering and name/ID search.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeORM | 0.3.x | Query builder with aggregations | Already used for MSP client counts |
| class-validator | 0.14.x | DTO validation | Existing validation patterns |
| class-transformer | 0.5.x | Type transformation | Query param transformation |
| @nestjs/swagger | 10.x | API documentation | Existing Swagger patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | 9.x | UUID validation | Query type detection for ID search |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TypeORM subquery for counts | Separate query + merge | Subquery is more efficient, single DB roundtrip |
| Cursor pagination | Page-based pagination | Cursor used in Phase 2, maintain consistency |

**Installation:**
```bash
# No new packages needed - all dependencies already in place
```

## Architecture Patterns

### Recommended Project Structure
```
api/src/modules/admin/
├── admin.controller.ts        # Add MSP listing endpoint here
├── admin.service.ts          # Add MSP listing logic here
├── dto/
│   ├── msp-listing.dto.ts    # NEW: Query and response DTOs for MSP listing
│   ├── tenant-search.dto.ts  # Existing - can reuse pagination patterns
│   └── ...existing...
└── ...existing files...
```

### Pattern 1: Filtering by Tier with Status
**What:** Query tenants with specific tier and optional status filter
**When to use:** MSP listing with status filter
**Example:**
```typescript
// Pattern from msp-clients.service.ts for status filtering
const queryBuilder = this.tenantRepository
  .createQueryBuilder('tenant')
  .where('tenant.tier = :tier', { tier: 'msp' });

// Apply optional status filter
if (query.status) {
  queryBuilder.andWhere('tenant.status = :status', { status: query.status });
}
```

### Pattern 2: Subquery for Client Count Aggregation
**What:** Use TypeORM subquery to count managed clients per MSP
**When to use:** When aggregating related entity counts
**Example:**
```typescript
// Pattern from msp-clients.service.ts lines 67-76 for counting relations
// Adapted for counting tenants managed by each MSP
const queryBuilder = this.tenantRepository
  .createQueryBuilder('msp')
  .leftJoin(
    Tenant,
    'client',
    'client.managed_by_msp_id = msp.id'
  )
  .addSelect('COUNT(DISTINCT client.id)', 'clientCount')
  .where('msp.tier = :tier', { tier: 'msp' })
  .groupBy('msp.id');
```

### Pattern 3: Search with Query Type Detection
**What:** Reuse Phase 2 pattern for detecting UUID vs name search
**When to use:** Admin search endpoints with flexible input
**Example:**
```typescript
// From admin.service.ts searchTenants() - reuse for MSP search
private detectQueryType(query: string): 'id' | 'name' {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(query)) {
    return 'id';
  }
  return 'name';
}
```

### Pattern 4: Cursor-Based Pagination with Total Count
**What:** Consistent pagination shape matching Phase 2
**When to use:** All admin list endpoints
**Example:**
```typescript
// From tenant-search.dto.ts - reuse for MSP listing
interface MspListingResponseDto {
  data: MspTenantDto[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}
```

### Anti-Patterns to Avoid
- **N+1 queries for client counts:** Don't query client count per MSP individually - use JOIN with GROUP BY
- **Returning full tenant entity:** Only return fields needed for listing (id, name, status, tier, clientCount)
- **Missing ORDER BY with pagination:** Always explicit ORDER BY to ensure stable pagination
- **Counting all clients in application code:** Use database aggregation

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pagination structure | Custom response shape | `PaginationInfoDto` from Phase 2 | Consistency across admin API |
| UUID detection | Custom regex | Pattern from `admin.service.ts` | Already tested, handles edge cases |
| Status enum validation | Manual checks | `@IsEnum(['active', 'suspended', 'trial'])` | Standard class-validator |
| Query param transformation | Manual parseInt | `@Type(() => Number)` | class-transformer handles edge cases |

**Key insight:** This phase follows established patterns from Phase 2 and existing MSP modules - no novel solutions needed.

## Common Pitfalls

### Pitfall 1: N+1 Query for Client Counts
**What goes wrong:** Querying MSP tenants first, then looping to count clients per MSP
**Why it happens:** Simpler code structure at first glance
**How to avoid:** Use single query with LEFT JOIN and GROUP BY for aggregation
**Warning signs:** Multiple SQL queries logged per API request

### Pitfall 2: Missing Index on Tier Column
**What goes wrong:** Full table scan when filtering by tier='msp'
**Why it happens:** Tier column doesn't have an index in current schema
**How to avoid:** For MVP, acceptable as MSP count is likely small (<1000). Consider index if slow.
**Warning signs:** Query times > 100ms for MSP listing

### Pitfall 3: Counting Suspended Clients in Total
**What goes wrong:** Client count includes suspended/cancelled clients
**Why it happens:** Not filtering on client status in count
**How to avoid:** Clarify requirements - likely want all clients regardless of status for admin visibility
**Warning signs:** Count mismatch between admin view and MSP's own client list

### Pitfall 4: Forgetting Trial Status
**What goes wrong:** Success criteria mentions "trial" status but current schema uses 'active', 'suspended', 'cancelled'
**Why it happens:** Success criteria may reference planned feature
**How to avoid:** Verify tenant status enum includes 'trial' or map 'active' tenants with trial flags
**Warning signs:** Status filter for 'trial' returns nothing

### Pitfall 5: Inconsistent Pagination Cursor Encoding
**What goes wrong:** Cursor format differs from Phase 2 tenant search
**Why it happens:** Different developer, different implementation
**How to avoid:** Follow Phase 2 pattern exactly: `cursor = String(offset)`, parse with `parseInt(cursor, 10)`
**Warning signs:** Frontend pagination breaks when switching between endpoints

## Code Examples

Verified patterns from codebase:

### MSP Listing Query DTO
```typescript
// Based on TenantSearchQueryDto from Phase 2 and MspClientQueryDto
import { IsString, IsOptional, IsEnum, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus } from '../../tenants/entities/tenant.entity';

export class MspListingQueryDto {
  @ApiPropertyOptional({
    description: 'Search by MSP name or ID (UUID)',
    example: 'acme',
    minLength: 2,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  q?: string;

  @ApiPropertyOptional({
    enum: ['active', 'suspended', 'cancelled'],
    description: 'Filter by MSP tenant status',
  })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'cancelled'])
  status?: TenantStatus;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Pagination cursor for fetching next page',
    example: '20',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
```

### MSP Listing Response DTOs
```typescript
// Response shape per success criteria
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus } from '../../tenants/entities/tenant.entity';

export class MspTenantDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'MSP tenant unique identifier',
  })
  id: string;

  @ApiProperty({
    example: 'Acme MSP',
    description: 'MSP tenant name',
  })
  name: string;

  @ApiProperty({
    enum: ['active', 'suspended', 'cancelled'],
    example: 'active',
    description: 'MSP tenant status',
  })
  status: TenantStatus;

  @ApiProperty({
    example: 15,
    description: 'Number of client organizations managed by this MSP',
  })
  clientCount: number;

  @ApiPropertyOptional({
    example: 'admin@acmemsp.com',
    description: 'Primary contact email for the MSP',
  })
  contactEmail?: string;
}

export class MspListingResponseDto {
  @ApiProperty({
    type: [MspTenantDto],
    description: 'Array of MSP tenants',
  })
  data: MspTenantDto[];

  @ApiProperty({
    description: 'Pagination information',
  })
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}
```

### Controller Endpoint
```typescript
// Following pattern from admin.controller.ts searchTenants endpoint
@Get('msp/tenants')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('admin-jwt')
@ApiOperation({
  summary: 'List all MSP tenants',
  description: 'List all MSP-tier tenants with client counts. Supports filtering by status and search by name/ID.',
})
@ApiResponse({ status: 200, type: MspListingResponseDto })
@ApiResponse({ status: 400, description: 'Invalid query parameters' })
@ApiResponse({ status: 401, description: 'Admin authentication required' })
async listMspTenants(
  @Query() query: MspListingQueryDto,
): Promise<MspListingResponseDto> {
  return this.adminService.listMspTenants(query);
}
```

### Service Method with Aggregation
```typescript
// Pattern from msp-clients.service.ts findAllForMsp() adapted for admin MSP listing
async listMspTenants(query: MspListingQueryDto): Promise<MspListingResponseDto> {
  const limit = query.limit ?? 20;
  const offset = query.cursor ? parseInt(query.cursor, 10) : 0;

  // Build query with client count aggregation
  const queryBuilder = this.tenantRepository
    .createQueryBuilder('msp')
    .leftJoin(
      Tenant,
      'client',
      'client.managed_by_msp_id = msp.id'
    )
    .select([
      'msp.id AS id',
      'msp.name AS name',
      'msp.status AS status',
      'msp.contact_email AS "contactEmail"',
    ])
    .addSelect('COUNT(DISTINCT client.id)', 'clientCount')
    .where('msp.tier = :tier', { tier: 'msp' })
    .groupBy('msp.id');

  // Apply status filter
  if (query.status) {
    queryBuilder.andWhere('msp.status = :status', { status: query.status });
  }

  // Apply search filter (name or ID)
  if (query.q) {
    const searchTerm = query.q.trim();
    const queryType = this.detectQueryType(searchTerm);

    if (queryType === 'id') {
      queryBuilder.andWhere('msp.id = :id', { id: searchTerm });
    } else {
      queryBuilder.andWhere('msp.name ILIKE :search', { search: `%${searchTerm}%` });
    }
  }

  // Get total count (separate query without pagination)
  const countQueryBuilder = this.tenantRepository
    .createQueryBuilder('msp')
    .where('msp.tier = :tier', { tier: 'msp' });

  if (query.status) {
    countQueryBuilder.andWhere('msp.status = :status', { status: query.status });
  }
  if (query.q) {
    const searchTerm = query.q.trim();
    const queryType = this.detectQueryType(searchTerm);
    if (queryType === 'id') {
      countQueryBuilder.andWhere('msp.id = :id', { id: searchTerm });
    } else {
      countQueryBuilder.andWhere('msp.name ILIKE :search', { search: `%${query.q.trim()}%` });
    }
  }

  const total = await countQueryBuilder.getCount();

  // Apply pagination and ordering
  queryBuilder
    .orderBy('msp.name', 'ASC')
    .offset(offset)
    .limit(limit + 1); // Fetch one extra to detect hasMore

  const rawResults = await queryBuilder.getRawMany();

  const hasMore = rawResults.length > limit;
  const data = rawResults.slice(0, limit).map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    clientCount: parseInt(row.clientCount, 10) || 0,
    contactEmail: row.contactEmail || undefined,
  }));

  return {
    data,
    pagination: {
      cursor: hasMore ? String(offset + limit) : null,
      hasMore,
      total,
    },
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Partner entity hierarchy | Tenant tier system with self-referential FK | US-001 implementation | MSPs are tenants with tier='msp', clients have managedByMspId |
| Separate MSP table | Unified tenant table with tier enum | Recent refactor | Single source of truth for all tenant types |

**Deprecated/outdated:**
- `partner_id` column on tenant - replaced by `managed_by_msp_id` for clarity
- `Partner` and `PartnerUser` entities - deleted, MSP is now a tenant tier

## Open Questions

Things that couldn't be fully resolved:

1. **Trial status handling**
   - What we know: Success criteria mentions "trial" status, current TenantStatus is 'active' | 'suspended' | 'cancelled'
   - What's unclear: Whether 'trial' needs to be added as a status or is tracked differently
   - Recommendation: Check if there's a separate trial tracking mechanism; if not, defer to planning

2. **Client count scope**
   - What we know: Need to show client count per MSP
   - What's unclear: Count all clients or only active clients?
   - Recommendation: Count all clients (active + suspended) for admin visibility; can add status breakdown later

3. **Response field completeness**
   - What we know: Success criteria says "status and client count"
   - What's unclear: What additional fields admins need (contact info, created date, etc.)
   - Recommendation: Include id, name, status, clientCount, contactEmail as minimum; extend if requested

## Sources

### Primary (HIGH confidence)
- `api/src/modules/admin/admin.service.ts` - Existing searchTenants pattern and query type detection
- `api/src/modules/admin/admin.controller.ts` - Existing admin endpoint structure
- `api/src/modules/admin/dto/tenant-search.dto.ts` - DTO patterns for search/pagination
- `api/src/modules/msp-clients/msp-clients.service.ts` - Client count aggregation pattern
- `api/src/modules/tenants/entities/tenant.entity.ts` - Tenant entity with tier and managedByMspId
- `api/src/modules/msp-clients/entities/msp-client.entity.ts` - MSP-client relationship structure
- `.planning/phases/02-tenant-search/02-RESEARCH.md` - Phase 2 research patterns

### Secondary (MEDIUM confidence)
- `scripts/init-postgres.sql` - Database indexes (no tier index exists)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use in codebase
- Architecture: HIGH - Follows exact patterns from Phase 2 and msp-clients module
- Pitfalls: HIGH - Based on real patterns observed in codebase

**Research date:** 2026-01-17
**Valid until:** 60 days (stable NestJS/TypeORM patterns, minimal dependency on external changes)
