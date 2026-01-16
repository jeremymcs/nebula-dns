// Nebula DNS - Report Worker Service - Metrics Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

package metrics

import (
	"testing"
	"time"
)

func TestNewMetrics(t *testing.T) {
	m := NewMetrics()
	if m == nil {
		t.Fatal("NewMetrics returned nil")
	}

	// Verify all metric objects are initialized
	if m.ReportGenerationTotal == nil {
		t.Error("ReportGenerationTotal is nil")
	}
	if m.ReportGenerationDuration == nil {
		t.Error("ReportGenerationDuration is nil")
	}
	if m.ReportGenerationErrors == nil {
		t.Error("ReportGenerationErrors is nil")
	}
	if m.JobsReceived == nil {
		t.Error("JobsReceived is nil")
	}
	if m.JobsCompleted == nil {
		t.Error("JobsCompleted is nil")
	}
	if m.JobsFailed == nil {
		t.Error("JobsFailed is nil")
	}
	if m.ActiveJobs == nil {
		t.Error("ActiveJobs is nil")
	}
	if m.ClickHouseQueueSize == nil {
		t.Error("ClickHouseQueueSize is nil")
	}
}

func TestGetMetricsSingleton(t *testing.T) {
	m1 := Get()
	m2 := Get()

	if m1 != m2 {
		t.Error("Get() should return the same singleton instance")
	}
}

func TestRecordReportGeneration(t *testing.T) {
	m := Get()

	// Record successful generation
	m.RecordReportGeneration("tenant-123", "pdf", "dns_summary", 2*time.Second, true)

	stats := m.GetStats()
	if stats["generations"] == 0 {
		t.Error("Generation count should be incremented")
	}
}

func TestRecordReportGenerationFailure(t *testing.T) {
	m := Get()

	initialErrors := m.GetStats()["errors"]

	// Record failed generation
	m.RecordReportGeneration("tenant-123", "pdf", "dns_summary", 1*time.Second, false)

	stats := m.GetStats()
	if stats["errors"] <= initialErrors {
		t.Error("Error count should be incremented on failure")
	}
}

func TestRecordError(t *testing.T) {
	m := Get()

	// Should not panic
	m.RecordError("tenant-123", "pdf", "dns_summary", "clickhouse_timeout")
}

func TestIncrementJobsReceived(t *testing.T) {
	m := Get()

	// Should not panic
	m.IncrementJobsReceived()
}

func TestIncrementJobsCompleted(t *testing.T) {
	m := Get()

	// Need to increment received first to avoid negative active jobs
	m.IncrementJobsReceived()
	m.IncrementJobsCompleted()
}

func TestIncrementJobsFailed(t *testing.T) {
	m := Get()

	// Need to increment received first to avoid negative active jobs
	m.IncrementJobsReceived()
	m.IncrementJobsFailed()
}

func TestSetClickHouseQueueSize(t *testing.T) {
	m := Get()

	// Should not panic
	m.SetClickHouseQueueSize(100)
	m.SetClickHouseQueueSize(0)
}

func TestGetStats(t *testing.T) {
	m := Get()

	stats := m.GetStats()

	if stats == nil {
		t.Fatal("GetStats returned nil")
	}

	// Should have expected keys
	if _, ok := stats["generations"]; !ok {
		t.Error("GetStats should include 'generations' key")
	}
	if _, ok := stats["errors"]; !ok {
		t.Error("GetStats should include 'errors' key")
	}
}

func TestHandler(t *testing.T) {
	handler := Handler()
	if handler == nil {
		t.Error("Handler returned nil")
	}
}

func TestMetricsConcurrency(t *testing.T) {
	m := Get()

	// Run concurrent operations to test thread safety
	done := make(chan bool, 10)

	for i := 0; i < 10; i++ {
		go func() {
			m.RecordReportGeneration("tenant", "pdf", "summary", time.Second, true)
			m.IncrementJobsReceived()
			m.IncrementJobsCompleted()
			m.SetClickHouseQueueSize(50)
			m.GetStats()
			done <- true
		}()
	}

	// Wait for all goroutines
	for i := 0; i < 10; i++ {
		<-done
	}
}
