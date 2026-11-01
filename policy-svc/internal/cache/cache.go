// Nebula DNS - Enterprise DNS Security Platform
// Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Policy Cache Implementation

package cache

import (
	"context"
	"encoding/json"
	"net"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/nebuladns/policy-svc/internal/metrics"
	"github.com/nebuladns/policy-svc/internal/models"
)

// PolicyCache manages in-memory and Redis-backed policy caching
type PolicyCache struct {
	redis   *redis.Client
	logger  *zap.Logger
	metrics *metrics.Metrics

	// In-memory caches
	policies   map[string]*models.CompiledPolicy // key: locationId
	policiesMu sync.RWMutex

	tokens   map[string]*TokenInfo // key: tokenHash
	tokensMu sync.RWMutex

	ipRanges   []IPRangeEntry // sorted list for IP matching
	ipRangesMu sync.RWMutex

	threatDomains map[string]string // domain -> threat type
	threatMu      sync.RWMutex

	categories   map[string]string // domain -> category
	categoriesMu sync.RWMutex

	// US-029: Subscription status cache for billing enforcement
	subscriptionStatus   map[string]models.SubscriptionStatus // key: tenantId
	subscriptionStatusMu sync.RWMutex
}

// TokenInfo contains validated token information
type TokenInfo struct {
	TenantID   string
	LocationID string
	RateLimit  int
	ExpiresAt  time.Time
}

// IPRangeEntry represents a parsed IP range for matching
type IPRangeEntry struct {
	Network    *net.IPNet
	TenantID   string
	LocationID string
	RateLimit  int
}

// NewPolicyCache creates a new policy cache
func NewPolicyCache(redisClient *redis.Client, logger *zap.Logger, m *metrics.Metrics) *PolicyCache {
	return &PolicyCache{
		redis:              redisClient,
		logger:             logger,
		metrics:            m,
		policies:           make(map[string]*models.CompiledPolicy),
		tokens:             make(map[string]*TokenInfo),
		ipRanges:           make([]IPRangeEntry, 0),
		threatDomains:      make(map[string]string),
		categories:         make(map[string]string),
		subscriptionStatus: make(map[string]models.SubscriptionStatus),
	}
}

// GetPolicy retrieves a compiled policy for a location
func (c *PolicyCache) GetPolicy(ctx context.Context, locationID string) (*models.CompiledPolicy, error) {
	// Try in-memory cache first
	c.policiesMu.RLock()
	policy, exists := c.policies[locationID]
	c.policiesMu.RUnlock()

	if exists && time.Since(policy.UpdatedAt) < 60*time.Second {
		if c.metrics != nil {
			c.metrics.RecordCacheHit()
		}
		return policy, nil
	}

	// Cache miss - fallback to Redis
	if c.metrics != nil {
		c.metrics.RecordCacheMiss()
	}

	key := "policy:" + locationID
	data, err := c.redis.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil
		}
		return nil, err
	}

	var cached models.CompiledPolicy
	if err := json.Unmarshal(data, &cached); err != nil {
		return nil, err
	}

	// Rebuild wildcard tries from patterns
	cached.AllowlistWildcard = models.NewSuffixTrie()
	for _, pattern := range cached.AllowlistWildcardPatterns {
		cached.AllowlistWildcard.Insert(pattern)
	}

	cached.BlocklistWildcard = models.NewSuffixTrie()
	for _, pattern := range cached.BlocklistWildcardPatterns {
		cached.BlocklistWildcard.Insert(pattern)
	}

	// Store in memory cache
	c.policiesMu.Lock()
	c.policies[locationID] = &cached
	c.policiesMu.Unlock()

	return &cached, nil
}

