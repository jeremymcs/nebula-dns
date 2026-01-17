// Nebula DNS - Policy Service Integration Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

//go:build integration
// +build integration

package integration

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/nebuladns/policy-svc/internal/models"
)

func TestCategoryBlocking_BlockedCategory(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy with blocked categories
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: map[string]bool{
			"gambling": true,
			"adult":    true,
		},
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

	// Add category data to Redis
	testRedisClient.Set(ctx, "category:casino.example.com", "gambling", 0)

	// Evaluate domain with blocked category
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "casino.example.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "BLOCK" {
		t.Errorf("Expected BLOCK for blocked category, got %s", result.Decision)
	}
	if result.Reason != "category:gambling" {
		t.Errorf("Expected reason 'category:gambling', got %s", result.Reason)
	}
	if result.Category != "gambling" {
		t.Errorf("Expected category 'gambling', got %s", result.Category)
	}
}

func TestCategoryBlocking_AllowedCategory(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create policy that blocks gambling but not news
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: map[string]bool{
			"gambling": true,
		},
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

	// Add category data to Redis
	testRedisClient.Set(ctx, "category:news.example.com", "news", 0)

	// Evaluate domain with allowed category
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "news.example.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW for non-blocked category, got %s", result.Decision)
	}
	if result.Category != "news" {
		t.Errorf("Expected category 'news' to be included, got %s", result.Category)
	}
}

func TestCategoryBlocking_ScheduleActive(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Get current day/time
	now := time.Now().UTC()
	dayShort := strings.ToLower(now.Weekday().String()[:3])

	// Create policy with schedule-based blocking
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: map[string]bool{
			"gambling": true, // Always blocked
		},
		ThreatFeeds:       []string{},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules: []models.Schedule{
			{
				Name:                 "Work hours",
				Days:                 []string{dayShort}, // Today
				StartTime:            "00:00",
				EndTime:              "23:59",
				Timezone:             "UTC",
				AdditionalCategories: []string{"social_media", "gaming"},
			},
		},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Add category data to Redis
	testRedisClient.Set(ctx, "category:facebook.example.com", "social_media", 0)

	// Evaluate domain with category blocked by schedule
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "facebook.example.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "BLOCK" {
		t.Errorf("Expected BLOCK for schedule-blocked category, got %s", result.Decision)
	}
	if result.Reason != "category:social_media" {
		t.Errorf("Expected reason 'category:social_media', got %s", result.Reason)
	}
}

func TestCategoryBlocking_ScheduleInactive(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Get different day
	now := time.Now().UTC()
	differentDay := (now.Weekday() + 1) % 7
	dayShort := strings.ToLower(time.Weekday(differentDay).String()[:3])

	// Create policy with schedule for different day
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: map[string]bool{
			"gambling": true,
		},
		ThreatFeeds:       []string{},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules: []models.Schedule{
			{
				Name:                 "Different day",
				Days:                 []string{dayShort}, // Different day
				StartTime:            "00:00",
				EndTime:              "23:59",
				Timezone:             "UTC",
				AdditionalCategories: []string{"social_media"},
			},
		},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Add category data to Redis
	testRedisClient.Set(ctx, "category:facebook.example.com", "social_media", 0)

	// Evaluate domain - should be allowed because schedule is inactive
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "facebook.example.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW when schedule inactive, got %s", result.Decision)
	}
}

func TestCategoryBlocking_TimezoneHandling(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Get current day
	now := time.Now()
	nowEST := now.In(time.FixedZone("EST", -5*3600))
	dayShort := strings.ToLower(nowEST.Weekday().String()[:3])

	// Create policy with EST timezone
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: map[string]bool{},
		ThreatFeeds:       []string{},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules: []models.Schedule{
			{
				Name:                 "EST hours",
				Days:                 []string{dayShort},
				StartTime:            "00:00",
				EndTime:              "23:59",
				Timezone:             "America/New_York",
				AdditionalCategories: []string{"gaming"},
			},
		},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Add category data to Redis
	testRedisClient.Set(ctx, "category:game.example.com", "gaming", 0)

	// Evaluate domain
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "game.example.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	// Should be blocked because we're within the schedule in EST
	if result.Decision != "BLOCK" {
		t.Errorf("Expected BLOCK for schedule with EST timezone, got %s", result.Decision)
	}
}

func TestCategoryBlocking_InvalidTimezone(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	now := time.Now().UTC()
	dayShort := strings.ToLower(now.Weekday().String()[:3])

	// Create policy with invalid timezone
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: map[string]bool{},
		ThreatFeeds:       []string{},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules: []models.Schedule{
			{
				Name:                 "Invalid TZ",
				Days:                 []string{dayShort},
				StartTime:            "00:00",
				EndTime:              "23:59",
				Timezone:             "Invalid/Timezone", // Invalid
				AdditionalCategories: []string{"gaming"},
			},
		},
		BlockResponseType: "NXDOMAIN",
	}

	// Store policy in cache
	if err := testCache.SetPolicy(ctx, policy); err != nil {
		t.Fatalf("Failed to set policy: %v", err)
	}

	// Add category data to Redis
	testRedisClient.Set(ctx, "category:game.example.com", "gaming", 0)

	// Evaluate domain - should still work with UTC fallback
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "game.example.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)

	// Should be blocked (fallback to UTC)
	if result.Decision != "BLOCK" {
		t.Errorf("Expected BLOCK with UTC fallback, got %s", result.Decision)
	}
}

func TestCategoryBlocking_CacheInvalidation(t *testing.T) {
	setupTest(t)
	defer teardownTest(t)

	ctx := context.Background()

	// Create initial policy
	policy := &models.CompiledPolicy{
		TenantID:      "tenant-test",
		LocationID:    "location-test",
		AllowlistExact: make(map[string]bool),
		BlocklistExact: make(map[string]bool),
		BlockedCategories: map[string]bool{
			"gambling": true,
		},
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

	// Add category data
	testRedisClient.Set(ctx, "category:test.example.com", "news", 0)

	// First evaluation - should be allowed
	req := &models.EvaluateRequest{
		TenantID:   "tenant-test",
		LocationID: "location-test",
		QName:      "test.example.com",
		QType:      1,
		ClientIP:   "192.168.1.1",
	}

	result := testPolicyService.Evaluate(ctx, req)
	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW initially, got %s", result.Decision)
	}

	// Invalidate category cache
	invalidationMsg := map[string]string{
		"type": "categories",
	}
	msgJSON, _ := json.Marshal(invalidationMsg)
	testRedisClient.Publish(ctx, "nebula:invalidate", string(msgJSON))

	// Wait for invalidation to process
	time.Sleep(50 * time.Millisecond)

	// Second evaluation - should still work (might refetch from Redis)
	result = testPolicyService.Evaluate(ctx, req)
	if result.Decision != "ALLOW" {
		t.Errorf("Expected ALLOW after invalidation, got %s", result.Decision)
	}
}
