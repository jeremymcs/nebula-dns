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

func TestPolicyEvaluation_AllowlistExact(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy with exact allowlist entry
	policy := &models.CompiledPolicy{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		AllowlistExact: map[string]bool{
			"allowed.example.com": true,
		},
		BlocklistExact:    make(map[string]bool),
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

	// Evaluate allowed domain
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "allowed.example.com",
		QType:      1, // A record
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW, got %s", result.Decision)
	}
	if result.Reason != "allowlist" {
		t.Errorf("Expected reason 'allowlist', got %s", result.Reason)
	}
}

func TestPolicyEvaluation_AllowlistWildcard(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy with wildcard allowlist
	policy := &models.CompiledPolicy{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		AllowlistExact: make(map[string]bool),
		AllowlistWildcardPatterns: []string{
			"*.example.com",
		},
		BlocklistExact:    make(map[string]bool),
		BlockedCategories: make(map[string]bool),
		ThreatFeeds:       []string{},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
	}

	// Build wildcard trie
	policy.AllowlistWildcard = models.NewSuffixTrie()
	for _, pattern := range policy.AllowlistWildcardPatterns {
		policy.AllowlistWildcard.Insert(pattern)
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Test subdomain matches wildcard
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "subdomain.example.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW for wildcard match, got %s", result.Decision)
	}
	if result.Reason != "allowlist_wildcard" {
		t.Errorf("Expected reason 'allowlist_wildcard', got %s", result.Reason)
	}
}

func TestPolicyEvaluation_BlocklistExact(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy with exact blocklist entry
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

	// Evaluate blocked domain
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "blocked.example.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "BLOCK" {
		t.Errorf("Expected BLOCK, got %s", result.Decision)
	}
	if result.Reason != "blocklist" {
		t.Errorf("Expected reason 'blocklist', got %s", result.Reason)
	}
	if result.BlockType != "NXDOMAIN" {
		t.Errorf("Expected block type 'NXDOMAIN', got %s", result.BlockType)
	}
}

func TestPolicyEvaluation_BlocklistWildcard(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy with wildcard blocklist
	policy := &models.CompiledPolicy{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlocklistWildcardPatterns: []string{
			"*.malware.com",
		},
		BlockedCategories: make(map[string]bool),
		ThreatFeeds:       []string{},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules:         []models.Schedule{},
		BlockResponseType: "null",
	}

	// Build wildcard trie
	policy.BlocklistWildcard = models.NewSuffixTrie()
	for _, pattern := range policy.BlocklistWildcardPatterns {
		policy.BlocklistWildcard.Insert(pattern)
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Test subdomain matches wildcard
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "bad.malware.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "BLOCK" {
		t.Errorf("Expected BLOCK for wildcard match, got %s", result.Decision)
	}
	if result.Reason != "blocklist_wildcard" {
		t.Errorf("Expected reason 'blocklist_wildcard', got %s", result.Reason)
	}
	if result.BlockType != "null" {
		t.Errorf("Expected block type 'null', got %s", result.BlockType)
	}
}

func TestPolicyEvaluation_AllowlistPrecedence(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy where domain is both allowed and blocked
	policy := &models.CompiledPolicy{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		AllowlistExact: map[string]bool{
			"override.example.com": true,
		},
		BlocklistExact: map[string]bool{
			"override.example.com": true, // Also in blocklist
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

	// Evaluate - allowlist should take precedence
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "override.example.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW (allowlist takes precedence), got %s", result.Decision)
	}
	if result.Reason != "allowlist" {
		t.Errorf("Expected reason 'allowlist', got %s", result.Reason)
	}
}

func TestPolicyEvaluation_DefaultAllow(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create empty policy (no rules)
	policy := &models.CompiledPolicy{
		TenantID:          "tenant-test",
		LocationID:        "location-test",
		AllowlistExact:    make(map[string]bool),
		BlocklistExact:    make(map[string]bool),
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

	// Evaluate random domain not in any list
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "random.example.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW (default), got %s", result.Decision)
	}
	if result.Reason != "default" {
		t.Errorf("Expected reason 'default', got %s", result.Reason)
	}
}
