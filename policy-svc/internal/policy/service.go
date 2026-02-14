// Nebula DNS - Enterprise DNS Security Platform
// Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Policy Evaluation Service

package policy

import (
	"context"
	"strings"
	"time"

	"go.uber.org/zap"

	"github.com/nebuladns/policy-svc/internal/cache"
	"github.com/nebuladns/policy-svc/internal/metrics"
	"github.com/nebuladns/policy-svc/internal/models"
)

// Decision types
const (
	DecisionAllow   = "ALLOW"
	DecisionBlock   = "BLOCK"
	DecisionRewrite = "REWRITE"
)

// CacheInterface defines the interface for policy cache operations
type CacheInterface interface {
	GetPolicy(ctx context.Context, locationID string) (*models.CompiledPolicy, error)
	CheckThreatDomain(ctx context.Context, domain string) (string, bool)
	GetDomainCategory(ctx context.Context, domain string) string
	ValidateToken(ctx context.Context, tokenHash string) (*cache.TokenInfo, error)
}

// Service handles policy evaluation
type Service struct {
	cache      CacheInterface
	logger     *zap.Logger
	metrics    *metrics.Metrics
	failClosed bool
}

// NewService creates a new policy service
func NewService(cache CacheInterface, logger *zap.Logger, m *metrics.Metrics, failClosed bool) *Service {
	return &Service{
		cache:      cache,
		logger:     logger,
		metrics:    m,
		failClosed: failClosed,
	}
}

// Evaluate evaluates a DNS query against the policy
func (s *Service) Evaluate(ctx context.Context, req *models.EvaluateRequest) *models.EvaluateResponse {
	start := time.Now()

	// Get compiled policy for location
	policy, err := s.cache.GetPolicy(ctx, req.LocationID)
	if err != nil {
		s.logger.Error("Failed to get policy", zap.Error(err), zap.String("locationId", req.LocationID))
		return s.failSafeResponse()
	}

	if policy == nil {
		s.logger.Warn("No policy found for location", zap.String("locationId", req.LocationID))
		return s.failSafeResponse()
	}

	// Normalize domain
	domain := strings.ToLower(strings.TrimSuffix(req.QName, "."))

	// Evaluate the domain against the policy
	result := s.evaluateDomain(ctx, policy, domain, req.QType)

	duration := time.Since(start)

	// Record metrics
	if s.metrics != nil {
		s.metrics.RecordEvaluation(result.Decision, result.Reason, duration)
	}

	s.logger.Debug("Policy evaluation complete",
		zap.String("domain", domain),
		zap.String("decision", result.Decision),
		zap.String("reason", result.Reason),
		zap.Duration("latency", duration),
	)

	return result
}

func (s *Service) evaluateDomain(ctx context.Context, policy *models.CompiledPolicy, domain string, qtype int) *models.EvaluateResponse {
	now := time.Now()

	// ============================================
	// PRIORITY 1: Tenant Allowlist (always allow)
	// ============================================
	if policy.AllowlistExact[domain] {
		return &models.EvaluateResponse{
			Decision: DecisionAllow,
			Reason:   "allowlist",
			TTL:      300,
		}
	}

	if policy.AllowlistWildcard != nil && policy.AllowlistWildcard.Match(domain) {
		return &models.EvaluateResponse{
			Decision: DecisionAllow,
			Reason:   "allowlist_wildcard",
			TTL:      300,
		}
	}

	// ============================================
	// PRIORITY 2: Tenant Blocklist (always block)
	// ============================================
	if policy.BlocklistExact[domain] {
		return &models.EvaluateResponse{
			Decision:  DecisionBlock,
			Reason:    "blocklist",
			BlockType: policy.BlockResponseType,
			TTL:       60,
		}
	}

	if policy.BlocklistWildcard != nil && policy.BlocklistWildcard.Match(domain) {
		return &models.EvaluateResponse{
			Decision:  DecisionBlock,
			Reason:    "blocklist_wildcard",
			BlockType: policy.BlockResponseType,
			TTL:       60,
		}
	}

	// ============================================
	// PRIORITY 3: SafeSearch Rewrite
	// ============================================
	if policy.SafeSearchEnabled {
		if rule, ok := policy.SafeSearchRules[domain]; ok {
			return &models.EvaluateResponse{
				Decision:      DecisionRewrite,
				Reason:        "safesearch",
				RewriteType:   "CNAME",
				RewriteTarget: rule.TargetCNAME,
				TTL:           300,
			}
		}
	}

	// ============================================
	// PRIORITY 4: Threat Feed Blocking
	// ============================================
	threatType, isThreat := s.cache.CheckThreatDomain(ctx, domain)
	if isThreat && s.isThreatFeedEnabled(policy, threatType) {
		return &models.EvaluateResponse{
			Decision:  DecisionBlock,
			Reason:    "threat:" + threatType,
			Category:  threatType,
			BlockType: policy.BlockResponseType,
			TTL:       60,
		}
	}

	// ============================================
	// PRIORITY 5: Category Blocking (with schedules)
	// ============================================
	category := s.cache.GetDomainCategory(ctx, domain)
	if category == "" {
		// Try parent domain matching for subdomains
		category = s.findCategoryByParent(ctx, domain)
	}

	if category != "" {
		blockedCategories := s.getActiveBlockedCategories(policy, now)
		if blockedCategories[category] {
			return &models.EvaluateResponse{
				Decision:  DecisionBlock,
				Reason:    "category:" + category,
				Category:  category,
				BlockType: policy.BlockResponseType,
				TTL:       60,
			}
		}
	}

	// ============================================
	// PRIORITY 6: Default Allow
	// ============================================
	return &models.EvaluateResponse{
		Decision: DecisionAllow,
		Reason:   "default",
		Category: category, // Include for logging even if allowed
		TTL:      0,        // Use upstream TTL
	}
}

