# Phase 2: Tenant Search - Research

**Researched:** 2026-01-17
**Domain:** NestJS admin search endpoint with TypeORM query patterns
**Confidence:** HIGH

## Summary

Phase 2 implements a tenant search endpoint for internal administrators. Based on the CONTEXT.md decisions, this is a unified endpoint with auto-detection of query type (UUID, email, name), cursor-based pagination, and minimal response shape.

The codebase already has established patterns for all required functionality:
- Pagination DTOs in `api/src/common/dto/pagination.dto.ts` (cursor-based with `hasMore` and optional `total`)
- ILIKE searches in `msp-clients.service.ts` showing TypeORM query builder patterns
- Admin authentication via `AdminAuthGuard` from Phase 1
- Swagger documentation patterns in existing DTOs

**Primary recommendation:** Add a single `GET /admin/tenants/search` endpoint with query parameter `q`, using existing pagination patterns and TypeORM query builder for flexible search.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeORM | 0.3.x | Query builder for search | Already in use throughout codebase |
| class-validator | 0.14.x | DTO validation | Existing validation patterns |
| class-transformer | 0.5.x | Type transformation | Query param transformation |
| @nestjs/swagger | 10.x | API documentation | Existing Swagger patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | 9.x | UUID validation | Already installed, for query type detection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single unified endpoint | Separate endpoints per type | CONTEXT.md mandates unified with auto-detection |
| ILIKE search | Full-text search (tsvector) | Overkill for admin use case, ILIKE sufficient |

**Installation:**
```bash
# No new packages needed - all dependencies already in place
```

## Architecture Patterns

### Recommended Project Structure
```
api/src/modules/admin/
├── admin.controller.ts        # Add search endpoint here
├── admin.service.ts          # Add search logic here (or separate tenant-search.service.ts)
├── dto/
│   ├── tenant-search.dto.ts  # NEW: Search query and response DTOs
│   └── ...existing...
└── ...existing files...
```

### Pattern 1: Query Type Auto-Detection
**What:** Detect whether query is UUID, email, or name based on format
**When to use:** Always - this is per CONTEXT.md decision
**Example:**
```typescript
// Codebase pattern from admin.service.ts uses email.toLowerCase()
// UUID regex from Node's uuid library is industry standard

private detectQueryType(query: string): 'id' | 'email' | 'name' {
  // UUID v4 regex pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(query)) {
    return 'id';
  }

  // Email regex - simple check sufficient for detection
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(query)) {
    return 'email';
  }

  return 'name';
}
```

### Pattern 2: Cursor-Based Pagination (Existing Pattern)
**What:** Use offset-based cursor encoded as string for simplicity
**When to use:** All list endpoints - matches existing `PaginationQueryDto`
**Example:**
```typescript
// From api/src/common/dto/pagination.dto.ts
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total?: number;  // CONTEXT.md requires total count
  };
}
```

### Pattern 3: ILIKE Search with TypeORM
**What:** Case-insensitive partial matching using PostgreSQL ILIKE
**When to use:** Name search - matches msp-clients.service.ts pattern
**Example:**
```typescript
// From msp-clients.service.ts line 87-90
queryBuilder.andWhere(
  '(clientTenant.name ILIKE :search OR clientTenant.slug ILIKE :search)',
  { search: `%${query.search}%` }
);
```

### Pattern 4: Join for Email Search
**What:** Join tenants with users table to search by user email
**When to use:** Email-based tenant lookup
**Example:**
```typescript
// TypeORM query builder join pattern
const queryBuilder = this.tenantRepository
  .createQueryBuilder('tenant')
  .leftJoin('tenant.users', 'user')
  .where('user.email = :email', { email: searchEmail.toLowerCase() })
  .select([
    'tenant.id',
    'tenant.name',
    'tenant.status',
    'tenant.tier',
    'user.email'  // Include matched email per CONTEXT.md
  ]);
```

### Anti-Patterns to Avoid
- **Raw SQL injection:** Always use parameterized queries via TypeORM
- **Returning full tenant entity:** Response should be minimal per CONTEXT.md
- **Case-sensitive email matching:** Always lowercase for email comparisons
- **Fetching all results then filtering:** Use database-side filtering/pagination

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID validation | Custom regex | `uuid` library or simple regex | Well-tested, handles edge cases |
| Pagination structure | Custom response shape | `PaginatedResponse<T>` from `pagination.dto.ts` | Consistency across API |
| Query validation | Manual length checks | class-validator `@MinLength` | Standard validation pipeline |
| Email format check | Complex email regex | Simple `@` check for detection | Full validation not needed for detection |

