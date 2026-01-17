# Coding Conventions

**Analysis Date:** 2026-01-17

## Naming Patterns

**Files:**
- API entities: `kebab-case.entity.ts` (e.g., `policy.entity.ts`, `custom-list.entity.ts`)
- API services: `kebab-case.service.ts` (e.g., `policies.service.ts`)
- API controllers: `kebab-case.controller.ts` (e.g., `policies.controller.ts`)
- API DTOs: `kebab-case.dto.ts` (e.g., `create-policy.dto.ts`, `login.dto.ts`)
- API modules: `kebab-case.module.ts` (e.g., `policies.module.ts`)
- API specs: `kebab-case.service.spec.ts` or `kebab-case.controller.spec.ts`
- UI components: `PascalCase.tsx` (e.g., `MissionControlDashboard.tsx`)
- UI hooks: `camelCase.ts` (e.g., `useApi.ts`, `useTierFeatures.tsx`)
- Go files: `snake_case.go` (e.g., `handlers.go`, `service_test.go`)

**Functions:**
- TypeScript/JavaScript: `camelCase` (e.g., `findAll`, `createPolicy`, `handleBlockDomain`)
- Go: `PascalCase` for exported, `camelCase` for private (e.g., `Evaluate`, `isThreatFeedEnabled`)

**Variables:**
- TypeScript/JavaScript: `camelCase` (e.g., `mockTenantId`, `policyRepository`)
- Go: `camelCase` (e.g., `policySvc`, `logger`)
- Constants: `SCREAMING_SNAKE_CASE` for true constants (e.g., `ROLES_KEY`, `API_URL`)

**Types/Classes:**
- TypeScript: `PascalCase` (e.g., `Policy`, `LoginResponseDto`, `AuthService`)
- Enums: `PascalCase` with `SCREAMING_SNAKE_CASE` values (e.g., `Role.ADMIN`, `Role.OWNER`)
- Go structs: `PascalCase` (e.g., `Handlers`, `CompiledPolicy`)

**Database:**
- Table names: `snake_case` plural (e.g., `policies`, `custom_lists`)
- Column names: `snake_case` (e.g., `tenant_id`, `created_at`, `current_version`)
- Column decorators use `name:` for snake_case mapping: `@Column({ name: 'tenant_id' })`

## Code Style

**Formatting:**
- Tool: Prettier (API), Next.js defaults (UI)
- Single quotes for strings: `'string'`
- Trailing commas: `all` (including function parameters)
- No semicolons in UI (.tsx files follow Next.js defaults)
- Semicolons required in API (.ts files)

**Linting:**
- API: ESLint with `@typescript-eslint` plugin
- UI: ESLint with `next/core-web-vitals` extends
- Key rules:
  - `@typescript-eslint/no-explicit-any`: off (any is permitted but should be avoided)
  - `@typescript-eslint/no-unused-vars`: warn with `argsIgnorePattern: '^_'` (prefix unused with `_`)
  - `react/no-unescaped-entities`: off (in UI)

## Import Organization

**Order for API (NestJS):**
1. External packages (`@nestjs/*`, `typeorm`, `class-validator`)
2. Internal modules with `@/` alias (`@/common/*`, `@/modules/*`)
3. Relative imports (`./dto`, `./entities`, `../other-module`)

**Order for UI (Next.js):**
1. React and Next.js (`react`, `next/*`)
2. External packages (`framer-motion`, `recharts`, `swr`)
3. Internal with `@/` alias (`@/components/*`, `@/hooks/*`, `@/lib/*`)
4. Relative imports

**Path Aliases:**
- API: `@/*` maps to `src/*`
- UI: `@/*` maps to `./src/*`

**Example API imports:**
```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';

import { Policy } from './entities/policy.entity';
import { CreatePolicyDto } from './dto/create-policy.dto';
```

**Example UI imports:**
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

import { ThreatRadar } from './ThreatRadar'
import { useThreatData } from '@/hooks/useApi'
import { api } from '@/lib/api'
```

## Error Handling

**API Patterns:**
- Use NestJS built-in exceptions: `NotFoundException`, `BadRequestException`, `UnauthorizedException`
- Throw exceptions directly, let NestJS handle HTTP response
- Include meaningful error messages: `throw new NotFoundException('Policy ${id} not found')`
- Use Logger for internal logging: `this.logger.warn('Invalid request', { details })`

**Example:**
```typescript
async findOne(tenantId: string, id: string): Promise<Policy> {
  const policy = await this.policyRepository.findOne({
    where: { id, tenantId },
  });

  if (!policy) {
    throw new NotFoundException(`Policy ${id} not found`);
  }

  return policy;
}
```

**UI Patterns:**
- Use custom `ApiError` class with status code
- Handle errors in hooks with SWR error states
- Display user-friendly error messages in components
- Retry buttons for recoverable errors

**Example:**
```typescript
class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
```

**Go Patterns:**
- Return errors as second value: `func (s *Service) Evaluate(ctx, req) (Result, error)`
- Log errors with zap: `h.logger.Warn("Invalid request", zap.Error(err))`
- HTTP handlers return appropriate status codes with JSON error response

## Logging

**API Framework:** NestJS Logger

**Patterns:**
```typescript
private readonly logger = new Logger(PoliciesService.name);

