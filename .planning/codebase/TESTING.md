# Testing Patterns

**Analysis Date:** 2026-01-17

## Test Framework

### API (NestJS)

**Runner:**
- Jest v29.7.0
- Config: `api/package.json` (jest section) and `api/test/jest-e2e.json`

**Assertion Library:**
- Jest built-in (`expect`)

**Run Commands:**
```bash
cd api
npm run test                 # Run all unit tests
npm run test:watch           # Watch mode
npm run test:cov             # Coverage report
npm run test:e2e             # E2E tests
npm run test:debug           # Debug mode with inspector
```

### UI (Next.js)

**Unit Tests:**
- Jest v30.2.0
- Config: `ui/jest.config.js`
- Environment: jsdom

**E2E Tests:**
- Playwright v1.57.0
- Config: `ui/playwright.config.ts`

**Run Commands:**
```bash
cd ui
npm run test                 # Jest unit tests
npm run test:e2e             # Playwright E2E
npm run test:e2e:ui          # Playwright interactive UI
npm run test:e2e:headed      # Headed browser mode
```

### Policy Service (Go)

**Runner:**
- Go testing package

**Run Commands:**
```bash
cd policy-svc
go test ./...                    # All tests
go test -v ./...                 # Verbose output
go test -bench=.                 # Benchmarks
go test -tags=integration ./tests/integration/...  # Integration tests
```

## Test File Organization

**API Location:**
- Unit tests: Co-located with source (`*.spec.ts` next to implementation)
- E2E tests: Separate `api/test/` directory (`*.e2e-spec.ts`)
- Integration tests: Co-located or in `test/` directory

**Naming:**
- Unit: `{feature}.service.spec.ts`, `{feature}.controller.spec.ts`
- E2E: `{feature}.e2e-spec.ts`
- Integration: `{feature}.integration.spec.ts`

**Structure:**
```
api/src/modules/policies/
├── policies.service.ts
├── policies.service.spec.ts      # Unit test (co-located)
├── policies.controller.ts
├── policies.controller.spec.ts   # Unit test (co-located)

api/test/
├── app.e2e-spec.ts              # E2E tests
├── auth.e2e-spec.ts
├── policy.e2e-spec.ts
├── jest-e2e.json                # E2E config
├── setup.ts                     # E2E setup
```

**UI Location:**
- E2E tests: `ui/e2e/` directory
- Helpers: `ui/e2e/helpers/`

**Naming:**
- E2E: `{feature}.spec.ts`

**Structure:**
```
ui/e2e/
├── auth.spec.ts
├── dashboard.spec.ts
├── policies.spec.ts
├── helpers/
│   └── auth.ts                  # Test helpers
```

**Go Location:**
- Unit tests: Co-located (`*_test.go`)
- Integration tests: Separate `tests/integration/` directory

**Structure:**
```
policy-svc/internal/handlers/
├── handlers.go
├── handlers_test.go             # Unit test

policy-svc/tests/integration/
├── main_test.go                 # Setup/teardown
├── policy_evaluation_test.go
├── category_blocking_test.go
```

## Test Structure

### API Unit Test Pattern

```typescript
// File header
// Nebula DNS - [Feature] Unit Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PoliciesService', () => {
  let service: PoliciesService;
  let repository: any;

  // Mock data
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockPolicy = {
    id: 'policy-123',
    name: 'Test Policy',
    tenantId: mockTenantId,
    // ... other fields
  };

  // Mock repositories
  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesService,
        {
          provide: getRepositoryToken(Policy),
          useValue: mockRepository,
        },
        // ... other mocked providers
      ],
    }).compile();

    service = module.get<PoliciesService>(PoliciesService);
    repository = module.get(getRepositoryToken(Policy));

    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return policy when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockPolicy);

      const result = await service.findOne(mockTenantId, mockPolicy.id);

      expect(result.id).toBe(mockPolicy.id);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockPolicy.id, tenantId: mockTenantId },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockTenantId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
```

