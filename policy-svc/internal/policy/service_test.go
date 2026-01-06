// Nebula DNS - Enterprise DNS Security Platform
// Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Policy Service Tests
//
// Note: These tests focus on helper functions and fail-safe behavior.
// Full integration tests require a Redis connection and are run separately.

package policy

import (
	"strings"
	"testing"
	"time"

	"go.uber.org/zap"

	"github.com/nebuladns/policy-svc/internal/models"
)

func TestFailSafeResponse_Open(t *testing.T) {
	logger := zap.NewNop()
	svc := NewService(nil, logger, nil, false) // failClosed = false

	result := svc.failSafeResponse()

	if result.Decision != DecisionAllow {
		t.Errorf("Expected decision ALLOW (fail-open), got %s", result.Decision)
	}
	if result.Reason != "policy_error" {
		t.Errorf("Expected reason 'policy_error', got %s", result.Reason)
	}
}

func TestFailSafeResponse_Closed(t *testing.T) {
	logger := zap.NewNop()
	svc := NewService(nil, logger, nil, true) // failClosed = true

	result := svc.failSafeResponse()

	if result.Decision != DecisionBlock {
		t.Errorf("Expected decision BLOCK (fail-closed), got %s", result.Decision)
	}
	if result.Reason != "policy_error" {
		t.Errorf("Expected reason 'policy_error', got %s", result.Reason)
	}
	if result.BlockType != "NXDOMAIN" {
		t.Errorf("Expected block type 'NXDOMAIN', got %s", result.BlockType)
	}
}

func TestIsThreatFeedEnabled(t *testing.T) {
	logger := zap.NewNop()
	svc := NewService(nil, logger, nil, false)

	tests := []struct {
		name       string
		feeds      []string
		threatType string
		expected   bool
	}{
		{"Exact match", []string{"malware", "phishing"}, "malware", true},
		{"Not in list", []string{"phishing"}, "malware", false},
		{"All wildcard", []string{"all"}, "malware", true},
		{"All wildcard with phishing", []string{"all"}, "phishing", true},
		{"Empty list", []string{}, "malware", false},
		{"Single match", []string{"botnet"}, "botnet", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			policy := &models.CompiledPolicy{ThreatFeeds: tt.feeds}
			result := svc.isThreatFeedEnabled(policy, tt.threatType)
			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestIsScheduleActive_ValidSchedule(t *testing.T) {
	logger := zap.NewNop()
	svc := NewService(nil, logger, nil, false)

	// Create a schedule that is always active today
	now := time.Now().UTC()
	dayShort := strings.ToLower(now.Weekday().String()[:3])

	schedule := models.Schedule{
		Days:      []string{dayShort},
		StartTime: "00:00",
		EndTime:   "23:59",
		Timezone:  "UTC",
	}

	// Should be active since we're within the time range today
	active := svc.isScheduleActive(schedule, now)
	if !active {
		t.Error("Expected schedule to be active")
	}
}

func TestIsScheduleActive_DifferentDay(t *testing.T) {
	logger := zap.NewNop()
	svc := NewService(nil, logger, nil, false)

	// Create a schedule for a different day
	now := time.Now().UTC()
	
	// Get a different day
	differentDay := (now.Weekday() + 1) % 7
	dayShort := strings.ToLower(time.Weekday(differentDay).String()[:3])

	schedule := models.Schedule{
		Days:      []string{dayShort},
		StartTime: "00:00",
		EndTime:   "23:59",
		Timezone:  "UTC",
	}

	active := svc.isScheduleActive(schedule, now)
	if active {
		t.Error("Expected schedule to be inactive (different day)")
	}
}

func TestIsScheduleActive_OutsideTimeRange(t *testing.T) {
	logger := zap.NewNop()
	svc := NewService(nil, logger, nil, false)

	now := time.Now().UTC()
	dayShort := strings.ToLower(now.Weekday().String()[:3])

	// Create a schedule outside current time
	schedule := models.Schedule{
		Days:      []string{dayShort},
		StartTime: "23:58",
		EndTime:   "23:59",
		Timezone:  "UTC",
	}

	// Unless it's exactly 23:58 or 23:59, this should be inactive
	hour := now.Hour()
	active := svc.isScheduleActive(schedule, now)
	
	if hour < 23 || (hour == 23 && now.Minute() < 58) {
		if active {
			t.Error("Expected schedule to be inactive (outside time range)")
		}
	}
}

func TestIsScheduleActive_InvalidTimezone(t *testing.T) {
	logger := zap.NewNop()
	svc := NewService(nil, logger, nil, false)

	now := time.Now().UTC()
	dayShort := strings.ToLower(now.Weekday().String()[:3])

	schedule := models.Schedule{
		Days:      []string{dayShort},
		StartTime: "00:00",
		EndTime:   "23:59",
		Timezone:  "Invalid/Timezone", // Invalid timezone
	}

	// Should fallback to UTC and still work
	active := svc.isScheduleActive(schedule, now)
	if !active {
		t.Error("Expected schedule to be active with fallback to UTC")
	}
}

func TestGetActiveBlockedCategories_BaseOnly(t *testing.T) {
	logger := zap.NewNop()
	svc := NewService(nil, logger, nil, false)

	policy := &models.CompiledPolicy{
		BlockedCategories: map[string]bool{
			"adult":    true,
			"gambling": true,
			"malware":  true,
		},
		Schedules: []models.Schedule{},
	}

	blocked := svc.getActiveBlockedCategories(policy, time.Now())

	if !blocked["adult"] {
		t.Error("Expected 'adult' to be blocked")
	}
	if !blocked["gambling"] {
		t.Error("Expected 'gambling' to be blocked")
	}
	if !blocked["malware"] {
		t.Error("Expected 'malware' to be blocked")
	}
	if blocked["social"] {
		t.Error("Expected 'social' to NOT be blocked")
	}
}

func TestGetActiveBlockedCategories_WithSchedule(t *testing.T) {
	logger := zap.NewNop()
	svc := NewService(nil, logger, nil, false)

	now := time.Now().UTC()
	dayShort := strings.ToLower(now.Weekday().String()[:3])

	policy := &models.CompiledPolicy{
		BlockedCategories: map[string]bool{
			"adult": true,
		},
		Schedules: []models.Schedule{
			{
				Name:                 "Work hours",
				Days:                 []string{dayShort},
				StartTime:            "00:00",
				EndTime:              "23:59",
				Timezone:             "UTC",
				AdditionalCategories: []string{"social_media", "gaming"},
			},
		},
	}

	blocked := svc.getActiveBlockedCategories(policy, now)

	if !blocked["adult"] {
		t.Error("Expected 'adult' to be blocked (base)")
	}
	if !blocked["social_media"] {
		t.Error("Expected 'social_media' to be blocked (schedule)")
	}
	if !blocked["gaming"] {
		t.Error("Expected 'gaming' to be blocked (schedule)")
	}
}

// Helper to create a basic test policy
func createTestPolicy() *models.CompiledPolicy {
	return &models.CompiledPolicy{
		TenantID:          "tenant-123",
		LocationID:        "location-456",
		PolicyVersion:     1,
		AllowlistExact:    make(map[string]bool),
		AllowlistWildcard: nil,
		BlocklistExact:    make(map[string]bool),
		BlocklistWildcard: nil,
		BlockedCategories: make(map[string]bool),
		ThreatFeeds:       []string{},
		SafeSearchEnabled: false,
		SafeSearchRules:   make(map[string]models.SafeSearchRule),
		Schedules:         []models.Schedule{},
		BlockResponseType: "NXDOMAIN",
		UpdatedAt:         time.Now(),
	}
}
