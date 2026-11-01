package cache

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

const DefaultCategoryShardCount = 16

func CategoryShardCountFromEnv() int {
	raw := os.Getenv("CATEGORY_SHARD_COUNT")
	if raw == "" {
		return DefaultCategoryShardCount
	}
	n, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || n < 1 || n > 256 {
		return DefaultCategoryShardCount
	}
	return n
}

// CategoryDomainShard assigns a normalized domain to a shard (FNV-1a 32-bit).
func CategoryDomainShard(domain string, shardCount int) int {
	if shardCount <= 0 {
		shardCount = DefaultCategoryShardCount
	}
	domain = strings.ToLower(strings.TrimSpace(domain))
	var hash uint32 = 2166136261
	for i := 0; i < len(domain); i++ {
		hash ^= uint32(domain[i])
		hash *= 16777619
	}
	return int(hash % uint32(shardCount))
}

func categoryShardSetKey(category string, shard int) string {
	return fmt.Sprintf("%s%s:%d", categorySetPrefix, category, shard)
}

func categoryShardStagingKey(category string, shard int) string {
	return categoryShardSetKey(category, shard) + ":staging"
}
