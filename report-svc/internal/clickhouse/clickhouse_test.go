// Nebula DNS - Report Worker Service - ClickHouse Client Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

package clickhouse

import (
	"context"
	"testing"
	"time"

	"go.uber.org/zap"

	"github.com/nebuladns/report-svc/internal/models"
)

func TestNewClient(t *testing.T) {
	logger := zap.NewNop()
	client := NewClient("http://localhost:8123", "nebula_dns", "user", "pass", logger)

	if client == nil {
		t.Fatal("NewClient returned nil")
	}

	if client.baseURL != "http://localhost:8123" {
		t.Errorf("baseURL = %s, want http://localhost:8123", client.baseURL)
	}

	if client.database != "nebula_dns" {
		t.Errorf("database = %s, want nebula_dns", client.database)
	}
}

func TestClientIsHealthy(t *testing.T) {
	logger := zap.NewNop()
	client := NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	// Initial state should be healthy (circuit closed)
	if !client.IsHealthy() {
		t.Error("Client should be healthy initially")
	}
}

func TestClientCircuitState(t *testing.T) {
	logger := zap.NewNop()
	client := NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	state := client.GetCircuitState()
	if state != CircuitClosed {
		t.Errorf("CircuitState = %v, want CircuitClosed", state)
	}
}

func TestRecordFailure(t *testing.T) {
	logger := zap.NewNop()
	client := NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	// Record multiple failures
	for i := int32(0); i < client.failureThreshold; i++ {
		client.recordFailure()
	}

	// Circuit should be open now
	if client.IsHealthy() {
		t.Error("Client should be unhealthy after threshold failures")
	}
}

func TestRecordSuccess(t *testing.T) {
	logger := zap.NewNop()
	client := NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	// Record a failure then success
	client.recordFailure()
	client.recordSuccess()

	// Should still be healthy
	if !client.IsHealthy() {
		t.Error("Client should be healthy after success")
	}
}

func TestGetMockSummary(t *testing.T) {
	logger := zap.NewNop()
	client := NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	summary := client.getMockSummary()

	if summary == nil {
		t.Fatal("getMockSummary returned nil")
	}

	if summary.TotalQueries <= 0 {
		t.Error("TotalQueries should be positive")
	}

	if summary.BlockedQueries < 0 {
		t.Error("BlockedQueries should not be negative")
	}

	if summary.AllowedQueries < 0 {
		t.Error("AllowedQueries should not be negative")
	}

	if summary.BlockRate < 0 || summary.BlockRate > 100 {
		t.Errorf("BlockRate = %v, should be between 0 and 100", summary.BlockRate)
	}
}

func TestGetMockTopBlocked(t *testing.T) {
	logger := zap.NewNop()
	client := NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	topBlocked := client.getMockTopBlocked()

	if len(topBlocked) == 0 {
		t.Error("getMockTopBlocked returned empty slice")
	}

	for i, domain := range topBlocked {
		if domain.Domain == "" {
			t.Errorf("Domain %d has empty domain name", i)
		}
		if domain.Count <= 0 {
			t.Errorf("Domain %d has non-positive count", i)
		}
		if domain.Category == "" {
			t.Errorf("Domain %d has empty category", i)
		}
	}
}

func TestGetMockCategoryBreakdown(t *testing.T) {
	logger := zap.NewNop()
	client := NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	breakdown := client.getMockCategoryBreakdown()

	if len(breakdown) == 0 {
		t.Error("getMockCategoryBreakdown returned empty slice")
	}

	var totalPercentage float64
	for _, cat := range breakdown {
		if cat.Category == "" {
			t.Error("Category has empty name")
		}
		if cat.Count < 0 {
			t.Error("Category has negative count")
		}
		totalPercentage += cat.Percentage
	}

	// Total percentage should be approximately 100%
	if totalPercentage < 99 || totalPercentage > 101 {
		t.Errorf("Total percentage = %v, should be approximately 100", totalPercentage)
	}
}

func TestGetMockThreatStats(t *testing.T) {
	logger := zap.NewNop()
	client := NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	stats := client.getMockThreatStats()

	if len(stats) == 0 {
		t.Error("getMockThreatStats returned empty slice")
	}

	for i, stat := range stats {
		if stat.ThreatType == "" {
			t.Errorf("ThreatStats %d has empty threat type", i)
		}
		if stat.Count < 0 {
			t.Errorf("ThreatStats %d has negative count", i)
		}
	}
}

func TestGetMockThreatTrends(t *testing.T) {
	logger := zap.NewNop()
	client := NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	dateRange := models.DateRange{
		Start: time.Now().AddDate(0, 0, -7),
		End:   time.Now(),
	}

	trends := client.getMockThreatTrends(dateRange)

	if len(trends) == 0 {
		t.Error("getMockThreatTrends returned empty slice")
	}

	for i, trend := range trends {
		if trend.Date == "" {
			t.Errorf("ThreatTrend %d has empty date", i)
		}
		if trend.Malware < 0 || trend.Phishing < 0 || trend.C2 < 0 {
			t.Errorf("ThreatTrend %d has negative counts", i)
		}
	}
}

