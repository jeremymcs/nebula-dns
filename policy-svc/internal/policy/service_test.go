// Nebula DNS - Enterprise DNS Security Platform
// Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Policy Service Tests
//
// Note: These tests focus on helper functions and fail-safe behavior.
// Full integration tests require a Redis connection and are run separately.

package policy

import (
	"context"
	"strings"
	"testing"
	"time"

	"go.uber.org/zap"

	"github.com/nebuladns/policy-svc/internal/cache"
	"github.com/nebuladns/policy-svc/internal/models"
)

// MockCache implements a minimal cache interface for testing
type MockCache struct {
	policies         map[string]*models.CompiledPolicy
	threatDomains    map[string]string
	categories       map[string]string
	suspendedTenants map[string]bool
}

func NewMockCache() *MockCache {
	return &MockCache{
		policies:         make(map[string]*models.CompiledPolicy),
		threatDomains:    make(map[string]string),
		categories:       make(map[string]string),
		suspendedTenants: make(map[string]bool),
	}
}

func (m *MockCache) GetPolicy(ctx context.Context, locationID string) (*models.CompiledPolicy, error) {
	return m.policies[locationID], nil
}

func (m *MockCache) CheckThreatDomain(ctx context.Context, domain string) (string, bool) {
	threatType, ok := m.threatDomains[domain]
	return threatType, ok
}

func (m *MockCache) GetDomainCategory(ctx context.Context, domain string) string {
	category, ok := m.categories[domain]
	if ok {
		return category
	}
	// Try parent domain
	parts := strings.Split(domain, ".")
	for i := 1; i < len(parts); i++ {
		parent := strings.Join(parts[i:], ".")
		if category, ok := m.categories[parent]; ok {
			return category
		}
	}
	return ""
}

func (m *MockCache) IsTenantSuspended(ctx context.Context, tenantID string) bool {
	return m.suspendedTenants[tenantID]
}

func (m *MockCache) ValidateToken(ctx context.Context, tokenHash string) (*cache.TokenInfo, error) {
	// By default, return nil (invalid token) for testing
	return nil, nil
}

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