// SetPolicy stores a compiled policy
func (c *PolicyCache) SetPolicy(ctx context.Context, policy *models.CompiledPolicy) error {
	policy.UpdatedAt = time.Now()

	// Store in memory
	c.policiesMu.Lock()
	c.policies[policy.LocationID] = policy
	c.policiesMu.Unlock()

	// Store in Redis
	data, err := json.Marshal(policy)
	if err != nil {
		return err
	}

	key := "policy:" + policy.LocationID
	return c.redis.Set(ctx, key, data, 5*time.Minute).Err()
}

// ValidateToken checks if a token is valid
func (c *PolicyCache) ValidateToken(ctx context.Context, tokenHash string) (*TokenInfo, error) {
	// Try in-memory cache first
	c.tokensMu.RLock()
	info, exists := c.tokens[tokenHash]
	c.tokensMu.RUnlock()

	if exists {
		if info.ExpiresAt.After(time.Now()) {
			return info, nil
		}
		// Token expired, remove from cache
		c.tokensMu.Lock()
		delete(c.tokens, tokenHash)
		c.tokensMu.Unlock()
		return nil, nil
	}

	// Check Redis - tokens are stored as JSON strings
	key := "token:" + tokenHash
	data, err := c.redis.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil
		}
		return nil, err
	}

	// Parse token info from JSON
	var tokenData struct {
		TenantID   string  `json:"tenantId"`
		LocationID string  `json:"locationId"`
		Label      string  `json:"label"`
		ExpiresAt  *string `json:"expiresAt"`
	}
	if err := json.Unmarshal(data, &tokenData); err != nil {
		c.logger.Warn("Failed to parse token data", zap.Error(err))
		return nil, err
	}

	// Check expiration
	if tokenData.ExpiresAt != nil {
		expiresAt, err := time.Parse(time.RFC3339, *tokenData.ExpiresAt)
		if err == nil && expiresAt.Before(time.Now()) {
			return nil, nil // Token expired
		}
	}

	info = &TokenInfo{
		TenantID:   tokenData.TenantID,
		LocationID: tokenData.LocationID,
	}

	// Cache in memory (short TTL)
	info.ExpiresAt = time.Now().Add(5 * time.Minute)
	c.tokensMu.Lock()
	c.tokens[tokenHash] = info
	c.tokensMu.Unlock()

	return info, nil
}

// CheckThreatDomain checks if a domain is in threat feeds
func (c *PolicyCache) CheckThreatDomain(ctx context.Context, domain string) (string, bool) {
	c.threatMu.RLock()
	threatType, exists := c.threatDomains[domain]
	c.threatMu.RUnlock()

	if exists {
		return threatType, true
	}

	// Check Redis
	key := "threat:" + domain
	threatType, err := c.redis.Get(ctx, key).Result()
	if err == nil {
		// Cache locally
		c.threatMu.Lock()
		c.threatDomains[domain] = threatType
		c.threatMu.Unlock()
		return threatType, true
	}

	return "", false
}

// GetDomainCategory returns the category for a domain
func (c *PolicyCache) GetDomainCategory(ctx context.Context, domain string) string {
	c.categoriesMu.RLock()
	category, exists := c.categories[domain]
	c.categoriesMu.RUnlock()

	if exists {
		return category
	}

	// Check Redis
	key := "category:" + domain
	category, err := c.redis.Get(ctx, key).Result()
	if err == nil {
		// Cache locally
		c.categoriesMu.Lock()
		c.categories[domain] = category
		c.categoriesMu.Unlock()
		return category
	}

	return ""
}

// StartSubscriber listens for cache invalidation messages
func (c *PolicyCache) StartSubscriber(ctx context.Context) {
	pubsub := c.redis.Subscribe(ctx, "nebula:invalidate")
	defer pubsub.Close()

	c.logger.Info("Started cache invalidation subscriber")

	for {
		select {
		case <-ctx.Done():
			return
		case msg := <-pubsub.Channel():
			c.handleInvalidation(msg.Payload)
		}
	}
}

