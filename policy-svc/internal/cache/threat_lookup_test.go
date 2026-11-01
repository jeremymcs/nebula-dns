package cache

import (
	"context"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

func TestCheckThreatDomainSetLookupAndParent(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatal(err)
	}
	defer mr.Close()

	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	cache := NewPolicyCache(client, zap.NewNop(), nil)
	ctx := context.Background()

	mr.SAdd("nebula:threats:malware", "evil.com")

	threatType, ok := cache.CheckThreatDomain(ctx, "sub.evil.com")
	if !ok {
		t.Fatal("expected threat match on parent domain")
	}
	if threatType != "malware" {
		t.Fatalf("expected malware, got %s", threatType)
	}
}

func TestGetDomainCategorySetLookup(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatal(err)
	}
	defer mr.Close()

	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	cache := NewPolicyCache(client, zap.NewNop(), nil)
	ctx := context.Background()

	domain := "casino.example.com"
	shard := CategoryDomainShard(domain, DefaultCategoryShardCount)
	mr.SAdd(categoryShardSetKey("gambling", shard), domain)

	cat := cache.GetDomainCategory(ctx, domain)
	if cat != "gambling" {
		t.Fatalf("expected gambling, got %s", cat)
	}
}
