// Nebula DNS - Report Worker Service - PDF Generation
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

package reports

import (
	"bytes"
	"fmt"
	"time"

	"github.com/jung-kurt/gofpdf"

	"github.com/nebuladns/report-svc/internal/models"
)

// PDFGenerator handles PDF report generation
type PDFGenerator struct{}

// NewPDFGenerator creates a new PDF generator
func NewPDFGenerator() *PDFGenerator {
	return &PDFGenerator{}
}

// GenerateDNSSummary generates a PDF for DNS summary report
func (g *PDFGenerator) GenerateDNSSummary(data *models.DNSSummaryData, reportName string) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// Header
	g.addHeader(pdf, reportName, data.Period)

	// Summary section
	g.addSummarySection(pdf, &data.Summary)

	// Top Blocked Domains
	pdf.SetY(pdf.GetY() + 10)
	g.addSectionTitle(pdf, "Top Blocked Domains")
	g.addTopBlockedTable(pdf, data.TopBlocked)

	// Category Breakdown
	if pdf.GetY() > 200 {
		pdf.AddPage()
	}
	pdf.SetY(pdf.GetY() + 10)
	g.addSectionTitle(pdf, "Blocks by Category")
	g.addCategoryTable(pdf, data.CategoryBreakdown)

	// Footer
	g.addFooter(pdf)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return buf.Bytes(), nil
}

// GenerateThreatReport generates a PDF for threat report
func (g *PDFGenerator) GenerateThreatReport(data *models.ThreatReportData, reportName string) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// Header
	g.addHeader(pdf, reportName, data.Period)

	// Summary section
	g.addSummarySection(pdf, &data.Summary)

	// Threat Statistics
	pdf.SetY(pdf.GetY() + 10)
	g.addSectionTitle(pdf, "Threat Statistics by Type")
	g.addThreatStatsTable(pdf, data.ThreatStats)

	// Top Threats
	if pdf.GetY() > 180 {
		pdf.AddPage()
	}
	pdf.SetY(pdf.GetY() + 10)
	g.addSectionTitle(pdf, "Top Threat Domains")
	g.addTopBlockedTable(pdf, data.TopThreats)

	// Threat Trends
	if pdf.GetY() > 180 {
		pdf.AddPage()
	}
	pdf.SetY(pdf.GetY() + 10)
	g.addSectionTitle(pdf, "Daily Threat Trends")
	g.addThreatTrendsTable(pdf, data.ThreatTrends)

	// Footer
	g.addFooter(pdf)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return buf.Bytes(), nil
}

// GenerateUsageReport generates a PDF for usage report
func (g *PDFGenerator) GenerateUsageReport(data *models.UsageReportData, reportName string) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// Header
	g.addHeader(pdf, reportName, data.Period)

	// Summary section
	g.addSummarySection(pdf, &data.Summary)

	// Location Usage
	pdf.SetY(pdf.GetY() + 10)
	g.addSectionTitle(pdf, "Usage by Location")
	g.addLocationUsageTable(pdf, data.LocationUsage)

	// Daily Breakdown
	if pdf.GetY() > 180 {
		pdf.AddPage()
	}
	pdf.SetY(pdf.GetY() + 10)
	g.addSectionTitle(pdf, "Daily Usage Breakdown")
	g.addDailyBreakdownTable(pdf, data.DailyBreakdown)

	// Footer
	g.addFooter(pdf)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return buf.Bytes(), nil
}

// addHeader adds the report header
func (g *PDFGenerator) addHeader(pdf *gofpdf.Fpdf, reportName string, period models.DateRange) {
	// Background gradient effect (solid color for simplicity)
	pdf.SetFillColor(102, 126, 234) // #667eea
	pdf.Rect(0, 0, 210, 35, "F")

	// Title
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 18)
	pdf.SetY(10)
	pdf.Cell(0, 10, reportName)

	// Period
	pdf.SetFont("Arial", "", 10)
	pdf.SetY(22)
	periodStr := fmt.Sprintf("Report Period: %s - %s",
		period.Start.Format("Jan 02, 2006"),
		period.End.Format("Jan 02, 2006"))
	pdf.Cell(0, 5, periodStr)

	// Reset position and colors
	pdf.SetY(45)
	pdf.SetTextColor(0, 0, 0)
}

