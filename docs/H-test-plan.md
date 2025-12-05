# H. Test Plan

## Overview

This document outlines the testing strategy for SafeDNS, covering unit tests, integration tests, and end-to-end tests. The goal is to ensure tenant isolation, policy enforcement correctness, and system reliability.

## Test Categories

### 1. Unit Tests

#### 1.1 Policy Evaluation Tests (`policy-svc/internal/policy/*_test.go`)

```go
// Test priority order
func TestEvaluationPriority(t *testing.T) {
    tests := []struct {
        name           string
        domain         string
        inAllowlist    bool
        inBlocklist    bool
        inThreatFeed   bool
        expectedAction string
        expectedReason string
    }{
        {
            name:           "allowlist takes precedence over blocklist",
            domain:         "example.com",
            inAllowlist:    true,
            inBlocklist:    true,
            expectedAction: "ALLOW",
            expectedReason: "allowlist",
        },
        {
            name:           "blocklist takes precedence over threat feed",
            domain:         "blocked.com",
            inBlocklist:    true,
            inThreatFeed:   true,
            expectedAction: "BLOCK",
            expectedReason: "blocklist",
        },
        {
            name:           "threat feed blocks when not in lists",
            domain:         "malware.com",
            inThreatFeed:   true,
            expectedAction: "BLOCK",
            expectedReason: "threat:malware",
        },
        {
            name:           "default allow for unknown domains",
            domain:         "unknown.com",
            expectedAction: "ALLOW",
            expectedReason: "default",
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Setup policy and cache mocks
            // Execute evaluation
            // Assert result matches expected
        })
    }
}

// Test wildcard matching
func TestWildcardMatching(t *testing.T) {
    tests := []struct {
        pattern string
        domain  string
        match   bool
    }{
        {"*.example.com", "sub.example.com", true},
        {"*.example.com", "example.com", false},
        {"*.example.com", "deep.sub.example.com", true},
        {"example.com", "example.com", true},
        {"example.com", "sub.example.com", false},
    }
    
    for _, tt := range tests {
        t.Run(tt.pattern+"_"+tt.domain, func(t *testing.T) {
            trie := models.NewSuffixTrie()
            trie.Insert(tt.pattern)
            assert.Equal(t, tt.match, trie.Match(tt.domain))
        })
    }
}

// Test schedule evaluation
func TestScheduleEvaluation(t *testing.T) {
    schedule := models.Schedule{
        Name:      "Work Hours",
        Days:      []string{"mon", "tue", "wed", "thu", "fri"},
        StartTime: "09:00",
        EndTime:   "17:00",
        Timezone:  "America/New_York",
    }
    
    tests := []struct {
        name     string
        time     time.Time
        expected bool
    }{
        {"monday 10am", time.Date(2024, 1, 8, 10, 0, 0, 0, nyLoc), true},
        {"monday 8am", time.Date(2024, 1, 8, 8, 0, 0, 0, nyLoc), false},
        {"saturday 10am", time.Date(2024, 1, 6, 10, 0, 0, 0, nyLoc), false},
    }
    
    // ... implement tests
}
```

#### 1.2 API Service Tests (`api/src/**/*.spec.ts`)

```typescript
// Auth service tests
describe('AuthService', () => {
  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const result = await authService.login({
        email: 'admin@test.com',
        password: 'ValidP@ssw0rd!',
      });
      
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('admin@test.com');
    });

    it('should reject invalid credentials', async () => {
      await expect(
        authService.login({
          email: 'admin@test.com',
          password: 'wrong',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should lock account after 5 failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await expect(
          authService.login({
            email: 'admin@test.com',
            password: 'wrong',
          }),
        ).rejects.toThrow();
      }
      
      await expect(
        authService.login({
          email: 'admin@test.com',
          password: 'ValidP@ssw0rd!',
        }),
      ).rejects.toThrow(/Account locked/);
    });
  });
});

// Policy versioning tests
describe('PoliciesService', () => {
  describe('update', () => {
    it('should create new version on config change', async () => {
      const policy = await policiesService.create(tenantId, {
        name: 'Test Policy',
        config: { blockCategories: ['malware'] },
      }, userId);
      
      expect(policy.currentVersion).toBe(1);
      
      await policiesService.update(tenantId, policy.id, {
        config: { blockCategories: ['malware', 'phishing'] },
      }, userId);
      
      const updated = await policiesService.findOne(tenantId, policy.id);
      expect(updated.currentVersion).toBe(2);
      
      const versions = await policiesService.getVersions(tenantId, policy.id);
      expect(versions).toHaveLength(2);
    });

    it('should not create version for metadata-only changes', async () => {
      const policy = await policiesService.create(...);
      
      await policiesService.update(tenantId, policy.id, {
        name: 'Renamed Policy',
        // No config change
      }, userId);
      
      expect(policy.currentVersion).toBe(1);
    });
  });
});
```

