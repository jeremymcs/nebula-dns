// Nebula DNS - Report Worker Service - HTTP Handlers Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"go.uber.org/zap"

	"github.com/nebuladns/report-svc/internal/clickhouse"
	"github.com/nebuladns/report-svc/internal/metrics"
)

func TestHealthHandler(t *testing.T) {
	logger := zap.NewNop()
	m := metrics.NewMetrics()
	chClient := clickhouse.NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	h := NewHandlers(nil, nil, chClient, m, logger)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	h.Health(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Health() status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response["status"] != "healthy" {
		t.Errorf("Health() status = %s, want healthy", response["status"])
	}

	if response["service"] != "report-svc" {
		t.Errorf("Health() service = %s, want report-svc", response["service"])
	}

	if response["timestamp"] == nil {
		t.Error("Health() should include timestamp")
	}

	if response["uptime"] == nil {
		t.Error("Health() should include uptime")
	}
}

func TestLiveHandler(t *testing.T) {
	logger := zap.NewNop()
	m := metrics.NewMetrics()
	chClient := clickhouse.NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	h := NewHandlers(nil, nil, chClient, m, logger)

	req := httptest.NewRequest(http.MethodGet, "/live", nil)
	w := httptest.NewRecorder()

	h.Live(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Live() status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response["alive"] != true {
		t.Error("Live() should return alive: true")
	}

	if response["timestamp"] == nil {
		t.Error("Live() should include timestamp")
	}
}

func TestReadyHandler(t *testing.T) {
	logger := zap.NewNop()
	m := metrics.NewMetrics()
	chClient := clickhouse.NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	h := NewHandlers(nil, nil, chClient, m, logger)

	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	w := httptest.NewRecorder()

	h.Ready(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	// Status may vary based on ClickHouse health
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusServiceUnavailable {
		t.Errorf("Ready() status = %d, want 200 or 503", resp.StatusCode)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response["timestamp"] == nil {
		t.Error("Ready() should include timestamp")
	}

	if response["checks"] == nil {
		t.Error("Ready() should include checks")
	}
}

func TestStatsHandler(t *testing.T) {
	logger := zap.NewNop()
	m := metrics.NewMetrics()
	chClient := clickhouse.NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	h := NewHandlers(nil, nil, chClient, m, logger)

	req := httptest.NewRequest(http.MethodGet, "/stats", nil)
	w := httptest.NewRecorder()

	h.Stats(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Stats() status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response["service"] != "report-svc" {
		t.Errorf("Stats() service = %s, want report-svc", response["service"])
	}

	if response["timestamp"] == nil {
		t.Error("Stats() should include timestamp")
	}

	if response["uptime"] == nil {
		t.Error("Stats() should include uptime")
	}

	if response["stats"] == nil {
		t.Error("Stats() should include stats")
	}

	if response["clickhouse"] == nil {
		t.Error("Stats() should include clickhouse status")
	}
}

func TestGenerateReportMethodNotAllowed(t *testing.T) {
	logger := zap.NewNop()
	m := metrics.NewMetrics()
	chClient := clickhouse.NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	h := NewHandlers(nil, nil, chClient, m, logger)

	// Test GET method (should be rejected)
	req := httptest.NewRequest(http.MethodGet, "/generate", nil)
	w := httptest.NewRecorder()

	h.GenerateReport(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("GenerateReport(GET) status = %d, want %d", resp.StatusCode, http.StatusMethodNotAllowed)
	}
}

func TestGetReportMethodNotAllowed(t *testing.T) {
	logger := zap.NewNop()
	m := metrics.NewMetrics()
	chClient := clickhouse.NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	h := NewHandlers(nil, nil, chClient, m, logger)

	// Test POST method (should be rejected)
	req := httptest.NewRequest(http.MethodPost, "/report", nil)
	w := httptest.NewRecorder()

	h.GetReport(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("GetReport(POST) status = %d, want %d", resp.StatusCode, http.StatusMethodNotAllowed)
	}
}

func TestGetReportMissingJobID(t *testing.T) {
	logger := zap.NewNop()
	m := metrics.NewMetrics()
	chClient := clickhouse.NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	h := NewHandlers(nil, nil, chClient, m, logger)

	req := httptest.NewRequest(http.MethodGet, "/report", nil)
	w := httptest.NewRecorder()

	h.GetReport(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("GetReport() without job_id status = %d, want %d", resp.StatusCode, http.StatusBadRequest)
	}
}

func TestNewHandlers(t *testing.T) {
	logger := zap.NewNop()
	m := metrics.NewMetrics()
	chClient := clickhouse.NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	h := NewHandlers(nil, nil, chClient, m, logger)

	if h == nil {
		t.Fatal("NewHandlers returned nil")
	}

	if h.chClient != chClient {
		t.Error("NewHandlers did not set chClient")
	}

	if h.metrics != m {
		t.Error("NewHandlers did not set metrics")
	}

	if h.logger != logger {
		t.Error("NewHandlers did not set logger")
	}

	if h.startTime.IsZero() {
		t.Error("NewHandlers did not set startTime")
	}
}

func TestContentTypeHeaders(t *testing.T) {
	logger := zap.NewNop()
	m := metrics.NewMetrics()
	chClient := clickhouse.NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	h := NewHandlers(nil, nil, chClient, m, logger)

	tests := []struct {
		name         string
		handler      func(http.ResponseWriter, *http.Request)
		expectedType string
	}{
		{"Health", h.Health, "application/json"},
		{"Live", h.Live, "application/json"},
		{"Ready", h.Ready, "application/json"},
		{"Stats", h.Stats, "application/json"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			w := httptest.NewRecorder()

			tt.handler(w, req)

			resp := w.Result()
			defer resp.Body.Close()

			contentType := resp.Header.Get("Content-Type")
			if contentType != tt.expectedType {
				t.Errorf("%s Content-Type = %s, want %s", tt.name, contentType, tt.expectedType)
			}
		})
	}
}