**Key insight:** This phase is glue code connecting existing patterns - no novel solutions needed.

## Common Pitfalls

### Pitfall 1: SQL Injection via ILIKE
**What goes wrong:** Directly interpolating user input into ILIKE pattern
**Why it happens:** `ILIKE '%${userInput}%'` looks harmless but allows wildcard injection
**How to avoid:** Always use parameterized queries: `{ search: `%${query}%` }`
**Warning signs:** String template literals in SQL conditions

### Pitfall 2: Missing Indexes for Name Search
**What goes wrong:** Full table scans on name ILIKE searches
**Why it happens:** B-tree indexes don't help with leading wildcard `%name%`
**How to avoid:** For admin-only search with <100k tenants, accept this. Consider `pg_trgm` for scale.
**Warning signs:** Slow search queries in production logs

### Pitfall 3: Cursor Confusion with Sorting
**What goes wrong:** Cursor-based pagination breaks when sort order changes
**Why it happens:** Offset cursor assumes stable ordering
**How to avoid:** Always specify explicit ORDER BY in query builder
**Warning signs:** Duplicate or missing results when paginating

### Pitfall 4: Exposing Sensitive Tenant Data
**What goes wrong:** Returning full tenant entity with settings/internal fields
**Why it happens:** Convenience of returning raw entity
**How to avoid:** Use explicit response DTO with only: id, name, status, tier, matchedEmail, suspensionReason
**Warning signs:** API response contains settings JSONB, timestamps, etc.

### Pitfall 5: Case-Sensitive Email Comparison
**What goes wrong:** Email search fails for `John@Example.com` when stored as `john@example.com`
**Why it happens:** Forgetting to normalize both search term and stored value
**How to avoid:** Always `email.toLowerCase()` - existing pattern in AdminService
**Warning signs:** "Not found" for emails that visibly exist

## Code Examples

Verified patterns from official sources:

### Search Query DTO
```typescript
// Based on audit-logs/dto/audit-log.dto.ts patterns
import { IsString, MinLength, MaxLength, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TenantSearchQueryDto {
  @ApiProperty({
    description: 'Search query (tenant ID, user email, or tenant name)',
    example: 'acme',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @MinLength(2, { message: 'Search query must be at least 2 characters' })
  @MaxLength(255)
  q: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Cursor for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;
}
```

### Search Response DTO
```typescript
// Minimal response per CONTEXT.md decisions
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus, TenantTier } from '../../tenants/entities/tenant.entity';

export class TenantSearchResultDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Acme Corporation' })
  name: string;

  @ApiProperty({ enum: ['active', 'suspended', 'cancelled'], example: 'active' })
  status: TenantStatus;

  @ApiProperty({ enum: ['home', 'enterprise', 'msp'], example: 'enterprise' })
  tier: TenantTier;

  @ApiPropertyOptional({
    description: 'Email that matched when search was by email',
    example: 'admin@acme.com',
  })
  matchedEmail?: string;

  @ApiPropertyOptional({
    description: 'Reason for suspension (only when status is suspended)',
    example: 'Payment overdue',
  })
  suspensionReason?: string;
}

export class TenantSearchResponseDto {
  @ApiProperty({ type: [TenantSearchResultDto] })
  data: TenantSearchResultDto[];

  @ApiProperty()
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}
```

### Controller Endpoint
```typescript
// Following pattern from admin.controller.ts
@Get('tenants/search')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('admin-jwt')
@ApiOperation({
  summary: 'Search tenants',
  description: 'Search tenants by ID, email, or name. Auto-detects query type.',
})
@ApiResponse({ status: 200, type: TenantSearchResponseDto })
@ApiResponse({ status: 400, description: 'Query too short or invalid' })
@ApiResponse({ status: 401, description: 'Admin authentication required' })
async searchTenants(
  @Query() query: TenantSearchQueryDto,
): Promise<TenantSearchResponseDto> {
  return this.adminService.searchTenants(query);
}
```