### API E2E Test Pattern

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Authentication E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Login Flow', () => {
    it('should reject login with missing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'wrong' });

      expect(response.status).toBe(401);
    });
  });
});
```

### UI E2E Test Pattern (Playwright)

```typescript
// File header
// Nebula DNS - [Feature] E2E Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test'
import { loginAndNavigate, waitForPageLoad } from './helpers/auth'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard')
    await waitForPageLoad(page)
  })

  test('should load dashboard page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: /mission control/i })).toBeVisible()
  })

  test('should display stats cards', async ({ page }) => {
    await expect(page.getByText(/total queries/i)).toBeVisible()
    await expect(page.getByText(/threats blocked/i)).toBeVisible()
  })

  test('should navigate to policies', async ({ page }) => {
    const policiesLink = page.getByRole('link', { name: /policies/i }).first()
    await policiesLink.click()
    await expect(page).toHaveURL(/\/dashboard\/policies/)
  })
})
```

### Go Unit Test Pattern

```go
// File header
// Nebula DNS - Enterprise DNS Security Platform
// Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// [Component] Tests

package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"go.uber.org/zap"
)

func TestHandlers_Health(t *testing.T) {
	logger := zap.NewNop()
	handlers := NewHandlers(nil, nil, nil, nil, logger)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	handlers.Health(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)

	if response["status"] != "healthy" {
		t.Errorf("Expected status 'healthy', got %v", response["status"])
	}
}

func TestHandlers_Evaluate_MissingFields(t *testing.T) {
	logger := zap.NewNop()
	handlers := NewHandlers(nil, nil, nil, nil, logger)

	testCases := []struct {
		name    string
		request models.EvaluateRequest
	}{
		{
			name: "Missing TenantID",
			request: models.EvaluateRequest{
				LocationID: "location-456",
				QName:      "example.com",
			},
		},
		// ... more cases
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			body, _ := json.Marshal(tc.request)
			req := httptest.NewRequest(http.MethodPost, "/evaluate", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			handlers.Evaluate(w, req)

			if w.Code != http.StatusBadRequest {
				t.Errorf("Expected status 400, got %d", w.Code)
			}
		})
	}
}
```

### Go Integration Test Pattern

```go
//go:build integration
// +build integration

package integration

import (
	"context"
	"testing"
)

func TestPolicyEvaluation_AllowlistExact(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy
	policy := &models.CompiledPolicy{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		AllowlistExact: map[string]bool{
			"allowed.example.com": true,
		},
		// ... configuration
	}

	// Store in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Execute
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "allowed.example.com",
	}
	result := testPolicyService.Evaluate(ctx, req)

	// Assert
	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW, got %s", result.Decision)
	}
}
```

## Mocking

### API Mocking Framework

Jest mocks with manual mock objects.

**Repository Mocking:**
```typescript
const mockPolicyRepository = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

// In test setup
{
  provide: getRepositoryToken(Policy),
  useValue: mockPolicyRepository,
}
```

**Service Mocking:**
```typescript
const mockRedisService = {
  publishPolicyUpdate: jest.fn(),
  invalidateCache: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
};

const mockMfaService = {
  isMfaEnabled: jest.fn().mockResolvedValue(false),
  verifyMfaCode: jest.fn().mockResolvedValue(true),
};
```

**QueryBuilder Mocking:**
```typescript
const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([mockPolicy]),
};
mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
```

**What to Mock:**
- External services (Redis, ClickHouse)
- Database repositories
- Third-party APIs (Stripe, SendGrid)
- JWT service for auth tests

**What NOT to Mock:**
- The service under test
- DTOs and validation (test actual validation)
- Pure utility functions

### UI E2E Authentication Mocking

```typescript
// ui/e2e/helpers/auth.ts

type TenantTier = 'home' | 'enterprise' | 'msp'

export async function login(page: Page, tier: TenantTier = 'enterprise') {
  await page.goto('/login')
  await page.evaluate(({ tier }) => {
    const tierConfig = {
      home: { id: 'home-tenant-1', email: 'home_user@test.com' },
      enterprise: { id: 'enterprise-tenant-1', email: 'enterprise_user@test.com' },
      msp: { id: 'msp-tenant-1', email: 'msp_user@test.com' },
    }

    const config = tierConfig[tier]
    localStorage.setItem('token', 'test-token-for-e2e')
    localStorage.setItem('user', JSON.stringify({
      id: `user-${tier}-1`,
      email: config.email,
      role: 'admin',
      tenantId: config.id,
    }))
    localStorage.setItem('tenant', JSON.stringify({
      id: config.id,
      tier: tier,
    }))
  }, { tier })
}

