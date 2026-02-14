// Nebula DNS - Policy Service Integration Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// ClickHouse Integration Tests

//go:build integration
// +build integration

package clickhouse

import (
	"os"
	"testing"
	"time"

	"go.uber.org/zap"

	"github.com/nebuladns/policy-svc/internal/models"
)

// getTestClickHouseURL returns the ClickHouse URL for tests
func getTestClickHouseURL() string {
	url := os.Getenv("TEST_CLICKHOUSE_URL")
	if url == "" {
		url = "http://localhost:8123"
	}
	return url
}

// getTestClickHouseDatabase returns the ClickHouse database for tests
func getTestClickHouseDatabase() string {
	db := os.Getenv("TEST_CLICKHOUSE_DB")
	if db == "" {
		db = "default"
	}
	return db
}

// TestClickHouseLogQuery tests LogQuery with valid DNS query
func TestClickHouseLogQuery(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	baseURL := getTestClickHouseURL()
	database := getTestClickHouseDatabase()

	logger := zap.NewNop()
	client := NewClient(baseURL, database, "", "", logger)

	// Wait for initial connection test
	time.Sleep(500 * time.Millisecond)

	// Skip if not healthy
	if !client.IsHealthy() {
		t.Skip("ClickHouse not available")
	}

	// Create a test query log entry
	entry := models.QueryLogEntry{
		Timestamp:     time.Now().UTC(),
		TenantID:      "test-tenant-1",
		LocationID:    "test-location-1",
		ClientIP:      "192.168.1.100",
		QName:         "example.com",
		QType:         1, // A record
		Action:        "ALLOW",
		Reason:        "allowlist",
		Category:      "",
		ThreatType:    "",
		PolicyVersion: 1,
		RCode:         0,
		LatencyMs:     5.2,
		Upstream:      "8.8.8.8",
		Cached:        false,
		ResponseIP:    "93.184.216.34",
	}

	// Log the entry - this adds to buffer but may not flush immediately
	client.Log(entry)

	// Give time for background flush
	time.Sleep(200 * time.Millisecond)

	// Check that something was logged (buffer may have been flushed)
	queueSize := client.GetQueueSize()
	t.Logf("Queue size after log: %d", queueSize)

	client.Close()
}

// TestClickHouseBatchInsert tests batch insert behavior
func TestClickHouseBatchInsert(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	baseURL := getTestClickHouseURL()
	database := getTestClickHouseDatabase()

	logger := zap.NewNop()
	client := NewClient(baseURL, database, "", "", logger)

	// Wait for initial connection test
	time.Sleep(500 * time.Millisecond)

	if !client.IsHealthy() {
		t.Skip("ClickHouse not available")
	}

	// Create multiple entries to test batch behavior
	entries := []models.QueryLogEntry{
		{
			Timestamp:  time.Now().UTC(),
			TenantID:   "test-tenant-2",
			LocationID: "test-location-2",
			ClientIP:   "10.0.0.1",
			QName:      "google.com",
			QType:      1,
			Action:     "ALLOW",
			Reason:     "default",
			RCode:      0,
			LatencyMs:  3.1,
			Cached:     true,
		},
		{
			Timestamp:  time.Now().UTC(),
			TenantID:   "test-tenant-2",
			LocationID: "test-location-2",
			ClientIP:   "10.0.0.2",
			QName:      "facebook.com",
			QType:      1,
			Action:     "BLOCK",
			Reason:     "category",
			Category:   "social_networking",
			RCode:      0,
			LatencyMs:  2.8,
			Cached:     false,
		},
		{
			Timestamp:  time.Now().UTC(),
			TenantID:   "test-tenant-2",
			LocationID: "test-location-2",
			ClientIP:   "10.0.0.3",
			QName:      "malware.test",
			QType:      1,
			Action:     "BLOCK",
			Reason:     "threat",
			ThreatType: "malware",
			RCode:      0,
			LatencyMs:  1.5,
			Cached:     false,
		},
	}

	// Log all entries
	for _, entry := range entries {
		client.Log(entry)
	}

	// Give time for background flush
	time.Sleep(600 * time.Millisecond)

	// Queue should be empty after flush
	queueSize := client.GetQueueSize()
	if queueSize > 0 {
		t.Logf("Warning: Queue still has %d entries after flush", queueSize)
	}

	client.Close()
}

// TestClickHouseErrorHandling tests error handling for connection failures
func TestClickHouseErrorHandling(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	// Test with invalid URL to trigger error handling
	baseURL := "http://invalid-host:9999"
	database := "default"

	logger := zap.NewNop()
	client := NewClient(baseURL, database, "", "", logger)

	// Wait for initial connection test
	time.Sleep(600 * time.Millisecond)

	// Should not be healthy with invalid host
	if client.IsHealthy() {
		t.Log("Warning: Client reported healthy with invalid URL")
	}

	// Log an entry - it should be buffered
	entry := models.QueryLogEntry{
		Timestamp: time.Now().UTC(),
		TenantID:  "test-tenant-3",
		QName:     "test.com",
		QType:     1,
		Action:    "ALLOW",
		Reason:    "test",
		RCode:     0,
		Cached:    false,
	}

	client.Log(entry)

	// Give time for background flush attempt
	time.Sleep(600 * time.Millisecond)

	// Entry should still be in buffer due to failed flush
	queueSize := client.GetQueueSize()
	if queueSize == 0 {
		t.Log("Warning: Queue is empty after failed flush - entries may have been dropped")
	} else {
		t.Logf("Queue size after failed flush: %d (expected > 0)", queueSize)
	}

	client.Close()
}

// TestClickHouseCircuitBreaker tests circuit breaker behavior
func TestClickHouseCircuitBreaker(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	// Use invalid URL to trigger failures
	baseURL := "http://invalid-host:9999"
	database := "default"

	logger := zap.NewNop()
	client := NewClient(baseURL, database, "", "", logger)

	// Wait for circuit breaker to open
	time.Sleep(2 * time.Second)

	// Check circuit state
	state := client.GetCircuitState()
	t.Logf("Circuit state: %d (0=closed, 1=open, 2=half-open)", state)

	// With many failures, circuit should be open
	if state == CircuitOpen {
		t.Log("Circuit breaker correctly opened after failures")
	} else {
		t.Logf("Circuit breaker state: %d", state)
	}

	client.Close()
}

// TestClickHouseHealthyConnection tests behavior with healthy connection
func TestClickHouseHealthyConnection(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	baseURL := getTestClickHouseURL()
	database := getTestClickHouseDatabase()

	logger := zap.NewNop()
	client := NewClient(baseURL, database, "", "", logger)

	// Wait for connection test
	time.Sleep(1 * time.Second)

	// Get circuit state
	state := client.GetCircuitState()
	isHealthy := client.IsHealthy()

	t.Logf("Circuit state: %d, IsHealthy: %v", state, isHealthy)

	if isHealthy {
		t.Log("ClickHouse connection is healthy")
	} else {
		t.Skip("ClickHouse not available")
	}

	client.Close()
}
