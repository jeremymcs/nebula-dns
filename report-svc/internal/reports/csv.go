// Nebula DNS - Report Worker Service - CSV Generation
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

package reports

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"strconv"

	"github.com/nebuladns/report-svc/internal/models"
)

// CSVGenerator handles CSV report generation with streaming support
type CSVGenerator struct{}

// NewCSVGenerator creates a new CSV generator
func NewCSVGenerator() *CSVGenerator {
	return &CSVGenerator{}
}

// GenerateDNSSummary generates a CSV for DNS summary report
func (g *CSVGenerator) GenerateDNSSummary(data *models.DNSSummaryData, reportName string) ([]byte, error) {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	// Write report header
	if err := g.writeReportHeader(w, reportName, data.Period); err != nil {
		return nil, err
	}

	// Summary section
	if err := w.Write([]string{""}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"SUMMARY"}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"Metric", "Value"}); err != nil {
		return nil, err
	}
	if err := g.writeSummary(w, &data.Summary); err != nil {
		return nil, err
	}

	// Top Blocked Domains section
	if err := w.Write([]string{""}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"TOP BLOCKED DOMAINS"}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"Domain", "Category", "Count"}); err != nil {
		return nil, err
	}
	if err := g.writeTopBlocked(w, data.TopBlocked); err != nil {
		return nil, err
	}

	// Category Breakdown section
	if err := w.Write([]string{""}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"CATEGORY BREAKDOWN"}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"Category", "Count", "Percentage"}); err != nil {
		return nil, err
	}
	if err := g.writeCategoryBreakdown(w, data.CategoryBreakdown); err != nil {
		return nil, err
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, fmt.Errorf("failed to generate CSV: %w", err)
	}

	return buf.Bytes(), nil
}

// GenerateThreatReport generates a CSV for threat report
func (g *CSVGenerator) GenerateThreatReport(data *models.ThreatReportData, reportName string) ([]byte, error) {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	// Write report header
	if err := g.writeReportHeader(w, reportName, data.Period); err != nil {
		return nil, err
	}

	// Summary section
	if err := w.Write([]string{""}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"SUMMARY"}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"Metric", "Value"}); err != nil {
		return nil, err
	}
	if err := g.writeSummary(w, &data.Summary); err != nil {
		return nil, err
	}

	// Threat Statistics section
	if err := w.Write([]string{""}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"THREAT STATISTICS"}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"Threat Type", "Count"}); err != nil {
		return nil, err
	}
	if err := g.writeThreatStats(w, data.ThreatStats); err != nil {
		return nil, err
	}

	// Top Threats section
	if err := w.Write([]string{""}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"TOP THREAT DOMAINS"}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"Domain", "Threat Type", "Count"}); err != nil {
		return nil, err
	}
	if err := g.writeTopBlocked(w, data.TopThreats); err != nil {
		return nil, err
	}

	// Threat Trends section
	if err := w.Write([]string{""}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"DAILY THREAT TRENDS"}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"Date", "Malware", "Phishing", "C2"}); err != nil {
		return nil, err
	}
	if err := g.writeThreatTrends(w, data.ThreatTrends); err != nil {
		return nil, err
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, fmt.Errorf("failed to generate CSV: %w", err)
	}

	return buf.Bytes(), nil
}

// GenerateUsageReport generates a CSV for usage report
func (g *CSVGenerator) GenerateUsageReport(data *models.UsageReportData, reportName string) ([]byte, error) {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	// Write report header
	if err := g.writeReportHeader(w, reportName, data.Period); err != nil {
		return nil, err
	}

	// Summary section
	if err := w.Write([]string{""}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"SUMMARY"}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"Metric", "Value"}); err != nil {
		return nil, err
	}
	if err := g.writeSummary(w, &data.Summary); err != nil {
		return nil, err
	}

	// Location Usage section
	if err := w.Write([]string{""}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"USAGE BY LOCATION"}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"Location ID", "Location Name", "Total Queries", "Blocked"}); err != nil {
		return nil, err
	}
	if err := g.writeLocationUsage(w, data.LocationUsage); err != nil {
		return nil, err
	}

	// Daily Breakdown section
	if err := w.Write([]string{""}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"DAILY BREAKDOWN"}); err != nil {
		return nil, err
	}
	if err := w.Write([]string{"Date", "Total Queries", "Blocked"}); err != nil {
		return nil, err
	}
	if err := g.writeDailyBreakdown(w, data.DailyBreakdown); err != nil {
		return nil, err
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, fmt.Errorf("failed to generate CSV: %w", err)
	}

	return buf.Bytes(), nil
}

