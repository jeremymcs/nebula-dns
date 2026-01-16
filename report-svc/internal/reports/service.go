// Nebula DNS - Report Worker Service - Report Service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

package reports

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"

	"github.com/nebuladns/report-svc/internal/clickhouse"
	"github.com/nebuladns/report-svc/internal/metrics"
	"github.com/nebuladns/report-svc/internal/models"
)

// Service handles report generation
type Service struct {
	chClient     *clickhouse.Client
	pdfGenerator *PDFGenerator
	csvGenerator *CSVGenerator
	metrics      *metrics.Metrics
	logger       *zap.Logger
}

// NewService creates a new report service
func NewService(chClient *clickhouse.Client, m *metrics.Metrics, logger *zap.Logger) *Service {
	return &Service{
		chClient:     chClient,
		pdfGenerator: NewPDFGenerator(),
		csvGenerator: NewCSVGenerator(),
		metrics:      m,
		logger:       logger,
	}
}

// Generate generates a report based on the request
func (s *Service) Generate(ctx context.Context, req *models.ReportRequest) (*models.Report, error) {
	start := time.Now()
	s.logger.Info("Starting report generation",
		zap.String("job_id", req.JobID),
		zap.String("tenant_id", req.TenantID),
		zap.String("report_type", string(req.ReportType)),
		zap.String("format", string(req.Format)),
	)

	var data []byte
	var err error
	var reportName string

	if req.ReportName != "" {
		reportName = req.ReportName
	} else {
		reportName = s.getDefaultReportName(req.ReportType)
	}

	switch req.ReportType {
	case models.ReportTypeDNSSummary:
		data, err = s.generateDNSSummary(ctx, req, reportName)
	case models.ReportTypeThreat:
		data, err = s.generateThreatReport(ctx, req, reportName)
	case models.ReportTypeUsage:
		data, err = s.generateUsageReport(ctx, req, reportName)
	default:
		err = fmt.Errorf("unsupported report type: %s", req.ReportType)
	}

	duration := time.Since(start)
	s.metrics.RecordReportGeneration(req.TenantID, string(req.Format), string(req.ReportType), duration, err == nil)

	if err != nil {
		s.logger.Error("Report generation failed",
			zap.String("job_id", req.JobID),
			zap.Error(err),
			zap.Duration("duration", duration),
		)
		return &models.Report{
			JobID:       req.JobID,
			TenantID:    req.TenantID,
			ReportType:  req.ReportType,
			Format:      req.Format,
			GeneratedAt: time.Now(),
			Error:       err.Error(),
		}, err
	}

	s.logger.Info("Report generation completed",
		zap.String("job_id", req.JobID),
		zap.Int("size_bytes", len(data)),
		zap.Duration("duration", duration),
	)

	return &models.Report{
		JobID:       req.JobID,
		TenantID:    req.TenantID,
		ReportType:  req.ReportType,
		Format:      req.Format,
		Data:        data,
		Filename:    s.generateFilename(reportName, req.Format),
		GeneratedAt: time.Now(),
	}, nil
}

// generateDNSSummary generates a DNS summary report
func (s *Service) generateDNSSummary(ctx context.Context, req *models.ReportRequest, reportName string) ([]byte, error) {
	data, err := s.chClient.GetDNSSummary(ctx, req.TenantID, req.DateRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get DNS summary data: %w", err)
	}

	switch req.Format {
	case models.ReportFormatPDF:
		return s.pdfGenerator.GenerateDNSSummary(data, reportName)
	case models.ReportFormatCSV:
		return s.csvGenerator.GenerateDNSSummary(data, reportName)
	default:
		return nil, fmt.Errorf("unsupported format: %s", req.Format)
	}
}

// generateThreatReport generates a threat report
func (s *Service) generateThreatReport(ctx context.Context, req *models.ReportRequest, reportName string) ([]byte, error) {
	data, err := s.chClient.GetThreatReport(ctx, req.TenantID, req.DateRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get threat report data: %w", err)
	}

	switch req.Format {
	case models.ReportFormatPDF:
		return s.pdfGenerator.GenerateThreatReport(data, reportName)
	case models.ReportFormatCSV:
		return s.csvGenerator.GenerateThreatReport(data, reportName)
	default:
		return nil, fmt.Errorf("unsupported format: %s", req.Format)
	}
}

// generateUsageReport generates a usage report
func (s *Service) generateUsageReport(ctx context.Context, req *models.ReportRequest, reportName string) ([]byte, error) {
	data, err := s.chClient.GetUsageReport(ctx, req.TenantID, req.DateRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get usage report data: %w", err)
	}

	switch req.Format {
	case models.ReportFormatPDF:
		return s.pdfGenerator.GenerateUsageReport(data, reportName)
	case models.ReportFormatCSV:
		return s.csvGenerator.GenerateUsageReport(data, reportName)
	default:
		return nil, fmt.Errorf("unsupported format: %s", req.Format)
	}
}

// getDefaultReportName returns a default name for a report type
func (s *Service) getDefaultReportName(reportType models.ReportType) string {
	switch reportType {
	case models.ReportTypeDNSSummary:
		return "DNS Summary Report"
	case models.ReportTypeThreat:
		return "Threat Analysis Report"
	case models.ReportTypeUsage:
		return "Usage Report"
	default:
		return "Report"
	}
}

// generateFilename creates a filename for the report
func (s *Service) generateFilename(reportName string, format models.ReportFormat) string {
	// Sanitize report name
	sanitized := ""
	for _, c := range reportName {
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_' {
			sanitized += string(c)
		} else if c == ' ' {
			sanitized += "_"
		}
	}

	dateStr := time.Now().Format("2006-01-02")
	ext := "pdf"
	if format == models.ReportFormatCSV {
		ext = "csv"
	}

	return fmt.Sprintf("%s_%s.%s", sanitized, dateStr, ext)
}
