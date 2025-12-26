package forwarder

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestMetrics_RecordQuery(t *testing.T) {
	m := NewMetrics()

	m.RecordQuery("A", "success")
	m.RecordQuery("A", "success")
	m.RecordQuery("AAAA", "error")

	// Verify metrics are recorded by checking the handler output
	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	w := httptest.NewRecorder()
	m.Handler().ServeHTTP(w, req)

	resp := w.Result()
	body, _ := io.ReadAll(resp.Body)
	bodyStr := string(body)

	if !strings.Contains(bodyStr, "nebuladns_forwarder_queries_total") {
		t.Error("Expected queries_total metric in output")
	}
}

func TestMetrics_RecordQueryDuration(t *testing.T) {
	m := NewMetrics()

	m.RecordQueryDuration("doh", 50*time.Millisecond)
	m.RecordQueryDuration("internal", 5*time.Millisecond)
	m.RecordQueryDuration("cache", 100*time.Microsecond)

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	w := httptest.NewRecorder()
	m.Handler().ServeHTTP(w, req)

	resp := w.Result()
	body, _ := io.ReadAll(resp.Body)
	bodyStr := string(body)

	if !strings.Contains(bodyStr, "nebuladns_forwarder_query_duration_seconds") {
		t.Error("Expected query_duration_seconds metric in output")
	}
}

func TestMetrics_CacheMetrics(t *testing.T) {
	m := NewMetrics()

	m.RecordCacheHit()
	m.RecordCacheHit()
	m.RecordCacheMiss()
	m.SetCacheSize(100)

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	w := httptest.NewRecorder()
	m.Handler().ServeHTTP(w, req)

	resp := w.Result()
	body, _ := io.ReadAll(resp.Body)
	bodyStr := string(body)

	if !strings.Contains(bodyStr, "nebuladns_forwarder_cache_hits_total") {
		t.Error("Expected cache_hits_total metric in output")
	}
	if !strings.Contains(bodyStr, "nebuladns_forwarder_cache_misses_total") {
		t.Error("Expected cache_misses_total metric in output")
	}
	if !strings.Contains(bodyStr, "nebuladns_forwarder_cache_size") {
		t.Error("Expected cache_size metric in output")
	}
}

func TestMetrics_UpstreamErrors(t *testing.T) {
	m := NewMetrics()

	m.RecordUpstreamError("doh")
	m.RecordUpstreamError("internal")
	m.RecordUpstreamError("fallback")

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	w := httptest.NewRecorder()
	m.Handler().ServeHTTP(w, req)

	resp := w.Result()
	body, _ := io.ReadAll(resp.Body)
	bodyStr := string(body)

	if !strings.Contains(bodyStr, "nebuladns_forwarder_upstream_errors_total") {
		t.Error("Expected upstream_errors_total metric in output")
	}
}

func TestMetrics_ActiveQueries(t *testing.T) {
	m := NewMetrics()

	m.IncActiveQueries()
	m.IncActiveQueries()
	m.DecActiveQueries()

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	w := httptest.NewRecorder()
	m.Handler().ServeHTTP(w, req)

	resp := w.Result()
	body, _ := io.ReadAll(resp.Body)
	bodyStr := string(body)

	if !strings.Contains(bodyStr, "nebuladns_forwarder_active_queries") {
		t.Error("Expected active_queries metric in output")
	}
}

func TestMetrics_QueryRouting(t *testing.T) {
	m := NewMetrics()

	m.RecordInternalQuery()
	m.RecordExternalQuery()
	m.RecordBlockedQuery()

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	w := httptest.NewRecorder()
	m.Handler().ServeHTTP(w, req)

	resp := w.Result()
	body, _ := io.ReadAll(resp.Body)
	bodyStr := string(body)

	if !strings.Contains(bodyStr, "nebuladns_forwarder_internal_queries_total") {
		t.Error("Expected internal_queries_total metric in output")
	}
	if !strings.Contains(bodyStr, "nebuladns_forwarder_external_queries_total") {
		t.Error("Expected external_queries_total metric in output")
	}
	if !strings.Contains(bodyStr, "nebuladns_forwarder_blocked_queries_total") {
		t.Error("Expected blocked_queries_total metric in output")
	}
}