func (c *PolicyCache) handleInvalidation(payload string) {
	var msg struct {
		Type       string `json:"type"`
		LocationID string `json:"location_id,omitempty"`
		Token      string `json:"token,omitempty"`
	}

	if err := json.Unmarshal([]byte(payload), &msg); err != nil {
		c.logger.Warn("Failed to parse invalidation message", zap.Error(err))
		return
	}

	switch msg.Type {
	case "policy":
		c.policiesMu.Lock()
		delete(c.policies, msg.LocationID)
		c.policiesMu.Unlock()
		c.logger.Debug("Invalidated policy cache", zap.String("locationId", msg.LocationID))

	case "token":
		c.tokensMu.Lock()
		delete(c.tokens, msg.Token)
		c.tokensMu.Unlock()
		c.logger.Debug("Invalidated token cache")

	case "threats":
		c.threatMu.Lock()
		c.threatDomains = make(map[string]string)
		c.threatMu.Unlock()
		c.logger.Debug("Invalidated threat cache")

	case "categories":
		c.categoriesMu.Lock()
		c.categories = make(map[string]string)
		c.categoriesMu.Unlock()
		c.logger.Debug("Invalidated category cache")

	case "ip_ranges":
		// Reload IP ranges from Redis
		go c.LoadIPRanges(context.Background())
		c.logger.Debug("Reloading IP ranges cache")

	case "subscription_status":
		// US-029: Invalidate subscription status cache for affected tenants
		c.subscriptionStatusMu.Lock()
		c.subscriptionStatus = make(map[string]models.SubscriptionStatus)
		c.subscriptionStatusMu.Unlock()
		c.logger.Debug("Invalidated subscription status cache")
	}
}

// LookupByIP finds a location by client IP address
func (c *PolicyCache) LookupByIP(clientIP string) (*models.LookupIPResponse, error) {
	ip := net.ParseIP(clientIP)
	if ip == nil {
		return &models.LookupIPResponse{Found: false}, nil
	}

	c.ipRangesMu.RLock()
	defer c.ipRangesMu.RUnlock()

	for _, entry := range c.ipRanges {
		if entry.Network.Contains(ip) {
			return &models.LookupIPResponse{
				Found:      true,
				TenantID:   entry.TenantID,
				LocationID: entry.LocationID,
				RateLimit:  entry.RateLimit,
			}, nil
		}
	}

	return &models.LookupIPResponse{Found: false}, nil
}

// GetPolicyCacheSize returns the number of cached policies
func (c *PolicyCache) GetPolicyCacheSize() int {
	c.policiesMu.RLock()
	defer c.policiesMu.RUnlock()
	return len(c.policies)
}

// LoadIPRanges loads all IP range mappings from Redis
func (c *PolicyCache) LoadIPRanges(ctx context.Context) error {
	// Scan for all IP range keys (SCAN is non-blocking, unlike KEYS)
	var keys []string
	var cursor uint64
	for {
		var batch []string
		var err error
		batch, cursor, err = c.redis.Scan(ctx, cursor, "ip_range:*", 100).Result()
		if err != nil {
			c.logger.Error("Failed to scan IP range keys from Redis", zap.Error(err))
			return err
		}
		keys = append(keys, batch...)
		if cursor == 0 {
			break
		}
	}

	entries := make([]IPRangeEntry, 0, len(keys))

	for _, key := range keys {
		data, err := c.redis.Get(ctx, key).Bytes()
		if err != nil {
			c.logger.Warn("Failed to get IP range data", zap.String("key", key), zap.Error(err))
			continue
		}

		var mapping models.IPRangeMapping
		if err := json.Unmarshal(data, &mapping); err != nil {
			c.logger.Warn("Failed to unmarshal IP range mapping", zap.String("key", key), zap.Error(err))
			continue
		}

		// Parse the CIDR
		_, network, err := net.ParseCIDR(mapping.IPRange)
		if err != nil {
			// Try as single IP
			ip := net.ParseIP(mapping.IPRange)
			if ip == nil {
				c.logger.Warn("Invalid IP range", zap.String("range", mapping.IPRange))
				continue
			}
			// Convert single IP to /32 or /128
			if ip.To4() != nil {
				_, network, _ = net.ParseCIDR(mapping.IPRange + "/32")
			} else {
				_, network, _ = net.ParseCIDR(mapping.IPRange + "/128")
			}
		}

		entries = append(entries, IPRangeEntry{
			Network:    network,
			TenantID:   mapping.TenantID,
			LocationID: mapping.LocationID,
			RateLimit:  mapping.RateLimit,
		})
	}

	c.ipRangesMu.Lock()
	c.ipRanges = entries
	c.ipRangesMu.Unlock()

	c.logger.Info("Loaded IP range mappings", zap.Int("count", len(entries)))
	return nil
}

