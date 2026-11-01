package cache

import (
	"context"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

func TestFindDomainCategoryShardedKeys(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatal(err)
	}
	defer mr.Close()

	domain := "sub.casino.example.com"
	parent := "casino.example.com"
	shard := CategoryDomainShard(parent, DefaultCategoryShardCount)
	key := categoryShardSetKey("gambling", shard)
	mr.SAdd(key, parent)

	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	pc := NewPolicyCache(client, zap.NewNop(), nil)
	pc.categoryShardCount = DefaultCategoryShardCount

	cat := pc.FindDomainCategory(context.Background(), domain, []string{"gambling"})
	if cat != "gambling" {
		t.Fatalf("expected gambling, got %q", cat)
	}
}

func TestFindDomainCategoryRespectsCandidates(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatal(err)
	}
	defer mr.Close()

	domain := "game.example.com"
	shard := CategoryDomainShard(domain, DefaultCategoryShardCount)
	mr.SAdd(categoryShardSetKey("gaming", shard), domain)

	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	pc := NewPolicyCache(client, zap.NewNop(), nil)

	cat := pc.FindDomainCategory(context.Background(), domain, []string{"gambling"})
	if cat != "" {
		t.Fatalf("expected no match when gaming not in candidates, got %q", cat)
	}
}
