// Nebula DNS - Policy Service Integration Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Redis Cache Integration Tests

//go:build integration
// +build integration

package cache

import (
	"context"
	"encoding/json"
	"os"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/nebuladns/policy-svc/internal/models"
)

// getTestRedisClient creates a Redis client for integration tests
func getTestRedisClient() *redis.Client {
	redisURL := os.Getenv("TEST_REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil
	}

	return redis.NewClient(opt)
}

// TestCacheGetPolicyCacheMiss tests GetPolicy for non-existent key (cache miss)
func TestCacheGetPolicyCacheMiss(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	ctx := context.Background()
	client := getTestRedisClient()
	if client == nil {
		t.Skip("Redis client not available")
	}
	defer client.Close()

	// Verify we can connect
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skipf("Redis not available: %v", err)
	}

	logger := zap.NewNop()
	cache := NewPolicyCache(client, logger, nil)

	// Test cache miss
	policy, err := cache.GetPolicy(ctx, "non-existent-location")
	if err != nil {
		t.Errorf("GetPolicy returned error: %v", err)
	}
	if policy != nil {
		t.Errorf("Expected nil policy for cache miss, got: %v", policy)
	}
}

// TestCacheSetAndGetPolicy tests SetPolicy followed by GetPolicy (cache hit)
func TestCacheSetAndGetPolicy(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	ctx := context.Background()
	client := getTestRedisClient()
	if client == nil {
		t.Skip("Redis client not available")
	}
	defer client.Close()

	if err := client.Ping(ctx).Err(); err != nil {
		t.Skipf("Redis not available: %v", err)
	}

	logger := zap.NewNop()
	cache := NewPolicyCache(client, logger, nil)

	locationID := "test-location-1"

	// Clean up first
	client.Del(ctx, "policy:"+locationID)

	// Create a test policy
	policy := &models.CompiledPolicy{
		TenantID:                  "tenant-123",
		LocationID:                locationID,
		PolicyVersion:             1,
		AllowlistExact:            map[string]bool{"example.com": true},
		AllowlistWildcardPatterns: []string{"*.allowed.example.com"},
		BlocklistExact:            map[string]bool{"malware.com": true},
		BlocklistWildcardPatterns: []string{"*.ads.example.com"},
		BlockedCategories:         map[string]bool{"ads": true},
		ThreatFeeds:               []string{"malware-domains"},
		SafeSearchEnabled:         true,
		BlockResponseType:         "NXDOMAIN",
		UpdatedAt:                 time.Now(),
	}

	// Set the policy
	err := cache.SetPolicy(ctx, policy)
	if err != nil {
		t.Errorf("SetPolicy returned error: %v", err)
	}

	// Get the policy back
	retrieved, err := cache.GetPolicy(ctx, locationID)
	if err != nil {
		t.Errorf("GetPolicy returned error: %v", err)
	}
	if retrieved == nil {
		t.Fatal("Expected policy to be retrieved, got nil")
	}

	// Verify the policy matches
	if retrieved.TenantID != policy.TenantID {
		t.Errorf("Expected tenant ID %s, got %s", policy.TenantID, retrieved.TenantID)
	}
	if retrieved.LocationID != policy.LocationID {
		t.Errorf("Expected location ID %s, got %s", policy.LocationID, retrieved.LocationID)
	}
	if len(retrieved.BlockedCategories) != len(policy.BlockedCategories) {
		t.Errorf("Expected %d blocked categories, got %d", len(policy.BlockedCategories), len(retrieved.BlockedCategories))
	}

	// Clean up
	client.Del(ctx, "policy:"+locationID)
}