export async function loginAndNavigate(page: Page, path: string, tier: TenantTier = 'enterprise') {
  await login(page, tier)
  await page.goto(path)
}
```

### Go Mocking

Use nil dependencies for unit tests, real services for integration:

```go
// Unit test - nil dependencies
func TestHandlers_Health(t *testing.T) {
	logger := zap.NewNop()
	handlers := NewHandlers(nil, nil, nil, nil, logger)
	// ...
}

// Integration test - real dependencies
func setupTest(t *testing.T) {
	testCache = cache.NewPolicyCache(redisClient, logger)
	testPolicyService = policy.NewService(testCache, logger, nil, false)
}
```

## Fixtures and Factories

### API Test Data Patterns

```typescript
// Mock data at describe block level
const mockTenantId = 'tenant-123';
const mockUserId = 'user-123';

const mockPolicy = {
  id: 'policy-123',
  name: 'Test Policy',
  description: 'A test policy',
  tenantId: mockTenantId,
  currentVersion: 1,
  isDefault: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockPolicyVersion = {
  id: 'version-123',
  policyId: 'policy-123',
  version: 1,
  config: {
    blockCategories: ['malware', 'phishing'],
    threatBlocking: { enabled: true, feeds: ['malware'] },
    safesearch: { enabled: false, services: [] },
    schedules: [],
  },
  createdBy: mockUserId,
  changelog: 'Initial version',
  createdAt: new Date('2024-01-01'),
};
```

### Go Test Helpers

```go
// Helper to create a basic test policy
func createTestPolicy() *models.CompiledPolicy {
	return &models.CompiledPolicy{
		TenantID:          "tenant-123",
		LocationID:        "location-456",
		PolicyVersion:     1,
		AllowlistExact:    make(map[string]bool),
		BlocklistExact:    make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds:       []string{},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
		UpdatedAt:         time.Now(),
	}
}
```

**Location:**
- API: Inline in spec files (no separate fixtures directory)
- Go: Helper functions in test files

## Coverage

**Requirements:** Not strictly enforced, but coverage reports available.

**View Coverage:**
```bash
# API
cd api && npm run test:cov
# Coverage output: api/coverage/

# Go
cd policy-svc && go test -cover ./...
```

## Test Types

**Unit Tests:**
- Scope: Single service or handler method
- Mocks: All external dependencies
- Speed: Fast (< 1s per file)
- Location: Co-located with source

**Integration Tests:**
- Scope: Multiple services with real dependencies
- Mocks: Only external APIs (Stripe, etc.)
- Speed: Medium (requires Docker services)
- Location: Separate directory or tagged

**E2E Tests:**
- Scope: Full application stack
- API E2E: HTTP requests through full NestJS app
- UI E2E: Browser automation with Playwright
- Speed: Slow (10-30s per test)

## Common Patterns

**Async Testing:**
```typescript
it('should return policy when found', async () => {
  mockRepository.findOne.mockResolvedValue(mockPolicy);

  const result = await service.findOne(tenantId, policyId);

  expect(result.id).toBe(policyId);
});
```

**Error Testing:**
```typescript
it('should throw NotFoundException when not found', async () => {
  mockRepository.findOne.mockResolvedValue(null);

  await expect(
    service.findOne(tenantId, 'nonexistent'),
  ).rejects.toThrow(NotFoundException);
});
```

**HTTP Status Testing (E2E):**
```typescript
it('should reject with 401 for invalid credentials', async () => {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'bad@example.com', password: 'wrong' });

  expect(response.status).toBe(401);
});
```

**Playwright Assertions:**
```typescript
// Visibility
await expect(page.getByRole('heading')).toBeVisible()

// URL
await expect(page).toHaveURL(/\/dashboard/)

// Text content
await expect(page.getByText(/threats blocked/i)).toBeVisible()

// With timeout
await expect(element).toBeVisible({ timeout: 10000 })
```

**Table-Driven Tests (Go):**
```go
func TestIsThreatFeedEnabled(t *testing.T) {
	tests := []struct {
		name       string
		feeds      []string
		threatType string
		expected   bool
	}{
		{"Exact match", []string{"malware", "phishing"}, "malware", true},
		{"Not in list", []string{"phishing"}, "malware", false},
		{"All wildcard", []string{"all"}, "malware", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			policy := &models.CompiledPolicy{ThreatFeeds: tt.feeds}
			result := svc.isThreatFeedEnabled(policy, tt.threatType)
			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}
```

---

*Testing analysis: 2026-01-17*