### 2. Integration Tests

#### 2.1 DoH Decision Flow Tests

```go
// Test complete DoH request flow
func TestDoHDecisionFlow(t *testing.T) {
    // Setup: Create tenant, location, policy, token
    tenant := setupTestTenant(t)
    location := setupTestLocation(t, tenant.ID)
    token := setupTestToken(t, location.ID)
    
    tests := []struct {
        name           string
        domain         string
        token          string
        expectedStatus int
        expectedAction string
    }{
        {
            name:           "valid token allows query",
            domain:         "google.com",
            token:          token.Value,
            expectedStatus: 200,
            expectedAction: "ALLOW",
        },
        {
            name:           "invalid token rejected",
            domain:         "google.com",
            token:          "invalid-token",
            expectedStatus: 401,
        },
        {
            name:           "blocked domain returns BLOCK",
            domain:         "malware.test.com",
            token:          token.Value,
            expectedStatus: 200,
            expectedAction: "BLOCK",
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := createDoHRequest(tt.domain, tt.token)
            resp := executeDoHQuery(req)
            
            assert.Equal(t, tt.expectedStatus, resp.StatusCode)
            if tt.expectedAction != "" {
                assert.Equal(t, tt.expectedAction, resp.Decision)
            }
        })
    }
}
```

#### 2.2 Cache Invalidation Tests

```go
func TestCacheInvalidation(t *testing.T) {
    // Setup
    location := setupTestLocation(t, tenantID)
    policy := setupTestPolicy(t, tenantID)
    
    // Prime the cache
    _, err := cache.GetPolicy(ctx, location.ID)
    require.NoError(t, err)
    
    // Update policy via API
    newConfig := PolicyConfig{BlockCategories: []string{"malware", "phishing"}}
    updatePolicy(t, policy.ID, newConfig)
    
    // Wait for invalidation to propagate
    time.Sleep(100 * time.Millisecond)
    
    // Verify cache was updated
    cachedPolicy, err := cache.GetPolicy(ctx, location.ID)
    require.NoError(t, err)
    assert.Contains(t, cachedPolicy.BlockedCategories, "phishing")
}
```

### 3. Tenant Isolation Tests

#### 3.1 Cross-Tenant Data Access Prevention