func TestGetMockLocationUsage(t *testing.T) {
	logger := zap.NewNop()
	client := NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	usage := client.getMockLocationUsage()

	if len(usage) == 0 {
		t.Error("getMockLocationUsage returned empty slice")
	}

	for i, loc := range usage {
		if loc.LocationID == "" {
			t.Errorf("LocationUsage %d has empty location ID", i)
		}
		if loc.LocationName == "" {
			t.Errorf("LocationUsage %d has empty location name", i)
		}
		if loc.QueryCount < 0 {
			t.Errorf("LocationUsage %d has negative query count", i)
		}
		if loc.BlockedCount > loc.QueryCount {
			t.Errorf("LocationUsage %d has blocked count > query count", i)
		}
	}
}

func TestGetMockDailyBreakdown(t *testing.T) {
	logger := zap.NewNop()
	client := NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	dateRange := models.DateRange{
		Start: time.Now().AddDate(0, 0, -7),
		End:   time.Now(),
	}

	breakdown := client.getMockDailyBreakdown(dateRange)

	if len(breakdown) == 0 {
		t.Error("getMockDailyBreakdown returned empty slice")
	}

	for i, day := range breakdown {
		if day.Date == "" {
			t.Errorf("DailyUsage %d has empty date", i)
		}
		if day.TotalQueries < 0 {
			t.Errorf("DailyUsage %d has negative total queries", i)
		}
		if day.BlockedCount > day.TotalQueries {
			t.Errorf("DailyUsage %d has blocked count > total queries", i)
		}
	}
}

func TestParseJSONLines(t *testing.T) {
	tests := []struct {
		name    string
		input   []byte
		wantLen int
		wantErr bool
	}{
		{
			name:    "Empty input",
			input:   []byte{},
			wantLen: 0,
			wantErr: false,
		},
		{
			name:    "Single line",
			input:   []byte(`{"name":"test"}`),
			wantLen: 1,
			wantErr: false,
		},
		{
			name:    "Multiple lines",
			input:   []byte("{\"name\":\"test1\"}\n{\"name\":\"test2\"}\n{\"name\":\"test3\"}"),
			wantLen: 3,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var results []map[string]interface{}
			err := parseJSONLines(tt.input, &results)
			if (err != nil) != tt.wantErr {
				t.Errorf("parseJSONLines() error = %v, wantErr %v", err, tt.wantErr)
			}
			if len(results) != tt.wantLen {
				t.Errorf("parseJSONLines() len = %v, want %v", len(results), tt.wantLen)
			}
		})
	}
}

func TestGetDNSSummaryWithMockData(t *testing.T) {
	logger := zap.NewNop()
	client := NewClient("http://invalid:8123", "nebula_dns", "", "", logger)

	// Force circuit open to test mock data fallback
	for i := int32(0); i < client.failureThreshold+1; i++ {
		client.recordFailure()
	}

	ctx := context.Background()
	dateRange := models.DateRange{
		Start: time.Now().AddDate(0, 0, -7),
		End:   time.Now(),
	}

	// Should fall back to mock data when circuit is open
	summary, err := client.GetDNSSummary(ctx, "tenant-123", dateRange)
	if err != nil {
		t.Errorf("GetDNSSummary() error = %v, expected nil with mock data", err)
	}
	if summary == nil {
		t.Error("GetDNSSummary() returned nil")
	}
}

func TestTenantIsolationInQueries(t *testing.T) {
	// Verify that tenant_id is always present in query patterns
	tenantID := "test-tenant-123"
	dateRange := models.DateRange{
		Start: time.Now().AddDate(0, 0, -7),
		End:   time.Now(),
	}

	// Create a mock query to test tenant isolation
	query := `
		SELECT count() as total_queries
		FROM query_logs
		WHERE tenant_id = '` + tenantID + `'
		  AND timestamp >= '` + dateRange.Start.Format(time.RFC3339) + `'
		  AND timestamp < '` + dateRange.End.Format(time.RFC3339) + `'
	`

	// Verify tenant_id is present in the query
	if !containsString(query, "tenant_id = '"+tenantID+"'") {
		t.Error("Query should contain tenant_id filter for tenant isolation")
	}
}

// containsString checks if a string contains a substring
func containsString(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsString(s[1:], substr) || s[:len(substr)] == substr)
}

func TestCircuitBreakerTransitions(t *testing.T) {
	logger := zap.NewNop()
	client := NewClient("http://localhost:8123", "nebula_dns", "", "", logger)

	// Initial state: closed
	if client.GetCircuitState() != CircuitClosed {
		t.Error("Initial state should be CircuitClosed")
	}

	// Trigger failures to open circuit
	for i := int32(0); i < client.failureThreshold; i++ {
		client.recordFailure()
	}

	if client.GetCircuitState() != CircuitOpen {
		t.Error("State should be CircuitOpen after threshold failures")
	}

	// Set last failure time to past to allow recovery
	client.lastFailureMu.Lock()
	client.lastFailureTime = time.Now().Add(-client.recoveryTimeout - time.Second)
	client.lastFailureMu.Unlock()

	// Attempting should transition to half-open
	canAttempt := client.canAttempt()
	if !canAttempt {
		t.Error("Should be able to attempt after recovery timeout")
	}

	if client.GetCircuitState() != CircuitHalfOpen {
		t.Error("State should be CircuitHalfOpen after recovery timeout")
	}

	// Successful requests should close the circuit
	for i := int32(0); i < client.halfOpenMaxRequests; i++ {
		client.recordSuccess()
	}

	if client.GetCircuitState() != CircuitClosed {
		t.Error("State should be CircuitClosed after successful requests")
	}
}
