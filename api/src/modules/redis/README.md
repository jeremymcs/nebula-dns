# Redis Module - Integration Tests

## Overview

This module provides Redis cache operations for the Nebula DNS platform, including policy caching, token management, pub/sub messaging, and IP range storage.

## Test Coverage

The `redis.integration.spec.ts` file provides comprehensive integration testing with **30 test cases** covering all Redis operations:

### Policy Cache Operations (6 tests)
- ✅ Store compiled policy correctly
- ✅ Retrieve compiled policy correctly
- ✅ Return null for non-existent policy
- ✅ Respect policy TTL and expire correctly
- ✅ Invalidate policy and publish message
- ✅ Handle concurrent access to same policy

### Token Cache Operations (5 tests)
- ✅ Store token with TTL
- ✅ Retrieve valid token
- ✅ Return null for non-existent token
- ✅ Return null for expired token
- ✅ Delete token and publish invalidation

### Pub/Sub Operations (3 tests)
- ✅ Publish and receive messages on channel
- ✅ Handle multiple subscribers receiving same message
- ✅ Handle list invalidation messages

### Hash Operations (3 tests)
- ✅ Set and get hash field
- ✅ Get all hash fields
- ✅ Delete hash field

### IP Range Operations (5 tests)
- ✅ Store IP range mapping
- ✅ Publish invalidation when storing IP range
- ✅ Delete IP range mapping
- ✅ Get all IP range mappings
- ✅ Return empty array when no IP ranges exist

### Connection and Error Handling (3 tests)
- ✅ Handle get operation on non-existent key
- ✅ Handle concurrent operations without errors
- ✅ Provide access to underlying Redis client

### Performance Tests (3 tests)
- ✅ Handle batch policy operations efficiently (100 policies < 5s)
- ✅ Handle high-throughput token operations (200 tokens < 10s)
- ✅ Handle rapid pub/sub messages (50 messages < 5s)

### Data Integrity Tests (2 tests)
- ✅ Preserve complex nested objects in policy cache
- ✅ Handle special characters in keys and values

## Running the Tests

### Prerequisites

Ensure Redis is running on port 4379 (Docker Compose default):

```bash
# Start Redis via Docker Compose
docker-compose up -d redis

# Or start standalone Redis
docker run -d -p 4379:6379 redis:7-alpine
```

### Execute Tests

```bash
# Run integration tests
npm test -- redis.integration.spec.ts

# Run with coverage
npm test -- redis.integration.spec.ts --coverage

# Run in watch mode
npm test -- redis.integration.spec.ts --watch
```

## Test Database Isolation

The tests use Redis database 15 (TEST_DB) to isolate test data from production data. The database is flushed between each test to ensure clean state.

## Key Features Tested

### 1. Cache TTL Management
Tests verify that cached items expire correctly according to their TTL settings, including:
- Policy cache with configurable TTL
- Token cache with automatic expiration
- Proper handling of expired vs. non-existent keys

### 2. Pub/Sub Messaging
Comprehensive testing of Redis pub/sub for cache invalidation:
- Single subscriber/publisher
- Multiple subscribers receiving broadcasts
- Message filtering by type (policy, token, list, ip_ranges)
- Error handling for malformed messages

### 3. Concurrent Operations
Tests ensure thread-safety and race condition handling:
- Concurrent policy reads/writes
- Batch operations (100+ items)
- High-throughput scenarios (200+ operations)

### 4. Data Integrity
Validates that complex data structures are preserved:
- Nested objects with multiple levels
- Arrays and objects in policy configurations
- Special characters and Unicode in keys/values

### 5. Error Handling
Tests graceful degradation:
- Non-existent key access returns null (not error)
- Invalid operations are handled safely
- Connection resilience

## Performance Benchmarks

All performance tests include assertions to ensure operations complete within acceptable timeframes:

| Operation | Volume | Max Time |
|-----------|--------|----------|
| Batch policy storage | 100 policies | 5 seconds |
| Batch policy retrieval | 100 policies | 5 seconds |
| Token operations | 200 tokens | 10 seconds |
| Pub/sub messaging | 50 messages | 5 seconds |

## Integration with Policy Service

The Redis cache is critical for the Policy Service's O(1) evaluation performance:

1. **Policy Compilation**: Policies are compiled and stored in Redis with `policy:compiled:{locationId}` keys
2. **Cache Invalidation**: Pub/sub messages notify Policy Service to reload policies
3. **Token Validation**: Authentication tokens are cached for fast validation
4. **IP Range Lookup**: Location-based IP ranges are stored for tenant identification

## Architecture Notes

### Multi-Tenancy
All cache operations are tenant-aware and isolated by database selection in tests.

### Fail-Open Strategy
The Redis service is designed to fail gracefully - if Redis is unavailable, the system continues to operate (though with degraded performance).

### Pub/Sub Channels
- `nebula:invalidate` - Primary channel for cache invalidation messages

### Message Types
- `policy` - Policy cache invalidation
- `token` - Token cache invalidation
- `list` - Allow/block list invalidation
- `ip_ranges` - IP range mapping invalidation
- `threat` - Threat feed update
- `category` - Category update

## Future Enhancements

Potential areas for additional testing:
- [ ] Redis cluster mode testing
- [ ] Sentinel failover testing
- [ ] Connection pool exhaustion scenarios
- [ ] Large payload handling (>1MB)
- [ ] Network partition simulation
- [ ] Memory pressure scenarios

## Troubleshooting

### Tests Fail to Connect
Ensure Redis is running:
```bash
docker-compose ps redis
# Should show "Up" status
```

### Tests Timeout
Increase Jest timeout or check Redis performance:
```bash
redis-cli -p 4379 INFO stats
```

### Flaky Pub/Sub Tests
Pub/sub tests include wait times for message propagation. If tests are flaky:
1. Check system load
2. Verify Redis is not under memory pressure
3. Increase wait times in tests if needed

## Related Documentation

- [Redis Service Implementation](./redis.service.ts)
- [Policy Evaluation Algorithm](../../../docs/E-policy-evaluation-algorithm.md)
- [System Design](../../../docs/A-system-design.md)