// Info level for normal operations
this.logger.log(`Policy ${policy.id} created in tenant ${tenantId}`);

// Warn for unexpected but handled situations
this.logger.warn('Invalid token type', { type: tokenType });

// Error for failures
this.logger.error('Failed to compile policy', error.stack);
```

**Go Framework:** uber-go/zap

**Patterns:**
```go
logger := zap.NewNop() // or zap.NewProduction()
h.logger.Warn("Invalid evaluate request", zap.Error(err))
h.logger.Info("Policy evaluated", zap.String("tenantId", req.TenantID))
```

## Comments

**When to Comment:**
- File headers with copyright and purpose (required by project standards)
- Complex business logic that isn't self-documenting
- Public API methods (via JSDoc/Swagger decorators)
- TODO/FIXME for known issues

**File Header Pattern:**
```typescript
// Nebula DNS - [File Purpose]
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
```

**JSDoc/Swagger for APIs:**
```typescript
@ApiOperation({
  summary: 'Authenticate user and get tokens',
  description: 'Authenticates a user with email and password...',
})
@ApiResponse({ status: 200, description: 'Login successful', type: LoginResponseDto })
@ApiResponse({ status: 401, description: 'Invalid credentials' })
async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
```

## Function Design

**Size:** Keep functions focused on single responsibility. Services typically have 10-50 line methods.

**Parameters:**
- Use DTOs for complex input validation
- Tenant ID as first parameter for tenant-scoped operations
- User ID passed separately when needed for auditing

**Return Values:**
- Return domain objects or DTOs
- Use Promise for async operations
- Paginated responses return `{ data: T[], pagination: { cursor, hasMore } }`

**Example pattern:**
```typescript
async findAll(
  tenantId: string,
  pagination: PaginationQueryDto,
): Promise<PaginatedResponse<Policy>> {
  // Implementation
}
```

## Module Design

**NestJS Module Structure:**
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Entity1, Entity2])],
  controllers: [FeatureController],
  providers: [FeatureService, HelperService],
  exports: [FeatureService], // Only export what other modules need
})
export class FeatureModule {}
```

**Exports:**
- Export services that other modules depend on
- Don't export entities or internal helpers

**Barrel Files:**
- UI uses `index.ts` for component exports: `export * from './ComponentName'`
- API modules don't typically use barrel files

## Validation Patterns

**DTOs with class-validator:**
```typescript
export class CreatePolicyDto {
  @ApiProperty({ example: 'Strict Security Policy' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => PolicyConfigDto)
  @IsObject()
  config: PolicyConfigDto;
}
```

**Nested validation:** Use `@ValidateNested()` with `@Type(() => NestedDto)`

## Entity Patterns

**Base Entities:**
```typescript
// All entities extend BaseEntity (id, createdAt, updatedAt)
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// Tenant-scoped entities extend TenantScopedEntity
export abstract class TenantScopedEntity extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;
}
```

**Entity class:**
```typescript
@Entity('policies')
export class Policy extends TenantScopedEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @ManyToOne(() => Tenant, (tenant) => tenant.policies)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
```

## React Component Patterns

**Client Components:**
```typescript
'use client'

import { useState } from 'react'

export function ComponentName() {
  const [state, setState] = useState(initialValue)

  // Event handlers
  const handleAction = () => { /* ... */ }

  // Loading/error states first
  if (isLoading) return <LoadingState />
  if (hasError) return <ErrorState />

  // Main render
  return (/* JSX */)
}
```

**Custom Hooks:**
```typescript
export function useFeature(param: string) {
  return useSWR(
    param ? `/endpoint/${param}` : null,
    fetcher,
    { ...defaultConfig }
  )
}
```

## Multi-Tenancy Pattern

**All tenant-scoped queries include tenantId:**
```typescript
const policy = await this.policyRepository.findOne({
  where: { id, tenantId }, // Always include tenantId
});
```

**Controllers extract tenant from JWT:**
```typescript
@Get()
@UseGuards(JwtAuthGuard)
async findAll(@CurrentTenant() tenantId: string) {
  return this.service.findAll(tenantId);
}
```

---

*Convention analysis: 2026-01-17*
