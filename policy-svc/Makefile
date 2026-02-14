# Nebula DNS - Policy Service Makefile
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

.PHONY: all build test test-unit test-integration test-integration-cache test-integration-clickhouse clean run

# Build the service
build:
	go build -o bin/policy-svc ./cmd/main.go

# Run all tests
test: test-unit

# Run unit tests only (skip integration tests)
test-unit:
	go test ./... -v -short

# Run all integration tests
# Requires: TEST_REDIS_URL, TEST_CLICKHOUSE_URL, TEST_CLICKHOUSE_DB
test-integration:
	go test ./... -v -tags=integration

# Run Redis cache integration tests only
# Requires: TEST_REDIS_URL (defaults to redis://localhost:6379)
test-integration-cache:
	go test ./internal/cache/... -v -tags=integration

# Run ClickHouse integration tests only
# Requires: TEST_CLICKHOUSE_URL (defaults to http://localhost:8123)
#           TEST_CLICKHOUSE_DB (defaults to default)
test-integration-clickhouse:
	go test ./internal/clickhouse/... -v -tags=integration

# Clean build artifacts
clean:
	rm -rf bin/

# Run the service
run:
	go run ./cmd/main.go

# Run linter
lint:
	golangci-lint run ./...

# Format code
fmt:
	go fmt ./...

# Environment variables needed for integration tests:
#
# TEST_REDIS_URL: Redis connection URL
#                 Example: redis://localhost:6379
#                 Example: rediss://host:6379 (TLS)
#
# TEST_CLICKHOUSE_URL: ClickHouse HTTP endpoint
#                      Example: http://localhost:8123
#                      Example: https://host:8443 (ClickHouse Cloud)
#
# TEST_CLICKHOUSE_DB: ClickHouse database name
#                     Example: default
#                     Example: nebula_dns
#
# Example usage:
#   TEST_REDIS_URL=redis://localhost:6379 \
#   TEST_CLICKHOUSE_URL=http://localhost:8123 \
#   TEST_CLICKHOUSE_DB=default \
#   make test-integration
