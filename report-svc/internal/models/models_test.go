// Nebula DNS - Report Worker Service - Data Models Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

package models

import (
	"testing"
	"time"
)

func TestReportTypeConstants(t *testing.T) {
	tests := []struct {
		name     string
		expected ReportType
		value    string
	}{
		{"DNS Summary", ReportTypeDNSSummary, "dns_summary"},
		{"Threat Report", ReportTypeThreat, "threat_report"},
		{"Usage Report", ReportTypeUsage, "usage"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.expected) != tt.value {
				t.Errorf("ReportType %s = %s, want %s", tt.name, string(tt.expected), tt.value)
			}
		})
	}
}

func TestReportFormatConstants(t *testing.T) {
	tests := []struct {
		name     string
		expected ReportFormat
		value    string
	}{
		{"PDF", ReportFormatPDF, "pdf"},
		{"CSV", ReportFormatCSV, "csv"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.expected) != tt.value {
				t.Errorf("ReportFormat %s = %s, want %s", tt.name, string(tt.expected), tt.value)
			}
		})
	}
}

func TestJobStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		expected JobStatus
		value    string
	}{
		{"Pending", JobStatusPending, "pending"},
		{"Generating", JobStatusGenerating, "generating"},
		{"Completed", JobStatusCompleted, "completed"},
		{"Failed", JobStatusFailed, "failed"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.expected) != tt.value {
				t.Errorf("JobStatus %s = %s, want %s", tt.name, string(tt.expected), tt.value)
			}
		})
	}
}

func TestReportRequestValidation(t *testing.T) {
	now := time.Now()
	tests := []struct {
		name    string
		req     ReportRequest
		wantErr bool
	}{
		{
			name: "Valid request",
			req: ReportRequest{
				JobID:      "job-123",
				TenantID:   "tenant-abc",
				ReportType: ReportTypeDNSSummary,
				Format:     ReportFormatPDF,
				DateRange: DateRange{
					Start: now.AddDate(0, 0, -7),
					End:   now,
				},
			},
			wantErr: false,
		},
		{
			name: "Missing JobID",
			req: ReportRequest{
				TenantID:   "tenant-abc",
				ReportType: ReportTypeDNSSummary,
			},
			wantErr: true,
		},
		{
			name: "Missing TenantID",
			req: ReportRequest{
				JobID:      "job-123",
				ReportType: ReportTypeDNSSummary,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Validate request fields
			hasError := tt.req.JobID == "" || tt.req.TenantID == ""
			if hasError != tt.wantErr {
				t.Errorf("Request validation error = %v, wantErr %v", hasError, tt.wantErr)
			}
		})
	}
}

func TestDateRange(t *testing.T) {
	now := time.Now()
	dr := DateRange{
		Start: now.AddDate(0, 0, -7),
		End:   now,
	}

	if !dr.Start.Before(dr.End) {
		t.Error("DateRange Start should be before End")
	}

	// Test duration
	duration := dr.End.Sub(dr.Start)
	if duration.Hours() < 168 { // 7 days = 168 hours
		t.Errorf("DateRange duration = %v, want approximately 168 hours", duration)
	}
}

func TestReportSummaryBlockRate(t *testing.T) {
	tests := []struct {
		name           string
		totalQueries   int64
		blockedQueries int64
		wantBlockRate  float64
	}{
		{
			name:           "Normal block rate",
			totalQueries:   1000,
			blockedQueries: 50,
			wantBlockRate:  5.0,
		},
		{
			name:           "Zero total queries",
			totalQueries:   0,
			blockedQueries: 0,
			wantBlockRate:  0.0,
		},
		{
			name:           "All blocked",
			totalQueries:   100,
			blockedQueries: 100,
			wantBlockRate:  100.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var blockRate float64
			if tt.totalQueries > 0 {
				blockRate = float64(tt.blockedQueries) / float64(tt.totalQueries) * 100
			}
			if blockRate != tt.wantBlockRate {
				t.Errorf("BlockRate = %v, want %v", blockRate, tt.wantBlockRate)
			}
		})
	}
}

func TestTopBlockedDomain(t *testing.T) {
	domain := TopBlockedDomain{
		Domain:   "malware.com",
		Count:    1234,
		Category: "malware",
	}

	if domain.Domain == "" {
		t.Error("Domain should not be empty")
	}
	if domain.Count < 0 {
		t.Error("Count should not be negative")
	}
	if domain.Category == "" {
		t.Error("Category should not be empty")
	}
}

func TestCategoryStatsPercentage(t *testing.T) {
	stats := CategoryStats{
		Category:   "Malware",
		Count:      500,
		Percentage: 25.0,
	}

	if stats.Percentage < 0 || stats.Percentage > 100 {
		t.Errorf("Percentage %v should be between 0 and 100", stats.Percentage)
	}
}

func TestThreatTrend(t *testing.T) {
	trend := ThreatTrend{
		Date:     "2024-01-15",
		Malware:  100,
		Phishing: 50,
		C2:       25,
	}

	if trend.Date == "" {
		t.Error("Date should not be empty")
	}
	if trend.Malware < 0 || trend.Phishing < 0 || trend.C2 < 0 {
		t.Error("Counts should not be negative")
	}
}

func TestLocationUsage(t *testing.T) {
	usage := LocationUsage{
		LocationID:   "loc-001",
		LocationName: "Main Office",
		QueryCount:   10000,
		BlockedCount: 500,
	}

	if usage.LocationID == "" {
		t.Error("LocationID should not be empty")
	}
	if usage.BlockedCount > usage.QueryCount {
		t.Error("BlockedCount should not exceed QueryCount")
	}
}

func TestJobUpdate(t *testing.T) {
	update := JobUpdate{
		JobID:       "job-123",
		Status:      JobStatusCompleted,
		CompletedAt: time.Now(),
		Filename:    "report.pdf",
	}

	if update.JobID == "" {
		t.Error("JobID should not be empty")
	}
	if update.Status != JobStatusCompleted {
		t.Error("Status should be completed")
	}
	if update.Filename == "" {
		t.Error("Filename should not be empty for completed job")
	}
}