// addSummarySection adds the summary statistics section
func (g *PDFGenerator) addSummarySection(pdf *gofpdf.Fpdf, summary *models.ReportSummary) {
	g.addSectionTitle(pdf, "Summary")

	// Summary boxes
	boxWidth := float64(43)
	boxHeight := float64(25)
	startX := float64(15)
	startY := pdf.GetY() + 5

	items := []struct {
		label string
		value string
	}{
		{"Total Queries", formatNumber(summary.TotalQueries)},
		{"Blocked", formatNumber(summary.BlockedQueries)},
		{"Allowed", formatNumber(summary.AllowedQueries)},
		{"Block Rate", fmt.Sprintf("%.2f%%", summary.BlockRate)},
	}

	for i, item := range items {
		x := startX + float64(i)*(boxWidth+5)

		// Box background
		pdf.SetFillColor(249, 250, 251) // #f9fafb
		pdf.Rect(x, startY, boxWidth, boxHeight, "F")

		// Value
		pdf.SetFont("Arial", "B", 14)
		pdf.SetTextColor(31, 41, 55) // #1f2937
		pdf.SetXY(x+2, startY+5)
		pdf.CellFormat(boxWidth-4, 8, item.value, "", 0, "C", false, 0, "")

		// Label
		pdf.SetFont("Arial", "", 8)
		pdf.SetTextColor(107, 114, 128) // #6b7280
		pdf.SetXY(x+2, startY+15)
		pdf.CellFormat(boxWidth-4, 5, item.label, "", 0, "C", false, 0, "")
	}

	pdf.SetTextColor(0, 0, 0)
	pdf.SetY(startY + boxHeight + 5)
}

// addSectionTitle adds a section title
func (g *PDFGenerator) addSectionTitle(pdf *gofpdf.Fpdf, title string) {
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(31, 41, 55)
	pdf.Cell(0, 8, title)
	pdf.Ln(10)

	// Underline
	pdf.SetDrawColor(229, 231, 235) // #e5e7eb
	pdf.Line(15, pdf.GetY()-2, 195, pdf.GetY()-2)
}

// addTopBlockedTable adds a table of top blocked domains
func (g *PDFGenerator) addTopBlockedTable(pdf *gofpdf.Fpdf, domains []models.TopBlockedDomain) {
	// Table header
	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(249, 250, 251)
	pdf.SetTextColor(107, 114, 128)
	pdf.CellFormat(90, 8, "Domain", "1", 0, "L", true, 0, "")
	pdf.CellFormat(50, 8, "Category", "1", 0, "L", true, 0, "")
	pdf.CellFormat(40, 8, "Count", "1", 1, "R", true, 0, "")

	// Table rows
	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(31, 41, 55)
	maxRows := 10
	if len(domains) < maxRows {
		maxRows = len(domains)
	}

	for i := 0; i < maxRows; i++ {
		d := domains[i]
		pdf.CellFormat(90, 7, truncateString(d.Domain, 40), "1", 0, "L", false, 0, "")
		pdf.CellFormat(50, 7, d.Category, "1", 0, "L", false, 0, "")
		pdf.CellFormat(40, 7, formatNumber(d.Count), "1", 1, "R", false, 0, "")
	}
}

// addCategoryTable adds a table of category breakdown
func (g *PDFGenerator) addCategoryTable(pdf *gofpdf.Fpdf, categories []models.CategoryStats) {
	// Table header
	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(249, 250, 251)
	pdf.SetTextColor(107, 114, 128)
	pdf.CellFormat(90, 8, "Category", "1", 0, "L", true, 0, "")
	pdf.CellFormat(45, 8, "Count", "1", 0, "R", true, 0, "")
	pdf.CellFormat(45, 8, "Percentage", "1", 1, "R", true, 0, "")

	// Table rows
	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(31, 41, 55)
	maxRows := 10
	if len(categories) < maxRows {
		maxRows = len(categories)
	}

	for i := 0; i < maxRows; i++ {
		c := categories[i]
		pdf.CellFormat(90, 7, c.Category, "1", 0, "L", false, 0, "")
		pdf.CellFormat(45, 7, formatNumber(c.Count), "1", 0, "R", false, 0, "")
		pdf.CellFormat(45, 7, fmt.Sprintf("%.1f%%", c.Percentage), "1", 1, "R", false, 0, "")
	}
}

// addThreatStatsTable adds a table of threat statistics
func (g *PDFGenerator) addThreatStatsTable(pdf *gofpdf.Fpdf, stats []models.ThreatStats) {
	// Table header
	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(249, 250, 251)
	pdf.SetTextColor(107, 114, 128)
	pdf.CellFormat(90, 8, "Threat Type", "1", 0, "L", true, 0, "")
	pdf.CellFormat(90, 8, "Count", "1", 1, "R", true, 0, "")

	// Table rows
	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(31, 41, 55)
	for _, s := range stats {
		pdf.CellFormat(90, 7, s.ThreatType, "1", 0, "L", false, 0, "")
		pdf.CellFormat(90, 7, formatNumber(s.Count), "1", 1, "R", false, 0, "")
	}
}

