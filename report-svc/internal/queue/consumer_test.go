// Nebula DNS - Report Worker Service - Queue Consumer Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

package queue

import (
	"testing"
	"time"

	"github.com/nebuladns/report-svc/internal/models"
)

func TestValidateRequest(t *testing.T) {
	consumer := &Consumer{}

	tests := []struct {
		name    string
		req     *models.ReportRequest
		wantErr bool
	}{
		{
			name: "Valid request",
			req: &models.ReportRequest{
				JobID:      "job-123",
				TenantID:   "tenant-abc",
				ReportType: models.ReportTypeDNSSummary,
				Format:     models.ReportFormatPDF,
				DateRange: models.DateRange{
					Start: time.Now().AddDate(0, 0, -7),
					End:   time.Now(),
				},
			},
			wantErr: false,
		},
		{
			name: "Missing JobID",
			req: &models.ReportRequest{
				TenantID:   "tenant-abc",
				ReportType: models.ReportTypeDNSSummary,
			},
			wantErr: true,
		},
		{
			name: "Missing TenantID",
			req: &models.ReportRequest{
				JobID:      "job-123",
				ReportType: models.ReportTypeDNSSummary,
			},
			wantErr: true,
		},
		{
			name: "Missing ReportType",
			req: &models.ReportRequest{
				JobID:    "job-123",
				TenantID: "tenant-abc",
			},
			wantErr: true,
		},
		{
			name: "Missing Format (should default)",
			req: &models.ReportRequest{
				JobID:      "job-123",
				TenantID:   "tenant-abc",
				ReportType: models.ReportTypeDNSSummary,
			},
			wantErr: false,
		},
		{
			name: "Missing DateRange (should default)",
			req: &models.ReportRequest{
				JobID:      "job-123",
				TenantID:   "tenant-abc",
				ReportType: models.ReportTypeDNSSummary,
				Format:     models.ReportFormatPDF,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := consumer.validateRequest(tt.req)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateRequest() error = %v, wantErr %v", err, tt.wantErr)
			}

			// Verify defaults are set
			if err == nil {
				if tt.req.Format == "" {
					t.Error("Format should have a default value")
				}
				if tt.req.DateRange.Start.IsZero() || tt.req.DateRange.End.IsZero() {
					t.Error("DateRange should have default values")
				}
			}
		})
	}
}

func TestValidationErrors(t *testing.T) {
	// Test ValidationError
	err := &ValidationError{Field: "test_field", Message: "test message"}
	if err.Error() != "test message" {
		t.Errorf("ValidationError.Error() = %s, want 'test message'", err.Error())
	}

	// Test NotFoundError
	notFound := &NotFoundError{Resource: "report"}
	if notFound.Error() != "report not found" {
		t.Errorf("NotFoundError.Error() = %s, want 'report not found'", notFound.Error())
	}
}

func TestErrorConstants(t *testing.T) {
	if ErrMissingJobID == nil {
		t.Error("ErrMissingJobID should not be nil")
	}
	if ErrMissingTenantID == nil {
		t.Error("ErrMissingTenantID should not be nil")
	}
	if ErrMissingReportType == nil {
		t.Error("ErrMissingReportType should not be nil")
	}
	if ErrReportNotFound == nil {
		t.Error("ErrReportNotFound should not be nil")
	}
}

func TestChannelConstants(t *testing.T) {
	if ReportJobsChannel == "" {
		t.Error("ReportJobsChannel should not be empty")
	}
	if ReportStatusChannel == "" {
		t.Error("ReportStatusChannel should not be empty")
	}
	if ReportResultsPrefix == "" {
		t.Error("ReportResultsPrefix should not be empty")
	}
	if ResultExpiration == 0 {
		t.Error("ResultExpiration should not be zero")
	}
}

func TestDefaultDateRange(t *testing.T) {
	consumer := &Consumer{}

	req := &models.ReportRequest{
		JobID:      "job-123",
		TenantID:   "tenant-abc",
		ReportType: models.ReportTypeDNSSummary,
	}

	err := consumer.validateRequest(req)
	if err != nil {
		t.Fatalf("validateRequest failed: %v", err)
	}

	// Check that default date range is approximately 7 days
	duration := req.DateRange.End.Sub(req.DateRange.Start)
	expectedDays := 7.0
	actualDays := duration.Hours() / 24

	// Allow some tolerance for test execution time
	if actualDays < expectedDays-0.1 || actualDays > expectedDays+0.1 {
		t.Errorf("Default date range duration = %.2f days, want ~%.2f days", actualDays, expectedDays)
	}
}

func TestDefaultFormat(t *testing.T) {
	consumer := &Consumer{}

	req := &models.ReportRequest{
		JobID:      "job-123",
		TenantID:   "tenant-abc",
		ReportType: models.ReportTypeDNSSummary,
	}

	err := consumer.validateRequest(req)
	if err != nil {
		t.Fatalf("validateRequest failed: %v", err)
	}

	if req.Format != models.ReportFormatPDF {
		t.Errorf("Default format = %s, want %s", req.Format, models.ReportFormatPDF)
	}
}

func TestValidateRequestDoesNotModifyValidValues(t *testing.T) {
	consumer := &Consumer{}

	originalStart := time.Now().AddDate(0, 0, -30)
	originalEnd := time.Now()

	req := &models.ReportRequest{
		JobID:      "job-123",
		TenantID:   "tenant-abc",
		ReportType: models.ReportTypeThreat,
		Format:     models.ReportFormatCSV,
		DateRange: models.DateRange{
			Start: originalStart,
			End:   originalEnd,
		},
	}

	err := consumer.validateRequest(req)
	if err != nil {
		t.Fatalf("validateRequest failed: %v", err)
	}

	// Verify values were not modified
	if req.Format != models.ReportFormatCSV {
		t.Error("Format should not have been modified")
	}
	if !req.DateRange.Start.Equal(originalStart) {
		t.Error("DateRange.Start should not have been modified")
	}
	if !req.DateRange.End.Equal(originalEnd) {
		t.Error("DateRange.End should not have been modified")
	}
}
