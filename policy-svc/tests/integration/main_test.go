// Nebula DNS - Policy Service Integration Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

//go:build integration
// +build integration

package integration

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/nebuladns/policy-svc/internal/cache"
	"github.com/nebuladns/policy-svc/internal/metrics"
	"github.com/nebuladns/policy-svc/internal/policy"
)

var (
	testRedisClient *redis.Client
	testCache       *cache.PolicyCache
	testPolicyService *policy.Service
	testLogger      *zap.Logger
	testMetrics     *metrics.Metrics
)

func TestMain(m *testing.M) {
	// Initialize logger
	testLogger = zap.NewNop()

	// Get Redis URL from environment or use default
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	// Initialize Redis client
	testRedisClient = redis.NewClient(&redis.Options{
		Addr: redisURL,
	})

	// Test Redis connection
	ctx := context.Background()
	if err := testRedisClient.Ping(ctx).Err(); err != nil {
		testLogger.Fatal("Failed to connect to Redis", zap.Error(err))
		os.Exit(1)
	}

	// Initialize metrics
	testMetrics = metrics.NewMetrics()

	// Initialize cache
	testCache = cache.NewPolicyCache(testRedisClient, testLogger, testMetrics)

	// Initialize policy service (fail-open mode)
	testPolicyService = policy.NewService(testCache, testLogger, testMetrics, false)

	// Start cache subscriber in background
	go testCache.StartSubscriber(ctx)

	// Give subscriber time to start
	time.Sleep(100 * time.Millisecond)

	// Run tests
	exitCode := m.Run()

	// Cleanup
	testRedisClient.Close()

	os.Exit(exitCode)
}

// setupTest clears Redis and prepares for a new test
func setupTest(t *testing.T) {
	ctx := context.Background()

	// Clear all Redis keys related to testing
	keys, err := testRedisClient.Keys(ctx, "policy:*").Result()
	if err == nil && len(keys) > 0 {
		testRedisClient.Del(ctx, keys...)
	}

	keys, err = testRedisClient.Keys(ctx, "token:*").Result()
	if err == nil && len(keys) > 0 {
		testRedisClient.Del(ctx, keys...)
	}

	keys, err = testRedisClient.Keys(ctx, "threat:*").Result()
	if err == nil && len(keys) > 0 {
		testRedisClient.Del(ctx, keys...)
	}

	keys, err = testRedisClient.Keys(ctx, "category:*").Result()
	if err == nil && len(keys) > 0 {
		testRedisClient.Del(ctx, keys...)
	}

	keys, err = testRedisClient.Keys(ctx, "ip_range:*").Result()
	if err == nil && len(keys) > 0 {
		testRedisClient.Del(ctx, keys...)
	}

	// Small delay to ensure cleanup is complete
	time.Sleep(10 * time.Millisecond)
}

// teardownTest cleans up after a test
func teardownTest(t *testing.T) {
	setupTest(t) // Reuse cleanup logic
}
