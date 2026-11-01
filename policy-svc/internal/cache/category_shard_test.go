package cache

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

type shardVectorFile struct {
	ShardCount int `json:"shardCount"`
	Vectors    []struct {
		Domain string `json:"domain"`
		Shard  int    `json:"shard"`
	} `json:"vectors"`
}

func TestCategoryDomainShardMatchesSharedVectors(t *testing.T) {
	path := filepath.Join("..", "..", "..", "shared", "category-shard-test-vectors.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read vectors: %v", err)
	}
	var fixture shardVectorFile
	if err := json.Unmarshal(data, &fixture); err != nil {
		t.Fatalf("parse vectors: %v", err)
	}
	if fixture.ShardCount != DefaultCategoryShardCount {
		t.Fatalf("expected shard count %d, got %d", DefaultCategoryShardCount, fixture.ShardCount)
	}
	for _, v := range fixture.Vectors {
		got := CategoryDomainShard(v.Domain, fixture.ShardCount)
		if got != v.Shard {
			t.Fatalf("domain %q: got shard %d want %d", v.Domain, got, v.Shard)
		}
	}
}