```typescript
describe('Tenant Isolation', () => {
  let tenant1User: TestUser;
  let tenant2User: TestUser;
  let tenant1Policy: Policy;
  let tenant2Policy: Policy;

  beforeAll(async () => {
    tenant1User = await createTestUser('tenant1');
    tenant2User = await createTestUser('tenant2');
    tenant1Policy = await createPolicy(tenant1User);
    tenant2Policy = await createPolicy(tenant2User);
  });

  it('tenant1 cannot read tenant2 policies', async () => {
    const response = await request(app)
      .get(`/policies/${tenant2Policy.id}`)
      .set('Authorization', `Bearer ${tenant1User.token}`);
    
    expect(response.status).toBe(404);
  });

  it('tenant1 cannot update tenant2 policies', async () => {
    const response = await request(app)
      .patch(`/policies/${tenant2Policy.id}`)
      .set('Authorization', `Bearer ${tenant1User.token}`)
      .send({ name: 'Hacked' });
    
    expect(response.status).toBe(404);
  });

  it('tenant1 cannot delete tenant2 policies', async () => {
    const response = await request(app)
      .delete(`/policies/${tenant2Policy.id}`)
      .set('Authorization', `Bearer ${tenant1User.token}`);
    
    expect(response.status).toBe(404);
  });

  it('tenant1 cannot list tenant2 users', async () => {
    const response = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${tenant1User.token}`);
    
    expect(response.status).toBe(200);
    const userIds = response.body.data.map((u: any) => u.id);
    expect(userIds).not.toContain(tenant2User.id);
  });

  it('tenant1 token cannot query on tenant2 location', async () => {
    const tenant1Token = await createLocationToken(tenant1User);
    const tenant2Location = await createLocation(tenant2User);
    
    const response = await evaluatePolicy({
      tenantId: tenant2User.tenantId,
      locationId: tenant2Location.id,
      token: tenant1Token.value,
    });
    
    expect(response.valid).toBe(false);
  });
});
```

#### 3.2 Query Log Isolation

```typescript
describe('Query Log Isolation', () => {
  it('tenant1 cannot see tenant2 query logs', async () => {
    // Generate queries for both tenants
    await generateTestQueries(tenant1);
    await generateTestQueries(tenant2);
    
    const response = await request(app)
      .get('/logs/queries')
      .set('Authorization', `Bearer ${tenant1User.token}`);
    
    expect(response.status).toBe(200);
    const tenantIds = response.body.data.map((l: any) => l.tenantId);
    expect(tenantIds.every((id: string) => id === tenant1.id)).toBe(true);
  });

  it('reports only include tenant-specific data', async () => {
    const response = await request(app)
      .get('/reports/summary?period=7d')
      .set('Authorization', `Bearer ${tenant1User.token}`);
    
    expect(response.status).toBe(200);
    // Verify counts match tenant1's queries only
  });
});
```

### 4. RBAC Tests

```typescript
describe('Role-Based Access Control', () => {
  const actions = [
    { method: 'POST', path: '/policies', minRole: 'admin' },
    { method: 'PATCH', path: '/policies/:id', minRole: 'admin' },
    { method: 'DELETE', path: '/policies/:id', minRole: 'owner' },
    { method: 'POST', path: '/users', minRole: 'admin' },
    { method: 'DELETE', path: '/users/:id', minRole: 'owner' },
    { method: 'GET', path: '/reports/summary', minRole: 'readonly' },
  ];
  
  const roles = ['owner', 'admin', 'analyst', 'readonly'];
  const roleHierarchy = { owner: 0, admin: 1, analyst: 2, readonly: 3 };

  for (const action of actions) {
    for (const role of roles) {
      const shouldAllow = roleHierarchy[role] <= roleHierarchy[action.minRole];
      
      it(`${role} ${shouldAllow ? 'can' : 'cannot'} ${action.method} ${action.path}`, async () => {
        const user = await createUserWithRole(tenantId, role);
        
        const response = await request(app)
          [action.method.toLowerCase()](action.path.replace(':id', testResourceId))
          .set('Authorization', `Bearer ${user.token}`)
          .send(getTestPayload(action));
        
        if (shouldAllow) {
          expect(response.status).not.toBe(403);
        } else {
          expect(response.status).toBe(403);
        }
      });
    }
  }
});
```

### 5. Performance Tests

```go
func BenchmarkPolicyEvaluation(b *testing.B) {
    // Setup large policy with many rules
    policy := createLargePolicy(
        allowlistSize: 1000,
        blocklistSize: 5000,
        categories: 50,
    )
    
    cache := setupCacheWithPolicy(policy)
    service := policy.NewService(cache, logger, false)
    
    b.ResetTimer()
    
    for i := 0; i < b.N; i++ {
        domain := fmt.Sprintf("test%d.example.com", i)
        service.Evaluate(ctx, &models.EvaluateRequest{
            TenantID:   "test-tenant",
            LocationID: "test-location",
            QName:      domain,
            QType:      1,
        })
    }
}

