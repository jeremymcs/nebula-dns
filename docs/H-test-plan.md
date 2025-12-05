# H. Test Plan

## Overview

This test plan covers unit tests, integration tests, and multi-tenant isolation tests for SafeDNS. All tests must ensure tenant isolation and correct policy enforcement.

## Test Categories

### 1. Unit Tests

#### Policy Evaluation Tests

**File**: `policy-service/policy_test.go`

**Test Cases**:
1. **Allowlist exact match**: Domain in allowlist should return ALLOW
2. **Allowlist wildcard match**: Subdomain matching wildcard should return ALLOW
3. **Blocklist exact match**: Domain in blocklist should return BLOCK with NXDOMAIN
4. **Blocklist wildcard match**: Subdomain matching wildcard should return BLOCK
5. **Threat blocking**: Domain in threat map should return BLOCK with threat reason
6. **Category blocking**: Domain in blocked category should return BLOCK with category reason
7. **Priority order**: Allowlist > Blocklist > Threat > Category > Default ALLOW
8. **SafeSearch rewrite**: Search engine domain should return REWRITE when enabled
9. **Case insensitivity**: Domain matching should be case-insensitive
10. **Trailing dot normalization**: Domain with trailing dot should match without dot

**Example Test**:
```go
func TestPolicyEvaluation_AllowlistExact(t *testing.T) {
    policy := &PolicySnapshot{
        Allowlist: map[string][]string{
            "exact": {"example.com"},
        },
    }
    
    req := &QueryRequest{
        QName: "example.com",
        QType: 1,
    }
    
    decision := evaluatePolicy(policy, req)
    
    assert.Equal(t, "ALLOW", decision.Action)
    assert.Equal(t, "allowlist_exact", decision.Reason)
    assert.Equal(t, uint8(0), decision.RCode)
}
```

#### API Service Tests

**File**: `api/src/policies/policies.service.spec.ts`

**Test Cases**:
1. **Create policy**: Creates new version with incremented version number
2. **Activate policy**: Deactivates previous active policy and activates new one
3. **Tenant isolation**: Cannot access policies from other tenants
4. **Policy versioning**: Each edit creates new immutable version
5. **Validation**: Invalid policy config should be rejected

**Example Test**:
```typescript
describe('PoliciesService', () => {
  it('should create new policy version', async () => {
    const tenantId = 'test-tenant-id';
    const userId = 'test-user-id';
    const dto = {
      name: 'Test Policy',
      config: { block_categories: ['malware'] },
    };
    
    const policy = await service.create(tenantId, userId, dto);
    
    expect(policy.version).toBe(1);
    expect(policy.isActive).toBe(false);
  });
  
  it('should enforce tenant isolation', async () => {
    const tenant1Id = 'tenant-1';
    const tenant2Id = 'tenant-2';
    
    const policy1 = await service.create(tenant1Id, 'user-1', createDto);
    
    await expect(
      service.findOne(policy1.id, tenant2Id)
    ).rejects.toThrow(NotFoundException);
  });
});
```

#### Authentication Tests

**File**: `api/src/auth/auth.service.spec.ts`

**Test Cases**:
1. **Valid login**: Returns JWT token and user info
2. **Invalid password**: Rejects with 401
3. **Account lockout**: Locks account after 5 failed attempts
4. **Locked account**: Rejects login when account is locked
5. **Password hashing**: Passwords are hashed with bcrypt

### 2. Integration Tests

#### DoH Decision Flow Tests

**File**: `tests/integration/doh-decision.test.ts`

**Test Cases**:
1. **ALLOW decision**: Query for allowed domain returns upstream answer
2. **BLOCK decision**: Query for blocked domain returns NXDOMAIN
3. **REWRITE decision**: Query for search engine returns SafeSearch rewrite
4. **Invalid token**: Request with invalid token returns error
5. **Missing token**: Request without token returns error
6. **Rate limiting**: Requests exceeding rate limit return SERVFAIL

**Example Test**:
```typescript
describe('DoH Decision Flow', () => {
  it('should BLOCK domain in blocklist', async () => {
    const token = 'valid-location-token';
    const response = await fetch('https://localhost:443/dns-query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/dns-message',
      },
      body: dnsQuery('blocked-domain.com'),
    });
    
    const dnsResponse = parseDNSMessage(response.body);
    expect(dnsResponse.rcode).toBe(RCODE_NXDOMAIN);
  });
});
```

#### Policy Service Integration Tests

**File**: `tests/integration/policy-service.test.ts`

**Test Cases**:
1. **Policy snapshot loading**: Loads policy from Redis
2. **Cache hit**: Returns cached policy without Redis query
3. **Cache miss**: Fetches from Redis and caches result
4. **Redis failure**: Falls back to ALLOW with error logging
5. **Policy update**: Picks up new policy snapshot after update

#### End-to-End Policy Update Flow

**File**: `tests/integration/policy-update-flow.test.ts`

