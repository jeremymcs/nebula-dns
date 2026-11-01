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

func TestThreatFeeds_MalwareDomain(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy with malware threat feed enabled
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds: []string{
			"malware",
			"phishing",
		},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Add malware threat to Redis
	testRedisClient.SAdd(ctx, "nebula:threats:malware", "evil.malware.com")

	// Evaluate malware domain
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "evil.malware.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "BLOCK" {
		t.Errorf("Expected BLOCK for malware domain, got %s", result.Decision)
	}
	if result.Reason != "threat:malware" {
		t.Errorf("Expected reason 'threat:malware', got %s", result.Reason)
	}
	if result.Category != "malware" {
		t.Errorf("Expected category 'malware', got %s", result.Category)
	}
}

func TestThreatFeeds_PhishingDomain(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy with phishing threat feed enabled
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds: []string{
			"phishing",
		},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules:         []models.Schedule{},
		BlockResponseType: "null",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Add phishing threat to Redis
	testRedisClient.SAdd(ctx, "nebula:threats:phishing", "fake-bank.com")

	// Evaluate phishing domain
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "fake-bank.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "BLOCK" {
		t.Errorf("Expected BLOCK for phishing domain, got %s", result.Decision)
	}
	if result.Reason != "threat:phishing" {
		t.Errorf("Expected reason 'threat:phishing', got %s", result.Reason)
	}
	if result.BlockType != "null" {
		t.Errorf("Expected block type 'null', got %s", result.BlockType)
	}
}

func TestThreatFeeds_CleanDomain(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy with threat feeds enabled
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds: []string{
			"malware",
			"phishing",
		},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// No threat data added for this domain

	// Evaluate clean domain
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "clean.example.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW for clean domain, got %s", result.Decision)
	}
}

func TestThreatFeeds_TypeFiltering(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy that only blocks phishing, not malware
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds: []string{
			"phishing", // Only phishing enabled
		},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Add malware threat to Redis (but policy doesn't enable malware)
	testRedisClient.SAdd(ctx, "nebula:threats:malware", "malware-domain.com")

	// Evaluate malware domain - should be allowed because malware feed not enabled
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "malware-domain.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW for disabled threat type, got %s", result.Decision)
	}
}

func TestThreatFeeds_AllWildcard(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy with "all" threat feeds
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds: []string{
			"all", // All threat types
		},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Add various threat types
	testRedisClient.SAdd(ctx, "nebula:threats:malware", "malware-test.com")
	testRedisClient.SAdd(ctx, "nebula:threats:phishing", "phishing-test.com")
	testRedisClient.SAdd(ctx, "nebula:threats:botnet", "botnet-test.com")

	// Test malware
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "malware-test.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}
	result := testPolicyService.Evaluate(ctx, req)
	if result.Decision != "BLOCK" {
		t.Errorf("Expected BLOCK for malware with 'all', got %s", result.Decision)
	}

	// Test phishing
	req.QName = "phishing-test.com"
	result = testPolicyService.Evaluate(ctx, req)
	if result.Decision != "BLOCK" {
		t.Errorf("Expected BLOCK for phishing with 'all', got %s", result.Decision)
	}

	// Test botnet
	req.QName = "botnet-test.com"
	result = testPolicyService.Evaluate(ctx, req)
	if result.Decision != "BLOCK" {
		t.Errorf("Expected BLOCK for botnet with 'all', got %s", result.Decision)
	}
}

func TestThreatFeeds_AllowlistPrecedence(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy where threat domain is also in allowlist
	policy := &models.CompiledPolicy{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		AllowlistExact: map[string]bool{
			"false-positive.com": true, // In allowlist
		},
		BlocklistExact:    make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds: []string{
			"malware",
		},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Add threat data (false positive)
	testRedisClient.SAdd(ctx, "nebula:threats:malware", "false-positive.com")

	// Evaluate - allowlist should take precedence
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "false-positive.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW (allowlist precedence), got %s", result.Decision)
	}
	if result.Reason != "allowlist" {
		t.Errorf("Expected reason 'allowlist', got %s", result.Reason)
	}
}

func TestThreatFeeds_CacheInvalidation(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy with threat feeds
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds: []string{
			"malware",
		},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Add threat data
	testRedisClient.SAdd(ctx, "nebula:threats:malware", "threat-test.com")

	// First evaluation - should be blocked
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "threat-test.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)
	if result.Decision != "BLOCK" {
		t.Errorf("Expected BLOCK initially, got %s", result.Decision)
	}

	// Remove threat from Redis first
	testRedisClient.SRem(ctx, "nebula:threats:malware", "threat-test.com")

	// Invalidate threat cache
	invalidationMsg := map[string]string{
		"type": "threats",
	}
	msgJSON, _ := json.Marshal(invalidationMsg)
	testRedisClient.Publish(ctx, "nebula:invalidate", string(msgJSON))

	// Wait for invalidation to process (pub/sub is async)
	time.Sleep(200 * time.Millisecond)

	// Second evaluation - should be allowed (cache invalidated, threat removed from Redis)
	result = testPolicyService.Evaluate(ctx, req)
	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW after threat removal, got %s", result.Decision)
	}
}

func TestThreatFeeds_BotnetBlock(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy with botnet threat feed
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds: []string{
			"botnet",
		},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Add botnet threat
	testRedisClient.SAdd(ctx, "nebula:threats:botnet", "botnet-c2.com")

	// Evaluate botnet domain
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "botnet-c2.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "BLOCK" {
		t.Errorf("Expected BLOCK for botnet domain, got %s", result.Decision)
	}
	if result.Reason != "threat:botnet" {
		t.Errorf("Expected reason 'threat:botnet', got %s", result.Reason)
	}
}
