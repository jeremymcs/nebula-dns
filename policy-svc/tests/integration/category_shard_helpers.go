//go:build integration
// +build integration

package integration

import (
	"context"
	"fmt"

	"github.com/nebuladns/policy-svc/internal/cache"
)

func addShardedCategoryDomain(ctx context.Context, category, domain string) {
	shard := cache.CategoryDomainShard(domain, cache.DefaultCategoryShardCount)
	key := fmt.Sprintf("nebula:categories:%s:%d", category, shard)
	testRedisClient.SAdd(ctx, key, domain)
}