// TestEvaluate_TableDriven tests the policy evaluation logic with table-driven test cases
func TestEvaluate_TableDriven(t *testing.T) {
	logger := zap.NewNop()

	tests := []struct {
		name          string
		domain        string
		policy        *models.CompiledPolicy
		threatDomains map[string]string
		categories    map[string]string
		wantDecision  string
		wantReason    string
		wantCategory  string
	}{
		// Allowlist tests
		{
			name:         "allowlist exact match",
			domain:       "allowed.example.com",
			policy:       withAllowlist("allowed.example.com"),
			wantDecision: DecisionAllow,
			wantReason:   "allowlist",
		},
		{
			name:         "allowlist wildcard match",
			domain:       "sub.allowed.example.com",
			policy:       withAllowlistWildcard("*.allowed.example.com"),
			wantDecision: DecisionAllow,
			wantReason:   "allowlist_wildcard",
		},
		{
			name:         "allowlist not matched",
			domain:       "other.example.com",
			policy:       withAllowlist("allowed.example.com"),
			wantDecision: DecisionAllow, // No block rules, default allow
			wantReason:   "default",
		},

		// Blocklist tests
		{
			name:         "blocklist exact match",
			domain:       "blocked.example.com",
			policy:       withBlocklist("blocked.example.com"),
			wantDecision: DecisionBlock,
			wantReason:   "blocklist",
		},
		{
			name:         "blocklist wildcard match",
			domain:       "sub.blocked.example.com",
			policy:       withBlocklistWildcard("*.blocked.example.com"),
			wantDecision: DecisionBlock,
			wantReason:   "blocklist_wildcard",
		},

		// Priority: Allowlist overrides blocklist
		{
			name:         "allowlist overrides blocklist",
			domain:       "both.example.com",
			policy:       withAllowlistAndBlocklist("both.example.com", "both.example.com"),
			wantDecision: DecisionAllow,
			wantReason:   "allowlist",
		},

		// Category blocking
		{
			name:         "category blocked - malware",
			domain:       "malware-site.com",
			policy:       withBlockedCategories("malware"),
			categories:   map[string]string{"malware-site.com": "malware"},
			wantDecision: DecisionBlock,
			wantReason:   "category:malware",
			wantCategory: "malware",
		},
		{
			name:         "category blocked - phishing",
			domain:       "phishing-site.com",
			policy:       withBlockedCategories("phishing"),
			categories:   map[string]string{"phishing-site.com": "phishing"},
			wantDecision: DecisionBlock,
			wantReason:   "category:phishing",
			wantCategory: "phishing",
		},
		{
			name:         "category blocked - adult",
			domain:       "adult-site.com",
			policy:       withBlockedCategories("adult"),
			categories:   map[string]string{"adult-site.com": "adult"},
			wantDecision: DecisionBlock,
			wantReason:   "category:adult",
			wantCategory: "adult",
		},
		{
			name:         "category blocked - social",
			domain:       "social-site.com",
			policy:       withBlockedCategories("social"),
			categories:   map[string]string{"social-site.com": "social"},
			wantDecision: DecisionBlock,
			wantReason:   "category:social",
			wantCategory: "social",
		},
		{
			name:         "category blocked - gambling",
			domain:       "gambling-site.com",
			policy:       withBlockedCategories("gambling"),
			categories:   map[string]string{"gambling-site.com": "gambling"},
			wantDecision: DecisionBlock,
			wantReason:   "category:gambling",
			wantCategory: "gambling",
		},
		{
			name:         "category blocked via parent domain",
			domain:       "sub.adult-site.com",
			policy:       withBlockedCategories("adult"),
			categories:   map[string]string{"adult-site.com": "adult"},
			wantDecision: DecisionBlock,
			wantReason:   "category:adult",
			wantCategory: "adult",
		},

		// Category not blocked
		{
			name:         "category not in blocked list",
			domain:       "safe-site.com",
			policy:       withBlockedCategories("malware"),
			categories:   map[string]string{"safe-site.com": "news"},
			wantDecision: DecisionAllow,
			wantReason:   "default",
		},
		{
			name:         "uncategorized domain allowed",
			domain:       "unknown-site.com",
			policy:       withBlockedCategories("adult"),
			categories:   map[string]string{},
			wantDecision: DecisionAllow,
			wantReason:   "default",
		},

		// SafeSearch tests
		{
			name:         "safesearch google",
			domain:       "www.google.com",
			policy:       withSafeSearch("www.google.com", "forcesafesearch.google.com"),
			wantDecision: DecisionRewrite,
			wantReason:   "safesearch",
		},
		{
			name:         "safesearch bing",
			domain:       "www.bing.com",
			policy:       withSafeSearch("www.bing.com", "strict.bing.com"),
			wantDecision: DecisionRewrite,
			wantReason:   "safesearch",
		},
		{
			name:         "safesearch disabled",
			domain:       "www.google.com",
			policy:       withBlockedCategories("adult"),
			wantDecision: DecisionAllow,
			wantReason:   "default",
		},

		// Threat feed blocking
		{
			name:          "threat feed - malware domain",
			domain:        "known-malware.com",
			policy:        withThreatFeeds([]string{"malware", "phishing"}),
			threatDomains: map[string]string{"known-malware.com": "malware"},
			wantDecision:  DecisionBlock,
			wantReason:    "threat:malware",
			wantCategory:  "malware",
		},
		{
			name:          "threat feed - phishing domain",
			domain:        "phish-site.com",
			policy:        withThreatFeeds([]string{"phishing"}),
			threatDomains: map[string]string{"phish-site.com": "phishing"},
			wantDecision:  DecisionBlock,
			wantReason:    "threat:phishing",
			wantCategory:  "phishing",
		},
		{
			name:          "threat feed disabled for type",
			domain:        "malware-site.com",
			policy:        withThreatFeeds([]string{"phishing"}), // malware not enabled
			threatDomains: map[string]string{"malware-site.com": "malware"},
			wantDecision:  DecisionAllow,
			wantReason:    "default",
		},
		{
			name:          "threat feed with 'all' wildcard",
			domain:        "any-threat.com",
			policy:        withThreatFeeds([]string{"all"}),
			threatDomains: map[string]string{"any-threat.com": "botnet"},
			wantDecision:  DecisionBlock,
			wantReason:    "threat:botnet",
			wantCategory:  "botnet",
		},

		// Default behavior
		{
			name:         "default allow - empty policy",
			domain:       "example.com",
			policy:       createTestPolicy(),
			wantDecision: DecisionAllow,
			wantReason:   "default",
		},
		{
			name:         "default allow - no match",
			domain:       "unmatched.example.com",
			policy:       withBlockedCategories("adult"),
			categories:   map[string]string{"other.com": "adult"},
			wantDecision: DecisionAllow,
			wantReason:   "default",
		},

		// Edge cases
		{
			name:         "domain with trailing dot",
			domain:       "example.com.",
			policy:       withBlocklist("example.com"),
			wantDecision: DecisionBlock,
			wantReason:   "blocklist",
		},
		{
			name:         "case insensitive domain",
			domain:       "BLOCKED.EXAMPLE.COM",
			policy:       withBlocklist("blocked.example.com"),
			wantDecision: DecisionBlock,
			wantReason:   "blocklist",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create mock cache with test data
			mockCache := NewMockCache()
			if tt.policy != nil {
				mockCache.policies[tt.policy.LocationID] = tt.policy
			}
			if tt.threatDomains != nil {
				mockCache.threatDomains = tt.threatDomains
			}
			if tt.categories != nil {
				mockCache.categories = tt.categories
			}

			// Create service with mock cache (using nil logger for simplicity)
			svc := NewService(mockCache, logger, nil, false)

			// Create evaluate request
			req := &models.EvaluateRequest{
				TenantID:   "tenant-123",
				LocationID: tt.policy.LocationID,
				QName:      tt.domain,
				QType:      1, // A record
			}

			// Evaluate
			result := svc.Evaluate(context.Background(), req)

			// Verify decision
			if result.Decision != tt.wantDecision {
				t.Errorf("Decision = %q, want %q", result.Decision, tt.wantDecision)
			}

			// Verify reason (check prefix since reason may include category)
			if tt.wantReason != "" && !strings.HasPrefix(result.Reason, tt.wantReason) {
				t.Errorf("Reason = %q, want to start with %q", result.Reason, tt.wantReason)
			}

			// Verify category if expected
			if tt.wantCategory != "" && result.Category != tt.wantCategory {
				t.Errorf("Category = %q, want %q", result.Category, tt.wantCategory)
			}
		})
	}
}

