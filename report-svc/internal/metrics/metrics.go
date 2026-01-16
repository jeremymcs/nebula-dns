// Nebula DNS - Report Worker Service - Prometheus Metrics
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

package metrics

import (
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	once     sync.Once
	instance *Metrics
)

// Metrics holds Prometheus metrics for the report service
type Metrics struct {
	ReportGenerationTotal    *prometheus.CounterVec
	ReportGenerationDuration *prometheus.HistogramVec
	ReportGenerationErrors   *prometheus.CounterVec
	JobsReceived             prometheus.Counter
	JobsCompleted            prometheus.Counter
	JobsFailed               prometheus.Counter
	ActiveJobs               prometheus.Gauge
	ClickHouseQueueSize      prometheus.Gauge

	// Internal counters for non-Prometheus access
	generationCount uint64
	errorCount      uint64
}

// NewMetrics creates and registers Prometheus metrics
func NewMetrics() *Metrics {
	once.Do(func() {
		instance = &Metrics{
			ReportGenerationTotal: prometheus.NewCounterVec(
				prometheus.CounterOpts{
					Name: "report_generation_total",
					Help: "Total number of report generations",
				},
				[]string{"tenant_id", "format", "report_type", "status"},
			),
			ReportGenerationDuration: prometheus.NewHistogramVec(
				prometheus.HistogramOpts{
					Name:    "report_generation_duration_seconds",
					Help:    "Duration of report generation in seconds",
					Buckets: []float64{0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300},
				},
				[]string{"tenant_id", "format", "report_type"},
			),
			ReportGenerationErrors: prometheus.NewCounterVec(
				prometheus.CounterOpts{
					Name: "report_generation_errors_total",
					Help: "Total number of report generation errors",
				},
				[]string{"tenant_id", "format", "report_type", "error_type"},
			),
			JobsReceived: prometheus.NewCounter(
				prometheus.CounterOpts{
					Name: "report_jobs_received_total",
					Help: "Total number of report jobs received",
				},
			),
			JobsCompleted: prometheus.NewCounter(
				prometheus.CounterOpts{
					Name: "report_jobs_completed_total",
					Help: "Total number of report jobs completed successfully",
				},
			),
			JobsFailed: prometheus.NewCounter(
				prometheus.CounterOpts{
					Name: "report_jobs_failed_total",
					Help: "Total number of report jobs that failed",
				},
			),
			ActiveJobs: prometheus.NewGauge(
				prometheus.GaugeOpts{
					Name: "report_jobs_active",
					Help: "Number of report jobs currently being processed",
				},
			),
			ClickHouseQueueSize: prometheus.NewGauge(
				prometheus.GaugeOpts{
					Name: "clickhouse_query_queue_size",
					Help: "Number of pending ClickHouse queries",
				},
			),
		}

		// Register metrics
		prometheus.MustRegister(
			instance.ReportGenerationTotal,
			instance.ReportGenerationDuration,
			instance.ReportGenerationErrors,
			instance.JobsReceived,
			instance.JobsCompleted,
			instance.JobsFailed,
			instance.ActiveJobs,
			instance.ClickHouseQueueSize,
		)
	})

	return instance
}

// RecordReportGeneration records a report generation event
func (m *Metrics) RecordReportGeneration(tenantID, format, reportType string, duration time.Duration, success bool) {
	status := "success"
	if !success {
		status = "failure"
		atomic.AddUint64(&m.errorCount, 1)
	}

	m.ReportGenerationTotal.WithLabelValues(tenantID, format, reportType, status).Inc()
	m.ReportGenerationDuration.WithLabelValues(tenantID, format, reportType).Observe(duration.Seconds())
	atomic.AddUint64(&m.generationCount, 1)
}

// RecordError records a generation error
func (m *Metrics) RecordError(tenantID, format, reportType, errorType string) {
	m.ReportGenerationErrors.WithLabelValues(tenantID, format, reportType, errorType).Inc()
}

// IncrementJobsReceived increments the jobs received counter
func (m *Metrics) IncrementJobsReceived() {
	m.JobsReceived.Inc()
	m.ActiveJobs.Inc()
}

// IncrementJobsCompleted increments the jobs completed counter
func (m *Metrics) IncrementJobsCompleted() {
	m.JobsCompleted.Inc()
	m.ActiveJobs.Dec()
}

// IncrementJobsFailed increments the jobs failed counter
func (m *Metrics) IncrementJobsFailed() {
	m.JobsFailed.Inc()
	m.ActiveJobs.Dec()
}

// SetClickHouseQueueSize sets the current ClickHouse queue size
func (m *Metrics) SetClickHouseQueueSize(size int) {
	m.ClickHouseQueueSize.Set(float64(size))
}

// GetStats returns internal counters for non-Prometheus consumers
func (m *Metrics) GetStats() map[string]uint64 {
	return map[string]uint64{
		"generations": atomic.LoadUint64(&m.generationCount),
		"errors":      atomic.LoadUint64(&m.errorCount),
	}
}

// Handler returns the Prometheus metrics HTTP handler
func Handler() http.Handler {
	return promhttp.Handler()
}

// Get returns the singleton metrics instance
func Get() *Metrics {
	if instance == nil {
		return NewMetrics()
	}
	return instance
}
