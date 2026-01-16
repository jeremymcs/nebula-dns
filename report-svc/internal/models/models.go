// Nebula DNS - Report Worker Service - Data Models
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

package models

import "time"

// ReportType defines the type of report to generate
type ReportType string

const (
	ReportTypeDNSSummary ReportType = "dns_summary"
	ReportTypeThreat     ReportType = "threat_report"
	ReportTypeUsage      ReportType = "usage"
)

// ReportFormat defines the output format
type ReportFormat string

const (
	ReportFormatPDF ReportFormat = "pdf"
	ReportFormatCSV ReportFormat = "csv"
)

// DateRange represents a time range for reports
type DateRange struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

// ReportRequest represents a request to generate a report
type ReportRequest struct {
	JobID      string         `json:"job_id"`
	TenantID   string         `json:"tenant_id"`
	ReportType ReportType     `json:"report_type"`
	DateRange  DateRange      `json:"date_range"`
	Format     ReportFormat   `json:"format"`
	Recipients []string       `json:"recipients,omitempty"`
	ReportName string         `json:"report_name,omitempty"`
	Filters    *ReportFilters `json:"filters,omitempty"`
}

// ReportFilters contains optional filters for reports
type ReportFilters struct {
	LocationIDs []string `json:"location_ids,omitempty"`
	Categories  []string `json:"categories,omitempty"`
}

// Report represents a generated report
type Report struct {
	JobID       string       `json:"job_id"`
	TenantID    string       `json:"tenant_id"`
	ReportType  ReportType   `json:"report_type"`
	Format      ReportFormat `json:"format"`
	Data        []byte       `json:"-"`
	Filename    string       `json:"filename"`
	GeneratedAt time.Time    `json:"generated_at"`
	Error       string       `json:"error,omitempty"`
}

// ReportSummary contains summary statistics for DNS reports
type ReportSummary struct {
	TotalQueries   int64   `json:"total_queries"`
	BlockedQueries int64   `json:"blocked_queries"`
	AllowedQueries int64   `json:"allowed_queries"`
	BlockRate      float64 `json:"block_rate"`
}

// TopBlockedDomain represents a frequently blocked domain
type TopBlockedDomain struct {
	Domain   string `json:"domain"`
	Count    int64  `json:"count"`
	Category string `json:"category"`
}

// CategoryStats represents block statistics by category
type CategoryStats struct {
	Category   string  `json:"category"`
	Count      int64   `json:"count"`
	Percentage float64 `json:"percentage"`
}

// ThreatStats represents threat-specific statistics
type ThreatStats struct {
	ThreatType string `json:"threat_type"`
	Count      int64  `json:"count"`
}

// ThreatTrend represents daily threat trend data
type ThreatTrend struct {
	Date     string `json:"date"`
	Malware  int64  `json:"malware"`
	Phishing int64  `json:"phishing"`
	C2       int64  `json:"c2"`
}

// LocationUsage represents usage statistics per location
type LocationUsage struct {
	LocationID   string `json:"location_id"`
	LocationName string `json:"location_name"`
	QueryCount   int64  `json:"query_count"`
	BlockedCount int64  `json:"blocked_count"`
}

// DNSSummaryData contains all data for a DNS summary report
type DNSSummaryData struct {
	Period            DateRange          `json:"period"`
	Summary           ReportSummary      `json:"summary"`
	TopBlocked        []TopBlockedDomain `json:"top_blocked"`
	CategoryBreakdown []CategoryStats    `json:"category_breakdown"`
}

// ThreatReportData contains all data for a threat report
type ThreatReportData struct {
	Period       DateRange          `json:"period"`
	Summary      ReportSummary      `json:"summary"`
	ThreatStats  []ThreatStats      `json:"threat_stats"`
	ThreatTrends []ThreatTrend      `json:"threat_trends"`
	TopThreats   []TopBlockedDomain `json:"top_threats"`
}

// UsageReportData contains all data for a usage report
type UsageReportData struct {
	Period         DateRange       `json:"period"`
	Summary        ReportSummary   `json:"summary"`
	LocationUsage  []LocationUsage `json:"location_usage"`
	DailyBreakdown []DailyUsage    `json:"daily_breakdown"`
}

// DailyUsage represents daily usage statistics
type DailyUsage struct {
	Date         string `json:"date"`
	TotalQueries int64  `json:"total_queries"`
	BlockedCount int64  `json:"blocked_count"`
}

// JobStatus represents the status of a report job
type JobStatus string

const (
	JobStatusPending    JobStatus = "pending"
	JobStatusGenerating JobStatus = "generating"
	JobStatusCompleted  JobStatus = "completed"
	JobStatusFailed     JobStatus = "failed"
)

// JobUpdate represents a job status update for Redis
type JobUpdate struct {
	JobID       string    `json:"job_id"`
	Status      JobStatus `json:"status"`
	Error       string    `json:"error,omitempty"`
	CompletedAt time.Time `json:"completed_at,omitempty"`
	Filename    string    `json:"filename,omitempty"`
}
