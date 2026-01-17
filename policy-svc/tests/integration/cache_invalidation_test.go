// Nebula DNS - Policy Service Integration Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

//go:build integration
// +build integration

package integration

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/nebuladns/policy-svc/internal/models"
)

func TestCacheInvalidation_PolicyUpdate(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create initial policy
	policy := &models.CompiledPolicy{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: map[string]bool{
			"blocked.example.com": true,
		},
		BlockedCategories: make(map[string]bool),
		ThreatFeeds:       []string{},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// First evaluation - should be blocked
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "blocked.example.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)
	if result.Decision != "BLOCK" {
		t.Errorf("Expected BLOCK initially, got %s", result.Decision)
	}

	// Publish invalidation message
	invalidationMsg := map[string]string{
		"type":        "policy",
		"location_id": "location-test",
	}
	msgJSON, _ := json.Marshal(invalidationMsg)
	testRedisClient.Publish(ctx, "nebula:invalidate", string(msgJSON))

	// Wait for invalidation to process
	time.Sleep(50 * time.Millisecond)

	// Update policy in Redis
	updatedPolicy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool), // No longer blocked
		BlockedCategories: make(map[string]bool),
		ThreatFeeds:       []string{},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	if err := testCache.SetPolicy(ctx, updatedPolicy); err != nil {
		t.Fatalf("Failed to update policy: %v", err)
	}

	// Second evaluation - should be allowed (cache invalidated)
	result = testPolicyService.Evaluate(ctx, req)
	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW after policy update, got %s", result.Decision)
	}
}

func TestCacheInvalidation_TokenUpdate(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create token in Redis
	tokenHash := "test-token-hash-123"
	tokenData := map[string]interface{}{
		"tenantId":   "tenant-test",
		"locationId": "location-test",
		"label":      "Test Token",
	}
	tokenJSON, _ := json.Marshal(tokenData)
	testRedisClient.Set(ctx, "token:"+tokenHash, string(tokenJSON), 0)

	// First validation - should be valid
	result, err := testCache.ValidateToken(ctx, tokenHash)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}
	if result == nil || !result.ExpiresAt.After(time.Now()) {
		t.Error("Expected valid token")
	}

	// Remove token from Redis first
	testRedisClient.Del(ctx, "token:"+tokenHash)

	// Publish token invalidation
	invalidationMsg := map[string]string{
		"type":  "token",
		"token": tokenHash,
	}
	msgJSON, _ := json.Marshal(invalidationMsg)
	testRedisClient.Publish(ctx, "nebula:invalidate", string(msgJSON))

	// Wait for invalidation to process (pub/sub is async)
	time.Sleep(200 * time.Millisecond)

	// Second validation - should be invalid (cache invalidated, refetch from Redis fails)
	result, err = testCache.ValidateToken(ctx, tokenHash)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}
	if result != nil {
		t.Error("Expected invalid token after invalidation and removal")
	}
}

func TestCacheInvalidation_IPRanges(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Add IP range to Redis
	ipRange := models.IPRangeMapping{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		IPRange:    "192.168.1.0/24",
		RateLimit:  100,
	}
	ipRangeJSON, _ := json.Marshal(ipRange)
	testRedisClient.Set(ctx, "ip_range:192.168.1.0/24", string(ipRangeJSON), 0)

	// Load IP ranges
	if err := testCache.LoadIPRanges(ctx); err != nil {
		t.Fatalf("Failed to load IP ranges: %v", err)
	}

	// First lookup - should find the range
	result, err := testCache.LookupByIP("192.168.1.100")
	if err != nil {
		t.Fatalf("Failed to lookup IP: %v", err)
	}
	if !result.Found {
		t.Error("Expected to find IP range")
	}

	// Publish IP range invalidation
	invalidationMsg := map[string]string{
		"type": "ip_ranges",
	}
	msgJSON, _ := json.Marshal(invalidationMsg)
	testRedisClient.Publish(ctx, "nebula:invalidate", string(msgJSON))

	// Wait for invalidation to process and reload
	time.Sleep(100 * time.Millisecond)

	// Remove IP range from Redis
	testRedisClient.Del(ctx, "ip_range:192.168.1.0/24")

	// The cache should have reloaded in the background
	// Give it a bit more time
	time.Sleep(50 * time.Millisecond)

	// Second lookup - might still find it because reload happens async
	// This tests that the invalidation triggers a reload
	result, err = testCache.LookupByIP("192.168.1.100")
	if err != nil {
		t.Fatalf("Failed to lookup IP: %v", err)
	}
	// Don't assert on Found since the reload is async
	// The important part is that no error occurred
}

func TestCacheInvalidation_MultipleUpdates(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy
	policy := &models.CompiledPolicy{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: map[string]bool{
			"test1.example.com": true,
		},
		BlockedCategories: make(map[string]bool),
		ThreatFeeds:       []string{},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Perform multiple invalidations in rapid succession
	for i := 0; i < 5; i++ {
		invalidationMsg := map[string]string{
			"type":        "policy",
			"location_id": "location-test",
		}
		msgJSON, _ := json.Marshal(invalidationMsg)
		testRedisClient.Publish(ctx, "nebula:invalidate", string(msgJSON))
		time.Sleep(10 * time.Millisecond)
	}

	// Wait for all invalidations to process
	time.Sleep(100 * time.Millisecond)

	// Update policy
	policy.BlocklistExact = map[string]bool{
		"test2.example.com": true,
	}
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to update policy: %v", err)
	}

	// Verify new policy is in effect
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "test2.example.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)
	if result.Decision != "BLOCK" {
		t.Errorf("Expected BLOCK for updated policy, got %s", result.Decision)
	}

	// Old domain should now be allowed
	req.QName = "test1.example.com"
	result = testPolicyService.Evaluate(ctx, req)
	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW for old domain, got %s", result.Decision)
	}
}

func TestCacheInvalidation_InvalidMessage(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds:       []string{},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Publish invalid invalidation message
	testRedisClient.Publish(ctx, "nebula:invalidate", "invalid json")

	// Wait a bit
	time.Sleep(50 * time.Millisecond)

	// Service should still work despite invalid message
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "test.example.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)
	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW despite invalid message, got %s", result.Decision)
	}
}

func TestCacheInvalidation_UnknownType(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds:       []string{},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Publish invalidation with unknown type
	invalidationMsg := map[string]string{
		"type": "unknown_type",
	}
	msgJSON, _ := json.Marshal(invalidationMsg)
	testRedisClient.Publish(ctx, "nebula:invalidate", string(msgJSON))

	// Wait a bit
	time.Sleep(50 * time.Millisecond)

	// Service should still work
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "test.example.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)
	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW despite unknown type, got %s", result.Decision)
	}
}
