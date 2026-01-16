// Nebula DNS - Report Worker Service - PDF Generation Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

package reports

import (
	"testing"
	"time"

	"github.com/nebuladns/report-svc/internal/models"
)

func TestNewPDFGenerator(t *testing.T) {
	gen := NewPDFGenerator()
	if gen == nil {
		t.Fatal("NewPDFGenerator returned nil")
	}
}

func TestGenerateDNSSummaryPDF(t *testing.T) {
	gen := NewPDFGenerator()

	data := &models.DNSSummaryData{
		Period: models.DateRange{
			Start: time.Now().AddDate(0, 0, -7),
			End:   time.Now(),
		},
		Summary: models.ReportSummary{
			TotalQueries:   1000000,
			BlockedQueries: 50000,
			AllowedQueries: 950000,
			BlockRate:      5.0,
		},
		TopBlocked: []models.TopBlockedDomain{
			{Domain: "malware.com", Count: 1000, Category: "malware"},
			{Domain: "phishing.net", Count: 500, Category: "phishing"},
		},
		CategoryBreakdown: []models.CategoryStats{
			{Category: "Malware", Count: 25000, Percentage: 50.0},
			{Category: "Phishing", Count: 15000, Percentage: 30.0},
			{Category: "Adult", Count: 10000, Percentage: 20.0},
		},
	}

	pdfData, err := gen.GenerateDNSSummary(data, "Test DNS Summary Report")
	if err != nil {
		t.Fatalf("GenerateDNSSummary failed: %v", err)
	}

	if len(pdfData) == 0 {
		t.Error("GenerateDNSSummary returned empty PDF")
	}

	// Verify PDF magic number
	if len(pdfData) < 4 || string(pdfData[:4]) != "%PDF" {
		t.Error("Generated data is not a valid PDF (missing magic number)")
	}
}

func TestGenerateThreatReportPDF(t *testing.T) {
	gen := NewPDFGenerator()

	data := &models.ThreatReportData{
		Period: models.DateRange{
			Start: time.Now().AddDate(0, 0, -7),
			End:   time.Now(),
		},
		Summary: models.ReportSummary{
			TotalQueries:   1000000,
			BlockedQueries: 50000,
			AllowedQueries: 950000,
			BlockRate:      5.0,
		},
		ThreatStats: []models.ThreatStats{
			{ThreatType: "malware", Count: 10000},
			{ThreatType: "phishing", Count: 8000},
			{ThreatType: "c2", Count: 2000},
		},
		ThreatTrends: []models.ThreatTrend{
			{Date: "2024-01-15", Malware: 1000, Phishing: 800, C2: 200},
			{Date: "2024-01-16", Malware: 1100, Phishing: 750, C2: 250},
		},
		TopThreats: []models.TopBlockedDomain{
			{Domain: "malware-dropper.com", Count: 500, Category: "malware"},
			{Domain: "fake-login.net", Count: 300, Category: "phishing"},
		},
	}

	pdfData, err := gen.GenerateThreatReport(data, "Test Threat Report")
	if err != nil {
		t.Fatalf("GenerateThreatReport failed: %v", err)
	}

	if len(pdfData) == 0 {
		t.Error("GenerateThreatReport returned empty PDF")
	}

	// Verify PDF magic number
	if len(pdfData) < 4 || string(pdfData[:4]) != "%PDF" {
		t.Error("Generated data is not a valid PDF (missing magic number)")
	}
}