// TestEvaluate_DefaultDeny tests fail-closed behavior
func TestEvaluate_DefaultDeny(t *testing.T) {
	logger := zap.NewNop()
	mockCache := NewMockCache()

	// Create policy with fail-closed
	policy := createTestPolicy()
	policy.LocationID = "location-deny"
	mockCache.policies[policy.LocationID] = policy

	// Create service with failClosed = true
	svc := NewService(mockCache, logger, nil, true)

	// When policy fails to load (nil policy), should block
	req := &models.EvaluateRequest{
		TenantID:   "tenant-123",
		LocationID: "nonexistent",
		QName:      "example.com",
	}

	result := svc.Evaluate(context.Background(), req)

	if result.Decision != DecisionBlock {
		t.Errorf("Expected BLOCK for fail-closed, got %s", result.Decision)
	}
	if result.Reason != "policy_error" {
		t.Errorf("Expected reason 'policy_error', got %s", result.Reason)
	}
}

// Helper functions to create test policies

func withAllowlist(domains ...string) *models.CompiledPolicy {
	p := createTestPolicy()
	p.LocationID = "location-allowlist"
	p.AllowlistExact = make(map[string]bool)
	for _, d := range domains {
		p.AllowlistExact[d] = true
	}
	return p
}

func withAllowlistWildcard(pattern string) *models.CompiledPolicy {
	p := createTestPolicy()
	p.LocationID = "location-allowlist-wildcard"
	p.AllowlistWildcardPatterns = []string{pattern}
	p.AllowlistWildcard = models.NewSuffixTrie()
	p.AllowlistWildcard.Insert(pattern)
	return p
}

func withBlocklist(domains ...string) *models.CompiledPolicy {
	p := createTestPolicy()
	p.LocationID = "location-blocklist"
	p.BlocklistExact = make(map[string]bool)
	for _, d := range domains {
		p.BlocklistExact[d] = true
	}
	return p
}

func withBlocklistWildcard(pattern string) *models.CompiledPolicy {
	p := createTestPolicy()
	p.LocationID = "location-blocklist-wildcard"
	p.BlocklistWildcardPatterns = []string{pattern}
	p.BlocklistWildcard = models.NewSuffixTrie()
	p.BlocklistWildcard.Insert(pattern)
	return p
}

func withAllowlistAndBlocklist(allowDomain, blockDomain string) *models.CompiledPolicy {
	p := createTestPolicy()
	p.LocationID = "location-both"
	p.AllowlistExact = map[string]bool{allowDomain: true}
	p.BlocklistExact = map[string]bool{blockDomain: true}
	return p
}

func withBlockedCategories(categories ...string) *models.CompiledPolicy {
	p := createTestPolicy()
	p.LocationID = "location-categories"
	p.BlockedCategories = make(map[string]bool)
	for _, c := range categories {
		p.BlockedCategories[c] = true
	}
	return p
}

func withSafeSearch(domain, target string) *models.CompiledPolicy {
	p := createTestPolicy()
	p.LocationID = "location-safesearch"
	p.SafeSearchEnabled = true
	p.SafeSearchRules = map[string]models.SafeSearchRule{
		domain: {TargetCNAME: target},
	}
	return p
}

func withThreatFeeds(feeds []string) *models.CompiledPolicy {
	p := createTestPolicy()
	p.LocationID = "location-threats"
	p.ThreatFeeds = feeds
	return p
}
