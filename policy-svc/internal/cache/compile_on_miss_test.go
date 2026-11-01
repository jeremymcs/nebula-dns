package cache

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

func TestGetPolicyCompileOnMiss(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatal(err)
	}
	defer mr.Close()

	var compileHits int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if r.Header.Get("X-Internal-Secret") != "test-secret" {
			t.Fatalf("missing internal secret header")
		}
		compileHits++
		mr.Set("policy:loc-1", `{"tenantId":"t1","locationId":"loc-1","policyVersion":1,"allowlistExact":{},"blocklistExact":{},"blockedCategories":{},"threatFeeds":[],"safesearchEnabled":false,"safesearchRules":{},"schedules":[],"blockResponseType":"NXDOMAIN","updatedAt":"2026-01-01T00:00:00.000Z"}`)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	t.Setenv("POLICY_COMPILE_API_URL", srv.URL)
	t.Setenv("INTERNAL_API_SECRET", "test-secret")

	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	cache := NewPolicyCache(client, zap.NewNop(), nil)

	policy, err := cache.GetPolicy(context.Background(), "loc-1")
	if err != nil {
		t.Fatalf("GetPolicy error: %v", err)
	}
	if policy == nil {
		t.Fatal("expected policy after compile-on-miss")
	}
	if compileHits != 1 {
		t.Fatalf("expected 1 compile call, got %d", compileHits)
	}
}
