// Nebula DNS - Report Worker Service - CSV Generation Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

package reports

import (
	"encoding/csv"
	"strings"
	"testing"
	"time"

	"github.com/nebuladns/report-svc/internal/models"
)

func TestNewCSVGenerator(t *testing.T) {
	gen := NewCSVGenerator()
	if gen == nil {
		t.Fatal("NewCSVGenerator returned nil")
	}
}

func TestGenerateDNSSummaryCSV(t *testing.T) {
	gen := NewCSVGenerator()

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
		},
	}

	csvData, err := gen.GenerateDNSSummary(data, "Test DNS Summary Report")
	if err != nil {
		t.Fatalf("GenerateDNSSummary failed: %v", err)
	}

	if len(csvData) == 0 {
		t.Error("GenerateDNSSummary returned empty CSV")
	}

	// Verify CSV is parseable with variable field count
	reader := csv.NewReader(strings.NewReader(string(csvData)))
	reader.FieldsPerRecord = -1 // Allow variable fields
	records, err := reader.ReadAll()
	if err != nil {
		t.Fatalf("Generated CSV is not parseable: %v", err)
	}

	if len(records) == 0 {
		t.Error("CSV has no records")
	}

	// Verify report name is in first row
	if records[0][0] != "Report Name" || records[0][1] != "Test DNS Summary Report" {
		t.Error("CSV should start with report name")
	}
}

func TestGenerateThreatReportCSV(t *testing.T) {
	gen := NewCSVGenerator()

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
		},
		ThreatTrends: []models.ThreatTrend{
			{Date: "2024-01-15", Malware: 1000, Phishing: 800, C2: 200},
		},
		TopThreats: []models.TopBlockedDomain{
			{Domain: "malware-dropper.com", Count: 500, Category: "malware"},
		},
	}

	csvData, err := gen.GenerateThreatReport(data, "Test Threat Report")
	if err != nil {
		t.Fatalf("GenerateThreatReport failed: %v", err)
	}

	if len(csvData) == 0 {
		t.Error("GenerateThreatReport returned empty CSV")
	}

	// Verify CSV is parseable with variable field count
	reader := csv.NewReader(strings.NewReader(string(csvData)))
	reader.FieldsPerRecord = -1 // Allow variable fields
	records, err := reader.ReadAll()
	if err != nil {
		t.Fatalf("Generated CSV is not parseable: %v", err)
	}

	if len(records) == 0 {
		t.Error("CSV has no records")
	}
}

func TestGenerateUsageReportCSV(t *testing.T) {
	gen := NewCSVGenerator()

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
		},
		DailyBreakdown: []models.DailyUsage{
			{Date: "2024-01-15", TotalQueries: 150000, BlockedCount: 7500},
		},
	}

	csvData, err := gen.GenerateUsageReport(data, "Test Usage Report")
	if err != nil {
		t.Fatalf("GenerateUsageReport failed: %v", err)
	}

	if len(csvData) == 0 {
		t.Error("GenerateUsageReport returned empty CSV")
	}

	// Verify CSV is parseable with variable field count
	reader := csv.NewReader(strings.NewReader(string(csvData)))
	reader.FieldsPerRecord = -1 // Allow variable fields
	records, err := reader.ReadAll()
	if err != nil {
		t.Fatalf("Generated CSV is not parseable: %v", err)
	}

	if len(records) == 0 {
		t.Error("CSV has no records")
	}
}

func TestCSVEmptyData(t *testing.T) {
	gen := NewCSVGenerator()

	data := &models.DNSSummaryData{
		Period: models.DateRange{
			Start: time.Now().AddDate(0, 0, -7),
			End:   time.Now(),
		},
		Summary:           models.ReportSummary{},
		TopBlocked:        []models.TopBlockedDomain{},
		CategoryBreakdown: []models.CategoryStats{},
	}

	csvData, err := gen.GenerateDNSSummary(data, "Empty Report")
	if err != nil {
		t.Fatalf("GenerateDNSSummary with empty data failed: %v", err)
	}

	if len(csvData) == 0 {
		t.Error("GenerateDNSSummary should produce output even with empty data")
	}
}