// GetSubscriptionStatus retrieves the subscription status for a tenant (US-029)
// Returns the status and whether the tenant can resolve DNS queries
func (c *PolicyCache) GetSubscriptionStatus(ctx context.Context, tenantID string) (models.SubscriptionStatus, bool) {
	// Try in-memory cache first
	c.subscriptionStatusMu.RLock()
	status, exists := c.subscriptionStatus[tenantID]
	c.subscriptionStatusMu.RUnlock()

	if exists {
		return status, status != models.SubscriptionSuspended
	}

	// Check Redis
	key := "subscription_status:" + tenantID
	statusStr, err := c.redis.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			// No cached status - assume active (fail-open for missing data)
			c.logger.Debug("No subscription status found, assuming active", zap.String("tenantId", tenantID))
			return models.SubscriptionActive, true
		}
		c.logger.Error("Failed to get subscription status from Redis", zap.Error(err), zap.String("tenantId", tenantID))
		// Fail-open on error
		return models.SubscriptionActive, true
	}

	// Parse and cache status
	status = models.SubscriptionStatus(statusStr)
	c.subscriptionStatusMu.Lock()
	c.subscriptionStatus[tenantID] = status
	c.subscriptionStatusMu.Unlock()

	c.logger.Debug("Retrieved subscription status", zap.String("tenantId", tenantID), zap.String("status", string(status)))
	return status, status != models.SubscriptionSuspended
}

// IsTenantSuspended checks if a tenant's subscription is suspended (US-029)
func (c *PolicyCache) IsTenantSuspended(ctx context.Context, tenantID string) bool {
	status, _ := c.GetSubscriptionStatus(ctx, tenantID)
	return status == models.SubscriptionSuspended
}

// BlockContextPayload is stored when sinkhole block pages are used.
type BlockContextPayload struct {
	TenantID   string `json:"tenantId"`
	LocationID string `json:"locationId"`
	Category   string `json:"category,omitempty"`
	Reason     string `json:"reason,omitempty"`
}

// SetBlockContext records tenant/category context for HTTP block page rendering.
func (c *PolicyCache) SetBlockContext(ctx context.Context, clientIP, domain string, payload BlockContextPayload) error {
	if clientIP == "" || domain == "" {
		return nil
	}
	key := "blockctx:" + clientIP + ":" + domain
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return c.redis.Set(ctx, key, data, 10*time.Minute).Err()
}

// SetBlockedDomainSni indexes blocked domains for HTTPS SNI routing and leaf issuance.
func (c *PolicyCache) SetBlockedDomainSni(ctx context.Context, tenantID, domain string) error {
	if tenantID == "" || domain == "" {
		return nil
	}
	pipe := c.redis.Pipeline()
	pipe.Set(ctx, "blockdomainsni:"+domain, tenantID, 10*time.Minute)
	pipe.Set(ctx, "blockdomain:"+tenantID+":"+domain, "1", 10*time.Minute)
	_, err := pipe.Exec(ctx)
	return err
}

// Ping verifies Redis connectivity for readiness checks
func (c *PolicyCache) Ping(ctx context.Context) error {
	return c.redis.Ping(ctx).Err()
}
