# Policy Service Integration Tests

This directory contains comprehensive integration tests for the Nebula DNS Policy Service. These tests require a running Redis instance and test the complete policy evaluation flow with real cache operations.

## Prerequisites

- Go 1.23+
- Redis 7+ running on `localhost:6379` (or set `REDIS_URL` environment variable)
- Docker (optional, for running Redis in a container)

## Running Tests

### Using Local Redis

If you have Redis running locally on port 6379:

```bash
go test -v -tags=integration ./tests/integration/...
```

### Using Docker Compose

Start Redis using the project's docker-compose:

```bash
# From the project root
docker-compose up -d redis

# Run tests
cd policy-svc
go test -v -tags=integration ./tests/integration/...

# Cleanup
docker-compose down
```

### Using Custom Redis URL

```bash
REDIS_URL="redis-host:6379" go test -v -tags=integration ./tests/integration/...
```

### Run Specific Test

```bash
go test -v -tags=integration ./tests/integration/... -run TestPolicyEvaluation_AllowlistExact
```

### Run with Race Detection

```bash
go test -v -race -tags=integration ./tests/integration/...
```

## Test Coverage

### Policy Evaluation Tests (`policy_evaluation_test.go`)
- Exact allowlist matching
- Wildcard allowlist matching (`*.example.com`)
- Exact blocklist matching
- Wildcard blocklist matching
- Allowlist precedence over blocklist
- Default allow behavior

### Category Blocking Tests (`category_blocking_test.go`)
- Blocked category blocking
- Allowed category pass-through
- Schedule-based blocking (active schedules)
- Schedule-based blocking (inactive schedules)
- Timezone handling in schedules
- Invalid timezone fallback to UTC
- Category cache invalidation

### SafeSearch Tests (`safesearch_test.go`)
- Google SafeSearch rewrite
- Bing SafeSearch rewrite
- YouTube SafeSearch rewrite
- Non-search domain (no rewrite)
- SafeSearch disabled behavior
- Allowlist precedence over SafeSearch
- Blocklist precedence over SafeSearch

### Threat Feed Tests (`threat_feeds_test.go`)
- Malware domain blocking
- Phishing domain blocking
- Clean domain allowing
- Threat type filtering (only block enabled types)
- "all" wildcard for threat feeds
- Botnet domain blocking
- Allowlist precedence over threat feeds
- Threat cache invalidation

### Fail-Safe Tests (`failsafe_test.go`)
- Fail-open mode (ALLOW on error)
- Fail-closed mode (BLOCK on error)
- Cache error handling (fail-open)
- Cache error handling (fail-closed)
- Partial Redis failure graceful degradation
- Recovery after error
- Nil cache handling

### Cache Invalidation Tests (`cache_invalidation_test.go`)
- Policy update invalidation
- Token invalidation
- IP range invalidation
- Multiple rapid invalidations
- Invalid invalidation message handling
- Unknown invalidation type handling

## Test Architecture

### Setup and Teardown

Each test file uses shared setup/teardown functions defined in `main_test.go`:

- `setupTest(t)`: Clears all Redis test data before each test
- `teardownTest(t)`: Cleans up after each test
- `TestMain(m)`: Initializes test infrastructure (Redis client, cache, policy service)

### Test Isolation

- Each test clears Redis before running to ensure isolation
- Tests use unique tenant/location IDs where appropriate
- No shared state between tests

### Real Dependencies

- Tests use a real Redis instance (not mocked)
- Tests use the actual cache implementation
- Tests use the actual policy service implementation
- This ensures integration correctness

## Continuous Integration

These integration tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Start Redis
  run: docker run -d -p 6379:6379 redis:7-alpine

- name: Run Integration Tests
  run: |
    cd policy-svc
    go test -v -tags=integration ./tests/integration/...
```

## Performance Considerations

- Tests typically complete in < 5 seconds total
- Each test runs in < 100ms
- Minimal Redis operations to reduce latency
- Suitable for pre-commit hooks

## Troubleshooting

### Redis Connection Errors

If you see "Failed to connect to Redis":

1. Ensure Redis is running: `redis-cli ping`
2. Check Redis is on the correct port: `netstat -an | grep 6379`
3. Set REDIS_URL if using non-standard location

### Test Timeouts

If tests timeout:

1. Check Redis performance: `redis-cli --latency`
2. Increase timeout in test code if needed
3. Check for network issues

### Flaky Tests

If tests are inconsistent:

1. Check for race conditions: `go test -race`
2. Increase sleep durations for cache invalidation tests
3. Ensure Redis is not under heavy load

## Contributing

When adding new integration tests:

1. Use the `//go:build integration` tag
2. Call `setupTest(t)` at the start
3. Call `defer teardownTest(t)` after setup
4. Use descriptive test names
5. Test both success and failure cases
6. Add documentation to this README

## License

Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
