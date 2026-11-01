//go:build integration
// +build integration

package integration

import (
	"context"
	"testing"

	"github.com/nebuladns/policy-svc/internal/models"
)

// TestThreatFeedRedisSetSchema verifies policy evaluation against nebula:threats:* sets.
func TestThreatFeedRedisSetSchema(t *testing.T) {
	setupTest(t)
	ctx := context.Background()

	policy := &models.CompiledPolicy{
		LocationID: "loc-redis-schema",
		TenantID:   "tenant-1",
		ThreatFeeds: []string{"malware"},
		BlockedCategories: map[string]bool{},
	}

	testCache.SetPolicy(ctx, policy)

	testRedisClient.SAdd(ctx, "nebula:threats:malware", "parent-malware.net")

	result := testPolicyService.Evaluate(ctx, &models.EvaluateRequest{
		TenantID:   "tenant-1",
		LocationID: "loc-redis-schema",
		QName:      "sub.parent-malware.net",
		QType:      1,
		ClientIP:   "192.168.1.1",
	})

	if result.Decision != "BLOCK" {
		t.Fatalf("expected block for subdomain of listed parent, got %s", result.Decision)
	}
	if result.Reason != "threat:malware" {
		t.Fatalf("expected threat:malware, got %s", result.Reason)
	}
}

func TestCategoryRedisSetSchema(t *testing.T) {
	setupTest(t)
	ctx := context.Background()

	policy := &models.CompiledPolicy{
		LocationID: "loc-cat-schema",
		TenantID:   "tenant-1",
		ThreatFeeds: []string{},
		BlockedCategories: map[string]bool{
			"gambling": true,
		},
	}

	testCache.SetPolicy(ctx, policy)
	addShardedCategoryDomain(ctx, "gambling", "bet.example.org")

	result := testPolicyService.Evaluate(ctx, &models.EvaluateRequest{
		TenantID:   "tenant-1",
		LocationID: "loc-cat-schema",
		QName:      "bet.example.org",
		QType:      1,
		ClientIP:   "192.168.1.1",
	})

	if result.Decision != "BLOCK" {
		t.Fatalf("expected block, got %s", result.Decision)
	}
	if result.Reason != "category:gambling" {
		t.Fatalf("expected category:gambling, got %s", result.Reason)
	}
}
