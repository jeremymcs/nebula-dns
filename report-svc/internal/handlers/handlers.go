// Nebula DNS - Report Worker Service - HTTP Handlers
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"go.uber.org/zap"

	"github.com/nebuladns/report-svc/internal/clickhouse"
	"github.com/nebuladns/report-svc/internal/metrics"
	"github.com/nebuladns/report-svc/internal/models"
	"github.com/nebuladns/report-svc/internal/queue"
	"github.com/nebuladns/report-svc/internal/reports"
)

// Handlers contains HTTP handlers for the report service
type Handlers struct {
	reportService *reports.Service
	consumer      *queue.Consumer
	chClient      *clickhouse.Client
	metrics       *metrics.Metrics
	logger        *zap.Logger
	startTime     time.Time
}

// NewHandlers creates a new handlers instance
func NewHandlers(
	reportService *reports.Service,
	consumer *queue.Consumer,
	chClient *clickhouse.Client,
	m *metrics.Metrics,
	logger *zap.Logger,
) *Handlers {
	return &Handlers{
		reportService: reportService,
		consumer:      consumer,
		chClient:      chClient,
		metrics:       m,
		logger:        logger,
		startTime:     time.Now(),
	}
}

// Health returns the health status
func (h *Handlers) Health(w http.ResponseWriter, r *http.Request) {
	response := map[string]interface{}{
		"status":    "healthy",
		"service":   "report-svc",
		"timestamp": time.Now().Format(time.RFC3339),
		"uptime":    time.Since(h.startTime).String(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Ready returns the readiness status
func (h *Handlers) Ready(w http.ResponseWriter, r *http.Request) {
	// Check if ClickHouse is healthy
	clickhouseHealthy := h.chClient.IsHealthy()

	ready := clickhouseHealthy

	response := map[string]interface{}{
		"ready":     ready,
		"timestamp": time.Now().Format(time.RFC3339),
		"checks": map[string]bool{
			"clickhouse": clickhouseHealthy,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	if !ready {
		w.WriteHeader(http.StatusServiceUnavailable)
	}
	json.NewEncoder(w).Encode(response)
}

// Live returns the liveness status
func (h *Handlers) Live(w http.ResponseWriter, r *http.Request) {
	response := map[string]interface{}{
		"alive":     true,
		"timestamp": time.Now().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Metrics returns Prometheus metrics
func (h *Handlers) Metrics(w http.ResponseWriter, r *http.Request) {
	metrics.Handler().ServeHTTP(w, r)
}

// GenerateReport handles synchronous report generation requests
func (h *Handlers) GenerateReport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.ReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode request", zap.Error(err))
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.TenantID == "" {
		http.Error(w, "tenant_id is required", http.StatusBadRequest)
		return
	}
	if req.ReportType == "" {
		http.Error(w, "report_type is required", http.StatusBadRequest)
		return
	}

	// Set defaults
	if req.Format == "" {
		req.Format = models.ReportFormatPDF
	}
	if req.DateRange.Start.IsZero() || req.DateRange.End.IsZero() {
		now := time.Now()
		req.DateRange = models.DateRange{
			Start: now.AddDate(0, 0, -7),
			End:   now,
		}
	}

	// Generate report
	report, err := h.reportService.Generate(r.Context(), &req)
	if err != nil {
		h.logger.Error("Failed to generate report", zap.Error(err))
		http.Error(w, "Failed to generate report: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Set appropriate content type and headers
	contentType := "application/pdf"
	if req.Format == models.ReportFormatCSV {
		contentType = "text/csv"
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", "attachment; filename=\""+report.Filename+"\"")
	w.Header().Set("Content-Length", strconv.Itoa(len(report.Data)))
	w.Write(report.Data)
}

// GetReport retrieves a previously generated report by job ID
func (h *Handlers) GetReport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	jobID := r.URL.Query().Get("job_id")
	if jobID == "" {
		http.Error(w, "job_id is required", http.StatusBadRequest)
		return
	}

	report, err := h.consumer.GetResult(r.Context(), jobID)
	if err != nil {
		if _, ok := err.(*queue.NotFoundError); ok {
			http.Error(w, "Report not found", http.StatusNotFound)
			return
		}
		h.logger.Error("Failed to get report", zap.Error(err))
		http.Error(w, "Failed to get report", http.StatusInternalServerError)
		return
	}

	// Set appropriate content type and headers
	contentType := "application/pdf"
	if report.Format == models.ReportFormatCSV {
		contentType = "text/csv"
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", "attachment; filename=\""+report.Filename+"\"")
	w.Write(report.Data)
}

// Stats returns service statistics
func (h *Handlers) Stats(w http.ResponseWriter, r *http.Request) {
	stats := h.metrics.GetStats()
	chState := h.chClient.GetCircuitState()

	chStateStr := "closed"
	switch chState {
	case clickhouse.CircuitOpen:
		chStateStr = "open"
	case clickhouse.CircuitHalfOpen:
		chStateStr = "half-open"
	}

	response := map[string]interface{}{
		"service":   "report-svc",
		"timestamp": time.Now().Format(time.RFC3339),
		"uptime":    time.Since(h.startTime).String(),
		"stats":     stats,
		"clickhouse": map[string]interface{}{
			"healthy":       h.chClient.IsHealthy(),
			"circuit_state": chStateStr,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