func (s *Service) isThreatFeedEnabled(policy *models.CompiledPolicy, threatType string) bool {
	for _, feed := range policy.ThreatFeeds {
		if feed == threatType || feed == "all" {
			return true
		}
	}
	return false
}

func (s *Service) findCategoryByParent(ctx context.Context, domain string) string {
	parts := strings.Split(domain, ".")

	// Try progressively shorter parent domains
	for i := 1; i < len(parts); i++ {
		parentDomain := strings.Join(parts[i:], ".")
		if category := s.cache.GetDomainCategory(ctx, parentDomain); category != "" {
			return category
		}
	}

	return ""
}

func (s *Service) getActiveBlockedCategories(policy *models.CompiledPolicy, now time.Time) map[string]bool {
	// Start with base blocked categories
	blocked := make(map[string]bool)
	for cat := range policy.BlockedCategories {
		blocked[cat] = true
	}

	// Check schedules for additional categories
	for _, schedule := range policy.Schedules {
		if s.isScheduleActive(schedule, now) {
			for _, cat := range schedule.AdditionalCategories {
				blocked[cat] = true
			}
		}
	}

	return blocked
}

func (s *Service) isScheduleActive(schedule models.Schedule, now time.Time) bool {
	// Load timezone
	loc, err := time.LoadLocation(schedule.Timezone)
	if err != nil {
		s.logger.Warn("Invalid timezone in schedule", zap.String("timezone", schedule.Timezone))
		loc = time.UTC
	}

	nowLocal := now.In(loc)
	dayName := strings.ToLower(nowLocal.Weekday().String()[:3])

	// Check if today is in the schedule
	dayMatch := false
	for _, day := range schedule.Days {
		if day == dayName {
			dayMatch = true
			break
		}
	}
	if !dayMatch {
		return false
	}

	// Check time range
	currentTime := nowLocal.Format("15:04")
	return currentTime >= schedule.StartTime && currentTime <= schedule.EndTime
}

func (s *Service) failSafeResponse() *models.EvaluateResponse {
	if s.failClosed {
		return &models.EvaluateResponse{
			Decision:  DecisionBlock,
			Reason:    "policy_error",
			BlockType: "NXDOMAIN",
			TTL:       30,
		}
	}

	return &models.EvaluateResponse{
		Decision: DecisionAllow,
		Reason:   "policy_error",
		TTL:      30,
	}
}

// ValidateToken validates a location token
func (s *Service) ValidateToken(ctx context.Context, tokenHash string) *models.ValidateTokenResponse {
	info, err := s.cache.ValidateToken(ctx, tokenHash)
	if err != nil {
		s.logger.Error("Failed to validate token", zap.Error(err))
		return &models.ValidateTokenResponse{Valid: false}
	}

	if info == nil {
		return &models.ValidateTokenResponse{Valid: false}
	}

	return &models.ValidateTokenResponse{
		Valid:      true,
		TenantID:   info.TenantID,
		LocationID: info.LocationID,
		RateLimit:  info.RateLimit,
	}
}
