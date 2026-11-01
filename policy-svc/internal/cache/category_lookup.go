package cache

import (
	"context"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

const categoryMemCacheTTL = 30 * time.Minute

type categoryMemEntry struct {
	category  string
	expiresAt time.Time
}

func (c *PolicyCache) getCategoryMem(domain string) (string, bool) {
	c.categoriesMu.RLock()
	entry, ok := c.categories[domain]
	c.categoriesMu.RUnlock()
	if !ok {
		return "", false
	}
	if time.Now().After(entry.expiresAt) {
		c.categoriesMu.Lock()
		delete(c.categories, domain)
		c.categoriesMu.Unlock()
		return "", false
	}
	return entry.category, true
}

func (c *PolicyCache) setCategoryMem(domain, category string) {
	c.categoriesMu.Lock()
	if len(c.categories) > 50000 {
		c.categories = make(map[string]categoryMemEntry)
	}
	c.categories[domain] = categoryMemEntry{
		category:  category,
		expiresAt: time.Now().Add(categoryMemCacheTTL),
	}
	c.categoriesMu.Unlock()
}

// FindDomainCategory looks up a domain in sharded category SETs for candidate categories only.
func (c *PolicyCache) FindDomainCategory(ctx context.Context, domain string, candidateCategories []string) string {
	domain = strings.ToLower(strings.TrimSpace(domain))
	if domain == "" || len(candidateCategories) == 0 {
		return ""
	}

	if cat, ok := c.getCategoryMem(domain); ok {
		return cat
	}

	suffixes := domainLabelSuffixes(domain)
	shardCount := c.categoryShardCount
	if shardCount <= 0 {
		shardCount = DefaultCategoryShardCount
	}

	pipe := c.redis.Pipeline()
	type lookup struct {
		category string
		cmd      *redis.BoolCmd
	}
	lookups := make([]lookup, 0, len(suffixes)*len(candidateCategories))

	for _, suffix := range suffixes {
		for _, cat := range candidateCategories {
			shard := CategoryDomainShard(suffix, shardCount)
			key := categoryShardSetKey(cat, shard)
			lookups = append(lookups, lookup{
				category: cat,
				cmd:      pipe.SIsMember(ctx, key, suffix),
			})
		}
	}

	if _, err := pipe.Exec(ctx); err != nil && err != redis.Nil {
		c.logger.Debug("Category shard pipeline failed", zap.Error(err))
	}

	for _, l := range lookups {
		if l.cmd.Val() {
			c.setCategoryMem(domain, l.category)
			return l.category
		}
	}

	return ""
}

// GetDomainCategory checks all known content categories (logging / legacy callers).
func (c *PolicyCache) GetDomainCategory(ctx context.Context, domain string) string {
	return c.FindDomainCategory(ctx, domain, contentCategoryOrder)
}