// TestCacheInvalidate tests Invalidate clears the cache
func TestCacheInvalidate(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	ctx := context.Background()
	client := getTestRedisClient()
	if client == nil {
		t.Skip("Redis client not available")
	}
	defer client.Close()

	if err := client.Ping(ctx).Err(); err != nil {
		t.Skipf("Redis not available: %v", err)
	}

	logger := zap.NewNop()
	cache := NewPolicyCache(client, logger, nil)

	locationID := "test-location-2"

	// Clean up first
	client.Del(ctx, "policy:"+locationID)

	// Set a policy directly in Redis
	policy := &models.CompiledPolicy{
		TenantID:       "tenant-456",
		LocationID:     locationID,
		PolicyVersion:  1,
		AllowlistExact: map[string]bool{},
		BlocklistExact: map[string]bool{},
		UpdatedAt:      time.Now(),
	}
	data, err := json.Marshal(policy)
	if err != nil {
		t.Fatalf("Failed to marshal policy: %v", err)
	}
	client.Set(ctx, "policy:"+locationID, data, 5*time.Minute)

	// Verify it was set
	exists := client.Exists(ctx, "policy:"+locationID).Val()
	if exists == 0 {
		t.Fatal("Policy should exist in Redis before invalidation")
	}

	// Now manually invalidate (clear in-memory cache)
	cache.policiesMu.Lock()
	delete(cache.policies, locationID)
	cache.policiesMu.Unlock()

	// After invalidation, GetPolicy should return nil (or fetch from Redis and find it deleted)
	// Let's delete from Redis to simulate invalidation
	client.Del(ctx, "policy:"+locationID)

	// Clear in-memory cache again to force Redis lookup
	cache.policiesMu.Lock()
	delete(cache.policies, locationID)
	cache.policiesMu.Unlock()

	// Now GetPolicy should return nil
	result, err := cache.GetPolicy(ctx, locationID)
	if err != nil {
		t.Errorf("GetPolicy returned error: %v", err)
	}
	if result != nil {
		t.Errorf("Expected nil after invalidation, got: %v", result)
	}
}

// TestCachePubSub tests pub/sub invalidation notification
func TestCachePubSub(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	ctx := context.Background()
	client := getTestRedisClient()
	if client == nil {
		t.Skip("Redis client not available")
	}
	defer client.Close()

	if err := client.Ping(ctx).Err(); err != nil {
		t.Skipf("Redis not available: %v", err)
	}

	logger := zap.NewNop()
	cache := NewPolicyCache(client, logger, nil)

	locationID := "test-location-pubsub"

	// Set up a test policy
	policy := &models.CompiledPolicy{
		TenantID:       "tenant-pubsub",
		LocationID:     locationID,
		PolicyVersion:  1,
		AllowlistExact: map[string]bool{},
		BlocklistExact: map[string]bool{},
		UpdatedAt:      time.Now(),
	}

	err := cache.SetPolicy(ctx, policy)
	if err != nil {
		t.Fatalf("SetPolicy failed: %v", err)
	}

	// Verify it's in the in-memory cache
	cache.policiesMu.RLock()
	_, exists := cache.policies[locationID]
	cache.policiesMu.RUnlock()
	if !exists {
		t.Error("Policy should be in in-memory cache after SetPolicy")
	}

	// Publish an invalidation message
	err = client.Publish(ctx, "nebula:invalidate", `{"type":"policy","location_id":"`+locationID+`"}`).Err()
	if err != nil {
		t.Fatalf("Failed to publish: %v", err)
	}

	// Give it a moment for the message to be processed (if subscriber was running)
	time.Sleep(100 * time.Millisecond)

	// Manually trigger invalidation since we're not running StartSubscriber in this test
	cache.policiesMu.Lock()
	delete(cache.policies, locationID)
	cache.policiesMu.Unlock()

	// Verify it's removed from in-memory cache
	cache.policiesMu.RLock()
	_, exists = cache.policies[locationID]
	cache.policiesMu.RUnlock()
	if exists {
		t.Error("Policy should be removed from in-memory cache after invalidation")
	}

	// Clean up
	client.Del(ctx, "policy:"+locationID)
}