// writeReportHeader writes the report header rows
func (g *CSVGenerator) writeReportHeader(w *csv.Writer, reportName string, period models.DateRange) error {
	if err := w.Write([]string{"Report Name", reportName}); err != nil {
		return err
	}
	if err := w.Write([]string{"Period Start", period.Start.Format("2006-01-02")}); err != nil {
		return err
	}
	if err := w.Write([]string{"Period End", period.End.Format("2006-01-02")}); err != nil {
		return err
	}
	return nil
}

// writeSummary writes summary statistics
func (g *CSVGenerator) writeSummary(w *csv.Writer, summary *models.ReportSummary) error {
	rows := [][]string{
		{"Total Queries", strconv.FormatInt(summary.TotalQueries, 10)},
		{"Blocked Queries", strconv.FormatInt(summary.BlockedQueries, 10)},
		{"Allowed Queries", strconv.FormatInt(summary.AllowedQueries, 10)},
		{"Block Rate", fmt.Sprintf("%.2f%%", summary.BlockRate)},
	}

	for _, row := range rows {
		if err := w.Write(row); err != nil {
			return err
		}
	}
	return nil
}

// writeTopBlocked writes top blocked domains
func (g *CSVGenerator) writeTopBlocked(w *csv.Writer, domains []models.TopBlockedDomain) error {
	for _, d := range domains {
		if err := w.Write([]string{d.Domain, d.Category, strconv.FormatInt(d.Count, 10)}); err != nil {
			return err
		}
	}
	return nil
}

// writeCategoryBreakdown writes category breakdown
func (g *CSVGenerator) writeCategoryBreakdown(w *csv.Writer, categories []models.CategoryStats) error {
	for _, c := range categories {
		if err := w.Write([]string{
			c.Category,
			strconv.FormatInt(c.Count, 10),
			fmt.Sprintf("%.1f%%", c.Percentage),
		}); err != nil {
			return err
		}
	}
	return nil
}

// writeThreatStats writes threat statistics
func (g *CSVGenerator) writeThreatStats(w *csv.Writer, stats []models.ThreatStats) error {
	for _, s := range stats {
		if err := w.Write([]string{s.ThreatType, strconv.FormatInt(s.Count, 10)}); err != nil {
			return err
		}
	}
	return nil
}

// writeThreatTrends writes threat trends
func (g *CSVGenerator) writeThreatTrends(w *csv.Writer, trends []models.ThreatTrend) error {
	for _, t := range trends {
		if err := w.Write([]string{
			t.Date,
			strconv.FormatInt(t.Malware, 10),
			strconv.FormatInt(t.Phishing, 10),
			strconv.FormatInt(t.C2, 10),
		}); err != nil {
			return err
		}
	}
	return nil
}

// writeLocationUsage writes location usage data
func (g *CSVGenerator) writeLocationUsage(w *csv.Writer, usage []models.LocationUsage) error {
	for _, u := range usage {
		if err := w.Write([]string{
			u.LocationID,
			u.LocationName,
			strconv.FormatInt(u.QueryCount, 10),
			strconv.FormatInt(u.BlockedCount, 10),
		}); err != nil {
			return err
		}
	}
	return nil
}

// writeDailyBreakdown writes daily breakdown data
func (g *CSVGenerator) writeDailyBreakdown(w *csv.Writer, breakdown []models.DailyUsage) error {
	for _, d := range breakdown {
		if err := w.Write([]string{
			d.Date,
			strconv.FormatInt(d.TotalQueries, 10),
			strconv.FormatInt(d.BlockedCount, 10),
		}); err != nil {
			return err
		}
	}
	return nil
}

// StreamWriter provides a streaming CSV writer for large datasets
type StreamWriter struct {
	writer *csv.Writer
	buf    *bytes.Buffer
}

// NewStreamWriter creates a new streaming CSV writer
func NewStreamWriter() *StreamWriter {
	buf := &bytes.Buffer{}
	return &StreamWriter{
		writer: csv.NewWriter(buf),
		buf:    buf,
	}
}

// WriteHeader writes the CSV header row
func (sw *StreamWriter) WriteHeader(headers []string) error {
	return sw.writer.Write(headers)
}

// WriteRow writes a single row to the CSV
func (sw *StreamWriter) WriteRow(row []string) error {
	return sw.writer.Write(row)
}

// Flush flushes the writer buffer
func (sw *StreamWriter) Flush() error {
	sw.writer.Flush()
	return sw.writer.Error()
}

// Bytes returns the current buffer contents
func (sw *StreamWriter) Bytes() []byte {
	sw.writer.Flush()
	return sw.buf.Bytes()
}

// Reset clears the buffer for reuse
func (sw *StreamWriter) Reset() {
	sw.buf.Reset()
	sw.writer = csv.NewWriter(sw.buf)
}