**Test Cases**:
1. **Create policy**: Policy created via API
2. **Compile snapshot**: Background worker compiles snapshot
3. **Redis update**: Snapshot stored in Redis
4. **Policy service pickup**: Policy service loads new snapshot
5. **Query enforcement**: New queries use updated policy

### 3. Multi-Tenant Isolation Tests

#### Tenant Data Isolation

**File**: `tests/integration/tenant-isolation.test.ts`

**Test Cases**:
1. **User access**: User from tenant A cannot access tenant B's data
2. **Policy access**: Policies are scoped to tenant
3. **Location access**: Locations are scoped to tenant
4. **Query isolation**: DNS queries are isolated by tenant/location
5. **Report isolation**: Reports only show data for user's tenant

**Example Test**:
```typescript
describe('Tenant Isolation', () => {
  it('should prevent cross-tenant policy access', async () => {
    const tenant1Token = await login('tenant1@example.com', 'password');
    const tenant2Token = await login('tenant2@example.com', 'password');
    
    const policy1 = await createPolicy(tenant1Token, { name: 'Policy 1' });
    
    // Tenant 2 should not see Tenant 1's policy
    const policies = await getPolicies(tenant2Token);
    expect(policies).not.toContainEqual(
      expect.objectContaining({ id: policy1.id })
    );
  });
});
```

#### Location Token Isolation

**File**: `tests/integration/location-isolation.test.ts`

**Test Cases**:
1. **Token scope**: Location token only works for its location
2. **Token rotation**: Old token invalidated after rotation
3. **Cross-tenant token**: Token from tenant A cannot access tenant B
4. **Certificate isolation**: DoT certificates are location-scoped

#### DNS Query Isolation

**File**: `tests/integration/dns-isolation.test.ts`

**Test Cases**:
1. **Policy enforcement**: Each location uses its assigned policy
2. **Query logging**: Logs include correct tenant_id and location_id
3. **Report accuracy**: Reports only show queries for tenant's locations

### 4. Performance Tests

#### Policy Evaluation Performance

**File**: `tests/performance/policy-evaluation.benchmark.go`

**Benchmarks**:
1. **Exact match lookup**: O(1) hash map lookup
2. **Wildcard matching**: Trie traversal performance
3. **Full evaluation**: End-to-end policy evaluation latency
4. **Cache hit rate**: Policy snapshot cache effectiveness

**Target Metrics**:
- Policy evaluation: < 1ms p99 latency
- Cache hit rate: > 99%
- Throughput: > 10,000 QPS per policy service instance

#### API Performance

**File**: `tests/performance/api.benchmark.ts`

**Benchmarks**:
1. **Policy creation**: < 100ms
2. **Policy activation**: < 200ms
3. **Report queries**: < 500ms for 1-day window

### 5. Security Tests

#### Authentication Security

**File**: `tests/security/auth-security.test.ts`

**Test Cases**:
1. **Password strength**: Weak passwords rejected
2. **JWT expiration**: Expired tokens rejected
3. **Token tampering**: Modified tokens rejected
4. **Brute force protection**: Account locked after failed attempts

#### Input Validation

**File**: `tests/security/input-validation.test.ts`

**Test Cases**:
1. **SQL injection**: Malicious input sanitized
2. **XSS prevention**: User input escaped in responses
3. **Domain validation**: Invalid domains rejected
4. **Policy config validation**: Invalid configs rejected

#### Rate Limiting

**File**: `tests/security/rate-limiting.test.ts`

**Test Cases**:
1. **Per-location limit**: 1000 QPS limit enforced
2. **Per-tenant limit**: 10000 QPS limit enforced
3. **Burst handling**: Burst requests handled correctly
4. **Recovery**: Rate limits reset after window

## Test Execution

### Running Unit Tests

```bash
# API tests
cd api
npm test

# Policy service tests
cd policy-service
go test ./...
```

### Running Integration Tests

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Cleanup
docker-compose -f docker-compose.test.yml down
```

### Running Performance Tests

```bash
# Policy service benchmarks
cd policy-service
go test -bench=. -benchmem

# API benchmarks
cd api
npm run test:benchmark
```

## Test Coverage Goals

- **Unit tests**: > 80% code coverage
- **Integration tests**: All critical paths covered
- **Security tests**: All security controls tested
- **Performance tests**: All performance targets validated

## Continuous Integration

All tests run in CI pipeline:
1. Lint checks
2. Unit tests
3. Integration tests (against test database)
4. Security scans
5. Performance benchmarks (on schedule)

## Test Data

Test data fixtures:
- `tests/fixtures/tenants.json`: Test tenant data
- `tests/fixtures/policies.json`: Test policy configurations
- `tests/fixtures/threat-feeds.json`: Sample threat feed data

## Test Maintenance

- Tests updated with each feature addition
- Flaky tests identified and fixed
- Performance regressions detected and addressed
- Security tests updated for new threats
