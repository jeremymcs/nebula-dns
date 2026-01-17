// Nebula DNS - Policy Service Integration Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

//go:build integration
// +build integration

package integration

import (
	"context"
	"testing"

	"github.com/nebuladns/policy-svc/internal/models"
)

func TestSafeSearch_GoogleRewrite(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy with SafeSearch enabled
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds:       []string{},
		SafeSearchEnabled: true,
		SafeSearchRules: map[string]models.SafeSearchRule{
			"google.com": {
				TargetCNAME: "forcesafesearch.google.com",
			},
			"www.google.com": {
				TargetCNAME: "forcesafesearch.google.com",
			},
		},
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Test Google rewrite
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "google.com",
		QType:      1, // A record
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "REWRITE" {
		t.Errorf("Expected REWRITE for Google SafeSearch, got %s", result.Decision)
	}
	if result.Reason != "safesearch" {
		t.Errorf("Expected reason 'safesearch', got %s", result.Reason)
	}
	if result.RewriteType != "CNAME" {
		t.Errorf("Expected rewrite type 'CNAME', got %s", result.RewriteType)
	}
	if result.RewriteTarget != "forcesafesearch.google.com" {
		t.Errorf("Expected rewrite target 'forcesafesearch.google.com', got %s", result.RewriteTarget)
	}
}

func TestSafeSearch_BingRewrite(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy with Bing SafeSearch
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds:       []string{},
		SafeSearchEnabled: true,
		SafeSearchRules: map[string]models.SafeSearchRule{
			"bing.com": {
				TargetCNAME: "strict.bing.com",
			},
			"www.bing.com": {
				TargetCNAME: "strict.bing.com",
			},
		},
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Test Bing rewrite
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "bing.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "REWRITE" {
		t.Errorf("Expected REWRITE for Bing SafeSearch, got %s", result.Decision)
	}
	if result.RewriteTarget != "strict.bing.com" {
		t.Errorf("Expected rewrite target 'strict.bing.com', got %s", result.RewriteTarget)
	}
}

func TestSafeSearch_YouTubeRewrite(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy with YouTube SafeSearch
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds:       []string{},
		SafeSearchEnabled: true,
		SafeSearchRules: map[string]models.SafeSearchRule{
			"youtube.com": {
				TargetCNAME: "restrictmoderate.youtube.com",
			},
			"www.youtube.com": {
				TargetCNAME: "restrictmoderate.youtube.com",
			},
		},
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Test YouTube rewrite
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "www.youtube.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "REWRITE" {
		t.Errorf("Expected REWRITE for YouTube SafeSearch, got %s", result.Decision)
	}
	if result.RewriteTarget != "restrictmoderate.youtube.com" {
		t.Errorf("Expected rewrite target 'restrictmoderate.youtube.com', got %s", result.RewriteTarget)
	}
}

func TestSafeSearch_NonSearchDomain(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy with SafeSearch enabled
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds:       []string{},
		SafeSearchEnabled: true,
		SafeSearchRules: map[string]models.SafeSearchRule{
			"google.com": {
				TargetCNAME: "forcesafesearch.google.com",
			},
		},
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Test non-search domain - should not be rewritten
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "example.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision == "REWRITE" {
		t.Errorf("Expected no REWRITE for non-search domain, got %s", result.Decision)
	}
	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW for non-search domain, got %s", result.Decision)
	}
}

func TestSafeSearch_DisabledNoRewrite(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy with SafeSearch disabled
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds:       []string{},
		SafeSearchEnabled: false, // Disabled
		SafeSearchRules: map[string]models.SafeSearchRule{
			"google.com": {
				TargetCNAME: "forcesafesearch.google.com",
			},
		},
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Test Google - should NOT be rewritten when disabled
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "google.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision == "REWRITE" {
		t.Errorf("Expected no REWRITE when SafeSearch disabled, got %s", result.Decision)
	}
	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW when SafeSearch disabled, got %s", result.Decision)
	}
}

func TestSafeSearch_AllowlistPrecedence(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy where Google is in allowlist
	policy := &models.CompiledPolicy{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		AllowlistExact: map[string]bool{
			"google.com": true, // Allowlist takes precedence
		},
		BlocklistExact:    make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds:       []string{},
		SafeSearchEnabled: true,
		SafeSearchRules: map[string]models.SafeSearchRule{
			"google.com": {
				TargetCNAME: "forcesafesearch.google.com",
			},
		},
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Test - allowlist should take precedence over SafeSearch
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "google.com",
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

func TestSafeSearch_BlocklistPrecedenceOverRewrite(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy where Google is in blocklist
	policy := &models.CompiledPolicy{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: map[string]bool{
			"google.com": true, // Blocklist should prevent rewrite
		},
		BlockedCategories: make(map[string]bool),
		ThreatFeeds:       []string{},
		SafeSearchEnabled: true,
		SafeSearchRules: map[string]models.SafeSearchRule{
			"google.com": {
				TargetCNAME: "forcesafesearch.google.com",
			},
		},
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Test - blocklist should take precedence over SafeSearch
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "google.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "BLOCK" {
		t.Errorf("Expected BLOCK (blocklist precedence), got %s", result.Decision)
	}
	if result.Reason != "blocklist" {
		t.Errorf("Expected reason 'blocklist', got %s", result.Reason)
	}
}
