// Nebula DNS - Enterprise DNS Security Platform
// Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Policy Cache Implementation

package cache

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/nebuladns/policy-svc/internal/models"
)

// PolicyCache manages in-memory and Redis-backed policy caching
type PolicyCache struct {
	redis  *redis.Client
	logger *zap.Logger

	// In-memory caches
	policies      map[string]*models.CompiledPolicy // key: locationId
	policiesMu    sync.RWMutex

	tokens        map[string]*TokenInfo // key: tokenHash
	tokensMu      sync.RWMutex

	threatDomains map[string]string // domain -> threat type
	threatMu      sync.RWMutex

	categories    map[string]string // domain -> category
	categoriesMu  sync.RWMutex
}

// TokenInfo contains validated token information
type TokenInfo struct {
	TenantID   string
	LocationID string
	RateLimit  int
	ExpiresAt  time.Time
}

// NewPolicyCache creates a new policy cache
func NewPolicyCache(redis *redis.Client, logger *zap.Logger) *PolicyCache {
	return &PolicyCache{
		redis:         redis,
		logger:        logger,
		policies:      make(map[string]*models.CompiledPolicy),
		tokens:        make(map[string]*TokenInfo),
		threatDomains: make(map[string]string),
		categories:    make(map[string]string),
	}
}

// GetPolicy retrieves a compiled policy for a location
func (c *PolicyCache) GetPolicy(ctx context.Context, locationID string) (*models.CompiledPolicy, error) {
	// Try in-memory cache first
	c.policiesMu.RLock()
	policy, exists := c.policies[locationID]
	c.policiesMu.RUnlock()

	if exists && time.Since(policy.UpdatedAt) < 60*time.Second {
		return policy, nil
	}

	// Fallback to Redis
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
	}
}