func TestCSVSpecialCharacters(t *testing.T) {
	gen := NewCSVGenerator()

	data := &models.DNSSummaryData{
		Period: models.DateRange{
			Start: time.Now().AddDate(0, 0, -7),
			End:   time.Now(),
		},
		Summary: models.ReportSummary{
			TotalQueries:   1000,
			BlockedQueries: 100,
			AllowedQueries: 900,
			BlockRate:      10.0,
		},
		TopBlocked: []models.TopBlockedDomain{
			{Domain: "domain,with,commas.com", Count: 100, Category: "test"},
			{Domain: "domain\"with\"quotes.com", Count: 50, Category: "test"},
			{Domain: "domain\nwith\nnewlines.com", Count: 25, Category: "test"},
		},
		CategoryBreakdown: []models.CategoryStats{},
	}

	csvData, err := gen.GenerateDNSSummary(data, "Report with \"special\" characters, and more")
	if err != nil {
		t.Fatalf("GenerateDNSSummary with special characters failed: %v", err)
	}

	// Verify CSV is still parseable with variable field count
	reader := csv.NewReader(strings.NewReader(string(csvData)))
	reader.FieldsPerRecord = -1 // Allow variable fields
	records, err := reader.ReadAll()
	if err != nil {
		t.Fatalf("Generated CSV with special characters is not parseable: %v", err)
	}

	if len(records) == 0 {
		t.Error("CSV has no records")
	}
}

func TestNewStreamWriter(t *testing.T) {
	sw := NewStreamWriter()
	if sw == nil {
		t.Fatal("NewStreamWriter returned nil")
	}
	if sw.writer == nil {
		t.Error("StreamWriter has nil csv.Writer")
	}
	if sw.buf == nil {
		t.Error("StreamWriter has nil buffer")
	}
}

func TestStreamWriterWriteHeader(t *testing.T) {
	sw := NewStreamWriter()
	headers := []string{"Column1", "Column2", "Column3"}

	err := sw.WriteHeader(headers)
	if err != nil {
		t.Fatalf("WriteHeader failed: %v", err)
	}

	err = sw.Flush()
	if err != nil {
		t.Fatalf("Flush failed: %v", err)
	}

	data := sw.Bytes()
	if len(data) == 0 {
		t.Error("StreamWriter produced no output after WriteHeader")
	}

	// Verify header is in output
	output := string(data)
	if !strings.Contains(output, "Column1") {
		t.Error("Output should contain header column")
	}
}

func TestStreamWriterWriteRow(t *testing.T) {
	sw := NewStreamWriter()

	err := sw.WriteHeader([]string{"Name", "Value"})
	if err != nil {
		t.Fatalf("WriteHeader failed: %v", err)
	}

	err = sw.WriteRow([]string{"Test", "123"})
	if err != nil {
		t.Fatalf("WriteRow failed: %v", err)
	}

	err = sw.Flush()
	if err != nil {
		t.Fatalf("Flush failed: %v", err)
	}

	data := sw.Bytes()
	if len(data) == 0 {
		t.Error("StreamWriter produced no output")
	}

	// Verify row is in output
	output := string(data)
	if !strings.Contains(output, "Test") {
		t.Error("Output should contain row data")
	}
}

func TestStreamWriterReset(t *testing.T) {
	sw := NewStreamWriter()

	sw.WriteRow([]string{"data"})
	sw.Flush()

	initialLen := len(sw.Bytes())
	if initialLen == 0 {
		t.Fatal("StreamWriter should have data before reset")
	}

	sw.Reset()

	if len(sw.Bytes()) != 0 {
		t.Error("StreamWriter should be empty after reset")
	}
}

func TestCSVLargeDataset(t *testing.T) {
	gen := NewCSVGenerator()

	// Create a large dataset
	topBlocked := make([]models.TopBlockedDomain, 1000)
	for i := range topBlocked {
		topBlocked[i] = models.TopBlockedDomain{
			Domain:   "domain" + string(rune(i)) + ".com",
			Count:    int64(10000 - i),
			Category: "category",
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
		CategoryBreakdown: []models.CategoryStats{},
	}

	csvData, err := gen.GenerateDNSSummary(data, "Large Dataset Report")
	if err != nil {
		t.Fatalf("GenerateDNSSummary with large dataset failed: %v", err)
	}

	if len(csvData) == 0 {
		t.Error("GenerateDNSSummary should produce output with large dataset")
	}

	// Verify CSV is still parseable with variable field count
	reader := csv.NewReader(strings.NewReader(string(csvData)))
	reader.FieldsPerRecord = -1 // Allow variable fields
	records, err := reader.ReadAll()
	if err != nil {
		t.Fatalf("Generated CSV is not parseable: %v", err)
	}

	// Should have header + sections + data rows
	if len(records) < 100 {
		t.Errorf("Expected at least 100 records, got %d", len(records))
	}
}