func BenchmarkWildcardMatching(b *testing.B) {
    trie := models.NewSuffixTrie()
    for i := 0; i < 10000; i++ {
        trie.Insert(fmt.Sprintf("*.subdomain%d.example.com", i))
    }
    
    b.ResetTimer()
    
    for i := 0; i < b.N; i++ {
        trie.Match("test.subdomain500.example.com")
    }
}
```

### 6. Security Tests

```typescript
describe('Security', () => {
  describe('Authentication', () => {
    it('rejects expired JWT tokens', async () => {
      const expiredToken = createExpiredToken(user);
      
      const response = await request(app)
        .get('/policies')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(response.status).toBe(401);
    });

    it('rejects tampered JWT tokens', async () => {
      const tamperedToken = user.token.slice(0, -5) + 'XXXXX';
      
      const response = await request(app)
        .get('/policies')
        .set('Authorization', `Bearer ${tamperedToken}`);
      
      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('rejects SQL injection in domain names', async () => {
      const response = await request(app)
        .post('/lists/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          entries: [{ domain: "'; DROP TABLE users; --" }],
        });
      
      expect(response.status).toBe(400);
    });

    it('sanitizes XSS in policy names', async () => {
      const response = await request(app)
        .post('/policies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '<script>alert("xss")</script>',
          config: { blockCategories: [] },
        });
      
      expect(response.status).toBe(201);
      expect(response.body.name).not.toContain('<script>');
    });
  });

  describe('Rate Limiting', () => {
    it('enforces API rate limits', async () => {
      const requests = Array(100).fill(null).map(() =>
        request(app)
          .get('/policies')
          .set('Authorization', `Bearer ${userToken}`)
      );
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
```

## Test Execution

### Running Tests

```bash
# API unit tests
cd api && npm test

# API integration tests
cd api && npm run test:e2e

# Policy service tests
cd policy-svc && go test ./...

# Policy service benchmarks
cd policy-svc && go test -bench=. ./...

# All tests with coverage
npm run test:coverage
go test -coverprofile=coverage.out ./...
```

### CI Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  api-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd api && npm ci
      - run: cd api && npm test
      - run: cd api && npm run test:e2e

  policy-svc-tests:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'
      - run: cd policy-svc && go test -v -race ./...
      - run: cd policy-svc && go test -bench=. ./...
```

## Test Data Management

### Fixtures

```typescript
// test/fixtures/policies.ts
export const defaultPolicy = {
  name: 'Test Policy',
  config: {
    blockCategories: ['malware', 'phishing'],
    threatBlocking: { enabled: true, feeds: ['malware'] },
    safesearch: { enabled: false, services: [] },
    schedules: [],
  },
};

export const strictPolicy = {
  name: 'Strict Policy',
  config: {
    blockCategories: ['malware', 'phishing', 'adult', 'gambling', 'social_media'],
    threatBlocking: { enabled: true, feeds: ['malware', 'phishing', 'c2'] },
    safesearch: { enabled: true, services: ['google', 'youtube', 'bing'] },
    schedules: [
      {
        name: 'Work Hours',
        days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'UTC',
        additionalCategories: ['streaming', 'gaming'],
      },
    ],
  },
};
```

### Database Seeding

```typescript
// test/setup/seed.ts
export async function seedTestDatabase() {
  await dataSource.query('TRUNCATE TABLE users CASCADE');
  await dataSource.query('TRUNCATE TABLE tenants CASCADE');
  
  const tenant = await createTestTenant();
  const owner = await createTestUser(tenant.id, 'owner');
  const admin = await createTestUser(tenant.id, 'admin');
  const analyst = await createTestUser(tenant.id, 'analyst');
  const readonly = await createTestUser(tenant.id, 'readonly');
  
  return { tenant, owner, admin, analyst, readonly };
}
```

## Coverage Requirements

| Component | Minimum Coverage |
|-----------|------------------|
| Policy evaluation | 95% |
| Authentication/Authorization | 90% |
| API controllers | 80% |
| Data access layer | 85% |
| Cache management | 80% |

## Test Environment

- Tests run against isolated database instances
- Redis is flushed between test suites
- ClickHouse uses test database with auto-cleanup
- Network isolation between test containers