### Service Search Logic
```typescript
// TypeORM query builder pattern from msp-clients.service.ts
async searchTenants(query: TenantSearchQueryDto): Promise<TenantSearchResponseDto> {
  const searchTerm = query.q.trim();
  const limit = query.limit || 20;
  const offset = query.cursor ? parseInt(query.cursor, 10) : 0;

  const queryType = this.detectQueryType(searchTerm);

  let results: TenantSearchResultDto[];
  let total: number;

  if (queryType === 'id') {
    // Direct ID lookup
    const tenant = await this.tenantRepository.findOne({
      where: { id: searchTerm },
      select: ['id', 'name', 'status', 'tier'],
    });
    results = tenant ? [this.toSearchResult(tenant)] : [];
    total = results.length;
  } else if (queryType === 'email') {
    // Join with users for email search
    const qb = this.tenantRepository
      .createQueryBuilder('tenant')
      .leftJoin('tenant.users', 'user')
      .where('LOWER(user.email) = :email', { email: searchTerm.toLowerCase() })
      .select(['tenant.id', 'tenant.name', 'tenant.status', 'tenant.tier', 'user.email']);

    total = await qb.getCount();
    const tenants = await qb.orderBy('tenant.name', 'ASC')
      .skip(offset).take(limit + 1).getMany();

    results = tenants.slice(0, limit).map(t =>
      this.toSearchResult(t, t.users?.[0]?.email)
    );
  } else {
    // Name search with ILIKE
    const qb = this.tenantRepository
      .createQueryBuilder('tenant')
      .where('tenant.name ILIKE :search', { search: `%${searchTerm}%` })
      .select(['tenant.id', 'tenant.name', 'tenant.status', 'tenant.tier']);

    total = await qb.getCount();
    const tenants = await qb.orderBy('tenant.name', 'ASC')
      .skip(offset).take(limit + 1).getMany();

    results = tenants.slice(0, limit).map(t => this.toSearchResult(t));
  }

  const hasMore = queryType === 'id' ? false : results.length === limit;

  return {
    data: results,
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
| Offset pagination | Cursor-based pagination | Industry standard | Better for large datasets, no page skipping |
| `LIKE` operator | `ILIKE` for case-insensitive | PostgreSQL standard | Cleaner than `LOWER(col) LIKE LOWER(?)` |

**Deprecated/outdated:**
- None - this is standard CRUD pattern work

## Open Questions

Things that couldn't be fully resolved:

1. **Suspension reason field**
   - What we know: CONTEXT.md says include suspension reason when suspended
   - What's unclear: Tenant entity doesn't have a `suspensionReason` field currently
   - Recommendation: Either add field to tenant entity or omit from response (defer to planning)

2. **Result ordering preference**
   - What we know: CONTEXT.md says Claude's discretion
   - What's unclear: Best UX for admin search results
   - Recommendation: Order by name ASC (alphabetical, predictable, simple)

3. **Empty result HTTP status**
   - What we know: CONTEXT.md says Claude's discretion
   - What's unclear: 200 empty vs 404
   - Recommendation: 200 with empty array (consistent with other endpoints like msp-clients)

4. **Minimum query length**
   - What we know: CONTEXT.md says Claude's discretion
   - What's unclear: Best balance of usability vs performance
   - Recommendation: 2 characters minimum (matches common patterns in codebase)

## Sources

### Primary (HIGH confidence)
- `api/src/common/dto/pagination.dto.ts` - Pagination patterns
- `api/src/modules/msp-clients/msp-clients.service.ts` - ILIKE search and TypeORM query builder
- `api/src/modules/admin/admin.controller.ts` - Admin endpoint patterns
- `api/src/modules/admin/admin.service.ts` - Admin service patterns
- `api/src/modules/audit-logs/dto/audit-log.dto.ts` - DTO validation patterns
- `api/src/modules/tenants/entities/tenant.entity.ts` - Tenant entity structure
- `api/src/modules/users/entities/user.entity.ts` - User entity structure
- `scripts/init-postgres.sql` - Database indexes (tenants.slug, users.email)

### Secondary (MEDIUM confidence)
- TypeORM documentation for query builder patterns

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use in codebase
- Architecture: HIGH - Follows exact patterns from existing admin/msp-clients modules
- Pitfalls: HIGH - Based on real patterns observed in codebase

**Research date:** 2026-01-17
**Valid until:** 60 days (stable NestJS/TypeORM patterns, minimal dependency on external changes)