func TestGenerateUsageReportPDF(t *testing.T) {
	gen := NewPDFGenerator()

	data := &models.UsageReportData{
		Period: models.DateRange{
			Start: time.Now().AddDate(0, 0, -7),
			End:   time.Now(),
		},
		Summary: models.ReportSummary{
			TotalQueries:   1000000,
			BlockedQueries: 50000,
			AllowedQueries: 950000,
			BlockRate:      5.0,
		},
		LocationUsage: []models.LocationUsage{
			{LocationID: "loc-001", LocationName: "Main Office", QueryCount: 500000, BlockedCount: 25000},
			{LocationID: "loc-002", LocationName: "Remote", QueryCount: 500000, BlockedCount: 25000},
		},
		DailyBreakdown: []models.DailyUsage{
			{Date: "2024-01-15", TotalQueries: 150000, BlockedCount: 7500},
			{Date: "2024-01-16", TotalQueries: 160000, BlockedCount: 8000},
		},
	}

	pdfData, err := gen.GenerateUsageReport(data, "Test Usage Report")
	if err != nil {
		t.Fatalf("GenerateUsageReport failed: %v", err)
	}

	if len(pdfData) == 0 {
		t.Error("GenerateUsageReport returned empty PDF")
	}

	// Verify PDF magic number
	if len(pdfData) < 4 || string(pdfData[:4]) != "%PDF" {
		t.Error("Generated data is not a valid PDF (missing magic number)")
	}
}

func TestFormatNumber(t *testing.T) {
	tests := []struct {
		input    int64
		expected string
	}{
		{0, "0"},
		{100, "100"},
		{1000, "1,000"},
		{10000, "10,000"},
		{100000, "100,000"},
		{1000000, "1,000,000"},
		{1234567, "1,234,567"},
	}

	for _, tt := range tests {
		result := formatNumber(tt.input)
		if result != tt.expected {
			t.Errorf("formatNumber(%d) = %s, want %s", tt.input, result, tt.expected)
		}
	}
}

func TestTruncateString(t *testing.T) {
	tests := []struct {
		input    string
		maxLen   int
		expected string
	}{
		{"short", 10, "short"},
		{"exactly10x", 10, "exactly10x"},
		{"this is a very long string", 10, "this is..."},
		{"", 5, ""},
		{"ab", 5, "ab"},
	}

	for _, tt := range tests {
		result := truncateString(tt.input, tt.maxLen)
		if result != tt.expected {
			t.Errorf("truncateString(%q, %d) = %q, want %q", tt.input, tt.maxLen, result, tt.expected)
		}
	}
}

func TestPDFEmptyData(t *testing.T) {
	gen := NewPDFGenerator()

	data := &models.DNSSummaryData{
		Period: models.DateRange{
			Start: time.Now().AddDate(0, 0, -7),
			End:   time.Now(),
		},
		Summary:           models.ReportSummary{},
		TopBlocked:        []models.TopBlockedDomain{},
		CategoryBreakdown: []models.CategoryStats{},
	}

	pdfData, err := gen.GenerateDNSSummary(data, "Empty Report")
	if err != nil {
		t.Fatalf("GenerateDNSSummary with empty data failed: %v", err)
	}

	if len(pdfData) == 0 {
		t.Error("GenerateDNSSummary should produce output even with empty data")
	}
}

func TestPDFLargeDataset(t *testing.T) {
	gen := NewPDFGenerator()

	// Create a large dataset
	topBlocked := make([]models.TopBlockedDomain, 100)
	for i := range topBlocked {
		topBlocked[i] = models.TopBlockedDomain{
			Domain:   "domain" + string(rune(i)) + ".com",
			Count:    int64(1000 - i),
			Category: "category",
		}
	}

	categories := make([]models.CategoryStats, 50)
	for i := range categories {
		categories[i] = models.CategoryStats{
			Category:   "Category " + string(rune('A'+i)),
			Count:      int64(1000 - i*10),
			Percentage: float64(100-i*2) / 50,
		}
	}

	data := &models.DNSSummaryData{
		Period: models.DateRange{
			Start: time.Now().AddDate(0, 0, -30),
			End:   time.Now(),
		},
		Summary: models.ReportSummary{
			TotalQueries:   100000000,
			BlockedQueries: 5000000,
			AllowedQueries: 95000000,
			BlockRate:      5.0,
		},
		TopBlocked:        topBlocked,
		CategoryBreakdown: categories,
	}

	pdfData, err := gen.GenerateDNSSummary(data, "Large Dataset Report")
	if err != nil {
		t.Fatalf("GenerateDNSSummary with large dataset failed: %v", err)
	}

	if len(pdfData) == 0 {
		t.Error("GenerateDNSSummary should produce output with large dataset")
	}
}