// addThreatTrendsTable adds a table of threat trends
func (g *PDFGenerator) addThreatTrendsTable(pdf *gofpdf.Fpdf, trends []models.ThreatTrend) {
	// Table header
	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(249, 250, 251)
	pdf.SetTextColor(107, 114, 128)
	pdf.CellFormat(45, 8, "Date", "1", 0, "L", true, 0, "")
	pdf.CellFormat(45, 8, "Malware", "1", 0, "R", true, 0, "")
	pdf.CellFormat(45, 8, "Phishing", "1", 0, "R", true, 0, "")
	pdf.CellFormat(45, 8, "C2", "1", 1, "R", true, 0, "")

	// Table rows
	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(31, 41, 55)
	maxRows := 14
	if len(trends) < maxRows {
		maxRows = len(trends)
	}

	for i := 0; i < maxRows; i++ {
		t := trends[i]
		pdf.CellFormat(45, 7, t.Date, "1", 0, "L", false, 0, "")
		pdf.CellFormat(45, 7, formatNumber(t.Malware), "1", 0, "R", false, 0, "")
		pdf.CellFormat(45, 7, formatNumber(t.Phishing), "1", 0, "R", false, 0, "")
		pdf.CellFormat(45, 7, formatNumber(t.C2), "1", 1, "R", false, 0, "")
	}
}

// addLocationUsageTable adds a table of location usage
func (g *PDFGenerator) addLocationUsageTable(pdf *gofpdf.Fpdf, usage []models.LocationUsage) {
	// Table header
	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(249, 250, 251)
	pdf.SetTextColor(107, 114, 128)
	pdf.CellFormat(80, 8, "Location", "1", 0, "L", true, 0, "")
	pdf.CellFormat(50, 8, "Total Queries", "1", 0, "R", true, 0, "")
	pdf.CellFormat(50, 8, "Blocked", "1", 1, "R", true, 0, "")

	// Table rows
	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(31, 41, 55)
	for _, u := range usage {
		pdf.CellFormat(80, 7, truncateString(u.LocationName, 35), "1", 0, "L", false, 0, "")
		pdf.CellFormat(50, 7, formatNumber(u.QueryCount), "1", 0, "R", false, 0, "")
		pdf.CellFormat(50, 7, formatNumber(u.BlockedCount), "1", 1, "R", false, 0, "")
	}
}

// addDailyBreakdownTable adds a table of daily breakdown
func (g *PDFGenerator) addDailyBreakdownTable(pdf *gofpdf.Fpdf, breakdown []models.DailyUsage) {
	// Table header
	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(249, 250, 251)
	pdf.SetTextColor(107, 114, 128)
	pdf.CellFormat(60, 8, "Date", "1", 0, "L", true, 0, "")
	pdf.CellFormat(60, 8, "Total Queries", "1", 0, "R", true, 0, "")
	pdf.CellFormat(60, 8, "Blocked", "1", 1, "R", true, 0, "")

	// Table rows
	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(31, 41, 55)
	maxRows := 14
	if len(breakdown) < maxRows {
		maxRows = len(breakdown)
	}

	for i := 0; i < maxRows; i++ {
		d := breakdown[i]
		pdf.CellFormat(60, 7, d.Date, "1", 0, "L", false, 0, "")
		pdf.CellFormat(60, 7, formatNumber(d.TotalQueries), "1", 0, "R", false, 0, "")
		pdf.CellFormat(60, 7, formatNumber(d.BlockedCount), "1", 1, "R", false, 0, "")
	}
}

// addFooter adds a footer to the PDF
func (g *PDFGenerator) addFooter(pdf *gofpdf.Fpdf) {
	pdf.SetY(-20)
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(156, 163, 175) // #9ca3af
	pdf.Cell(0, 10, fmt.Sprintf("Generated by Nebula DNS on %s", time.Now().Format("Jan 02, 2006 15:04:05 MST")))
}

// formatNumber formats a number with thousand separators
func formatNumber(n int64) string {
	str := fmt.Sprintf("%d", n)
	result := ""
	for i, c := range str {
		if i > 0 && (len(str)-i)%3 == 0 {
			result += ","
		}
		result += string(c)
	}
	return result
}

// truncateString truncates a string to max length
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}
