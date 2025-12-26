// Nebula DNS - Enterprise DNS Security Platform
// Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Prometheus Metrics for Policy Service

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

// Metrics holds Prometheus metrics for the policy service
type Metrics struct {
	EvaluationsTotal    *prometheus.CounterVec
	EvaluationDuration  prometheus.Histogram
	CacheHits           prometheus.Counter
	CacheMisses         prometheus.Counter
	RequestsTotal       *prometheus.CounterVec
	RequestDuration     *prometheus.HistogramVec
	ActiveConnections   prometheus.Gauge
	PolicyCacheSize     prometheus.Gauge
	ClickHouseQueueSize prometheus.Gauge

	// Internal counters for non-Prometheus access
	evaluationCount uint64
	blockCount      uint64
	allowCount      uint64
	rewriteCount    uint64
}

// NewMetrics creates and registers Prometheus metrics
func NewMetrics() *Metrics {
	once.Do(func() {
		instance = &Metrics{
			EvaluationsTotal: prometheus.NewCounterVec(
				prometheus.CounterOpts{
					Name: "policy_evaluations_total",
					Help: "Total number of policy evaluations",
				},
				[]string{"decision", "reason"},
			),
			EvaluationDuration: prometheus.NewHistogram(
				prometheus.HistogramOpts{
					Name:    "policy_evaluation_duration_seconds",
					Help:    "Duration of policy evaluations in seconds",
					Buckets: []float64{.0001, .0005, .001, .005, .01, .025, .05, .1},
				},
			),
			CacheHits: prometheus.NewCounter(
				prometheus.CounterOpts{
					Name: "policy_cache_hits_total",
					Help: "Total number of cache hits",
				},
			),
			CacheMisses: prometheus.NewCounter(
				prometheus.CounterOpts{
					Name: "policy_cache_misses_total",
					Help: "Total number of cache misses",
				},
			),
			RequestsTotal: prometheus.NewCounterVec(
				prometheus.CounterOpts{
					Name: "http_requests_total",
					Help: "Total number of HTTP requests",
				},
				[]string{"method", "path", "status"},
			),
			RequestDuration: prometheus.NewHistogramVec(
				prometheus.HistogramOpts{
					Name:    "http_request_duration_seconds",
					Help:    "Duration of HTTP requests in seconds",
					Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1},
				},
				[]string{"method", "path"},
			),
			ActiveConnections: prometheus.NewGauge(
				prometheus.GaugeOpts{
					Name: "http_active_connections",
					Help: "Number of active HTTP connections",
				},
			),
			PolicyCacheSize: prometheus.NewGauge(
				prometheus.GaugeOpts{
					Name: "policy_cache_size",
					Help: "Number of policies in cache",
				},
			),
			ClickHouseQueueSize: prometheus.NewGauge(
				prometheus.GaugeOpts{
					Name: "clickhouse_queue_size",
					Help: "Number of logs pending to be sent to ClickHouse",
				},
			),
		}

		// Register metrics
		prometheus.MustRegister(
			instance.EvaluationsTotal,
			instance.EvaluationDuration,
			instance.CacheHits,
			instance.CacheMisses,
			instance.RequestsTotal,
			instance.RequestDuration,
			instance.ActiveConnections,
			instance.PolicyCacheSize,
			instance.ClickHouseQueueSize,
		)
	})

	return instance
}

// RecordEvaluation records a policy evaluation
func (m *Metrics) RecordEvaluation(decision, reason string, duration time.Duration) {
	m.EvaluationsTotal.WithLabelValues(decision, reason).Inc()
	m.EvaluationDuration.Observe(duration.Seconds())
	atomic.AddUint64(&m.evaluationCount, 1)

	switch decision {
	case "block":
		atomic.AddUint64(&m.blockCount, 1)
	case "allow":
		atomic.AddUint64(&m.allowCount, 1)
	case "rewrite":
		atomic.AddUint64(&m.rewriteCount, 1)
	}
}

// Handler returns the Prometheus metrics HTTP handler
func Handler() http.Handler {
	return promhttp.Handler()
}

